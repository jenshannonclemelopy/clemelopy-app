/**
 * API Route: /api/analytics/callback
 * 
 * Handles the OAuth callback from Google.
 * Exchanges the authorization code for tokens and stores them.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exchangeCodeForTokens, listGA4Properties } from '../../../lib/google-analytics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/tools/analytics?error=${encodeURIComponent(error)}`, process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/tools/analytics?error=missing_params', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    // Decode state
    let stateData: { userId: string; returnUrl: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/tools/analytics?error=invalid_state', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/analytics/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Get list of properties to help user select one
    const properties = await listGA4Properties(tokens.access_token);

    // Calculate token expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

    // Store connection info in Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // If user has no properties, redirect with error
    if (properties.length === 0) {
      return NextResponse.redirect(
        new URL('/tools/analytics?error=no_properties', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    // Store temporary tokens (user will select property next)
    // We use a temporary record that will be updated when they select a property
    const { error: dbError } = await supabase
      .from('ga4_connections')
      .upsert({
        user_id: stateData.userId,
        property_id: 'pending_selection',
        property_name: null,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,property_id',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(
        new URL('/tools/analytics?error=database_error', process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    // Redirect to analytics page with success
    return NextResponse.redirect(
      new URL(`${stateData.returnUrl}?connected=true&select_property=true`, process.env.NEXT_PUBLIC_APP_URL!)
    );
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      new URL('/tools/analytics?error=callback_failed', process.env.NEXT_PUBLIC_APP_URL!)
    );
  }
}
