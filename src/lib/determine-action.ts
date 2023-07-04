// Determine the action that caused the notification for display purposes
import { Endpoints } from "@octokit/types";
import { REASONS } from "./get-inputs";

// Text can't include .(non-whitespace) in Webex or it is interpreted as a link
function clean(text: string): string {
  return text.replaceAll(/(\.)([\S]|^\.)/gm, "\/.\/$2")
}

export default function determineAction(
  notification: Endpoints["GET /notifications"]["response"]["data"][0]
): string | [string, string] {
  if (notification.reason === REASONS.MENTION) {
    return `Mentioned in ${clean(notification.subject.title)}`
  }

  if (notification.reason === REASONS.SUBSCRIBED) {
    if (notification.subject.latest_comment_url) {
      return `New comment on ${clean(notification.subject.title)}`
    }
  }

  if (notification.reason === REASONS.REVIEW_REQUESTED) { 
    return `Review requested on ${clean(notification.subject.title)}`
  }

  return notification.subject.title
}
