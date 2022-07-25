# GitHub Notifications Slack Forwarder

- TODO: Add repository filter
- TODO: Input section
- TODO: Release section and release logic
- TODO: Contribution section
- TODO: License section
- TODO: Finish tests

This action is intended to be run from a scheduled GitHub action. It checks all notifications since the last scheduled run and forwards them to a Slack channel or direct message.

Requires access to a Slack Bot with proper `write` permissions to the Slack channel or DM, and a user-generated legacy [personal access token](https://github.com/settings/tokens) with the `notifications` scope enabled.

Forwarded notifications can be filtered by their [reason](#filtering-inputs), [participation](#filter-participating), or [read status](#filter-include-read).

## Example Usage

Scheduled action, e.g. `.github/workflows/my-notifications.yml` that runs every 3 hours to forward the past 3 hours of notifications to channel with id "abc1234"

```yml
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

## Slack Destination

In order for a Slack bot to DM you, it needs privledges to.

In order for your bot to post to a channel, you should invite it with `/invite @botname` 

To find the channel's `destination`, you can press on the channel's name or your DMs to find the "Channel ID"

![Finding the channel ID](./docs/finding-channel-id.png)


## Inputs

All configuration for the action is set via inputs.

For true/false inputs, a "true" or "false" string is required.

For lists, a comma-separated string is required, e.g. `"apples, bananas, pears"`

### Required Inputs

#### action-schedule

#### github-token

#### slack-token

#### destination

### Filtering Inputs

[Notification reason types](https://docs.github.com/en/account-and-profile/managing-subscriptions-and-notifications-on-github/setting-up-notifications/configuring-notifications#filtering-email-notifications)

#### filter-include-reasons

#### filter-exclude-reasons

#### filter-only-participating

#### filter-only-read

### Optional Inputs

#### rollup-notifications

#### paginate-all

#### timezone
