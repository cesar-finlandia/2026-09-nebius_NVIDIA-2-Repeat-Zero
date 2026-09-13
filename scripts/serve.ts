import { createServer } from "node:http";
import { handler } from "../src/repeatzero/server/routes.js";

const port: number = Number(process.env["PORT"] ?? "3000");

const server = createServer((req, res) => {
  const host: string = req.headers.host ?? `localhost:${port}`;
  const url: string = `http://${host}${req.url ?? "/"}`;
  const chunks: Buffer[] = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", () => {
    const body: Uint8Array = Buffer.concat(chunks);
    const request = new Request(url, {
      method: req.method ?? "GET",
      headers: req.headers as Record<string, string>,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : (body as BodyInit),
    });
    handler(request)
      .then(async (response) => {
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
        const text: string = await response.text();
        res.end(text);
      })
      .catch(() => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "internal" }));
      });
  });
});

server.listen(port, () => {
  console.log(`listening on :${port}`);
});
