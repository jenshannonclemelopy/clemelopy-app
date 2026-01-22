import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Get auth token from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7); // Remove "Bearer "

    // First, get the current user from Supabase auth
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await userResponse.json();
    
    // DEBUG: Log the user email
    console.log('BILLING API - User email:', user.email);

    // Get user's subscription from licenses table
    // Filter by app_slug to get the correct license for this app
    const queryUrl = `${SUPABASE_URL}/rest/v1/licenses?email=eq.${encodeURIComponent(user.email)}&app_slug=eq.geo-linking-strategy-map&select=plan,status,stripe_customer_id,stripe_subscription_id,pack_remaining,monthly_reset_at`;
    
    // DEBUG: Log the query URL
    console.log('BILLING API - Query URL:', queryUrl);
    
    const licenseResponse = await fetch(queryUrl, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!licenseResponse.ok) {
      console.log('BILLING API - License response not OK:', licenseResponse.status);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    const licenses = await licenseResponse.json();
    
    // DEBUG: Log what we got back
    console.log('BILLING API - Licenses found:', JSON.stringify(licenses));
    
    // No license record found at all
    if (!Array.isArray(licenses) || licenses.length === 0) {
      console.log('BILLING API - No licenses found for', user.email);
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    const license = licenses[0];

    // Return license data for ALL users (free or paid)
    // The frontend will determine what they can do based on pack_remaining and plan
    return NextResponse.json({
      plan: license.plan || 'free',
      status: license.status || 'active',
      stripe_customer_id: license.stripe_customer_id || null,
      stripe_subscription_id: license.stripe_subscription_id || null,
      pack_remaining: license.pack_remaining ?? 0,
      monthly_reset_at: license.monthly_reset_at || null,
    });

  } catch (error: any) {
    console.error('Subscription endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}