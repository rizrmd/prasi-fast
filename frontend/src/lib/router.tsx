import { api } from "@/lib/generated/api";
import { pageModules } from "@/lib/generated/routes";
import { createContext, useContext, useEffect } from "react";
import { useAuth } from "./auth";
import { useLocal } from "../hooks/use-local";
import config from "../../config.json";

// Normalize basePath to ensure it has trailing slash only if it's not '/'
const basePath =
  config.basePath === "/"
    ? "/"
    : config.basePath.endsWith("/")
    ? config.basePath
    : config.basePath + "/";

// Utility for consistent path building
function buildPath(to: string): string {
  return to.startsWith("/")
    ? basePath === "/"
      ? to
      : `${basePath}${to.slice(1)}`
    : to;
}

type Params = Record<string, string>;
type RoutePattern = {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
};

export const ParamsContext = createContext<Params>({});

function parsePattern(pattern: string): RoutePattern {
  const paramNames: string[] = [];
  const patternParts = pattern.split("/");
  const regexParts = patternParts.map((part) => {
    // Find all parameter patterns like [id] in the part
    const matches = part.match(/\[([^\]]+)\]/g);
    if (matches) {
      let processedPart = part;
      matches.forEach((match) => {
        const paramName = match.slice(1, -1);
        paramNames.push(paramName);
        // Replace [param] with capture group, preserve surrounding text
        processedPart = processedPart.replace(match, "([^/]+)");
      });
      return processedPart;
    }
    return part;
  });

  return {
    pattern,
    regex: new RegExp(`^${regexParts.join("/")}$`),
    paramNames,
  };
}

function matchRoute(path: string, routePattern: RoutePattern): Params | null {
  const match = (path.split("#").shift() || "").match(routePattern.regex);
  if (!match) return null;

  const params: Params = {};
  routePattern.paramNames.forEach((name, index) => {
    params[name] = match[index + 1];
  });
  return params;
}

export function parseRouteParams(path: string): Params | null {
  for (let pattern in pageModules) {
    const params = matchRoute(path, parsePattern(pattern));
    if (params) {
      return params;
    }
  }
  return null;
}

const router = {
  currentPath: window.location.pathname,
  currentFullPath: window.location.pathname + window.location.hash,
  params: {} as Params,
};

export function useRoot() {
  const { user, isLoading } = useAuth();
  const local = useLocal({
    Page: null as React.ComponentType | null,
    routePath: "",
  });
  useEffect(() => {
    const handlePathChange = () => {
      router.currentPath = window.location.pathname;
      router.currentFullPath = window.location.pathname + window.location.hash;
      local.render();
    };

    window.addEventListener("popstate", handlePathChange);
    return () => window.removeEventListener("popstate", handlePathChange);
  }, []);

  useEffect(() => {
    const logRouteChange = async (path: string) => {
      api.logRoute(path, user?.id);
    };

    const loadPage = async () => {
      // Always strip basePath if it exists, since the route definitions don't include it
      const withoutBase =
        basePath !== "/" && router.currentPath.startsWith(basePath)
          ? router.currentPath.slice(basePath.length)
          : router.currentPath;
      // Ensure path starts with slash and handle trailing slashes
      const path =
        (withoutBase.startsWith("/") ? withoutBase : "/" + withoutBase).replace(
          /\/$/,
          ""
        ) || "/";

      await logRouteChange(path);

      // Try exact match first
      let pageLoader = pageModules[path];
      let matchedParams = {};

      // If no exact match, try parameterized routes
      if (!pageLoader) {
        for (const [pattern, loader] of Object.entries(pageModules)) {
          const routePattern = parsePattern(pattern);
          const params = matchRoute(path, routePattern);
          if (params) {
            pageLoader = loader;
            matchedParams = params;
            break;
          }
        }
      }

      if (pageLoader) {
        try {
          const module = await pageLoader();
          local.routePath = path;
          local.Page = module.default;
          router.params = matchedParams;
          local.render();
        } catch (err) {
          console.error("Failed to load page:", err);
          local.Page = null;
          local.routePath;
          router.params = {};
          local.render();
        }
      } else {
        // Load 404 page
        try {
          const module = await pageModules["/404"]();
          local.routePath = path;
          local.Page = module.default;
          router.params = {};
          local.render();
        } catch {
          local.Page = null;
          local.routePath = "";
          router.params = {};
          local.render();
        }
      }
    };

    loadPage();
  }, [router.currentPath]);

  const navigate = (to: string) => {
    const fullPath = buildPath(to);
    window.history.pushState({}, "", fullPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return {
    Page: local.Page ? local.Page : null,
    currentPath: router.currentPath,
    params: router.params,
    isLoading,
  };
}

export function useRouter() {
  console.log(router.currentFullPath);
  return router;
}

export function useParams<T extends Record<string, string>>(): T {
  return useContext(ParamsContext) as T;
}

export function Link({
  to,
  children,
  ...props
}: {
  to: string;
  children: React.ReactNode;
  [key: string]: any;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(to);
  };

  return (
    <a href={buildPath(to)} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

export const navigate = (to: string) => {
  const fullPath = buildPath(to);
  window.history.pushState({}, "", fullPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
};
