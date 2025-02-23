import { Card, CardContent } from "@/components/ui/card";
import { ProtectedRoute } from "@/lib/auth";

export default function AboutPage() {
  return (
    <ProtectedRoute>
      <Card className="bg-card/50 backdrop-blur-sm border-muted">
        <CardContent className="pt-6">
          <h1 className="text-3xl font-bold mb-4">About</h1>
          <p>This is a demonstration of dynamic file-based routing.</p>
          <p className="mt-2">
            You can add new pages by creating files in the pages directory,
            and they will be automatically available as routes.
          </p>
        </CardContent>
      </Card>
    </ProtectedRoute>
  );
}
