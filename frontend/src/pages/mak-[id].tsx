import { Card } from '../components/ui/card';
import { ProtectedRoute } from '../lib/auth';
import { useParams } from '../lib/router';

export default function MakPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <ProtectedRoute>
      <Card className="p-6">
      <h1 className="text-2xl font-bold mb-4">Mak Page</h1>
      <p>Mak ID: {id}</p>
      </Card>
    </ProtectedRoute>
  );
}
