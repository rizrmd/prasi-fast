import "./index.css";
import { AuthProvider, useAuth } from "./lib/auth";
import { Link, useRouter } from "./lib/router";

function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="mb-8 flex items-center justify-between">
      <div>
        <Link to="/" className="mx-2 text-blue-500 hover:text-blue-700">Home</Link>
        <Link to="/api-tester" className="mx-2 text-blue-500 hover:text-blue-700">API Tester</Link>
        <Link to="/about" className="mx-2 text-blue-500 hover:text-blue-700">About</Link>
      </div>
      <div>
        {user ? (
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, {user.username}</span>
            <button
              onClick={() => logout()}
              className="text-red-500 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        ) : (
          <div>
            <Link to="/auth/login" className="mx-2 text-blue-500 hover:text-blue-700">Login</Link>
            <Link to="/auth/register" className="mx-2 text-blue-500 hover:text-blue-700">Register</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function AppContent() {
  const { Page } = useRouter();

  return (
    <div className="w-full h-full flex-col flex">
      <main>
        {Page ? <Page /> : <div>Page not found</div>}
      </main>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
