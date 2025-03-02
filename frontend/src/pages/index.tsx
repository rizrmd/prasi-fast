import { Card } from "@/components/ui/card";
import { navigate } from "@/lib/router";

export default function HomePage() {
  navigate("/model/role");
  return <Card className="bg-card/50 backdrop-blur-sm border-muted m-3"></Card>;
}
