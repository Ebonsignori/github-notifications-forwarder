import * as CoreLibrary from "@actions/core";
import CronParser from "cron-parser";
import { Octokit } from "octokit";
import { throttling } from "@octokit/plugin-throttling";
import { Endpoints } from "@octokit/types";
import { WebClient } from "@slack/web-api";
import Webex from "webex"

import getInputs from "./lib/get-inputs";
import sendToSlack from "./lib/send-to-slack";
import sendToWebex from "./lib/send-to-webex";
import determineUrl from "./lib/determine-url";

const ExtendedOctokit = Octokit.plugin(throttling);

// Call `run()` directly if this file is the entry point
if (require.main === module) {
  const getCore = (): typeof CoreLibrary => {
    return CoreLibrary;
  };
  const getOctokit = (inputs): Octokit => {
    return new ExtendedOctokit({ 
      auth: inputs.githubToken,
      throttle: {
        onRateLimit: (retryAfter, options, octokit, retryCount) => {
          octokit.log.warn(
            // @ts-expect-error
            `Request quota exhausted for request ${options.method} ${options.url}`
          );
    
          if (retryCount < 1) {
            // only retries once
            octokit.log.info(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
        },
        onSecondaryRateLimit: (retryAfter, options, octokit) => {
          // does not retry, only logs a warning
          octokit.log.warn(
            // @ts-expect-error
            `SecondaryRateLimit detected for request ${options.method} ${options.url}`
          );
        },
      }
     });
  };
  const getSlack = (inputs): WebClient | null => {
    if (!inputs.slackToken) {
      return null;
    }
    return new WebClient(inputs.slackToken);
  };
  const getWebex = (inputs): Webex | null => {
    if (!inputs.webexToken) {
      return null;
    }
    return Webex.init({
      level: process.env.ACTIONS_STEP_DEBUG ? "trace" : "info",
      credentials: {
        access_token: inputs.webexToken,
      },
    });
  }
  run(getCore, getOctokit, getSlack, getWebex).then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

/**
 * Entry logic for notifications forwarder
 */
async function run(
  getCore: () => typeof CoreLibrary,
  getOctokit: (inputs) => Octokit,
  getSlack: (inputs) => WebClient | null,
  getWebex: (inputs) => Webex | null
): Promise<void> {
  const core = getCore();

  try {
    // Initialize
    const inputs = getInputs(core);
    const octokit = getOctokit(inputs);
    const slack = getSlack(inputs);
    const webex = getWebex(inputs);
    const currentDate = new Date().toISOString();

    // Get the last date that the action should have run
    let lastRunDate;
    try {
      const cronInterval = CronParser.parseExpression(inputs.actionSchedule, {
        currentDate,
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

    if (inputs.debugLogging) {
      core.info("Every fetched notification: ");
      for (const notification of notifications) {
        core.info(JSON.stringify(notification, null, 2));
      }
    }

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

    // Get the `html_url` for each notification and add it as `notification_html_url`
    notifications = await Promise.all(
      notifications.map(
        async (
          notification: Endpoints["GET /notifications"]["response"]["data"][0]
        ) => {
          return {
            ...notification,
            notification_html_url: await determineUrl(
              core,
              octokit,
              inputs,
              notification
            ),
          };
        }
      )
    );

    // Default return is DESC, we want ASC to show oldest first
    if (inputs.sortOldestFirst) {
      notifications = notifications.reverse();
    }

    // Send Slack Message
    if (inputs.slackDestination) {
      core.info(`Forwarding ${notifications.length} notifications to Slack...`);
      await sendToSlack(core, slack as WebClient, inputs, notifications);
    }

    // Send Webex Message
    if (inputs.webexEmail) {
      core.info(`Forwarding ${notifications.length} notifications to Webex...`);
      await sendToWebex(core, webex as Webex, inputs, notifications);
    }

    core.info("Notification message(s) sent!");

    // Mark notifications as read if configured to
    if (inputs.markAsRead) {
      core.info(`Marking ${notifications.length} as read...`);
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
  <filter-include-reasons>: ${
    inputs.filterIncludeReasons.length
      ? inputs.filterIncludeReasons.join(", ")
      : "[]"
  }
  <filter-exclude-reasons>: ${
    inputs.filterExcludeReasons.length
      ? inputs.filterExcludeReasons.join(", ")
      : "[]"
  }
  <filter-include-repositories>: ${
    inputs.filterIncludeRepositories.length
      ? inputs.filterIncludeRepositories.join(", ")
      : "[]"
  }
  <filter-exclude-repositories>: ${
    inputs.filterExcludeRepositories.length
      ? inputs.filterExcludeRepositories.join(", ")
      : "[]"
  }
  `;
}

// export `run` function for testing
export default run;
