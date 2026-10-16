import { createServer } from "./server.js";

const PORT = Number(process.env.PORT) || 3000;
// Loopback by default: the server is unauthenticated and meant for local development.
const HOST = process.env.HOST || "127.0.0.1";

const server = await createServer();
try {
  console.log(`Market-data server listening on ${await server.listen({ port: PORT, host: HOST })}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
