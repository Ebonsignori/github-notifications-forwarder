import * as CoreLibrary from "@actions/core";
import CronParser from "cron-parser";
import { Octokit } from "octokit";
import { throttling } from "@octokit/plugin-throttling";
import { WebClient } from "@slack/web-api";

import getInputs from "./lib/get-inputs";
import sendToSlack from "./lib/send-to-slack";

const ExtendedOctokit = Octokit.plugin(throttling);

// Call `run()` directly if this file is the entry point
if (import.meta.url.endsWith(process.argv[1])) {
  run(CoreLibrary, ExtendedOctokit, WebClient);
}

/**
 * Entry logic for notifications forwarder
 */
async function run(
  core: typeof CoreLibrary,
  InstanceOctokit: typeof Octokit,
  InstanceSlack: typeof WebClient
): Promise<void> {
  try {
    // Initialize
    const inputs = getInputs(core);
    const octokit = new InstanceOctokit({ auth: inputs.githubToken });
    const slack = new InstanceSlack(inputs.slackToken);

    // Get the last date that the action should have run
    let lastRunDate
    try {
      const cronInterval = CronParser.parseExpression(inputs.actionSchedule, {
        currentDate: new Date().toISOString(),
        tz: inputs.timezone,
      });
      // Navigate pointer to 2 past previous intervals to account for current interval
      cronInterval.prev();
      lastRunDate = cronInterval.prev();
    } catch (error: any) {
      core.error(error);
      throw new Error(`Invalid <action-schedule>, "${inputs.actionSchedule}". Please use the same cron string you use to schedule your workflow_dispatch.`);
    }

    // Fetch notifications since last date
    core.info(`Fetching notifications since ${lastRunDate.toISOString()}`);
    let notificationsFetch;
    if (inputs.paginateAll) {
      try {
        notificationsFetch =
          await octokit.paginate("GET /notifications", {
            all: !inputs.filterOnlyUnread,
            participating: inputs.filterOnlyParticipating,
            since: lastRunDate.toISOString(),
          });
        notificationsFetch = notificationsFetch.data;
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
      } catch (error: any) {
        core.error(error);
        throw new Error(
          `Unable to fetch notifications. Are you using a properly scoped <github-token>?`
        );
      }
    }

    if (!notificationsFetch.length) {
      return core.info(
        `No new notifications since last run with given filters:\n<filter-only-unread>: ${inputs.filterOnlyUnread}\n<filter-only-participating>: ${inputs.filterOnlyParticipating}`
      );
    }

    // Filter notifications to include/exclude user defined "reason"s
    let notifications = notificationsFetch.filter((notification) =>
      inputs.filterIncludeReasons.includes(notification.reason.toLowerCase())
    );
    if (inputs.filterExcludeReasons.length) {
      notifications = notifications.filter(
        (notification) =>
          !inputs.filterExcludeReasons.includes(
            notification.reason.toLowerCase()
          )
      );
    }

    // Send Slack Message
    await sendToSlack(core, slack, inputs, notifications);

    return core.info("Notification message(s) sent!");
  } catch (error: any) {
    core.error(error);
    core.setFailed(error?.message);
  }
}

// export `run` function for testing
export default run;
