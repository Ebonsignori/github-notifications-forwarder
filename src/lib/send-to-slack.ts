import * as CoreLibrary from "@actions/core";
import { Endpoints } from "@octokit/types";
import { WebClient } from "@slack/web-api";

/**
 * Renders notifications for Slack and then sends them
 */
async function sendToSlack(
  core: typeof CoreLibrary,
  slack: WebClient,
  inputs: { rollupNotifications: boolean; destination: string },
  notifications: Endpoints["GET /notifications"]["response"]["data"]
) {
  // On rollup, send all notifications in one message body
  if (inputs.rollupNotifications) {
    let blocks;
    let bodyText = "";

    for (const notification of notifications) {
      if (bodyText) {
        bodyText += "\n\n";
      }
      bodyText += `<${notification.url}|${notification.subject.title}>`;
    }

    blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "GitHub Notifications",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: bodyText,
        },
      },
    ];

    const text = `GitHub Notifications\n\n${bodyText}`;

    try {
      return slack.chat.postMessage({
        blocks,
        channel: inputs.destination,
        text, // Fallback if blocks aren't available
      });
    } catch (error: any) {
      core.error(error);
      return core.setFailed(
        `Unable to send notification to Slack. Is your <slack-token> properly scoped to your <destination>?`
      );
    }
  }

  // If not rollup, send each notification individually
  for (const notification of notifications) {
    const text = `<${notification.url}|${notification.subject.title}>`;
    // Not promisified for rate limitting, wait 2 seconds between each message
    try {
      await slack.chat.postMessage({
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text,
            },
          },
        ],
        channel: inputs.destination,
        text,
      });
      await delay(2000);
    } catch (error: any) {
      core.error(error);
      return core.setFailed(
        `Unable to send notification to Slack. Is your <slack-token> properly scoped to your <destination>?`
      );
    }
  }
}

export default sendToSlack;
