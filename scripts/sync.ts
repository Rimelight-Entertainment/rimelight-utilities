import { cp } from "node:fs/promises";
import { join } from "node:path";

const PROJECT_ROOT = process.cwd();
const SHARED_ROOT = join(PROJECT_ROOT, ".rimelight-utilities");

/**
 * Define sync mappings.
 * Works for both files and directories.
 */
const SYNC_CONFIG: Record<string, string[]> = {
  "bunfig.toml": ["bunfig.toml"],
  ".gitignore": [".gitignore"],
  ".editorconfig": [".editorconfig"],
  ".antigravity": [".antigravity"],
  ".gemini": [".gemini"],
  "AGENTS.md": ["GEMINI.md", "CLAUDE.md", "CURSOR.md", ".cursorrules"],
  ".husky": [".husky"],
  "commitlint.config.ts": ["commitlint.config.ts"],
  "oxlint-shared-config.ts": ["oxlint-shared-config.ts"],
  ".antigravity/rules": [".antigravity/rules"],
  ".antigravity/workflows": [".antigravity/workflows"],
  ".antigravity/skills": [".antigravity/skills"],
  ".gemini/rules": [".gemini/rules"],
  ".gemini/workflows": [".gemini/workflows"],
  ".gemini/skills": [".gemini/skills"],
};

async function runSync() {
  console.log("🔄 Synchronizing shared workspace configurations...");

  for (const [sourceName, destinations] of Object.entries(SYNC_CONFIG)) {
    const sourcePath = join(SHARED_ROOT, sourceName);

    for (const destName of destinations) {
      const destPath = join(PROJECT_ROOT, destName);

      try {
        // 'cp' with recursive: true handles both files and folders
        await cp(sourcePath, destPath, {
          recursive: true,
          force: true
        });
        console.log(`✅ ${sourceName} -> ${destName}`);
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        console.warn(`⚠️  Failed to sync ${destName}: ${error.message}`);
      }
    }
  }

  console.log("✨ Sync complete.");
}

runSync().catch((err) => {
  console.error("💥 Critical sync error:", err);
  process.exit(1);
});
