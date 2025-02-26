import { GlobalAlert } from "@/components/ui/global-alert";
import "@/index.css";
import { AuthProvider } from "@/lib/auth";
import { useRouter } from "@/lib/router";
import { Toaster } from "../ui/sonner";
import { AppLoading } from "./app-loading";
import { Layout } from "./layout";

function AppContent() {
  const { Page, currentPath, isLoading } = useRouter();

  if (isLoading) {
    return <AppLoading />;
  }
  if (currentPath.startsWith("/auth")) {
    return <>{Page ? <Page /> : <div>Page not found</div>}</>;
  }

  return <Layout>{Page ? <Page /> : <div>Page not found</div>}</Layout>;
}

export function App() {
  return (
    <AuthProvider>
      <GlobalAlert />
      <Toaster />
      <AppContent />
    </AuthProvider>
  );
}

export default App;
