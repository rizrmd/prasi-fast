import React from 'react';
import { useParams } from '../../lib/router';
import { Card } from '../../components/ui/card';
import { ProtectedRoute } from '../../lib/auth';

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();

  return (
    <ProtectedRoute>
      <Card className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>
      <p>User ID: {id}</p>
      </Card>
    </ProtectedRoute>
  );
}
