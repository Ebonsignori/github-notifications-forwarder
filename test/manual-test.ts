import { executeRun } from "../src";
import { getCoreOverride } from "../src/lib/local-core-override";
import { injectYmlConfigIntoEnv } from "../src/lib/yml-config-to-env";
import { Octokit } from "octokit";

import mentionedNotification from "./fixtures/mentioned.json";
import subscribedCommentNotification from "./fixtures/subscribed-comment.json";
import reviewRequestedNotification from "./fixtures/review-requested.json";

const notifications = [
  mentionedNotification,
  subscribedCommentNotification,
  reviewRequestedNotification,
];

const getOctokitOverride = (inputs): any => {
  const realOctokit = new Octokit({
    auth: inputs.githubToken,
  });
  return {
    request: realOctokit.request,
    rest: {
      activity: {
        markThreadAsRead: async () => {},
        listNotificationsForAuthenticatedUser: async () => {
          return {
            data: notifications,
          };
        },
      },
    },
    paginate: async () => {
      return notifications;
    },
  };
};

async function main() {
  injectYmlConfigIntoEnv();
  return executeRun(getCoreOverride, getOctokitOverride);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    console.log("Exiting...");
    process.exit(1);
  });
}
