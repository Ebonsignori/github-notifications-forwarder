// Determine the action that caused the notification for display purposes
import { Endpoints } from "@octokit/types";
import { REASONS } from "./get-inputs";

export default function determineAction(
  notification: Endpoints["GET /notifications"]["response"]["data"][0]
): string | [string, string] {
  if (notification.reason === REASONS.MENTION) {
    return `Mentioned in ${notification.subject.title}`;
  }

  if (notification.reason === REASONS.SUBSCRIBED) {
    if (notification.subject.latest_comment_url) {
      return `New comment on ${notification.subject.title}`;
    }
  }

  return notification.subject.title
}
