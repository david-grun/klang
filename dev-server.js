import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
let port = Number(process.env.PORT || 5173);

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
    const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const resolved = path.resolve(root, `.${requested}`);
    const relative = path.relative(root, resolved);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const file = existsSync(resolved) ? resolved : path.join(root, "index.html");
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
    console.log(`Klang web shell running at http://localhost:${port}`);
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
