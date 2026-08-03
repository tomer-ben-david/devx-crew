import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { installPublicSkills, PUBLIC_SKILL_NAMES } from "./skill-installer.js";

function createSkillSources(skillsSourceRoot: string): void {
  for (const skillName of PUBLIC_SKILL_NAMES) {
    const source = path.join(skillsSourceRoot, skillName);
    mkdirSync(source, { recursive: true });
    writeFileSync(path.join(source, "SKILL.md"), `# ${skillName}\n`);
  }
}

function assertSkillSourcesRemain(skillsSourceRoot: string): void {
  for (const skillName of PUBLIC_SKILL_NAMES) {
    assert.match(readFileSync(path.join(skillsSourceRoot, skillName, "SKILL.md"), "utf8"), new RegExp(skillName));
  }
}

test("rejects overlapping skill sources and destinations before mutating any skill root", () => {
  const root = mkdtempSync(path.join(tmpdir(), "devx-mux-overlap-"));
  try {
    const skillsSourceRoot = path.join(root, "skills");
    createSkillSources(skillsSourceRoot);

    const claudeHome = path.join(root, "claude-home");
    const agentsHome = path.join(root, "agents-home");
    assert.throws(
      () => installPublicSkills({
        environment: {
          CODEX_HOME: root,
          CLAUDE_HOME: claudeHome,
          AGENTS_HOME: agentsHome,
        },
        skillsSourceRoot,
      }),
      /overlaps the source tree/,
    );

    assertSkillSourcesRemain(skillsSourceRoot);
    assert.equal(existsSync(path.join(claudeHome, "skills")), false);
    assert.equal(existsSync(path.join(agentsHome, "skills")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a legacy deletion that contains the source checkout before any mutation", () => {
  const root = mkdtempSync(path.join(tmpdir(), "devx-mux-legacy-overlap-"));
  try {
    const codexHome = path.join(root, "codex-home");
    const checkout = path.join(codexHome, "skills", "devx-mux", "checkout");
    const skillsSourceRoot = path.join(checkout, "skills");
    createSkillSources(skillsSourceRoot);
    const claudeHome = path.join(root, "claude-home");
    const agentsHome = path.join(root, "agents-home");

    assert.throws(
      () => installPublicSkills({
        environment: {
          CODEX_HOME: codexHome,
          CLAUDE_HOME: claudeHome,
          AGENTS_HOME: agentsHome,
        },
        skillsSourceRoot,
      }),
      /overlaps the source tree/,
    );

    assertSkillSourcesRemain(skillsSourceRoot);
    assert.equal(existsSync(path.join(codexHome, "skills", "mux-director")), false);
    assert.equal(existsSync(path.join(claudeHome, "skills")), false);
    assert.equal(existsSync(path.join(agentsHome, "skills")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a skill root nested below another root's legacy deletion", () => {
  const root = mkdtempSync(path.join(tmpdir(), "devx-mux-nested-legacy-root-"));
  try {
    const skillsSourceRoot = path.join(root, "source", "skills");
    createSkillSources(skillsSourceRoot);
    const codexHome = path.join(root, "codex");
    const claudeHome = path.join(codexHome, "skills", "devx-mux", "checkout");

    assert.throws(
      () => installPublicSkills({
        environment: {
          CODEX_HOME: codexHome,
          CLAUDE_HOME: claudeHome,
          AGENTS_HOME: path.join(root, "agents"),
        },
        skillsSourceRoot,
      }),
      /skill roots must not be nested/,
    );

    assertSkillSourcesRemain(skillsSourceRoot);
    assert.equal(existsSync(path.join(codexHome, "skills", "mux-director")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a skill root nested below another planned canonical link", () => {
  const root = mkdtempSync(path.join(tmpdir(), "devx-mux-nested-canonical-root-"));
  try {
    const skillsSourceRoot = path.join(root, "source", "skills");
    createSkillSources(skillsSourceRoot);
    const codexHome = path.join(root, "codex");
    const claudeHome = path.join(codexHome, "skills", "mux-director", "checkout");

    assert.throws(
      () => installPublicSkills({
        environment: {
          CODEX_HOME: codexHome,
          CLAUDE_HOME: claudeHome,
          AGENTS_HOME: path.join(root, "agents"),
        },
        skillsSourceRoot,
      }),
      /skill roots must not be nested/,
    );

    assertSkillSourcesRemain(skillsSourceRoot);
    assert.equal(existsSync(path.join(codexHome, "skills", "mux-director")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("links canonical sources before deleting an obsolete source alias", () => {
  const root = mkdtempSync(path.join(tmpdir(), "devx-mux-source-alias-"));
  try {
    const checkout = path.join(root, "checkout");
    const skillsSourceRoot = path.join(checkout, "skills");
    createSkillSources(skillsSourceRoot);

    const codexHome = path.join(root, "codex");
    const obsoleteAlias = path.join(codexHome, "skills", "devx-mux");
    mkdirSync(path.dirname(obsoleteAlias), { recursive: true });
    symlinkSync(checkout, obsoleteAlias, process.platform === "win32" ? "junction" : "dir");

    installPublicSkills({
      environment: {
        CODEX_HOME: codexHome,
        CLAUDE_HOME: path.join(root, "claude"),
        AGENTS_HOME: path.join(root, "agents"),
      },
      skillsSourceRoot: path.join(obsoleteAlias, "skills"),
    });

    assert.equal(existsSync(obsoleteAlias), false);
    for (const skillName of PUBLIC_SKILL_NAMES) {
      const installedSkill = path.join(codexHome, "skills", skillName);
      assert.equal(realpathSync(installedSkill), realpathSync(path.join(skillsSourceRoot, skillName)));
      assert.match(readFileSync(path.join(installedSkill, "SKILL.md"), "utf8"), new RegExp(skillName));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─── Agent config files (global AGENTS.md / CLAUDE.md / RTK.md / rules) ────
// The installer walks agent-config/<home>/... generically and mirrors each
// file into the matching home. Tests create a fake source tree (including a
// nested subfolder) and assert every file is linked - no production file list
// is duplicated here.

/** Sample files (relative to agent-config/) used as installer input in tests. */
const SAMPLE_AGENT_CONFIG_FILES = [
  "codex/AGENTS.md",
  "codex/RTK.md",
  "claude/CLAUDE.md",
  "claude/RTK.md",
  "claude/rules/review-pipeline.md",
] as const;

function createAgentConfigSources(agentConfigSourceRoot: string): void {
  for (const sourceRelative of SAMPLE_AGENT_CONFIG_FILES) {
    const source = path.join(agentConfigSourceRoot, sourceRelative);
    mkdirSync(path.dirname(source), { recursive: true });
    writeFileSync(source, `# ${sourceRelative}\n`);
  }
}

function createEmptySkillSource(skillsSourceRoot: string): void {
  // The installer still requires skills to exist; give it a minimal valid set.
  createSkillSources(skillsSourceRoot);
}

/** Recursively collect regular files under `dir` as POSIX-relative paths. */
function listFilesRecursively(dir: string): string[] {
  const results: string[] = [];
  const walk = (current: string, relative: string): void => {
    for (const entry of readdirSync(current)) {
      const entryPath = path.join(current, entry);
      const entryRelative = relative === "" ? entry : `${relative}/${entry}`;
      if (statSync(entryPath).isDirectory()) {
        walk(entryPath, entryRelative);
      } else {
        results.push(entryRelative);
      }
    }
  };
  walk(dir, "");
  return results;
}

function assertAllAgentConfigLinked(agentConfigSourceRoot: string, codexHome: string, claudeHome: string): void {
  for (const sourceRelative of listFilesRecursively(agentConfigSourceRoot)) {
    const [homeDir, ...rest] = sourceRelative.split("/");
    const home = homeDir === "codex" ? codexHome : claudeHome;
    const destination = path.join(home, ...rest);
    const source = path.join(agentConfigSourceRoot, sourceRelative);
    assert.equal(realpathSync(destination), realpathSync(source), `${destination} should point at ${source}`);
    assert.match(readFileSync(destination, "utf8"), new RegExp(sourceRelative.replace(/\//g, "[\\/]")));
  }
}

test("symlinks every agent-config file into the matching home, mirroring structure", () => {
  const root = mkdtempSync(path.join(tmpdir(), "devx-mux-agent-config-"));
  try {
    const skillsSourceRoot = path.join(root, "skills");
    const agentConfigSourceRoot = path.join(root, "agent-config");
    createEmptySkillSource(skillsSourceRoot);
    createAgentConfigSources(agentConfigSourceRoot);

    const codexHome = path.join(root, "codex-home");
    const claudeHome = path.join(root, "claude-home");
    installPublicSkills({
      environment: { CODEX_HOME: codexHome, CLAUDE_HOME: claudeHome, AGENTS_HOME: path.join(root, "agents") },
      skillsSourceRoot,
      agentConfigSourceRoot,
    });

    assertAllAgentConfigLinked(agentConfigSourceRoot, codexHome, claudeHome);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("picks up newly added agent-config files without code changes (generic walk)", () => {
  const root = mkdtempSync(path.join(tmpdir(), "devx-mux-agent-generic-"));
  try {
    const skillsSourceRoot = path.join(root, "skills");
    const agentConfigSourceRoot = path.join(root, "agent-config");
    createEmptySkillSource(skillsSourceRoot);
    createAgentConfigSources(agentConfigSourceRoot);
    // Drop a brand-new nested file the installer must discover on its own.
    const newFile = path.join(agentConfigSourceRoot, "codex", "brand-new", "future-rule.md");
    mkdirSync(path.dirname(newFile), { recursive: true });
    writeFileSync(newFile, "# future\n");

    const codexHome = path.join(root, "codex-home");
    installPublicSkills({
      environment: { CODEX_HOME: codexHome, CLAUDE_HOME: path.join(root, "claude"), AGENTS_HOME: path.join(root, "agents") },
      skillsSourceRoot,
      agentConfigSourceRoot,
    });

    const destination = path.join(codexHome, "brand-new", "future-rule.md");
    assert.equal(realpathSync(destination), realpathSync(newFile));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("refuses to symlink an agent-config destination that overlaps the source tree", () => {
  const root = mkdtempSync(path.join(tmpdir(), "devx-mux-agent-overlap-"));
  try {
    const checkout = path.join(root, "checkout");
    const skillsSourceRoot = path.join(checkout, "skills");
    const agentConfigSourceRoot = path.join(checkout, "agent-config");
    createEmptySkillSource(skillsSourceRoot);
    createAgentConfigSources(agentConfigSourceRoot);

    // CODEX_HOME is the checkout itself, so ~/.codex/AGENTS.md resolves inside
    // the agent-config source tree.
    assert.throws(
      () => installPublicSkills({
        environment: { CODEX_HOME: checkout, CLAUDE_HOME: path.join(root, "claude"), AGENTS_HOME: path.join(root, "agents") },
        skillsSourceRoot,
        agentConfigSourceRoot,
      }),
      /overlaps the source tree/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("overwrites a real file at an agent-config destination with the symlink", () => {
  const root = mkdtempSync(path.join(tmpdir(), "devx-mux-agent-overwrite-"));
  try {
    const skillsSourceRoot = path.join(root, "skills");
    const agentConfigSourceRoot = path.join(root, "agent-config");
    createEmptySkillSource(skillsSourceRoot);
    createAgentConfigSources(agentConfigSourceRoot);

    const codexHome = path.join(root, "codex-home");
    mkdirSync(codexHome, { recursive: true });
    writeFileSync(path.join(codexHome, "AGENTS.md"), "STALE LOCAL CONTENT\n");

    installPublicSkills({
      environment: { CODEX_HOME: codexHome, CLAUDE_HOME: path.join(root, "claude"), AGENTS_HOME: path.join(root, "agents") },
      skillsSourceRoot,
      agentConfigSourceRoot,
    });

    const destination = path.join(codexHome, "AGENTS.md");
    assert.equal(realpathSync(destination), realpathSync(path.join(agentConfigSourceRoot, "codex", "AGENTS.md")));
    assert.match(readFileSync(destination, "utf8"), /codex\/AGENTS\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("re-running the installer is idempotent for agent-config files", () => {
  const root = mkdtempSync(path.join(tmpdir(), "devx-mux-agent-idempotent-"));
  try {
    const skillsSourceRoot = path.join(root, "skills");
    const agentConfigSourceRoot = path.join(root, "agent-config");
    createEmptySkillSource(skillsSourceRoot);
    createAgentConfigSources(agentConfigSourceRoot);

    const env = { CODEX_HOME: path.join(root, "codex-home"), CLAUDE_HOME: path.join(root, "claude-home"), AGENTS_HOME: path.join(root, "agents") };
    const opts = { environment: env, skillsSourceRoot, agentConfigSourceRoot };

    installPublicSkills(opts);
    installPublicSkills(opts); // second run must not throw and must leave links intact

    assertAllAgentConfigLinked(agentConfigSourceRoot, env.CODEX_HOME!, env.CLAUDE_HOME!);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
