import { executeRun } from ".";
import { getCoreOverride } from "./lib/local-core-override";
import { injectYmlConfigIntoEnv } from "./lib/yml-config-to-env";


async function main() {
  injectYmlConfigIntoEnv();
  return executeRun(getCoreOverride);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    console.log("Exiting...")
    process.exit(1);
  });
}