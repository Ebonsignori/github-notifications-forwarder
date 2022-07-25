import * as CoreLibrary from "@actions/core";

enum inputType {
  string = "STRING",
  boolean = "BOOLEAN",
  reasonList = "REASON_LIST",
  repositoryList = "REPOSITORY_LIST",
}

export enum inputs {
  actionSchedule = "action-schedule",
  githubToken = "github-token",
  slackToken = "slack-token",
  destination = "destination",
  filterIncludeReasons = "filter-include-reasons",
  filterExcludeReasons = "filter-exclude-reasons",
  filterIncludeRepositories = "filter-include-repositories",
  filterExcludeRepositories = "filter-exclude-repositories",
  filterOnlyParticipating = "filter-only-participating",
  filterOnlyUnread = "filter-only-unread",
  rollupNotifications = "rollup-notifications",
  markAsRead = "mark-as-read",
  paginateAll = "paginate-all",
  timezone = "timezone",
}

const reasons = [
  "assign",
  "author",
  "ci_activity",
  "comment",
  "manual",
  "mention",
  "push",
  "review_requested",
  "security_alert",
  "state_change",
  "subscribed",
  "team_mention",
  "your_activity",
];

/**
 * Parses, validates, transforms, and returns all action inputs as an object
 */
function getInputs(core: typeof CoreLibrary) {
  // Getter and validator for each individual input
  function getInput(
    name: string,
    type: inputType.boolean,
    required: boolean
  ): boolean;
  function getInput(
    name: string,
    type: inputType.reasonList | inputType.repositoryList,
    required: boolean
  ): Array<string>;
  function getInput(
    name: string,
    type: inputType.string,
    required: boolean
  ): string;
  function getInput(
    name: string,
    type: inputType,
    required: boolean
  ): boolean | Array<string> | string {
    let input;
    if (type === inputType.string) {
      input = core.getInput(name, { required });
      // Validate
      if (required && !input) {
        throw new Error(`Input <${name}> is a required string.`);
      }
    } else if (type === inputType.boolean) {
      input = core.getBooleanInput(name, { required });
      // Validate
      if (required && !input) {
        throw new Error(`Input <${name}> is a required boolean.`);
      }
    } else if (
      type === inputType.reasonList ||
      type === inputType.repositoryList
    ) {
      input = core.getInput(name, { required });
      if (input) {
        input = input.split(",").map((opt: string) => opt.trim().toLowerCase());
        // Validate
        if (required && !input) {
          throw new Error(
            `Input <${name}> is a required comma-separated list.`
          );
        }
        if (input?.length) {
          // Validate that array only contains "reason" values if reason
          if (inputType.reasonList) {
            const allPass = input.every((reason: string) => {
              if (!reasons.includes(reason.toLowerCase())) {
                core.error(
                  `"${reason}" is not a valid notification reason type. Please refer to "Filtering Inputs" in README.md.`
                );
                return false;
              }
              return true;
            });
            if (!allPass) {
              throw new Error(
                `Invalid reason in filter input. Valid reasons: [${reasons.join(
                  ", "
                )}]`
              );
            }
          } else if (inputType.repositoryList) {
            const allPass = input.every((repository: string) => {
              if (!repository.match(/([A-Za-z0-9_.-]*\/[A-Za-z0-9_.-]*)/g)) {
                core.error(
                  `"${repository}" is not a valid repository name. Must be in the form owner/repo.`
                );
                return false

              }
              return true;
            });
            if (!allPass) {
              throw new Error(
                `Invalid repository in filter input. Must be in form "owner/repo" e.g. "Ebonsignori/github-notifications-slack-forwarder"`
              );
            }
          }
        }
      }
    } else {
      throw new Error("Internal error: invalid inputType, ${type}");
    }

    return input;
  }

  // All inputs
  return {
    actionSchedule: getInput(inputs.actionSchedule, inputType.string, true),
    githubToken: getInput(inputs.githubToken, inputType.string, true),
    slackToken: getInput(inputs.slackToken, inputType.string, true),
    destination: getInput(inputs.destination, inputType.string, true),
    filterIncludeReasons: getInput(
      inputs.filterIncludeReasons,
      inputType.reasonList,
      false,
    ),
    filterExcludeReasons: getInput(
      inputs.filterExcludeReasons,
      inputType.reasonList,
      false,
    ),
    filterIncludeRepositories: getInput(
      inputs.filterIncludeRepositories,
      inputType.repositoryList,
      false
    ),
    filterExcludeRepositories: getInput(
      inputs.filterExcludeRepositories,
      inputType.repositoryList,
      false
    ),
    filterOnlyParticipating: getInput(
      inputs.filterOnlyParticipating,
      inputType.boolean,
      false
    ),
    filterOnlyUnread: getInput(
      inputs.filterOnlyUnread,
      inputType.boolean,
      false
    ),
    rollupNotifications: getInput(
      inputs.rollupNotifications,
      inputType.boolean,
      false
    ),
    markAsRead: getInput(inputs.markAsRead, inputType.boolean, false),
    paginateAll: getInput(inputs.paginateAll, inputType.boolean, false),
    timezone: getInput(inputs.timezone, inputType.string, false),
  };
}

export default getInputs;
