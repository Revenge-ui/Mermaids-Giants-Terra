import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = dirname(fileURLToPath(import.meta.url));
const clientDirectory = join(appDirectory, "client");
const host = process.env.CLIENT_HOST || "127.0.0.1";
const port = Number(process.env.CLIENT_PORT || 5173);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    const relative = normalize(pathname === "/" ? "index.html" : pathname.replace(/^\/+/, ""));
    let file = resolve(clientDirectory, relative);
    if (!file.startsWith(clientDirectory + sep) || !existsSync(file) || statSync(file).isDirectory()) file = join(clientDirectory, "index.html");
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": extname(file) === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Game client could not be loaded.");
  }
}).listen(port, host);
