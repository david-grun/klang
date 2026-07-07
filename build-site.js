import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of ["index.html", "about.html", "styles.css", "app.js", "sound.js"]) {
  await cp(path.join(root, file), path.join(dist, file));
}

for (const folder of ["src", "examples", "docs"]) {
  await cp(path.join(root, folder), path.join(dist, folder), { recursive: true });
}

console.log("Built static site in dist/");
