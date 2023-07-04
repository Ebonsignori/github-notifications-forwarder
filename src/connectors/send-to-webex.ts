import * as CoreLibrary from "@actions/core";
import { Endpoints } from "@octokit/types";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import Webex from "webex";
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
  return `**[${
    // @ts-expect-error actionText is manually added and not typed on notification
    notification.actionText
  }](${
    // @ts-expect-error actionUrl is manually added and not typed on notification
    notification.actionUrl
  })** in [${notification.repository.name}](${notification.repository.html_url}) at _${notificationDate}_ `;
}

/**
 * Renders notifications for Webex and then sends them
 */
async function sendToWebex(
  core: typeof CoreLibrary,
  webex: Webex,
  inputs: {
    rollupNotifications: boolean;
    webexEmail: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
  },
  notifications: Endpoints["GET /notifications"]["response"]["data"],
  lastRunDate: Date
) {
  core.info(`Sending ${notifications.length} notifications to Webex...`);
  const sinceDate = dayjs(lastRunDate).tz(inputs.timezone).format(inputs.dateFormat);
  // On rollup, send all notifications in one message body
  if (inputs.rollupNotifications) {
    const markdown = `# GitHub Notifications\n\n${notifications.map((notification, index) => {
      return `${index + 1}. ${renderNotificationMessage(inputs, notification)}`;
    }).join("\n")}\n\n_Since ${sinceDate}_`;

    try {
      return webex.messages.create({
        toPersonEmail: inputs.webexEmail,
        markdown,
        text: markdown,
      });
    } catch (error: any) {
      core.error(error);
      throw new Error(
        `Unable to send notification to Webex. Does your <webex-token> have access to send to ${inputs.webexEmail}?`
      );
    }
  }

  // If not rollup, send each notification individually
  for (const notification of notifications) {
    const markdown = renderNotificationMessage(inputs, notification);
    try {
      await webex.messages.create({
        toPersonEmail: inputs.webexEmail,
        markdown,
        text: markdown,
      });
      // Rate limiting, wait 2 seconds between each message
      await delay(2000);
    } catch (error: any) {
      core.error(error);
      throw new Error(
        `Unable to send notification to Webex. Does your <webex-token> have access to send to ${inputs.webexEmail}?`
      );
    }
  }
}

export default sendToWebex;
