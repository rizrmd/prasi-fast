import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/lib/router";

export default function HomePage() {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-muted m-3">
      <CardContent className="pt-6">
        <h1 className="text-5xl font-bold my-4 leading-tight">Bun + React</h1>
        
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Example Routes</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">User Profiles</h3>
              <div className="space-y-2">
                <p>
                  <Link to="/user/1" className="text-blue-500 hover:underline">
                    View User 1
                  </Link>
                </p>
                <p>
                  <Link to="/user/jane-doe" className="text-blue-500 hover:underline">
                    View Jane Doe's Profile
                  </Link>
                </p>
                <p>
                  <Link to="/user/john-smith" className="text-blue-500 hover:underline">
                    View John Smith's Profile
                  </Link>
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Mak Pages</h3>
              <div className="space-y-2">
                <p>
                  <Link to="/mak-123" className="text-blue-500 hover:underline">
                    View Mak 123
                  </Link>
                </p>
                <p>
                  <Link to="/mak-abc" className="text-blue-500 hover:underline">
                    View Mak ABC
                  </Link>
                </p>
                <p>
                  <Link to="/mak-test" className="text-blue-500 hover:underline">
                    View Mak Test
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
