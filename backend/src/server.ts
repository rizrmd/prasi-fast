import { serve } from "bun";
import { statSync } from "fs";
import { join } from "path";
import { modelRoute } from "system/model/model-route";
import { handleLogin, handleRegister, handleLogout, requireAuth } from "./auth";

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

async function protectedRoute(req: Request) {
  try {
    await requireAuth(req);
    return null; // Continue to next handler
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

 serve({
  port: PORT,
  routes: {
    "/auth/login": {
      POST: handleLogin,
    },
    "/auth/register": {
      POST: handleRegister,
    },
    "/auth/logout": {
      POST: handleLogout,
    },
    "/auth/session": {
      GET: async (req) => {
        try {
          const session = await requireAuth(req);
          return new Response(JSON.stringify({ user: session.user }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          return new Response(JSON.stringify({ user: null }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
    "/models/:model": {
      POST: async (req) => {
        const authResponse = await protectedRoute(req);
        if (authResponse) return authResponse;
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
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/models/')) {
      return new Response(JSON.stringify({ error: "Not Found" }), { 
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
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
        "Content-Type": "application/json"
      }
    });
  },
});
