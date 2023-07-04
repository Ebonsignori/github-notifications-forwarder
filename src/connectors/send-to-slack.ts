import * as CoreLibrary from "@actions/core";
import { Endpoints } from "@octokit/types";
import { WebClient } from "@slack/web-api";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import { delay } from "../lib/delay";

// Required for timezone
dayjs.extend(utc);
dayjs.extend(timezone);

function renderNotificationMessage(
  inputs: { timezone: string; timeFormat: string },
  notification: Endpoints["GET /notifications"]["response"]["data"][0]
) {
  const notificationDate = dayjs(notification.updated_at)
    .tz(inputs.timezone)
    .format(inputs.timeFormat);
  // @ts-expect-error notification_html_url is added and not typed on notification
  return `*<${notification.actionUrl}|${notification.actionText}>* in <${notification.repository.html_url}|${notification.repository.name}> at _${notificationDate}_`;
}

/**
 * Renders notifications for Slack and then sends them
 */
async function sendToSlack(
  core: typeof CoreLibrary,
  slack: WebClient,
  inputs: {
    rollupNotifications: boolean;
    slackDestination: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
  },
  notifications: Endpoints["GET /notifications"]["response"]["data"],
  lastRunDate: Date
) {
  const sinceDate = dayjs(lastRunDate)
    .tz(inputs.timezone)
    .format(inputs.dateFormat);
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
      {
        type: "section",
        text: {
          type: "plain_text",
          text: `Since ${sinceDate}`,
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

    const text = `GitHub Notifications since ${sinceDate}\n\n${textBody}`;

    try {
      return slack.chat.postMessage({
        blocks,
        channel: inputs.slackDestination,
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
        channel: inputs.slackDestination,
        text,
      });
      // Rate limiting, wait 2 seconds between each message
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
