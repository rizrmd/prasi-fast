import { Card, CardContent } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-muted">
      <CardContent className="pt-6">
        <h1 className="text-3xl font-bold mb-4">404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
      </CardContent>
    </Card>
  );
}
