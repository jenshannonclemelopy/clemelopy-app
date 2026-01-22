/**
 * Google Analytics Data API Helper Functions
 * 
 * Tracks referral traffic from AI/Generative Engine platforms:
 * ChatGPT, Claude, Perplexity, Gemini, Grok, Copilot, etc.
 */

// AI Referrer domains to track
export const AI_REFERRERS = [
  'chat.openai.com',
  'chatgpt.com',
  'openai.com',
  'perplexity.ai',
  'claude.ai',
  'anthropic.com',
  'gemini.google.com',
  'grok.x.ai',
  'x.com',
  'grok.com',
  'copilot.microsoft.com',
  'bing.com',
  'you.com',
  'poe.com',
  'phind.com',
  'pi.ai',
];

export const AI_SOURCE_NAMES: Record<string, string> = {
  'chat.openai.com': 'ChatGPT',
  'chatgpt.com': 'ChatGPT',
  'openai.com': 'ChatGPT',
  'perplexity.ai': 'Perplexity',
  'claude.ai': 'Claude',
  'anthropic.com': 'Claude',
  'gemini.google.com': 'Gemini',
  'grok.x.ai': 'Grok',
  'x.com': 'Grok',
  'grok.com': 'Grok',
  'copilot.microsoft.com': 'Copilot',
  'bing.com': 'Copilot',
  'you.com': 'You.com',
  'poe.com': 'Poe',
  'phind.com': 'Phind',
  'pi.ai': 'Pi',
};

export const AI_SOURCE_COLORS: Record<string, string> = {
  'ChatGPT': '#10A37F',
  'Perplexity': '#20B2AA',
  'Claude': '#D4A574',
  'Gemini': '#4285F4',
  'Grok': '#000000',
  'Copilot': '#0078D4',
  'You.com': '#6366F1',
  'Poe': '#7C3AED',
  'Phind': '#22D3EE',
  'Pi': '#EC4899',
  'Other AI': '#94A3B8',
};

export interface GA4Property {
  name: string;
  displayName: string;
  propertyType: string;
  timeZone: string;
  currencyCode: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface AIReferralData {
  totalSessions: number;
  totalUsers: number;
  totalConversions: number;
  avgEngagementRate: number;
  bySource: {
    source: string;
    displayName: string;
    sessions: number;
    users: number;
    conversions: number;
    color: string;
  }[];
  byLandingPage: {
    page: string;
    sessions: number;
    source: string;
  }[];
  trend: {
    date: string;
    sessions: number;
  }[];
  previousPeriodComparison: {
    sessionsChange: number;
    usersChange: number;
    conversionsChange: number;
  };
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error('Token exchange failed: ' + error);
  }
  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error('Token refresh failed: ' + error);
  }
  return response.json();
}

export async function listGA4Properties(accessToken: string): Promise<GA4Property[]> {
  const response = await fetch(
    'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
    { headers: { Authorization: 'Bearer ' + accessToken } }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error('Failed to list properties: ' + error);
  }
  const data = await response.json();
  const properties: GA4Property[] = [];
  for (const account of data.accountSummaries || []) {
    for (const property of account.propertySummaries || []) {
      properties.push({
        name: property.property,
        displayName: property.displayName,
        propertyType: property.propertyType || 'PROPERTY_TYPE_ORDINARY',
        timeZone: 'UTC',
        currencyCode: 'USD',
      });
    }
  }
  return properties;
}

function buildAIReferrerFilter() {
  return {
    orGroup: {
      expressions: AI_REFERRERS.map(domain => ({
        filter: {
          fieldName: 'sessionSource',
          stringFilter: {
            matchType: 'CONTAINS',
            value: domain.replace('www.', ''),
            caseSensitive: false,
          },
        },
      })),
    },
  };
}

