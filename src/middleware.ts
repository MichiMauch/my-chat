import { withAuth } from 'next-auth/middleware';

export default withAuth(
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect admin routes
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return token?.role === 'admin';
        }
        
        // Protect chat routes - require any authenticated user
        if (req.nextUrl.pathname.startsWith('/chat')) {
          return !!token;
        }
        
        return true;
      },
    },
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },
  }
);

export const config = {
  matcher: [
    '/chat/:path*',
    '/api/admin/:path*'
  ]
};