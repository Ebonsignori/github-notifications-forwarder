import * as CoreLibrary from "@actions/core";
import { Endpoints } from "@octokit/types";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import Webex from "webex";

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
  return `*${notification.repository.full_name}* _${notificationDate}_\n[${
    notification.subject.title
  }](${
    // @ts-expect-error notification_html_url is added and not typed on notification
    notification.notification_html_url || notification.repository.html_url
  })`;
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
  },
  notifications: Endpoints["GET /notifications"]["response"]["data"]
) {
  // On rollup, send all notifications in one message body
  if (inputs.rollupNotifications) {
    const attachments = [
      {
        type: "AdaptiveCard",
        version: "1.3",
        body: [
          {
            type: "TextBlock",
            text: "GitHub Notifications",
            // TODO: From date to date
            wrap: true,
            size: "ExtraLarge",
            weight: "Bolder",
          },
          {
            type: "FactSet",
            facts: notifications.map((notification, index) => {
              return {
                title: `${index + 1}`,
                value: renderNotificationMessage(inputs, notification),
              };
            }),
          },
        ],
      },
    ];
    try {
      return webex.messages.create({
        toPersonEmail: inputs.webexEmail,
        attachments,
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
    const text = renderNotificationMessage(inputs, notification);
    // Not promisified for rate limiting, wait 2 seconds between each message
    try {
      await webex.messages.create({
        toPersonEmail: inputs.webexEmail,
        markdown: text,
        text,
      });
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
