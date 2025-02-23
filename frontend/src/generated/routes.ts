// Create a mapping of paths to modules
export const pageModules: Record<string, () => Promise<any>> = {
  "/": () => import("@/pages"),
  "/404": () => import("@/pages/404"),
  "/auth/login": () => import("@/pages/auth/login"),
  "/auth/register": () => import("@/pages/auth/register"),
  "/user/[id]": () => import("@/pages/user/[id]"),
  "/about": () => import("@/pages/about"),
  "/mak-[id]": () => import("@/pages/mak-[id]"),
};