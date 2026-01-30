import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      );
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    // Fetch the checkout session from Stripe
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
        },
      }
    );

    const session = await response.json();

    if (!response.ok) {
      throw new Error(session.error?.message || 'Failed to fetch session');
    }

    return NextResponse.json({
      email: session.customer_details?.email || session.customer_email || null,
      status: session.status,
      paymentStatus: session.payment_status,
    });

  } catch (error: any) {
    console.error('Checkout verify error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify session' },
      { status: 500 }
    );
  }
}
