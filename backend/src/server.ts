import { BunRequest, serve } from "bun";
import { statSync } from "fs";
import { join } from "path";
import { modelRoute } from "system/model/model-route";
import * as api from "./generated/api";
import config from "../../config.json";
import { parseServerUrl } from "../../shared/types/config";

const { port: PORT, host: HOST } = process.env.PORT
  ? { port: parseInt(process.env.PORT), host: "localhost" }
  : parseServerUrl(config.backend.url);
const STATIC_DIR =
  process.env.NODE_ENV === "production"
    ? "../frontend/dist"
    : "../frontend/src";

function serveStatic(path: string) {
  try {
    const fullPath = join(import.meta.dir, STATIC_DIR, path);
    const stat = statSync(fullPath);

    if (stat.isFile()) {
      return new Response(Bun.file(fullPath));
    }
    return null;
  } catch {
    return null;
  }
}

const routes = {} as Record<string, any>;
for (const [_, value] of Object.entries(api)) {
  routes[value.path] = async (req: BunRequest) => {
    if (req.method === "POST") {
      const args = (await req.json()) as unknown[];
      const body = await value.handler.call(
        { req },
        ...(args as Parameters<typeof value.handler>)
      );

      const res = value.raw ? (body as any) : Response.json(body);
      addCorsHeaders(res.headers);
      return res;
    }
  };
}

// CORS headers setup
function addCorsHeaders(headers: Headers) {
  headers.set("Access-Control-Allow-Origin", config.frontend.url);
  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Allow-Credentials", "true");
}

const server = serve({
  port: PORT,
  hostname: HOST,
  routes: {
    ...routes,
    "/_system/models/:model": {
      POST: async (req) => {
        const response = await modelRoute(req);
        addCorsHeaders(response.headers);
        return response;
      },
    },
  },
  async fetch(req) {
    const url = new URL(req.url);

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      const response = new Response(null, { status: 204 });
      addCorsHeaders(response.headers);
      return response;
    }

    // Serve static files directly
    const staticResponse = serveStatic(url.pathname.slice(1));
    if (staticResponse) {
      addCorsHeaders(staticResponse.headers);
      return staticResponse;
    }

    // If it's an API route that wasn't handled by the routes above, return 404 JSON
    if (url.pathname.startsWith("/_system/")) {
      const response = new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      });
      addCorsHeaders(response.headers);
      return response;
    }

    // For all other routes, serve index.html for client-side routing
    const indexResponse = serveStatic("index.html");
    if (indexResponse) {
      addCorsHeaders(indexResponse.headers);
      return indexResponse;
    }

    const errorResponse = new Response(
      JSON.stringify({ error: "Server Error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    addCorsHeaders(errorResponse.headers);
    return errorResponse;
  },
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.stop();
  process.exit(0);
});
