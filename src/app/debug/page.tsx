'use client';

import { useSession } from 'next-auth/react';

export default function DebugPage() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Session Info</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Session Status: {status}</h2>
          
          <div className="space-y-4">
            <div>
              <strong>Email:</strong> {session?.user?.email || 'Not found'}
            </div>
            <div>
              <strong>Name:</strong> {session?.user?.name || 'Not found'}
            </div>
            <div>
              <strong>ID:</strong> {(session?.user as { id?: string })?.id || 'Not found'}
            </div>
            <div>
              <strong>Role:</strong> {(session?.user as { role?: string })?.role || 'Not found'}
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Full Session Object:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}