import { Router } from "express";
import fetch from "node-fetch";
import { pool } from "../db.js";
import { requireAuth } from "../authMiddleware.js";
import { encrypt, decrypt } from "../crypto.js";

const router = Router();

// Recognizable GitHub token prefixes, so we can reject an obviously-wrong paste (a client
// secret, a webhook secret, half a token, ...) before spending a network round trip on it.
// ghp_        classic personal access token
// github_pat_ fine-grained personal access token
// gho_        OAuth App user token
// 40 hex chars  the legacy (pre-2021) classic token format, still accepted by GitHub
const TOKEN_FORMATS = [
  /^ghp_[A-Za-z0-9]{36,}$/,
  /^github_pat_[A-Za-z0-9_]{20,}$/,
  /^gho_[A-Za-z0-9]{36,}$/,
  /^[a-f0-9]{40}$/i,
];
function looksLikeGithubToken(token) {
  return TOKEN_FORMATS.some((re) => re.test(token));
}

// GitHub username/org rules: letters, digits, single hyphens, can't start/end with one, <= 39 chars.
const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
// Repo name rules: letters, digits, '.', '_', '-', <= 100 chars.
const REPO_NAME_RE = /^[A-Za-z0-9._-]{1,100}$/;

function validateRepoFields(repoOwner, repoName) {
  if (repoOwner.includes("/") || repoName.includes("/")) {
    return 'Put just the owner (e.g. "octocat") in "Repo owner" and just the repo (e.g. "Hello-World") in ' +
      '"Repo name" -- no slashes, and don\'t paste the whole "owner/repo" into a single field.';
  }
  if (/github\.com/i.test(repoOwner) || /github\.com/i.test(repoName)) {
    return "Paste just the owner and the repo name, not the full github.com URL.";
  }
  if (repoName.endsWith(".git")) {
    return 'Drop the trailing ".git" from the repo name.';
  }
  if (!OWNER_RE.test(repoOwner)) {
    return "That doesn't look like a valid GitHub username/org: letters, digits and single hyphens only, up to 39 characters, and it can't start or end with a hyphen.";
  }
  if (!REPO_NAME_RE.test(repoName)) {
    return "That doesn't look like a valid GitHub repo name: letters, digits, '.', '_' and '-' only, up to 100 characters.";
  }
  return null;
}

// Turns a failed GitHub API response into a specific, actionable error message instead of a
// bare status code.
async function describeGithubError(response, repoOwner, repoName) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // GitHub usually returns JSON even for errors, but don't blow up if it doesn't this time.
  }
  const apiMessage = body?.message;

  switch (response.status) {
    case 401:
      return "GitHub rejected that token as invalid, expired or revoked (401). Generate a fresh one at " +
        "github.com/settings/tokens and make sure you copy the whole value -- it's only shown once.";

    case 403: {
      if (response.headers.get("x-ratelimit-remaining") === "0") {
        const resetHeader = response.headers.get("x-ratelimit-reset");
        const resetAt = resetHeader ? new Date(Number(resetHeader) * 1000).toLocaleTimeString() : "shortly";
        return `You've hit GitHub's API rate limit for this token (403). It resets at ${resetAt} -- try again after that.`;
      }
      if (apiMessage && /saml/i.test(apiMessage)) {
        return `This token's organization requires SSO (403). Authorize it at github.com/settings/tokens ` +
          `by clicking "Enable SSO" next to the token, then try again.`;
      }
      return `GitHub refused access (403)${apiMessage ? `: ${apiMessage}` : ""}. If this is a fine-grained ` +
        `token, check it has "Issues: Read-only" permission for this repo under Repository permissions; if ` +
        `it's a classic token, check the "repo" scope (or "public_repo" for a public repo) is checked.`;
    }

    case 404:
      return `Repo "${repoOwner}/${repoName}" wasn't found (404). Either the owner/name is misspelled, or ` +
        `it's private and this token can't see it -- classic tokens need the "repo" scope, fine-grained ` +
        `tokens need this exact repo selected under "Repository access".`;

    case 422:
      return `GitHub couldn't process that request (422)${apiMessage ? `: ${apiMessage}` : ""}. Double-check the owner and repo name.`;

    default:
      return `GitHub API error ${response.status}${apiMessage ? `: ${apiMessage}` : ""}.`;
  }
}

