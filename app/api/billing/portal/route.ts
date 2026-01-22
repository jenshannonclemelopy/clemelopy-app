import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
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

    // Get the current user from Supabase auth
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
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    // Get user's license from Supabase
    const licenseResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/licenses?email=eq.${encodeURIComponent(user.email)}&select=id,stripe_customer_id`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!licenseResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch license' },
        { status: 500 }
      );
    }

    const licenses = await licenseResponse.json();
    let customerId = licenses?.[0]?.stripe_customer_id || null;
    const licenseId = licenses?.[0]?.id || null;

    // If no customer ID in DB, try to find by email in Stripe
    if (!customerId) {
      const customersResponse = await fetch(
        `https://api.stripe.com/v1/customers?limit=1&email=${encodeURIComponent(user.email)}`,
        {
          headers: {
            Authorization: `Bearer ${stripeKey}`,
          },
        }
      );

      const customersData = await customersResponse.json();
      customerId = customersData.data?.[0]?.id;
    }

    // If still no customer, create one
    if (!customerId) {
      const body = new URLSearchParams();
      body.set('email', user.email);
      if (user.user_metadata?.first_name || user.user_metadata?.last_name) {
        const name = `${user.user_metadata.first_name || ''} ${user.user_metadata.last_name || ''}`.trim();
        if (name) body.set('name', name);
      }

      const createResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createData.error?.message || 'Failed to create Stripe customer');
      }

      customerId = createData.id;

      // Save to Supabase if we have a license record
      if (licenseId) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/licenses?id=eq.${licenseId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ stripe_customer_id: customerId }),
          }
        );
      }
    }

    // Create portal session
    const portalBody = new URLSearchParams();
    portalBody.set('customer', customerId);
    portalBody.set('return_url', `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings`);

    const portalResponse = await fetch(
      'https://api.stripe.com/v1/billing_portal/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: portalBody,
      }
    );

    const portalData = await portalResponse.json();

    if (!portalResponse.ok) {
      throw new Error(portalData.error?.message || 'Failed to create portal session');
    }

    return NextResponse.json({
      url: portalData.url,
    });

  } catch (error: any) {
    console.error('Portal endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}