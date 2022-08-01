import * as CoreLibrary from "@actions/core";
import { Endpoints } from "@octokit/types";
import { WebClient } from "@slack/web-api";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

// Required for timezone
dayjs.extend(utc);
dayjs.extend(timezone);

function renderNotificationMessage(
  inputs: { timezone: string; dateFormat: string },
  notification: Endpoints["GET /notifications"]["response"]["data"][0]
) {
  const notificationDate = dayjs(notification.updated_at)
    .tz(inputs.timezone)
    .format(inputs.dateFormat);
  return `*${notification.repository.full_name}* _${notificationDate}_\n<${notification.url}|${notification.subject.title}>`;
}

/**
 * Renders notifications for Slack and then sends them
 */
async function sendToSlack(
  core: typeof CoreLibrary,
  slack: WebClient,
  inputs: {
    rollupNotifications: boolean;
    destination: string;
    timezone: string;
    dateFormat: string;
  },
  notifications: Endpoints["GET /notifications"]["response"]["data"]
) {
  // On rollup, send all notifications in one message body
  if (inputs.rollupNotifications) {
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "GitHub Notifications",
        },
      },
    ];
    let textBody = "";

    for (const notification of notifications) {
      if (textBody) {
        textBody += "\n\n";
      }
      textBody += renderNotificationMessage(inputs, notification);
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: renderNotificationMessage(inputs, notification),
        },
      });
    }

    const text = `GitHub Notifications\n\n${textBody}`;

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
    const text = renderNotificationMessage(inputs, notification);
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
