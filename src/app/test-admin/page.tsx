'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function TestAdminPage() {
  const { data: session } = useSession();
  const [adminData, setAdminData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const testAdminAccess = async () => {
      try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const data = await response.json();
          setAdminData(data);
        } else {
          setError(`Failed: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        setError(`Error: ${err}`);
      }
    };

    if (session) {
      testAdminAccess();
    }
  }, [session]);

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Test Admin Access</h1>
      
      <div className="mb-4">
        <a 
          href="/admin" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Go to Admin Dashboard
        </a>
      </div>
      
      <div className="mb-4">
        <strong>Session Role:</strong> {(session?.user as { role?: string })?.role}
      </div>
      
      <div className="mb-4">
        <strong>API Test:</strong> 
        {error ? (
          <span className="text-red-500">{error}</span>
        ) : adminData ? (
          <span className="text-green-500">Success! Can access admin API</span>
        ) : (
          <span>Testing...</span>
        )}
      </div>

      {adminData && (
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(adminData, null, 2)}
        </pre>
      )}
    </div>
  );
}