import { NextRequest, NextResponse } from 'next/server';

// Price IDs for different plans
const PRICE_IDS: Record<string, string> = {
  starter_monthly: 'price_1SkuFnF55HwzD2U94EbwwuHL',
  starter_yearly: 'price_1SkuGpF55HwzD2U9r6YdBxLl',
  growth_monthly: 'price_1SuHnLF55HwzD2U91ZezsJfC',
  growth_yearly: 'price_1SuHoJF55HwzD2U9pUaNC4tk',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceType, successUrl, cancelUrl } = body;

    // Validate price type
    const priceId = PRICE_IDS[priceType];
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid price type' },
        { status: 400 }
      );
    }

    // Determine plan from priceType
    const plan = priceType.startsWith('starter') ? 'starter' : 'growth';
    const interval = priceType.endsWith('yearly') ? 'yearly' : 'monthly';

    // Create Stripe checkout session directly (no auth required)
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const formData = new URLSearchParams();
    formData.set('mode', 'subscription');
    formData.set('success_url', successUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.clemelopy.com'}/checkout-success?session_id={CHECKOUT_SESSION_ID}`);
    formData.set('cancel_url', cancelUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://app.clemelopy.com');
    formData.set('line_items[0][price]', priceId);
    formData.set('line_items[0][quantity]', '1');
    
    // Store plan info in metadata for the webhook
    formData.set('subscription_data[metadata][plan]', plan);
    formData.set('subscription_data[metadata][interval]', interval);
    formData.set('subscription_data[metadata][source]', 'beta_signup');
    
    // Allow promotion codes if you have any
    formData.set('allow_promotion_codes', 'true');

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const session = await response.json();

    if (!response.ok) {
      console.error('Stripe checkout error:', session);
      throw new Error(session.error?.message || 'Failed to create checkout session');
    }

    return NextResponse.json({ 
      ok: true, 
      url: session.url,
      sessionId: session.id,
    });

  } catch (error: any) {
    console.error('Checkout API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}