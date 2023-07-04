import * as CoreLibrary from "@actions/core";

// For running locally, we want to override the core library to use console.log
export function getCoreOverride(): typeof CoreLibrary {
  return {
    ...CoreLibrary,
    debug: (message: string): void => {
      if (process.env["INPUT_DEBUG-LOGGING"] === "true") {
        console.debug(message);
      }
    },
    info: (message: string): void => {
      console.log(message);
    },
    // @ts-expect-error
    warning: (message: string): void => {
      console.warn(message);
    },
    // @ts-expect-error
    error: (message: string): void => {
      console.error(message);
    },
    // @ts-expect-error
    setFailed: (message: string): void => {
      console.log("Warning: setFailed called, but not exiting process.")
      console.log("Reason:")
      console.log(message);
    }
  };
};