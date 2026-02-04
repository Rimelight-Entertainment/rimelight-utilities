import { copyFile } from "node:fs/promises";
import { join } from "node:path";

const PROJECT_ROOT = process.cwd();
const SHARED_ROOT = join(PROJECT_ROOT, ".rimelight-utilities");

/**
 * Define sync mappings: { "source_in_utils": ["dest_in_root_1", "dest_in_root_2"] }
 */
const SYNC_CONFIG: Record<string, string[]> = {
  ".gitignore": [".gitignore"],
  ".editorconfig": [".editorconfig"],
  "bunfig.toml": ["bunfig.toml"],
  "AGENTS.md": ["CLAUDE.md", "CURSOR.md", ".cursorrules"],
};

async function runSync() {
  console.log("🔄 Synchronizing shared workspace configurations...");

  const entries = Object.entries(SYNC_CONFIG);

  for (const [sourceName, destinations] of entries) {
    const sourcePath = join(SHARED_ROOT, sourceName);

    for (const destName of destinations) {
      const destPath = join(PROJECT_ROOT, destName);

      try {
        await copyFile(sourcePath, destPath);
        console.log(`✅ ${sourceName} -> ${destName}`);
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        console.warn(`⚠️  Failed to sync ${destName}: ${error.message}`);
      }
    }
  }

  console.log("✨ Sync complete.");
}

runSync();