// POST /github/connect  { patToken, repoOwner, repoName }
router.post("/connect", requireAuth, async (req, res) => {
  const patToken = (req.body.patToken || "").trim();
  const repoOwner = (req.body.repoOwner || "").trim();
  const repoName = (req.body.repoName || "").trim();
  if (!patToken || !repoOwner || !repoName) {
    return res.status(400).json({ error: "patToken, repoOwner and repoName are required" });
  }

  const fieldsError = validateRepoFields(repoOwner, repoName);
  if (fieldsError) return res.status(400).json({ error: fieldsError });

  if (!looksLikeGithubToken(patToken)) {
    return res.status(400).json({
      error:
        'That doesn\'t look like a GitHub Personal Access Token. Classic tokens start with "ghp_", ' +
        'fine-grained tokens start with "github_pat_" -- make sure you copied the whole thing and not, ' +
        "e.g., an OAuth app client secret.",
    });
  }

  // Validate the token actually works, and against this exact repo, before saving it.
  const check = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
    headers: { Authorization: `Bearer ${patToken}`, "User-Agent": "ttt-app" },
  });
  if (!check.ok) {
    return res.status(400).json({ error: await describeGithubError(check, repoOwner, repoName) });
  }

  const encrypted = encrypt(patToken);
  await pool.query(
    `INSERT INTO github_integrations (user_id, pat_token_encrypted, repo_owner, repo_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       pat_token_encrypted = EXCLUDED.pat_token_encrypted,
       repo_owner = EXCLUDED.repo_owner,
       repo_name = EXCLUDED.repo_name,
       connected_at = now()`,
    [req.userId, encrypted, repoOwner, repoName]
  );

  const syncResult = await syncIssuesForUser(req.userId);
  res.status(201).json({ ok: true, sync: syncResult });
});

// GET /github/status
router.get("/status", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT repo_owner, repo_name, connected_at FROM github_integrations WHERE user_id = $1",
    [req.userId]
  );
  res.json({ connected: result.rows.length > 0, integration: result.rows[0] || null });
});

// DELETE /github/disconnect
router.delete("/disconnect", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM github_integrations WHERE user_id = $1", [req.userId]);
  await pool.query("DELETE FROM github_issues_cache WHERE user_id = $1", [req.userId]);
  res.json({ ok: true });
});

// GET /github/issues  -> serves the cache (populated by /connect and the timer-triggered Azure Function)
router.get("/issues", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM github_issues_cache WHERE user_id = $1 ORDER BY updated_at_github DESC",
    [req.userId]
  );
  res.json({ issues: result.rows });
});

// POST /github/issues/refresh -> manual refresh button, in addition to the timer trigger
router.post("/issues/refresh", requireAuth, async (req, res) => {
  const result = await syncIssuesForUser(req.userId);
  if (result.reason) return res.status(502).json({ ...result, error: result.reason });
  res.json(result);
});

export async function syncIssuesForUser(userId) {
  const integration = await pool.query("SELECT * FROM github_integrations WHERE user_id = $1", [userId]);
  const row = integration.rows[0];
  if (!row) return { synced: 0, reason: "not connected" };

  const patToken = decrypt(row.pat_token_encrypted);
  const response = await fetch(
    `https://api.github.com/repos/${row.repo_owner}/${row.repo_name}/issues?state=all&per_page=30`,
    { headers: { Authorization: `Bearer ${patToken}`, "User-Agent": "ttt-app" } }
  );
  if (!response.ok) {
    return { synced: 0, reason: await describeGithubError(response, row.repo_owner, row.repo_name) };
  }
  const issues = await response.json();

  for (const issue of issues) {
    if (issue.pull_request) continue; // keep this view to plain issues
    await pool.query(
      `INSERT INTO github_issues_cache (user_id, issue_number, title, state, url, updated_at_github)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, issue_number) DO UPDATE SET
         title = EXCLUDED.title, state = EXCLUDED.state, url = EXCLUDED.url,
         updated_at_github = EXCLUDED.updated_at_github, cached_at = now()`,
      [userId, issue.number, issue.title, issue.state, issue.html_url, issue.updated_at]
    );
  }
  return { synced: issues.length };
}

export default router;
