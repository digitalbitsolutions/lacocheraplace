import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env");
} catch {}

process.argv[2] = "./build/server/index.js";

import("./node_modules/@remix-run/serve/dist/cli.js").catch((error) => {
  console.error(error);
  process.exit(1);
});
