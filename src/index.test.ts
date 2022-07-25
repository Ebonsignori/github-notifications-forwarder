import * as CoreLibrary from "@actions/core";
import test from "ava";
import sinon from "sinon";
import { Endpoints } from "@octokit/types";

import run from "./index.js";
import { inputs } from "./lib/get-inputs.js";

const defaultEnv = {
  "action-schedule": "0 */3 * * *",
  "github-token": "<github-token>",
  "slack-token": "<slack-token>",
  destination: "<destination>",
  "filter-include-reasons":
    "assign, author, ci_activity, comment, manual, mention, push, review_requested, security_alert, state_change, subscribed, team_mention, your_activity",
  "filter-exclude-reasons": "",
  "filter-only-participating": "false",
  "filter-only-unread": "false",
  "rollup-notifications": "true",
  "mark-as-read": "false",
  "paginate-all": "false",
  timezone: "UTC",
};

function setMockEnv(envMap: { [key: string]: any }) {
  // Clear existing env
  for (const input of Object.values(inputs)) {
    process.env[input] = "";
  }

  // Override defaults
  envMap = {
    ...defaultEnv,
    ...envMap,
  };

  // Set new env
  for (const [key, value] of Object.entries(envMap)) {
    process.env[`INPUT_${key.replace(/ /g, "_").toUpperCase()}`] = value;
  }
}

function mockCore() {
  return {
    info: sinon.stub().callsFake((args) => console.log(args)),
    error: sinon.stub().callsFake((args) => {}),
    getInput: CoreLibrary.getInput,
    getBooleanInput: CoreLibrary.getBooleanInput,
    setFailed: sinon.stub().callsFake((args) => {}),
  };
}

function mockOctokit(
  notifications?: Endpoints["GET /notifications"]["response"]["data"]
) {
  return class MockOctokit {
    constructor() {
      return {
        rest: {
          activity: {
            listNotificationsForAuthenticatedUser: sinon
              .stub()
              .resolves({ data: notifications }),
          },
        },
        paginate: sinon.stub().resolves(notifications),
      };
    }
  };
}

function mockSlack() {
  return class MockSlack {
    constructor() {}
    chat() {
      return {
        postMessage: sinon.stub(),
      };
    }
  };
}

test("errors when required argument is omitted", async (t) => {
  setMockEnv({
    "github-token": "",
  });
  const core = mockCore();
  const octokit = mockOctokit();
  const slack = mockSlack();

  await run(core as any, octokit as any, slack as any);

  t.true(
    core.setFailed.calledWithMatch(
      "Input required and not supplied: github-token"
    )
  );
});

test("errors on invalid action-schedule", async (t) => {
  setMockEnv({
    "action-schedule": "a b c",
  });
  const core = mockCore();
  const octokit = mockOctokit();
  const slack = mockSlack();

  await run(core as any, octokit as any, slack as any);

  t.true(core.setFailed.calledWithMatch("Invalid <action-schedule>"));
});

test("errors when invalid filter reason is set", async (t) => {
  setMockEnv({
    "filter-include-reasons": "<all the things I want to hear>",
  });
  const core = mockCore();
  const octokit = mockOctokit();
  const slack = mockSlack();

  await run(core as any, octokit as any, slack as any);

  t.true(core.setFailed.calledWithMatch("Invalid reason in filter input."));
});

test("exits when no new notifications", async (t) => {
  setMockEnv({});
  const core = mockCore();
  const octokit = mockOctokit();
  const slack = mockSlack();

  await run(core as any, octokit as any, slack as any);

  t.true(core.setFailed.notCalled);
  t.true(core.info.calledWithMatch("No new notifications since last run"));
});

// TODO:
// test("sends slack message", async (t) => {
  // setMockEnv({});
  // const core = mockCore();
  // const octokit = mockOctokit();
  // const slack = mockSlack();

  // await run(core as any, octokit as any, slack as any);

  // t.true(core.setFailed.notCalled);
// });

// TODO:
// test("filters notifications", async (t) => {
  // setMockEnv({});
  // const core = mockCore();
  // const octokit = mockOctokit();
  // const slack = mockSlack();

  // await run(core as any, octokit as any, slack as any);

  // t.true(core.setFailed.notCalled);
// });

// TODO: Test rollup-notifications
// TODO: test timezone
