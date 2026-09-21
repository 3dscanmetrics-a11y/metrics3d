import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // The inbound email endpoint authenticates with WEBHOOK_SIGNING_SECRET.
  // Receipt extraction is an interactive CRM feature and remains behind Basic Auth.
  if (req.nextUrl.pathname === '/api/webhooks/email') {
    return NextResponse.next();
  }

  const validUser = process.env.ADMIN_USERNAME;
  const validPass = process.env.ADMIN_PASSWORD;
  if (!validUser || !validPass) {
    return new NextResponse('CRM authentication is not configured', { status: 503 });
  }

  const basicAuth = req.headers.get('authorization');
  if (basicAuth?.startsWith('Basic ')) {
    try {
      const decoded = atob(basicAuth.slice(6));
      const separator = decoded.indexOf(':');
      const user = decoded.slice(0, separator);
      const pwd = decoded.slice(separator + 1);
      if (separator > 0 && constantTimeEqual(user, validUser) && constantTimeEqual(pwd, validPass)) {
        return NextResponse.next();
      }
    } catch {
      // Malformed credentials are handled as unauthorized below.
    }
  }

  return new NextResponse('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure CRM Dashboard"',
    },
  });
}

function constantTimeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const length = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return mismatch === 0;
}

export const runtime = 'experimental-edge';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
