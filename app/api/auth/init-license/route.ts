import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Number of free runs to grant for new users
const FREE_RUNS_TO_GRANT = 3;

/**
 * Extract Google sub ID from Supabase user object
 * Supabase stores this in different places depending on the auth method
 */
function extractGoogleSubId(user: any): string | null {
  // Method 1: Check identities array (most reliable)
  if (user.identities && Array.isArray(user.identities)) {
    const googleIdentity = user.identities.find(
      (i: any) => i.provider === 'google'
    );
    if (googleIdentity) {
      // The 'id' field in identities is the provider's user ID (sub)
      return googleIdentity.id || googleIdentity.identity_data?.sub || null;
    }
  }
  
  // Method 2: Check app_metadata
  if (user.app_metadata?.provider === 'google') {
    return user.app_metadata.provider_id || null;
  }
  
  // Method 3: Check user_metadata (sometimes populated by OAuth)
  if (user.user_metadata?.sub && user.app_metadata?.provider === 'google') {
    return user.user_metadata.sub;
  }
  
  return null;
}

/**
 * Get client IP address from request headers
 * Handles various proxy configurations
 */
function getClientIp(request: NextRequest): string | null {
  // Try various headers in order of reliability
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs: client, proxy1, proxy2
    // The first one is the original client
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // Vercel-specific header
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }
  
  return null;
}

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

    const token = authHeader.slice(7);

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
    const email = user.email;

    if (!email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    // Extract Google sub ID using our helper function
    const googleSubId = extractGoogleSubId(user);
    
    // Log for debugging (remove in production or reduce verbosity)
    console.log('License init for:', {
      email,
      googleSubId: googleSubId ? '(present)' : '(none)',
      provider: user.app_metadata?.provider,
    });

    // Get IP address and user agent
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || null;

    // Use the atomic database function that handles everything
    const { data: initResult, error: initError } = await supabaseAdmin
      .rpc('initialize_user_license', {
        p_email: email,
        p_google_sub_id: googleSubId,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_free_runs: FREE_RUNS_TO_GRANT,
      });

    if (initError) {
      console.error('Initialize license error:', initError);
      
      // If the function doesn't exist, fall back to legacy behavior
      if (initError.message?.includes('function') && initError.message?.includes('does not exist')) {
        console.warn('initialize_user_license function not found - using legacy flow');
        return await legacyLicenseInit(email, googleSubId, ipAddress, userAgent);
      }
      
      return NextResponse.json(
        { error: 'Failed to initialize license' },
        { status: 500 }
      );
    }

    const result = initResult?.[0];
    
    if (!result) {
      return NextResponse.json(
        { error: 'Unexpected response from license initialization' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: result.status,
      license: {
        id: result.license_id,
        runs_remaining: result.runs_granted,
      },
      free_trial: {
        granted: result.runs_granted > 0,
        runs: result.runs_granted,
        message: result.message,
      },
    });

  } catch (error: any) {
    console.error('Init license error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize license' },
      { status: 500 }
    );
  }
}

/**
 * Legacy license initialization for backwards compatibility
 * Used if the new database functions aren't deployed yet
 */
async function legacyLicenseInit(
  email: string, 
  googleSubId: string | null,
  ipAddress: string | null,
  userAgent: string | null
): Promise<NextResponse> {
  // Check if license already exists
  const { data: existingLicense } = await supabaseAdmin
    .from('licenses')
    .select('id, pack_remaining, plan, status')
    .eq('email', email)
    .single();

  if (existingLicense) {
    return NextResponse.json({
      status: 'existing',
      license: {
        id: existingLicense.id,
        runs_remaining: existingLicense.pack_remaining,
      },
      free_trial: {
        granted: false,
        runs: existingLicense.pack_remaining,
        message: 'License already exists',
      },
    });
  }

  // Check free trial eligibility (if function exists)
  let runsToGrant = FREE_RUNS_TO_GRANT;
  
  try {
    const { data: eligibility } = await supabaseAdmin
      .rpc('check_free_trial_eligibility', {
        p_email: email,
        p_google_sub_id: googleSubId,
      });
    
    if (eligibility?.[0]?.is_eligible === false) {
      runsToGrant = 0;
    }
  } catch (err) {
    // Function might not exist yet, grant runs anyway
    console.warn('check_free_trial_eligibility not available');
  }

  // Try to claim trial (if function exists)
  if (runsToGrant > 0) {
    try {
      const { data: claimResult } = await supabaseAdmin
        .rpc('claim_free_trial', {
          p_email: email,
          p_google_sub_id: googleSubId,
          p_ip_address: ipAddress,
          p_user_agent: userAgent,
          p_runs_to_grant: runsToGrant,
        });
      
      if (claimResult?.[0]?.success === false) {
        runsToGrant = 0;
      }
    } catch (err) {
      // Function might not exist yet
      console.warn('claim_free_trial not available');
    }
  }

  // Create license
  const { data: newLicense, error: licenseError } = await supabaseAdmin
    .from('licenses')
    .insert({
      email,
      google_sub_id: googleSubId,
      plan: 'free',
      status: 'active',
      pack_remaining: runsToGrant,
    })
    .select('id, pack_remaining')
    .single();

  if (licenseError) {
    console.error('License creation error:', licenseError);
    return NextResponse.json(
      { error: 'Failed to create license' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: 'created',
    license: {
      id: newLicense.id,
      runs_remaining: newLicense.pack_remaining,
    },
    free_trial: {
      granted: runsToGrant > 0,
      runs: runsToGrant,
      message: runsToGrant > 0 ? 'Free trial granted' : 'Free trial not available',
    },
  });
}
