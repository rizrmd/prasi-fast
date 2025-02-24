import { api } from "@/lib/generated/api";
import { pageModules } from "@/lib/generated/routes";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth";

type Params = Record<string, string>;
type RoutePattern = {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
};

const ParamsContext = createContext<Params>({});

function parsePattern(pattern: string): RoutePattern {
  const paramNames: string[] = [];
  const patternParts = pattern.split('/');
  const regexParts = patternParts.map(part => {
    // Find all parameter patterns like [id] in the part
    const matches = part.match(/\[([^\]]+)\]/g);
    if (matches) {
      let processedPart = part;
      matches.forEach(match => {
        const paramName = match.slice(1, -1);
        paramNames.push(paramName);
        // Replace [param] with capture group, preserve surrounding text
        processedPart = processedPart.replace(match, '([^/]+)');
      });
      return processedPart;
    }
    return part;
  });

  return {
    pattern,
    regex: new RegExp(`^${regexParts.join('/')}$`),
    paramNames
  };
}

function matchRoute(path: string, routePattern: RoutePattern): Params | null {
  const match = path.match(routePattern.regex);
  if (!match) return null;

  const params: Params = {};
  routePattern.paramNames.forEach((name, index) => {
    params[name] = match[index + 1];
  });
  return params;
}

export function useRouter() {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [Page, setPage] = useState<React.ComponentType | null>(null);
  const [params, setParams] = useState<Params>({});

  useEffect(() => {
    const handlePathChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePathChange);
    return () => window.removeEventListener('popstate', handlePathChange);
  }, []);

  useEffect(() => {
    const logRouteChange = async (path: string) => {
      api.logRoute(path, user?.id)
    };

    const loadPage = async () => {
      const path = currentPath.replace(/\/$/, '') || "/";

      // Log the route change
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
          setPage(() => module.default);
          setParams(matchedParams);
        } catch (err) {
          console.error('Failed to load page:', err);
          setPage(null);
          setParams({});
        }
      } else {
        // Load 404 page
        try {
          const module = await pageModules["/404"]();
          setPage(() => module.default);
          setParams({});
        } catch {
          setPage(null);
          setParams({});
        }
      }
    };

    loadPage();
  }, [currentPath]);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setCurrentPath(to);
  };

  return {
    Page: params ?
      (props: any) => (
        <ParamsContext.Provider value={params}>
          {Page && <Page {...props} />}
        </ParamsContext.Provider>
      ) :
      null,
    currentPath,
    navigate,
    params
  };
}

export function useParams<T extends Record<string, string>>(): T {
  return useContext(ParamsContext) as T;
}

export function Link({ to, children, ...props }: { to: string; children: React.ReactNode;[key: string]: any }) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
