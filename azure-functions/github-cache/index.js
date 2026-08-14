const fetch = require("node-fetch");

/**
 * Timer-trigger function, runs every 15 minutes ("0 *\/15 * * * *").
 * Calls integrations-service's internal endpoint, which loops over every user with a
 * connected GitHub account and refreshes their cached issues/PRs. This means the
 * dashboard never has to call the GitHub API live on page load -- it just reads
 * whatever this function last cached, which keeps the dashboard fast and avoids
 * hitting GitHub's rate limits on every visit.
 */
module.exports = async function (context, myTimer) {
  const baseUrl = process.env.INTEGRATIONS_SERVICE_URL || "http://integrations-service:4001";
  const secret = process.env.INTERNAL_SYNC_SECRET;

  context.log(`[github-cache] tick at ${new Date().toISOString()}, syncing via ${baseUrl}`);

  try {
    const response = await fetch(`${baseUrl}/internal/sync-all-github`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": secret },
    });
    const body = await response.json();
    context.log(`[github-cache] synced ${body.syncedUsers ?? 0} user(s)`);
  } catch (err) {
    context.log.error(`[github-cache] sync failed: ${err.message}`);
  }
};
