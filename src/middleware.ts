import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Webhooks should bypass authentication
  if (req.nextUrl.pathname.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }

  const basicAuth = req.headers.get('authorization');
  
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    const validUser = process.env.ADMIN_USERNAME || 'admin';
    const validPass = process.env.ADMIN_PASSWORD || 'metrics2026';

    if (user === validUser && pwd === validPass) {
      return NextResponse.next();
    }
  }

  const url = req.nextUrl;
  url.pathname = '/api/auth';

  return new NextResponse('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure CRM Dashboard"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
