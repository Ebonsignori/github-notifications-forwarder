# GitHub Notifications Slack Forwarder

An action intended to be run from a scheduled GitHub action that checks all notifications since the last scheduled run and forwards them to a Slack channel or direct message.

Requires:

1. Access to a [Slack Bot](https://api.slack.com/bot-users) with proper `write` [permissions](https://api.slack.com/scopes) to the [destination](#destination) Slack channel or DM.
2. A user-generated legacy [personal access token](https://github.com/settings/tokens) with the `notifications` scope enabled and any organization's SSO authorized.

Forwarded notifications can be filtered by their [reason](#reason-filtering), [repository](#repository-filtering), [participation](#filter-only-participating), or [read status](#filter-only-unread).

After a notification is forwarded, it can be [marked as read](#mark-as-read).

## TOC

- [Example Usage](#example-usage)
- [Finding The Channel ID](#finding-the-channel-id)
- [Inputs](#inputs)
  - [Required Inputs](#required-inputs)
    - [`action-schedule`](#action-schedule)
    - [`github-token`](#github-token)
    - [`slack-token`](#slack-token)
    - [`destination`](#destination)
  - [Reason Filtering](#reason-filtering)
    - [`filter-include-reasons`](#filter-include-reasons)
    - [`filter-exclude-reasons`](#filter-exclude-reasons)
  - [Repository Filtering](#repository-filtering)
    - [`filter-include-repositories`](#filter-include-repositories)
    - [`filter-exclude-repositories`](#filter-exclude-repositories)
  - [Other Filtering](#other-filtering)
    - [`filter-only-participating`](#filter-only-participating)
    - [`filter-only-unread`](#filter-only-unread)
  - [Optional Configuration](#optional-configuration)
    - [`mark-as-read`](#mark-as-read)
    - [`sort-oldest-first`](#sort-oldest-first)
    - [`timezone`](#timezone)
    - [`date-format`](#date-format)
    - [`rollup-notifications`](#rollup-notifications)
    - [`paginate-all`](#paginate-all)

## Example Usage

Below is a scheduled action, e.g. [.github/workflows/debug-action.yml](./.github/workflows/debug-action.yml) that runs every 3 hours (`0 */3 * * *`) to forward the past 3 hours of notifications to Slack channel with channel id = `"abc1234"`

```yml
name: Debug action

on:
  schedule:
    - cron: "0 */3 * * *"

jobs:
  forward-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Forward Notifications
        uses: "Ebonsignori/github-notifications-slack-forwarder"
        with:
          action-schedule: "0 */3 * * *"
          github-token: ${{ secrets.GITHUB_TOKEN }}
          slack-token: ${{ secrets.SLACK_TOKEN }}
          destination: "abc1234"
```

## Finding The Channel ID

In order for a Slack bot to DM you, it needs privileges to.

In order for your bot to post to a Slak channel, you need to invite it with `/invite @botname`.

To find the channel's [destination](#destination), you can press on the channel's name or at the top of your DMs to find the "Channel ID".

![Finding the channel ID](./docs/finding-channel-id.png)

## Inputs

All configuration for the action is set via inputs, e.g.

```yml
with:
  mark-as-read: "true"
```

Where `mark-as-read` is an _input_.

For true/false inputs, a `"true"` or `"false"` string is required.

For lists, a comma-separated string is required, e.g. `"apples, bananas, pears"`.

### Required Inputs

#### `action-schedule`

The schedule used by the workflow cron that this action is called from.

e.g. Use `"0 */3 * * *"` to check every three hours for the past 3 hours of notifications.

You can use [Crontab.guru](https://crontab.guru/) to find a schedule that works for you.

#### `github-token`

A legacy [personal access token](https://github.com/settings/tokens) with the `notifications` scope checked. Store thetoken in your repository's secrets and access it in the action as an input, e.g. `${{ secrets.GITHUB_TOKEN }}`.

If you receive notifications for a private organization, you need to authorize that organization's SSO from the tokens page. Select `Configure SSO` and authorize the desired organization(s).

#### `slack-token`

A token for a Slack App that is invited into the [destination](#destination) and has permissions to post there. Store token in your repository's secrets and access it in the action as an input, e.g. `${{ secrets.SLACK_TOKEN }}`.

#### `destination`

The ID of a slack channel or DM that you wish your notifications to go to. See [Finding The Channel ID](#finding-the-channel-id) for how to find the ID of your preferred destination.

### Reason Filtering

For `reason` filters, refer to [About notification reasons](https://docs.github.com/en/rest/activity/notifications#about-notification-reasons) for a more detailed explanation of each `reason`.

A list of accepted reasons can be found [here](https://github.com/Ebonsignori/github-notifications-slack-forwarder/blob/main/action.yml#L19).

#### `filter-include-reasons`

Limits the included notifications to the list of `reason`s included in a comma-separated string, e.g. `"assign, author, comment, mention, review_requested"`.

Defaults to all `reason`s.

#### `filter-exclude-reasons`

Omits notifications with the listed `reason`s from forwarding to slack using a comma-separated string, e.g. `"security_alert, "push"`.

Defaults to all no `reason`s.

### Repository Filtering

Filter which repositories are included/excluded by writing them in a comma-separated string in the form "owner/repo", e.g. `Ebonsignori/github-notifications-slack-forwarder`.

#### `filter-include-repositories`

Limits the forwarded notifications to the list of repositories included in a comma-separated string, e.g. `"github/github, Ebonsignori/my-sites"`.

Defaults to empty, `""` which allows all repositories to be included.

#### `filter-exclude-repositories`

Omits forwarding notifications that are in repositories included in the comma-separated string, e.g. `github/howie`.

Defaults to empty, `""` which filters out no repositories.

### Other Filtering

#### `filter-only-participating`

Set to `"true"` to only forward notifications in which the user is directly participating or mentioned in.

Defaults to `"false"`.

#### `filter-only-unread`

Set to `"false"` to include notifications marked as "read".

Defaults to `"true"`.

### Optional Configuration

#### `mark-as-read`

Set to `"true"` to mark forwarded notifications as "read".

Defaults to `"false"`.

#### `sort-oldest-first`

Sort Slack message(s) by oldest notifications first.

Defaults to `"true"`.

#### `timezone`

Timezone you're located in for displaying dates and times in Slack messages.

**Note** You can set this for display, but the timezone of the action runner should not be changed from its default "UTC".

#### `date-format`

Customize dates in Slack messages using [dayjs Date format](https://day.js.org/docs/en/display/format).

Defaults to `"M/DD h:mm A"`.

#### `rollup-notifications`

By default notifications are sent as a single Slack message.

Set to "false" to send a new Slack messages for each notification (may run into rate limiting problems depending on bot limits).

Defaults to `"true"`.

#### `paginate-all`

By default, the action checks the last 100 notifications since the last `action-schedule` was fired. Set to "true" to check all notifications at the cost of a bigger fetch.

Useful if you receive a lot of notifications and not all are being forwarded to you, for instance if you have an `action-schedule` with long gaps between runs.
