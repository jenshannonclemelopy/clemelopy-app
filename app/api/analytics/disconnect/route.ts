/**
 * API Route: /api/analytics/disconnect
 * 
 * Removes the user's GA4 connection and clears cached data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify user authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete GA4 connection
    const { error: deleteConnError } = await supabase
      .from('ga4_connections')
      .delete()
      .eq('user_id', user.id);

    if (deleteConnError) {
      console.error('Error deleting connection:', deleteConnError);
    }

    // Delete cached analytics data
    const { error: deleteCacheError } = await supabase
      .from('analytics_cache')
      .delete()
      .eq('user_id', user.id);

    if (deleteCacheError) {
      console.error('Error deleting cache:', deleteCacheError);
    }

    // Optionally: Revoke the Google token
    // This is a nice-to-have but not strictly necessary
    // The token will expire on its own

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