export async function fetchAIReferralData(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<AIReferralData> {
  const propertyName = propertyId.startsWith('properties/')
    ? propertyId
    : 'properties/' + propertyId;

  const apiUrl = 'https://analyticsdata.googleapis.com/v1beta/' + propertyName + ':runReport';

  const mainReportResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionSource' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
      ],
      dimensionFilter: buildAIReferrerFilter(),
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 50,
    }),
  });

  if (!mainReportResponse.ok) {
    const error = await mainReportResponse.text();
    console.error('GA4 API Error:', error);
    throw new Error('Failed to fetch analytics data: ' + error);
  }

  const mainReport = await mainReportResponse.json();

  const landingPagesResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'landingPage' }, { name: 'sessionSource' }],
      metrics: [{ name: 'sessions' }],
      dimensionFilter: buildAIReferrerFilter(),
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    }),
  });

  const landingPagesReport = landingPagesResponse.ok 
    ? await landingPagesResponse.json() 
    : { rows: [] };

  const trendResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      dimensionFilter: buildAIReferrerFilter(),
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
    }),
  });

  const trendReport = trendResponse.ok 
    ? await trendResponse.json() 
    : { rows: [] };

  const daysDiff = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(previousStartDate.getDate() - daysDiff);
  const previousEndDate = new Date(startDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1);

  const previousPeriodResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [
        {
          startDate: previousStartDate.toISOString().split('T')[0],
          endDate: previousEndDate.toISOString().split('T')[0],
        },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
      ],
      dimensionFilter: buildAIReferrerFilter(),
    }),
  });

  const previousPeriodReport = previousPeriodResponse.ok 
    ? await previousPeriodResponse.json() 
    : { rows: [] };

  return processAnalyticsData(mainReport, landingPagesReport, trendReport, previousPeriodReport);
}

function processAnalyticsData(
  mainReport: any,
  landingPagesReport: any,
  trendReport: any,
  previousPeriodReport: any
): AIReferralData {
  let totalSessions = 0;
  let totalUsers = 0;
  const bySource: AIReferralData['bySource'] = [];

  for (const row of mainReport.rows || []) {
    const source = row.dimensionValues[0].value;
    const sessions = parseInt(row.metricValues[0].value) || 0;
    const users = parseInt(row.metricValues[1].value) || 0;

    totalSessions += sessions;
    totalUsers += users;

    const displayName = getAISourceDisplayName(source);
    const existingIndex = bySource.findIndex(s => s.displayName === displayName);
    if (existingIndex >= 0) {
      bySource[existingIndex].sessions += sessions;
      bySource[existingIndex].users += users;
    } else {
      bySource.push({
        source,
        displayName,
        sessions,
        users,
        conversions: 0,
        color: AI_SOURCE_COLORS[displayName] || AI_SOURCE_COLORS['Other AI'],
      });
    }
  }

  bySource.sort((a, b) => b.sessions - a.sessions);

  const byLandingPage: AIReferralData['byLandingPage'] = [];
  for (const row of landingPagesReport.rows || []) {
    byLandingPage.push({
      page: row.dimensionValues[0].value,
      source: getAISourceDisplayName(row.dimensionValues[1].value),
      sessions: parseInt(row.metricValues[0].value) || 0,
    });
  }

  const trend: AIReferralData['trend'] = [];
  for (const row of trendReport.rows || []) {
    const dateStr = row.dimensionValues[0].value;
    const formattedDate = dateStr.slice(0, 4) + '-' + dateStr.slice(4, 6) + '-' + dateStr.slice(6, 8);
    trend.push({
      date: formattedDate,
      sessions: parseInt(row.metricValues[0].value) || 0,
    });
  }

  let prevSessions = 0;
  let prevUsers = 0;
  if (previousPeriodReport.rows && previousPeriodReport.rows[0]) {
    const prevRow = previousPeriodReport.rows[0];
    prevSessions = parseInt(prevRow.metricValues[0].value) || 0;
    prevUsers = parseInt(prevRow.metricValues[1].value) || 0;
  }

  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return {
    totalSessions,
    totalUsers,
    totalConversions: 0,
    avgEngagementRate: 0,
    bySource,
    byLandingPage,
    trend,
    previousPeriodComparison: {
      sessionsChange: calcChange(totalSessions, prevSessions),
      usersChange: calcChange(totalUsers, prevUsers),
      conversionsChange: 0,
    },
  };
}

function getAISourceDisplayName(source: string): string {
  const lowerSource = source.toLowerCase();
  
  for (const [domain, name] of Object.entries(AI_SOURCE_NAMES)) {
    if (lowerSource.includes(domain.replace('www.', ''))) {
      return name;
    }
  }
  
  if (lowerSource.includes('openai') || lowerSource.includes('chatgpt')) return 'ChatGPT';
  if (lowerSource.includes('perplexity')) return 'Perplexity';
  if (lowerSource.includes('claude') || lowerSource.includes('anthropic')) return 'Claude';
  if (lowerSource.includes('gemini')) return 'Gemini';
  if (lowerSource.includes('grok')) return 'Grok';
  if (lowerSource.includes('copilot') || lowerSource.includes('bing')) return 'Copilot';
  
  return 'Other AI';
}

export function getDateRange(period: '7days' | '30days' | '90days' | 'custom') {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case '7days':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30days':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90days':
      startDate.setDate(endDate.getDate() - 90);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}
