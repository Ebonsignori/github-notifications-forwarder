// Determine the action that caused the notification for display purposes
import { Endpoints } from "@octokit/types";
import { REASONS } from "./get-inputs";

export default function determineAction(
  notification: Endpoints["GET /notifications"]["response"]["data"][0]
): string | [string, string] {
  if (notification.reason === REASONS.MENTION) {
    return [`Mentioned in ${notification.subject.title}`, notification.subject.url];
  }

  if (notification.reason === REASONS.SUBSCRIBED) {
    if (notification.subject.latest_comment_url) {
      return [`New comment on ${notification.subject.title}`, notification.subject.latest_comment_url];
    }
  }

  if (notification.reason === REASONS.REVIEW_REQUESTED) { 
    return [`Review requested on ${notification.subject.title}`, notification.subject.url];
  }

  return notification.subject.title
}
