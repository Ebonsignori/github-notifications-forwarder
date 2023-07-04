# Connectors

Connectors are supported messaging systems that GitHub notifications can be forwarded to.

Currently the following are supported:

1. [Webex](./send-to-webex.ts)
2. [Slack](./send-to-slack.ts)

## Adding Connectors

To add a connector:
1. Add the appropriate auth and destination inputs needed in 
   - [get-inputs](../lib/get-inputs.ts)
   - [action.yml](../../action.yml)
   - [config-private-example.yml](../../action.yml)

2. Write the connector using the patterns established in existing connectors in this directory.

3. Add the library needed to connect / mock the connector during testing to `executeRun` in [index.ts](../index.ts)

3. Call the connector after the lines that other connectors are called on in [index.ts](../index.ts)
