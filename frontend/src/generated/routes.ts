// Create a mapping of paths to modules
export const pageModules: Record<string, () => Promise<any>> = {
  "/": () => import("@@/pages"),
  "/404": () => import("@@/pages/404"),
  "/login": () => import("@@/pages/login"),
  "/register": () => import("@@/pages/register"),
  "/user/[id]": () => import("@@/pages/user/[id]"),
  "/about": () => import("@@/pages/about"),
  "/mak-[id]": () => import("@@/pages/mak-[id]"),
  "/api-tester": () => import("@@/pages/api-tester"),
};