import { cp, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.cwd();

// SHARED_ROOT is the rimelight-utilities directory
// We check if we are running from within the utilities repo or from a project using it
const SHARED_ROOT = __dirname.includes(".rimelight-utilities") 
    ? join(PROJECT_ROOT, ".rimelight-utilities")
    : join(__dirname, "..");

/**
 * Agent-specific configuration
 */
const AGENTS = [
    { name: "Gemini", folder: ".gemini", file: "GEMINI.md" },
    { name: "Antigravity", folder: ".antigravity", file: "ANTIGRAVITY.md" },
    { name: "Claude", folder: ".claude", file: "CLAUDE.md" },
    { name: "Cursor", folder: ".cursor", file: "CURSOR.md", extra: ".cursorrules" }
];

/**
 * Files to sync directly to project root
 */
const DIRECT_SYNC = [
    "bunfig.toml",
    ".gitignore",
    ".editorconfig",
    ".husky",
    "commitlint.config.ts",
    "oxlint.config.ts",
    ".oxlint",
    ".oxfmtrc.jsonc"
];

async function runSync() {
    console.log("🔄 Synchronizing shared workspace configurations...");
    
    // Determine if we are running inside rimelight-utilities repo
    const isSelfSync = SHARED_ROOT === PROJECT_ROOT;
    
    if (isSelfSync) {
        console.log("ℹ️  Running inside rimelight-utilities. Skipping generation for target projects.");
    } else {
        console.log(`📂 Source: ${SHARED_ROOT}`);
        console.log(`📂 Destination: ${PROJECT_ROOT}`);
    }

    // 1. Direct File/Folder Sync
    for (const item of DIRECT_SYNC) {
        const sourcePath = join(SHARED_ROOT, item);
        const destPath = join(PROJECT_ROOT, item);
        
        // Skip syncing to self
        if (sourcePath === destPath) continue;

        try {
            await cp(sourcePath, destPath, { recursive: true, force: true });
            console.log(`✅ ${item} synced`);
        } catch (err) {
            console.warn(`⚠️  Skipped ${item}: Not found in source`);
        }
    }

    // 2. AGENTS.md Processing & Agent Folder Sync
    const agentsMdPath = join(SHARED_ROOT, "AGENTS.md");
    let agentsMdContent = "";
    try {
        agentsMdContent = await readFile(agentsMdPath, "utf-8");
    } catch (err) {
        console.error("💥 Critical error: AGENTS.md not found!");
        process.exit(1);
    }

    // Skip variant generation if we are in the utilities repo itself
    if (SHARED_ROOT === PROJECT_ROOT) {
        console.log("ℹ️  Running inside rimelight-utilities. Skipping agent variant generation.");
        console.log("✨ Sync complete.");
        return;
    }

    for (const agent of AGENTS) {
        const agentRoot = join(PROJECT_ROOT, agent.folder);
        
        // Ensure agent directory exists
        await mkdir(agentRoot, { recursive: true });

        // Sync shared rules/workflows/skills to agent folder
        const sharedFolders = ["rules", "workflows", "skills"];
        for (const folder of sharedFolders) {
            const sourceFolder = join(SHARED_ROOT, ".agent", folder);
            const destFolder = join(agentRoot, folder);
            try {
                await cp(sourceFolder, destFolder, { recursive: true, force: true });
                // console.log(`✅ ${agent.folder}/${folder} synced`);
            } catch (err) {
                // Folder might not exist in .agent, that's okay
            }
        }

        // Generate agent-specific instruction file
        // Replace ./.agent with ./.folder (e.g. ./.gemini)
        const agentInstructions = agentsMdContent.replace(/\.\/\.agent/g, `./${agent.folder}`);
        
        // Write to root (for Gemini/Claude/Cursor convenience)
        await writeFile(join(PROJECT_ROOT, agent.file), agentInstructions);
        
        // Also write into the agent folder
        await writeFile(join(agentRoot, agent.file), agentInstructions);

        if (agent.extra) {
            await writeFile(join(PROJECT_ROOT, agent.extra), agentInstructions);
        }

        console.log(`✅ ${agent.name} instructions generated`);
    }

    console.log("✨ Sync complete.");
}

runSync().catch((err) => {
    console.error("💥 Critical sync error:", err);
    process.exit(1);
});
