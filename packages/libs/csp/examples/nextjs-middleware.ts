/**
 * Example Next.js middleware using @descope/csp
 *
 * File: middleware.ts (in your Next.js app root)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createDescopeCSP, generateNonce } from '@descope/csp';

export function middleware(request: NextRequest) {
  const nonce = generateNonce();

  const csp = createDescopeCSP({
    urls: {
      api: process.env.DESCOPE_API_URL || 'api.descope.com',
      cdn: process.env.DESCOPE_CDN_URL || 'descopecdn.com',
      static: process.env.DESCOPE_STATIC_URL || 'static.descope.com',
      images: process.env.DESCOPE_IMAGES_URL || 'imgs.descope.com',
    },
    nonce,
    extend: {
      'connect-src': [
        process.env.NEXT_PUBLIC_API_URL || 'https://api.myapp.com',
      ],
    },
  });

  const response = NextResponse.next();

  response.headers.set('Content-Security-Policy', csp.toString());

  response.headers.set('x-nonce', nonce);

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
