import * as CoreLibrary from "@actions/core";
import { Endpoints } from "@octokit/types";
import { Octokit } from "octokit";

const BASE = `https://github.com`;

export default async function determineUrl(
  core: typeof CoreLibrary,
  octokit: Octokit,
  inputs,
  notification: Endpoints["GET /notifications"]["response"]["data"][0]
) {
  const urlResource = /[^/]*$/.exec(notification.subject.url)?.[0];
  if (notification.subject.type === "Discussion") {
    return `${BASE}/${
      notification.repository.full_name
    }/discussions?${encodeURI(notification.subject.title)}`;
  }
  if (notification.subject.type === "Release") {
    return `${BASE}/${
      notification.repository.full_name
    }/releases/tag/${notification.subject.title}`;
  }
  if (notification.subject.type === "Release") {
    return `${BASE}/${
      notification.repository.full_name
    }/releases/tag/${notification.subject.title}`;
  }
  if (notification.subject.type === "PullRequest" && urlResource) {
    return `${BASE}/${
      notification.repository.full_name
    }/pull/${urlResource}`
  }
  if (notification.subject.type === "Issue" && urlResource) {
    return `${BASE}/${
      notification.repository.full_name
    }/issues/${urlResource}`
  }
  if (notification.subject.type === "CheckSuite") {
    return `${BASE}/${
      notification.repository.full_name
    }/actions`
  }
  if (notification.subject.type === "CheckSuite") {
    return `${BASE}/${
      notification.repository.full_name
    }/actions`
  }

  // If no hard-coded method for fetching URL is defined, try .request to get the `html_url`
  let notificationHtmlURL;
  if (notification.subject.url) {
    core.debug(`No hard coded Url transform. Fetching URL for notification with id: ${notification.id}`)
    try {
      const notificationSubject = await octokit.request(
        notification.subject.url
      );
      notificationHtmlURL = notificationSubject?.data?.html_url;
      // If there still isn't an html_url, it lives on another key
      if (inputs.debugLogging && !notificationHtmlURL) {
        core.warning(
          `Unable to find URL from linked api url for notification\nid :${
            notification.id
          }\nsubject:${JSON.stringify(
            notification.subject,
            null,
            2
          )}\subject.url request: ${JSON.stringify(
            notificationSubject.data,
            null,
            2
          )}`
        );
      }
    } catch (error: any) {
      if (inputs.debugLogging) {
        core.warning(
          `Unable to fetch URL for notification\nid :${
            notification.id
          }\nsubject:${JSON.stringify(notification.subject, null, 2)}`
        );
        core.info(error.message);
      }
    }
  }

  return notificationHtmlURL;
}
