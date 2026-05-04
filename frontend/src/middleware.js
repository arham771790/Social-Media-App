import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Use a cookie for auth token (industry standard for middleware)
  const token = request.cookies.get('token')?.value;

  // Paths that require authentication
  const protectedPaths = ['/feed', '/messages', '/notifications', '/profile', '/settings', '/u', '/users'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  // Auth paths (login, register, etc.) - redirect to /feed if already logged in
  const authPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isAuthPath = authPaths.some(path => pathname.startsWith(path));

  // 1. If trying to access a protected path without a token, redirect to /login
  if (isProtectedPath && !token) {
    const url = new URL('/login', request.url);
    // Optional: save the intended destination to redirect back after login
    // url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // 2. If trying to access an auth path (login/register) WITH a token, redirect to /feed
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }

  // 3. Special case for root path /
  if (pathname === '/' && token) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
