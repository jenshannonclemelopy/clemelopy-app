import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication at all
const publicRoutes = [
  '/subscribe',           // Public pricing/paywall page
  '/login', 
  '/signup', 
  '/forgot-password', 
  '/reset-password', 
  '/auth/callback',
  '/auth/confirm',        // Email verification
  '/checkout-success',    // Post-payment success page
];

// Admin emails that bypass subscription check
const adminEmails = [
  'jen@clemelopy.com',
  'support@clemelopy.com',
  'jen@jenshannon.com',
];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value));
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // API routes for checkout don't need auth
  if (pathname.startsWith('/api/checkout')) {
    return res;
  }

  // If accessing a public route, allow through
  if (isPublicRoute) {
    // If logged in and subscribed, redirect from subscribe page to dashboard
    if (pathname === '/subscribe' && session) {
      const email = session.user.email?.toLowerCase() || '';
      
      // Admin bypass
      if (adminEmails.includes(email)) {
        return NextResponse.redirect(new URL('/', req.url));
      }

      // Check subscription in new subscriptions table
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('email', email)
        .single();

      const isSubscribed = subscription?.status === 'active';

      if (isSubscribed) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
    
    return res;
  }

  // For protected routes: require auth
  if (!session) {
    // Not logged in - redirect to subscribe page
    return NextResponse.redirect(new URL('/subscribe', req.url));
  }

  // Logged in - check subscription status
  const email = session.user.email?.toLowerCase() || '';
  
  // Admin bypass
  if (adminEmails.includes(email)) {
    return res;
  }

  // Check subscription in new subscriptions table
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('email', email)
    .single();

  const isSubscribed = subscription?.status === 'active';

  // If not subscribed, redirect to subscribe page
  if (!isSubscribed) {
    return NextResponse.redirect(new URL('/subscribe', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
