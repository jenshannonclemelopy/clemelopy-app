/**
 * API Route: /api/analytics/data
 * 
 * Fetches AI referral analytics data for the user's connected property.
 * Supports caching to reduce API calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  fetchAIReferralData,
  refreshAccessToken,
  getDateRange,
  AIReferralData,
} from '../../../lib/google-analytics';

// Cache duration in minutes
const CACHE_DURATION_MINUTES = 15;

export async function GET(request: NextRequest) {
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

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') as '7days' | '30days' | '90days') || '30days';
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Get user's GA4 connection
    const { data: connection, error: connError } = await supabase
      .from('ga4_connections')
      .select('*')
      .eq('user_id', user.id)
      .neq('property_id', 'pending_selection')
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'No GA4 property connected', needsConnection: true },
        { status: 404 }
      );
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('analytics_cache')
        .select('*')
        .eq('user_id', user.id)
        .eq('property_id', connection.property_id)
        .eq('date_range', period)
        .single();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.fetched_at).getTime();
        const cacheMaxAge = CACHE_DURATION_MINUTES * 60 * 1000;

        if (cacheAge < cacheMaxAge) {
          return NextResponse.json({
            data: cached.data as AIReferralData,
            cached: true,
            cachedAt: cached.fetched_at,
            propertyName: connection.property_name,
          });
        }
      }
    }

    // Check if token is expired and refresh if needed
    let accessToken = connection.access_token;
    if (new Date(connection.token_expires_at) < new Date()) {
      try {
        const newTokens = await refreshAccessToken(connection.refresh_token);
        accessToken = newTokens.access_token;

        // Update stored tokens
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + newTokens.expires_in);

        await supabase
          .from('ga4_connections')
          .update({
            access_token: newTokens.access_token,
            token_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json(
          { error: 'Session expired. Please reconnect Google Analytics.', needsReconnect: true },
          { status: 401 }
        );
      }
    }

    // Fetch fresh data from Google Analytics
    const { startDate, endDate } = getDateRange(period);
    const data = await fetchAIReferralData(
      accessToken,
      connection.property_id,
      startDate,
      endDate
    );

    // Update cache
    await supabase
      .from('analytics_cache')
      .upsert({
        user_id: user.id,
        property_id: connection.property_id,
        date_range: period,
        data: data as any,
        fetched_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,property_id,date_range',
      });

    return NextResponse.json({
      data,
      cached: false,
      propertyName: connection.property_name,
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
