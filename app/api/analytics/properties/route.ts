/**
 * API Route: /api/analytics/properties
 * 
 * Lists all GA4 properties the user has access to.
 * Also handles selecting/updating the active property.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { listGA4Properties, refreshAccessToken } from '../../../lib/google-analytics';

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

    // Get user's GA4 connection
    const { data: connection, error: connError } = await supabase
      .from('ga4_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: 'No GA4 connection found' }, { status: 404 });
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
          { error: 'Token expired. Please reconnect.' },
          { status: 401 }
        );
      }
    }

    // Fetch properties from Google
    const properties = await listGA4Properties(accessToken);

    return NextResponse.json({
      properties,
      selectedPropertyId: connection.property_id !== 'pending_selection' 
        ? connection.property_id 
        : null,
      selectedPropertyName: connection.property_name,
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

/**
 * POST - Select/update the active GA4 property
 */
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

    const body = await request.json();
    const { propertyId, propertyName } = body;

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
    }

    // Get existing connection to preserve tokens
    const { data: existingConn } = await supabase
      .from('ga4_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!existingConn) {
      return NextResponse.json({ error: 'No connection found' }, { status: 404 });
    }

    // Delete old pending connection if exists
    if (existingConn.property_id === 'pending_selection') {
      await supabase
        .from('ga4_connections')
        .delete()
        .eq('id', existingConn.id);
    }

    // Insert new connection with selected property
    const { error: upsertError } = await supabase
      .from('ga4_connections')
      .upsert({
        user_id: user.id,
        property_id: propertyId,
        property_name: propertyName,
        access_token: existingConn.access_token,
        refresh_token: existingConn.refresh_token,
        token_expires_at: existingConn.token_expires_at,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,property_id',
      });

    if (upsertError) {
      console.error('Error saving property selection:', upsertError);
      return NextResponse.json({ error: 'Failed to save selection' }, { status: 500 });
    }

    // Clear analytics cache for this user
    await supabase
      .from('analytics_cache')
      .delete()
      .eq('user_id', user.id);

    return NextResponse.json({ success: true, propertyId, propertyName });
  } catch (error) {
    console.error('Error selecting property:', error);
    return NextResponse.json(
      { error: 'Failed to select property' },
      { status: 500 }
    );
  }
}
