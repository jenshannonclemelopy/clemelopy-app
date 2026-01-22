import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function stripeGET(path: string) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${stripeKey}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'Stripe API error');
  }

  return data;
}

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

    // Get user's Stripe customer ID from licenses table
    const licenseResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/licenses?email=eq.${encodeURIComponent(user.email)}&select=stripe_customer_id`,
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
    
    if (!Array.isArray(licenses) || licenses.length === 0 || !licenses[0].stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 404 }
      );
    }

    const customerId = licenses[0].stripe_customer_id;

    // Fetch invoices from Stripe
    const invoicesData = await stripeGET(
      `invoices?customer=${encodeURIComponent(customerId)}&limit=50`
    );

    // Format invoices for frontend
    const invoices = (invoicesData.data || []).map((invoice: any) => ({
      id: invoice.id,
      number: invoice.number || 'N/A',
      amount_paid: invoice.amount_paid,
      currency: invoice.currency || 'usd',
      created: invoice.created,
      due_date: invoice.due_date,
      paid: invoice.paid,
      invoice_pdf: invoice.invoice_pdf || invoice.pdf,
      status: invoice.status,
    }));

    return NextResponse.json(invoices);

  } catch (error: any) {
    console.error('Invoices endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}