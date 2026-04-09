import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Väärä salasana' }, { status: 401 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Set-Cookie': `admin_auth=${process.env.ADMIN_PASSWORD}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
      'Content-Type': 'application/json',
    },
  });
}
