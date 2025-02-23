import { serve } from "bun";
import { statSync } from "fs";
import { join } from "path";
import { modelRoute } from "system/model/model-route";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
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

serve({
  port: PORT,
  routes: {
    "/_system/models/:model": {
      POST: async (req) => {
        return modelRoute(req);
      },
    },
  },
  async fetch(req) {
    const url = new URL(req.url);

    // Serve static files directly
    const staticResponse = serveStatic(url.pathname.slice(1));
    if (staticResponse) {
      return staticResponse;
    }

    // If it's an API route that wasn't handled by the routes above, return 404 JSON
    if (url.pathname.startsWith("/_system/")) {
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // For all other routes, serve index.html for client-side routing
    const indexResponse = serveStatic("index.html");
    if (indexResponse) {
      return indexResponse;
    }

    return new Response(JSON.stringify({ error: "Server Error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
});
