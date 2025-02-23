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

const server = serve({
  port: PORT,
  routes: {
    "/models/:model": {
      POST: modelRoute,
    },
  },
  async fetch(req) {
    // Serve index.html for client-side routing
    const indexResponse = serveStatic("index.html");
    if (indexResponse) {
      return indexResponse;
    }

    return new Response("Not Found", { status: 404 });
  },
});
