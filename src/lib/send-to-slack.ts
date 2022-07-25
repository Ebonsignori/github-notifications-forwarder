import * as CoreLibrary from "@actions/core";
import { Endpoints } from "@octokit/types";
import { WebClient } from "@slack/web-api";

function renderNotificationMessage(notification: Endpoints["GET /notifications"]["response"]["data"][0]) {
  return `<${notification.repository.html_url}|${notification.repository.full_name}>\n<${notification.url}|${notification.subject.title}>`;
}

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
      bodyText += renderNotificationMessage(notification);
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
      throw new Error(
        `Unable to send notification to Slack. Is your <slack-token> properly scoped to your <destination>?`
      );
    }
  }

  // If not rollup, send each notification individually
  for (const notification of notifications) {
    const text = renderNotificationMessage(notification);
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
      throw new Error(
        `Unable to send notification to Slack. Is your <slack-token> properly scoped to your <destination>?`
      );
    }
  }
}

export default sendToSlack;
