import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL, configProblems } from '@/lib/supabase/env';

/** Protects /dashboard. API routes authenticate themselves (HMAC, verify token, CRON_SECRET). */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Misconfigured settings must never take the whole site down; the login page explains the problem.
  if (configProblems().length > 0) {
    return request.nextUrl.pathname.startsWith('/dashboard')
      ? NextResponse.redirect(new URL('/login', request.url))
      : response;
  }

  try {
    return await guard(request, response);
  } catch (err) {
    console.error('[middleware] auth check failed', err);
    return request.nextUrl.pathname.startsWith('/dashboard')
      ? NextResponse.redirect(new URL('/login?error=auth_unavailable', request.url))
      : response;
  }
}

async function guard(request: NextRequest, initial: NextResponse): Promise<NextResponse> {
  let response = initial;

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  if (user && pathname === '/login' && !request.nextUrl.searchParams.has('error')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
