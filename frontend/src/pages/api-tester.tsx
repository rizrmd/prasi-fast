import { Card, CardContent } from "@/components/ui/card";
import { APITester } from "@/APITester";

export default function APITesterPage() {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-muted">
      <CardContent className="pt-6">
        <h2 className="text-3xl font-bold mb-4">API Testing</h2>
        <APITester />
      </CardContent>
    </Card>
  );
}
