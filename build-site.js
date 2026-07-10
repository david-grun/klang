import { execSync } from "node:child_process";
import { cp } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const landing = path.join(root, "landing");

console.log("Installing landing dependencies…");
execSync("npm install", { cwd: landing, stdio: "inherit" });

console.log("Building React landing → dist/…");
execSync("npm run build", { cwd: landing, stdio: "inherit" });

const demoFiles = ["play.html", "styles.css", "app.js", "sound.js"];
for (const file of demoFiles) {
  await cp(path.join(root, file), path.join(dist, file));
}

for (const folder of ["src", "examples", "docs"]) {
  await cp(path.join(root, folder), path.join(dist, folder), { recursive: true });
}

console.log("Built hybrid site in dist/ (landing + /play demo)");
