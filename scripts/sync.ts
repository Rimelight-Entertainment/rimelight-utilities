import { copyFile } from "node:fs/promises";
import { join } from "node:path";

// process.cwd() refers to the root of the project RUNNING the script
const PROJECT_ROOT = process.cwd();
// This assumes the submodule is always named .rimelight-utils
const SHARED_ROOT = join(PROJECT_ROOT, ".rimelight-utilities");

const FILES_TO_SYNC = [
  ".gitignore",
  ".editorconfig",
  "bunfig.toml"
];

async function runSync() {
  console.log("🔄 Syncing shared configs...");

  for (const file of FILES_TO_SYNC) {
    try {
      await copyFile(
          join(SHARED_ROOT, file),
          join(PROJECT_ROOT, file)
      );
      console.log(`✅ ${file} synced`);
    } catch (err) {
      console.warn(`⚠️  Could not sync ${file}:`, err.message);
    }
  }
}

runSync();
