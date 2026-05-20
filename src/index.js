import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.env.PORT ?? 3000;
const SRC = fileURLToPath(new URL(".", import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const PAGES = {
  "/": "html/intro.html",
  "/intro": "html/intro.html",
  "/home": "html/home.html",
};

async function sendFile(res, relativePath) {
  const filePath = join(SRC, relativePath);
  const ext = extname(filePath);
  const body = await readFile(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
  res.end(body);
}

async function streamVideo(req, res, relativePath) {
  const { createReadStream } = await import("node:fs");
  const filePath = join(SRC, relativePath);
  const fileStat = await stat(filePath);
  const fileSize = fileStat.size;
  const range = req.headers.range;

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    let start = 0;
    let end = fileSize - 1;

    if (match?.[1] !== "" && match?.[2] !== "") {
      start = parseInt(match[1], 10);
      end = parseInt(match[2], 10);
    } else if (match?.[1] === "" && match?.[2]) {
      const suffix = parseInt(match[2], 10);
      start = Math.max(0, fileSize - suffix);
      end = fileSize - 1;
    } else if (match?.[1]) {
      start = parseInt(match[1], 10);
      end = fileSize - 1;
    }

    end = Math.min(end, fileSize - 1);

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
      res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
      res.end();
      return;
    }

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": "video/mp4",
      "Cache-Control": "public, max-age=31536000",
    });
    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  if (req.method === "HEAD") {
    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Content-Length": fileSize,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000",
    });
    res.end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": "video/mp4",
    "Content-Length": fileSize,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000",
  });
  createReadStream(filePath).pipe(res);
}

async function handleRequest(req, res) {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const { pathname } = url;

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end();
    return;
  }

  const page = PAGES[pathname];
  if (page) {
    await sendFile(res, page);
    return;
  }

  if (pathname.startsWith("/css/") || pathname.startsWith("/js/")) {
    await sendFile(res, pathname.slice(1));
    return;
  }

  if (pathname.startsWith("/assets/")) {
    if (pathname.endsWith(".mp4")) {
      await streamVideo(req, res, pathname.slice(1));
      return;
    }
    await sendFile(res, pathname.slice(1));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not Found");
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch(() => {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    }
    res.end("Internal Server Error");
  });
});

server.listen(PORT, () => {
  console.log(`WAB listening on http://localhost:${PORT}`);
});
