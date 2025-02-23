import "./index.css";
import { useRouter, Link } from "./lib/router";

export function App() {
  const { Page } = useRouter();

  return (
    <div className="container mx-auto p-8 text-center relative z-10">
      <nav className="mb-8">
        <Link to="/" className="mx-2 text-blue-500 hover:text-blue-700">Home</Link>
        <Link to="/api-tester" className="mx-2 text-blue-500 hover:text-blue-700">API Tester</Link>
        <Link to="/about" className="mx-2 text-blue-500 hover:text-blue-700">About</Link>
      </nav>
      <main>
        {Page ? <Page /> : <div>Page not found</div>}
      </main>
    </div>
  );
}

export default App;
