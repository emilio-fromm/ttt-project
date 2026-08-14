import { useEffect, useState } from "react";
import { integrationsApi } from "../api/client";

export default function GitHubView() {
  const [status, setStatus] = useState(null);
  const [issues, setIssues] = useState([]);
  const [form, setForm] = useState({ patToken: "", repoOwner: "", repoName: "" });
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const statusRes = await integrationsApi.get("/github/status");
    setStatus(statusRes.data);
    if (statusRes.data.connected) {
      const issuesRes = await integrationsApi.get("/github/issues");
      setIssues(issuesRes.data.issues);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleConnect(e) {
    e.preventDefault();
    setConnecting(true);
    setError("");
    try {
      const res = await integrationsApi.post("/github/connect", form);
      await loadAll();
      // The token/repo check passed, but the very first issue sync can still fail on its
      // own (e.g. a fine-grained token missing "Issues" permission even though it can read
      // the repo) -- surface that instead of silently showing an empty issue list.
      if (res.data.sync?.reason) setRefreshError(`Connected, but the first sync failed: ${res.data.sync.reason}`);
    } catch (err) {
      setError(err.response?.data?.error || "Could not connect to GitHub");
    } finally {
      setConnecting(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshError("");
    try {
      // A non-2xx response (e.g. a revoked token, a rate limit) throws in axios and is
      // handled below -- reaching here means the sync actually worked.
      await integrationsApi.post("/github/issues/refresh");
      const issuesRes = await integrationsApi.get("/github/issues");
      setIssues(issuesRes.data.issues);
    } catch (err) {
      setRefreshError(err.response?.data?.error || "Refresh failed, try again.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDisconnect() {
    await integrationsApi.delete("/github/disconnect");
    setStatus({ connected: false, integration: null });
    setIssues([]);
    setRefreshError("");
  }

  if (loading) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <h2 className="section-heading">GitHub</h2>

      {!status.connected && (
        <div className="auth-card" style={{ maxWidth: "560px", margin: "0" }}>
          <p style={{ marginTop: 0 }}>
            Connect a repo with a{" "}
            <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer">
              Personal Access Token
            </a>{" "}
            to see its issues right here, refreshed automatically every 15 minutes.
          </p>

          <details className="info-disclosure" open>
            <summary>Which token & permissions do I need?</summary>
            <div className="info-disclosure-body">
              <p style={{ marginTop: 0 }}>
                <strong>Option A — classic token (simplest):</strong>
              </p>
              <ol>
                <li>
                  Go to{" "}
                  <a href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer">
                    Settings → Developer settings → Personal access tokens → Tokens (classic)
                  </a>
                  .
                </li>
                <li>Give it a name and an expiration date.</li>
                <li>
                  Under "Select scopes", check <code>repo</code> if the repo is private, or just{" "}
                  <code>public_repo</code> if it's public.
                </li>
                <li>
                  Generate it and copy the value right away — it's shown once and starts with{" "}
                  <code>ghp_</code>.
                </li>
              </ol>
              <p>
                <strong>Option B — fine-grained token (narrower scope):</strong>
              </p>
              <ol>
                <li>
                  Go to{" "}
                  <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                    Settings → Developer settings → Fine-grained tokens
                  </a>
                  .
                </li>
                <li>Under "Repository access", choose "Only select repositories" and pick this one.</li>
                <li>
                  Under "Permissions → Repository permissions", set <strong>Issues</strong> to{" "}
                  <strong>Read-only</strong> (Metadata read is added automatically).
                </li>
                <li>
                  Generate it — this token starts with <code>github_pat_</code>.
                </li>
              </ol>
              <p style={{ marginBottom: 0 }}>
                <strong>Repo owner / name format:</strong> for{" "}
                <code>github.com/octocat/Hello-World</code>, the owner is <code>octocat</code> and the name
                is <code>Hello-World</code> — no slashes, no <code>.git</code>, and don't paste the full URL
                into either field.
              </p>
            </div>
          </details>

          <form onSubmit={handleConnect}>
            <div className="field-group">
              <label className="field-label">Personal Access Token</label>
              <input
                className="marker-input"
                type="password"
                required
                placeholder="ghp_... or github_pat_..."
                value={form.patToken}
                onChange={(e) => setForm({ ...form, patToken: e.target.value })}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Repo owner</label>
              <input
                className="marker-input"
                required
                placeholder="e.g. octocat"
                value={form.repoOwner}
                onChange={(e) => setForm({ ...form, repoOwner: e.target.value })}
              />
            </div>
            <div className="field-group">
              <label className="field-label">Repo name</label>
              <input
                className="marker-input"
                required
                placeholder="e.g. Hello-World"
                value={form.repoName}
                onChange={(e) => setForm({ ...form, repoName: e.target.value })}
              />
            </div>
            {error && (
              <div className="field-group">
                <span className="error-note">{error}</span>
              </div>
            )}
            <button className="marker-btn primary" type="submit" disabled={connecting}>
              {connecting ? "Connecting..." : "Connect"}
            </button>
          </form>
        </div>
      )}

      {status.connected && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <p style={{ margin: 0 }}>
              Connected to <strong>{status.integration.repo_owner}/{status.integration.repo_name}</strong>. Issues
              refresh automatically every 15 minutes via a serverless timer function.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="marker-btn small" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? "Refreshing..." : "Refresh now"}
              </button>
              <button className="marker-btn small ghost" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>
          </div>

          {refreshError && (
            <div className="field-group">
              <span className="error-note">{refreshError}</span>
            </div>
          )}

          {issues.length === 0 ? (
            <div className="empty-state">No issues found in this repo yet.</div>
          ) : (
            <div className="issue-list">
              {issues.map((issue) => (
                <div className="issue-row" key={issue.id}>
                  <a href={issue.url} target="_blank" rel="noreferrer">
                    #{issue.issue_number} {issue.title}
                  </a>
                  <span className={`state-pill ${issue.state}`}>{issue.state}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
