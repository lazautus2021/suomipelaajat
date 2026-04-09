import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const cookie = request.cookies.get('admin_auth')?.value;
  if (cookie === process.env.ADMIN_PASSWORD) return NextResponse.next();

  if (request.nextUrl.pathname === '/admin/login') return NextResponse.next();

  const loginUrl = new URL('/admin/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: '/admin/:path*',
};
