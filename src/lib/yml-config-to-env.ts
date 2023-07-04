import { readFileSync } from "fs";
import { load } from "js-yaml";
import path from "path";

const CONFIG_FILE = path.join(__filename, "..", "..", '..', 'config.yml')
const CONFIG_PRIVATE_FILE = path.join(__filename, "..", "..", '..', 'config-private.yml')

// Reads local config.yml merged with config-private.yml and add them to process.env
export const injectYmlConfigIntoEnv = (): void => {
  const config = load(readFileSync(CONFIG_FILE, "utf8"));
  const configPrivate = load(readFileSync(CONFIG_PRIVATE_FILE, "utf8"));
  const configMerged: { [key: string]: string } = { ...config, ...configPrivate };
  for (const [key, value] of Object.entries(configMerged)) {
    process.env[`INPUT_${key.replace(/ /g, "_").toUpperCase()}`] = value;
  }
};