const core = require("@actions/core");
const { context } = require("@actions/github");
const axios = require("axios");

// Trigger the PagerDuty webhook with a given alert
async function sendAlert(alert) {
  try {
    const response = await axios.post(
      "https://events.pagerduty.com/v2/enqueue",
      alert
    );

    if (response.status === 202) {
      console.log(
        `Successfully sent PagerDuty alert. Response: ${JSON.stringify(
          response.data
        )}`
      );
    } else {
      core.setFailed(
        `PagerDuty API returned status code ${
          response.status
        } - ${JSON.stringify(response.data)}`
      );
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

// Run the action
try {
  const integrationKey = core.getInput("pagerduty-integration-key");

  let alert = {
    payload: {
      summary: `${context.repo.repo}: Error in "${context.workflow}"`,
      timestamp: new Date().toISOString(),
      source: "GitHub Actions",
      severity: "critical",
      custom_details: {
        run_details: `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
      },
    },
    routing_key: integrationKey,
    event_action: "trigger",
  };

  const showRelatedCommits = core.getInput("show-related-commits");
  if (showRelatedCommits) {
    const relatedCommits = context.payload.commits
      ? context.payload.commits
          .map((commit) => `${commit.message}: ${commit.url}`)
          .join(", ")
      : "No related commits";

    alert.payload.custom_details.related_commits = relatedCommits;
  }

  const dedupKey = core.getInput("pagerduty-dedup-key");
  if (dedupKey != "") {
    alert.dedup_key = dedupKey;
  }

  const stringifiedLinks = core.getInput("pagerduty-links");
  if (stringifiedLinks != "") {
    try {
      const links = JSON.parse(stringifiedLinks);
      alert.links = links;
    } catch (e) {}
  }
  sendAlert(alert);
} catch (error) {
  core.setFailed(error.message);
}
