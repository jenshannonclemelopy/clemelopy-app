import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/billing/use-run
 * 
 * Atomically decrements the user's available runs.
 * Call this BEFORE running the strategy generation to prevent race conditions.
 * 
 * Returns:
 * - success: true if run was consumed
 * - runs_remaining: number of runs left after this one
 * - can_proceed: true if they can proceed with generation
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // Get the current user
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
    const email = user.email;

    if (!email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Get the user's license - filter by app_slug to get the correct one
    const { data: license, error: licenseError } = await supabaseAdmin
      .from('licenses')
      .select('id, plan, status, pack_remaining, stripe_subscription_id')
      .eq('email', email)
      .eq('app_slug', 'geo-linking-strategy-map')
      .single();

    if (licenseError || !license) {
      console.error('License lookup error:', licenseError);
      return NextResponse.json({
        success: false,
        can_proceed: false,
        runs_remaining: 0,
        message: 'No license found. Please contact support.',
        needs_subscription: true,
      });
    }

    // Check if they're a paid subscriber with active subscription
    const isPaidActive = 
      license.plan !== 'free' && 
      license.plan !== 'none' &&
      ['active', 'trialing'].includes(license.status) &&
      license.stripe_subscription_id;

    if (isPaidActive) {
      // Paid users can proceed - they have their allocation managed separately
      return NextResponse.json({
        success: true,
        can_proceed: true,
        runs_remaining: license.pack_remaining,
        is_subscriber: true,
        message: 'Subscriber - run authorized',
      });
    }

    // Free user - check if they have runs remaining
    const currentRuns = license.pack_remaining ?? 0;
    
    if (currentRuns <= 0) {
      return NextResponse.json({
        success: false,
        can_proceed: false,
        runs_remaining: 0,
        message: 'No runs remaining',
        needs_subscription: true,
      });
    }

    // Decrement the pack_remaining
    const newRunsRemaining = currentRuns - 1;
    
    const { error: updateError } = await supabaseAdmin
      .from('licenses')
      .update({ pack_remaining: newRunsRemaining })
      .eq('id', license.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update runs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      can_proceed: true,
      runs_remaining: newRunsRemaining,
      is_subscriber: false,
      message: 'Run consumed successfully',
    });

  } catch (error: any) {
    console.error('Use run error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to use run' },
      { status: 500 }
    );
  }
}
