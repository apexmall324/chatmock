"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname);
const port = Number(process.env.PORT) || 8000;
const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon"
};

function sendText(res, statusCode, message) {
    res.writeHead(statusCode, {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff"
    });
    res.end(message);
}

function resolveFilePath(requestPath) {
    const normalizedRequestPath = requestPath.replace(/\\/g, "/");
    const relativePath = normalizedRequestPath.replace(/^\/+/, "") || "index.html";
    const filePath = path.resolve(rootDir, relativePath);
    const relativeToRoot = path.relative(rootDir, filePath);

    if (
        relativeToRoot === ".." ||
        relativeToRoot.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativeToRoot)
    ) {
        return null;
    }
    return filePath;
}

function serveFile(filePath, req, res) {
    fs.stat(filePath, (statError, stats) => {
        if (statError) {
            sendText(res, 404, "Not found");
            return;
        }

        if (stats.isDirectory()) {
            serveFile(path.join(filePath, "index.html"), req, res);
            return;
        }

        if (!stats.isFile()) {
            sendText(res, 404, "Not found");
            return;
        }

        fs.readFile(filePath, (readError, content) => {
            if (readError) {
                console.error(`Could not read ${filePath}:`, readError);
                sendText(res, 500, "Unable to read file");
                return;
            }

            const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
            res.writeHead(200, {
                "Content-Type": contentType,
                "Content-Length": content.length,
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "no-store"
            });
            res.end(req.method === "HEAD" ? undefined : content);
        });
    });
}

const server = http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
        res.setHeader("Allow", "GET, HEAD");
        sendText(res, 405, "Method not allowed");
        return;
    }

    let requestPath;
    try {
        requestPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch (error) {
        sendText(res, 400, "Invalid request path");
        return;
    }

    const filePath = resolveFilePath(requestPath);
    if (!filePath) {
        sendText(res, 404, "Not found");
        return;
    }

    serveFile(filePath, req, res);
});

server.listen(port, () => {
    console.log(`ChatMock is ready at http://127.0.0.1:${port}`);
});
