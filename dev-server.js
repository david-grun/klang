import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

/** Fallback static server for the vanilla demo only (`npm run dev:play`).
 *  Prefer `npm run dev` (Vite) for the full hybrid site. */

const root = process.cwd();
let port = Number(process.env.PORT || 5174);

const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".klang", "text/plain; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
]);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    let requested = decodeURIComponent(url.pathname);
    if (requested === "/" || requested === "/play" || requested === "/play/") {
      requested = "/play.html";
    }

    const resolved = path.resolve(root, `.${requested}`);
    const relative = path.relative(root, resolved);

    if (relative.startsWith("..") || path.isAbsolute(relative) || relative.startsWith("landing")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const file = existsSync(resolved) ? resolved : path.join(root, "play.html");
    const ext = path.extname(file);
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types.get(ext) || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error instanceof Error ? error.message : "Not found");
  }
});

function listen() {
  server.listen(port, () => {
    console.log(`Klang play shell at http://localhost:${port}/play`);
  });
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    port += 1;
    listen();
    return;
  }
  throw error;
});

listen();
