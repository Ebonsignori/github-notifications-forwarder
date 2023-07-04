# GitHub Notifications Slack Forwarder

**Note:** If you only want to forward personal notifications to Slack, you can accomplish what this tool does via native [scheduled reminders](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-your-membership-in-organizations/managing-your-scheduled-reminders) in GitHub. Use this tool if you'd like to forward personal notifications to Webex or have more flexible filtering for Slack.

This tool can be run as a GitHub Action on a cron-like schedule or run locally on a cron. It forwards personal GitHub notifications to supported connector.

Currently there are only Webex and Slack connectors, though you're welcome to open a PR [to add another](./src/connectors).

Requires:

- A user-generated (classic) [personal access token](https://github.com/settings/tokens) with the `notifications` scope enabled and any organization's SSO authorized.

**For Slack**

- Access to a [Slack Bot](https://api.slack.com/bot-users) with proper `write` [permissions](https://api.slack.com/scopes) to the [slack-destination](#slack-destination) (A Slack channel or DM).

**For Webex**

- Access to a [Webex bot](https://developer.webex.com/docs/bots) or a [personal access token](https://developer.webex.com/docs/getting-your-personal-access-token) for your user.

Forwarded notifications can be filtered by their [reason](#reason-filtering), [repository](#repository-filtering), [participation](#filter-only-participating), or [read status](#filter-only-unread).

After a notification is forwarded, it can be [marked as read](#mark-as-read).

## TOC

<details>
  <summary>Expand for Table of Contents</summary>

- [Usage](#usage)
- [Finding a Slack Channel ID](#finding-the-channel-id)
- [Inputs](#inputs)
  - [Required Inputs](#required-inputs)
    - [`action-schedule`](#action-schedule)
    - [`github-token`](#github-token)
    - [`webex-token`](#webex-token)
    - [`webex-email`](#webex-email)
    - [`slack-token`](#slack-token)
    - [`slack-destination`](#slack-destination)
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
    - [`time-format`](#time-format)
    - [`rollup-notifications`](#rollup-notifications)
    - [`since-last-run`](#since-last-run)
    - [`paginate-all`](#paginate-all)
    - [`debug-logging`](#debug-logging)

</details>

## Usage

Below are examples of how you can use this tool:

<details>
  <summary>Forward to Slack via GitHub Action</summary>

### Action that forwards notifications to a Slack channel with channel id = `"abc1234"`

Runs every 3 hours (`0 */3 * * *`) to forward the past 3 hours of notifications

```yml
name: Forward Notifications to Slack

on:
  schedule:
    # Forwards notifications every 3 hours if there are new notifications
    # If you change this value to a different interval, update action-schedule found below to match it
    - cron: "0 */3 * * *"

jobs:
  forward-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Forward Notifications
        uses: "Ebonsignori/github-notifications-slack-forwarder"
        with:
          # Every 3 hours, must match on.schedule.cron
          action-schedule: "0 */3 * * *"
          # Set PERSONAL_TOKEN in your repo secrets
          github-token: ${{ secrets.PERSONAL_TOKEN }}
          # Set SLACK_TOKEN in your repo secrets
          slack-token: ${{ secrets.SLACK_TOKEN }}
          slack-destination: "abc1234"
          timezone: "PST"
```

</details>

<details>
  <summary>Forward to Webex via GitHub Action</summary>

### Action that forwards notifications to `user@gmail.com` in Webex

Runs every 3 hours (`0 */3 * * *`) to forward the past 3 hours of notifications

```yml
name: Forward Notifications to Webex

on:
  schedule:
    # Forwards notifications every 3 hours if there are new notifications
    # If you change this value to a different interval, update action-schedule found below to match it
    - cron: "0 */3 * * *"

jobs:
  forward-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Forward Notifications
        uses: "Ebonsignori/github-notifications-slack-forwarder"
        with:
          # Every 3 hours, must match on.schedule.cron
          action-schedule: "0 */3 * * *"
          # Set PERSONAL_TOKEN in your repo secrets
          github-token: ${{ secrets.PERSONAL_TOKEN }}
          # Set WEBEX in your repo secrets
          webex-token: ${{ secrets.WEBEX_TOKEN }}
          webex-email: "user@gmail.com"
          timezone: "PST"
```

</details>

<details>
  <summary>Use local CRON to forward notifications</summary>

1. Clone this repo
1. Copy `config-private.example.yml` to `config-private.yml` and fill in the necessary secrets for your configuration
1. Further configure this tools configuration in [config.yml](config.yml)
1. Make sure you have NodeJS v18+ installed locally
1. Setup a cron job on your local system with a path to the NodeJS executable, `node <your-cloned-directory-location>/dist/local/index.js`

</details>

### Using a GitHub Action

To forward your own notifications via a GitHub action, create a private repo, e.g. `ebonsignori/notifcations` and copy either of the above examples to `.github/workflows/forward-notifications.yml`.

Then set relevant secrets like `PERSONAL_TOKEN`, `WEBEX_TOKEN` and/or `SLACK_TOKEN` in your [repositories settings](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository) under the `Secrets and variables` tab.

Further customize your action and how it filters notifications using the [inputs](#inputs) found below.

## Finding A Slack Channel ID

<details>
  <summary>Click for details</summary>
  In order for a Slack bot to DM you, it needs privileges to.

In order for your bot to post to a Slack channel, you need to invite it with `/invite @botname`.

To find the channel's [slack-destination](#slack-destination), you can press on the channel's name or at the top of your DMs to find the "Channel ID".

![Finding the channel ID](./docs/finding-channel-id.png)

</details>

## Inputs

### Actions

All configuration for the action is set via inputs, e.g.

```yml
with:
  mark-as-read: "true"
```

Where `mark-as-read` is an _input_.

### Local / CRON

Configuration is set in [config.yml](config.yml) and [config-private.yml](config-private.yml) (copied from [config-private.example.yml](config-private.example.yml))

### Format

For true/false inputs, a `"true"` or `"false"` string is required.

For lists, a comma-separated string is required, e.g. `"apples, bananas, pears"`.

### Required Inputs

Only [github-token](#github-token) and [action-schedule](#action-schedule) are required for every run, the others are required if you want to forward to that respective connector (e.g. Slack).

#### `action-schedule`

The schedule used by the workflow cron that this action is called from.

e.g. Use `"0 */3 * * *"` to check every three hours for the past 3 hours of notifications.

You can use [Crontab.guru](https://crontab.guru/) to find a schedule that works for you.

#### `github-token`

A (classic) [personal access token](https://github.com/settings/tokens) with the `notifications` scope checked. Store the token in your repository's secrets and access it in the action as an input, e.g. `${{ secrets.PERSONAL_TOKEN }}`.

If you receive notifications for a private organization, you need to authorize that organization's SSO from the tokens page. Select `Configure SSO` and authorize the desired organization(s).

#### `webex-token`

A token for a Webex Bot or User that has permissions to send messages to [webex-email](#webex-email). Store token in your repository's secrets and access it in the action as an input, e.g. `${{ secrets.WEBEX_TOKEN}}`.

#### `webex-email`

The email of the Webex user that you want to receive personal Slack notifications in their DMS.

#### `slack-token`

A token for a Slack App that is invited into the [slack-destination](#slack-destination) and has permissions to post there. Store token in your repository's secrets and access it in the action as an input, e.g. `${{ secrets.SLACK_TOKEN }}`.

#### `slack-destination`

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

Defaults to `"true"`.

#### `sort-oldest-first`

Sort Slack message(s) by oldest notifications first.

Defaults to `"true"`.

#### `timezone`

Timezone you're located in for displaying dates and times in Slack messages.

**Note** You can set this for display, but the timezone of the action runner should not be changed from its default "UTC".

Defaults to `"UTC"`.

#### `date-format`

Customize dates in Slack messages using [dayjs Date format](https://day.js.org/docs/en/display/format).

Defaults to `"M/DD h:mm A"`.

#### `time-format`

Customize times in Slack messages using [dayjs Date format](https://day.js.org/docs/en/display/format).

Defaults to `"h:mm A"`.

#### `rollup-notifications`

By default notifications are sent as a single Slack message.

Set to "false" to send a new Slack messages for each notification (may run into rate limiting problems depending on bot limits).

Defaults to `"true"`.

#### `since-last-run`

Checks the last 100 notifications since the last [action-schedule](#action-schedule) was fired. Set to `"false"` to check the last 100 notifications regardless of the last [action-schedule](#action-schedule).

You disabled, recommended to have [filter-only-unread](#filter-only-unread) set to `"true"`

Defaults to `"true"`.

#### `paginate-all`

With [since-last-run](#since-last-run) enabled, the action checks the last 100 notifications since the last [action-schedule](#action-schedule) was fired. Set to `"true"` to check **all** existing notifications at the cost of a bigger fetch.

Useful if you receive a lot of notifications and not all are being forwarded to you, for instance if you have an `action-schedule` with long gaps between runs, or if you'd like to run once with [mark-as-read](#mark-as-read) set to `"true"` to mark every backlogged notification as `"true"`.

[]() it will take a long time to run and might hit the GitHub API rate limit. Use with caution.

Defaults to `"false"`.

#### `debug-logging`

Set to `true` to enable debug logging and an [artifact upload](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts) of any notifications.
