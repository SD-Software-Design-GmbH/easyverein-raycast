import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/store-copy.mjs <target folder>");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const destination = path.resolve(target);
const excluded = (file) => file.endsWith(".test.ts") || file.startsWith("scripts/");

const tracked = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean)
  .filter((file) => existsSync(path.join(root, file)) && !excluded(file));

mkdirSync(destination, { recursive: true });
for (const entry of readdirSync(destination)) {
  if (entry !== "node_modules") {
    rmSync(path.join(destination, entry), { recursive: true, force: true });
  }
}
for (const file of tracked) {
  mkdirSync(path.dirname(path.join(destination, file)), { recursive: true });
  copyFileSync(path.join(root, file), path.join(destination, file));
}

const manifestPath = path.join(destination, "package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
delete manifest.devDependencies.vitest;
delete manifest.scripts.test;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

execFileSync("npm", ["install", "--package-lock-only", "--no-audit", "--no-fund"], {
  cwd: destination,
  stdio: "inherit",
});
console.log(`copied ${tracked.length} files to ${destination}`);
