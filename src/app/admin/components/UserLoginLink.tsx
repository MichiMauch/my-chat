'use client';

import { useState } from 'react';
import { Link } from 'lucide-react';

interface UserLoginLinkProps {
  user: {
    id: number;
    email: string;
    username: string;
  };
}

export default function UserLoginLink({ user }: UserLoginLinkProps) {
  const [loginLink, setLoginLink] = useState('');
  const [loading, setLoading] = useState(false);

  const generateLoginLink = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/generate-login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();
      if (response.ok) {
        setLoginLink(data.loginLink);
      } else {
        alert('Failed to generate login link');
      }
    } catch (error) {
      console.error('Failed to generate login link:', error);
      alert('Failed to generate login link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(loginLink);
    alert('Login link copied to clipboard!');
  };

  // Only show for non-netnode domains
  if (user.email?.endsWith('@netnode.ag') || user.email?.endsWith('@netnode.ch')) {
    return (
      <span className="text-xs text-green-600">
        Can use Google OAuth
      </span>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {!loginLink ? (
        <button
          onClick={generateLoginLink}
          disabled={loading}
          className="text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1"
        >
          <Link className="w-3 h-3" />
          <span>{loading ? 'Generating...' : 'Generate Login Link'}</span>
        </button>
      ) : (
        <div className="flex items-center space-x-1">
          <input
            type="text"
            value={loginLink}
            readOnly
            className="text-xs border rounded px-1 py-0.5 w-32"
          />
          <button
            onClick={copyToClipboard}
            className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}