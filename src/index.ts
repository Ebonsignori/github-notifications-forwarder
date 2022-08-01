import * as CoreLibrary from "@actions/core";
import CronParser from "cron-parser";
import { Octokit } from "octokit";
import { throttling } from "@octokit/plugin-throttling";
import { Endpoints } from "@octokit/types";
import { WebClient } from "@slack/web-api";

import getInputs from "./lib/get-inputs";
import sendToSlack from "./lib/send-to-slack";

const ExtendedOctokit = Octokit.plugin(throttling);

// Call `run()` directly if this file is the entry point
if (require.main === module) {
  const getCore = (): typeof CoreLibrary => {
    return CoreLibrary;
  };
  const getOctokit = (inputs): Octokit => {
    return new ExtendedOctokit({ auth: inputs.githubToken });
  };
  const getSlack = (inputs): WebClient => {
    return new WebClient(inputs.slackToken);
  };
  run(getCore, getOctokit, getSlack);
}

/**
 * Entry logic for notifications forwarder
 */
async function run(
  getCore: () => typeof CoreLibrary,
  getOctokit: (inputs) => Octokit,
  getSlack: (inputs) => WebClient
): Promise<void> {
  const core = getCore();

  try {
    // Initialize
    const inputs = getInputs(core);
    const octokit = getOctokit(inputs);
    const slack = getSlack(inputs);
    const currentDate = new Date().toISOString();

    // Get the last date that the action should have run
    let lastRunDate;
    try {
      const cronInterval = CronParser.parseExpression(inputs.actionSchedule, {
        currentDate,
        tz: inputs.timezone,
      });
      // Navigate pointer to 2 past previous intervals to account for current interval
      cronInterval.prev();
      lastRunDate = cronInterval.prev();
    } catch (error: any) {
      core.error(error);
      throw new Error(
        `Invalid <action-schedule>, "${inputs.actionSchedule}". Please use the same cron string you use to schedule your workflow_dispatch.`
      );
    }

    // Fetch notifications since last date
    core.info(
      `Fetching notifications between ${lastRunDate.toISOString()} and now, ${currentDate} UTC...`
    );
    let notificationsFetch;
    if (inputs.paginateAll) {
      try {
        notificationsFetch = await octokit.paginate("GET /notifications", {
          all: !inputs.filterOnlyUnread,
          participating: inputs.filterOnlyParticipating,
          since: lastRunDate.toISOString(),
        });
      } catch (error: any) {
        core.error(error);
        throw new Error(
          `Unable to fetch all notifications using "paginate-all". Are you using a properly scoped "github-token"?`
        );
      }
    } else {
      try {
        notificationsFetch =
          await octokit.rest.activity.listNotificationsForAuthenticatedUser({
            all: !inputs.filterOnlyUnread,
            participating: inputs.filterOnlyParticipating,
            since: lastRunDate.toISOString(),
            per_page: 100,
          });
        notificationsFetch = notificationsFetch.data;
      } catch (error: any) {
        core.error(error);
        throw new Error(
          `Unable to fetch notifications. Are you using a properly scoped <github-token>?`
        );
      }
    }

    if (!notificationsFetch.length) {
      return core.info(
        `No new notifications fetched since last run with given filters:\n<filter-only-unread>: ${inputs.filterOnlyUnread}\n<filter-only-participating>: ${inputs.filterOnlyParticipating}`
      );
    }
    let notifications = notificationsFetch;
    core.info(
      `${notifications.length} notifications fetched before filtering.`
    );

    // Filter notifications to include/exclude user defined "reason"s
    if (inputs.filterIncludeReasons.length) {
      notifications = notifications.filter((notification) =>
        inputs.filterIncludeReasons.includes(notification.reason.toLowerCase())
      );
    }
    if (inputs.filterExcludeReasons.length) {
      notifications = notifications.filter(
        (notification) =>
          !inputs.filterExcludeReasons.includes(
            notification.reason.toLowerCase()
          )
      );
    }

    // Filter notifications to include/exclude repositories
    if (inputs.filterIncludeRepositories.length) {
      notifications = notifications.filter((notification) =>
        inputs.filterIncludeRepositories.includes(
          notification.repository.full_name.toLowerCase()
        )
      );
    }
    if (inputs.filterExcludeRepositories.length) {
      notifications = notifications.filter(
        (notification) =>
          !inputs.filterExcludeRepositories.includes(
            notification.repository.full_name.toLowerCase()
          )
      );
    }

    if (!notifications.length) {
      return core.info(
        `No new notifications since last run after running through all filters: ${displayFilters(
          inputs
        )}`
      );
    }

    notifications = await Promise.all(notifications.map(
      async (
        notification: Endpoints["GET /notifications"]["response"]["data"][0]
      ) => {
        let notification_html_url;
        try {
          const notificationSubject = await octokit.request(
            notification.subject.url
          );
          notification_html_url = notificationSubject?.data?.html_url;
        } catch (error) {
          core.warning(
            `Unable to fetch URL fo notification\mid:${
              notification.id
            }\nsubject:${JSON.stringify(notification.subject, null, 2)}`
          );
        }
        console.log("Item:");
        console.log(notification.subject);
        console.log(notification_html_url);
        return {
          ...notification,
          notification_html_url,
        };
      }
    ));

    // Default return is DESC, we want ASC to show oldest first
    if (inputs.sortOldestFirst) {
      notifications = notifications.reverse();
    }

    // Send Slack Message
    core.info(`Forwarding ${notifications.length} notifications to Slack...`);
    await sendToSlack(core, slack, inputs, notifications);

    core.info("Notification message(s) sent!");

    // Mark notifications as read if configured to
    if (inputs.markAsRead) {
      core.info("Marking ${notifications.length} as read...");
      for (const notification of notifications) {
        await octokit.rest.activity.markThreadAsRead({
          thread_id: notification.id,
        });
      }
    }

    core.info("Action complete!");
  } catch (error: any) {
    core.error(error);
    core.setFailed(error?.message);
  }
}

function displayFilters(inputs) {
  return `
  <filter-only-unread>: ${inputs.filterOnlyUnread}
  <filter-only-participating>: ${inputs.filterOnlyParticipating}
  <filter-include-reasons>: ${inputs.filterIncludeReasons?.join(", ") || "[]"}
  <filter-exclude-reasons>: ${inputs.filterExcludeReasons?.join(", ") || "[]"}
  <filter-include-repositories>: ${
    inputs.filterIncludeRepositories?.join(", ") || "[]"
  }
  <filter-exclude-repositories>: ${
    inputs.filterExcludeRepositories?.join(", ") || "[]"
  }
  `;
}

// export `run` function for testing
export default run;
