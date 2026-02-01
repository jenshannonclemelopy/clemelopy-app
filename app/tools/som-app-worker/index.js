/* ===========================
Clemelopy Share of Model Tracker - Cloudflare Worker
Automated AI platform querying and brand mention detection
With license integration for Growth tier
=========================== */

// ============================================
// PLATFORM CONFIGURATIONS
// ============================================

const PLATFORMS = {
  chatgpt: {
    name: 'ChatGPT',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    getHeaders: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    buildPayload: (query) => ({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Answer questions thoroughly and recommend specific tools, products, or services when relevant. Always include brand names and company names in your recommendations. List specific tools by name.'
        },
        { role: 'user', content: query }
      ],
      max_tokens: 3000,
      temperature: 0.7,
    }),
    extractResponse: (data) => data.choices?.[0]?.message?.content || '',
    extractCitations: () => [], // ChatGPT doesn't provide citations
  },

  perplexity: {
    name: 'Perplexity',
    endpoint: 'https://api.perplexity.ai/chat/completions',
    model: 'sonar',
    getHeaders: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    buildPayload: (query) => ({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'Provide detailed answers with specific tool and service recommendations. Include brand names and cite your sources.'
        },
        { role: 'user', content: query }
      ],
      max_tokens: 3000,
    }),
    extractResponse: (data) => {
      // Perplexity returns citations separately - append them to the response
      let response = data.choices?.[0]?.message?.content || '';
      const citations = data.citations || [];
      if (citations.length > 0) {
        response += '\n\n---\nSources:\n' + citations.map((c, i) => `[${i + 1}] ${c}`).join('\n');
      }
      return response;
    },
    extractCitations: (data) => data.citations || [],
  },

  claude: {
    name: 'Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    getHeaders: (apiKey) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }),
    buildPayload: (query) => ({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [
        { role: 'user', content: query + '\n\nPlease recommend specific tools and services by name where relevant.' }
      ],
    }),
    extractResponse: (data) => data.content?.[0]?.text || '',
    extractCitations: () => [], // Claude doesn't provide citations in basic API
  },

  gemini: {
    name: 'Gemini',
    getEndpoint: (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    model: 'gemini-1.5-flash',
    getHeaders: () => ({
      'Content-Type': 'application/json',
    }),
    buildPayload: (query) => ({
      contents: [{ parts: [{ text: query + '\n\nPlease recommend specific tools and services by name where relevant.' }] }],
      generationConfig: {
        maxOutputTokens: 3000,
        temperature: 0.7,
      },
    }),
    extractResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    extractCitations: () => [],
  },
};

// ============================================
// CORS & UTILITY FUNCTIONS
// ============================================

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = [
    'https://app.clemelopy.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  if (env.ALLOW_ORIGIN) allowedOrigins.push(env.ALLOW_ORIGIN);

  const isAllowed = allowedOrigins.some(o => origin.startsWith(o));

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) },
  });
}

// ============================================
// LICENSE & USAGE TRACKING
// ============================================

/**
 * Check if user has Growth tier access and available runs
 */
async function checkLicenseAndUsage(env, userId, email) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return { allowed: false, error: 'Server configuration error' };
  }

  try {
    // Check subscription tier
    const subResponse = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&status=in.(active,trialing)&select=plan`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const subscriptions = await subResponse.json();
    
    // Check if user has Growth or Unlimited plan
    const hasGrowth = subscriptions.some(sub => 
      sub.plan === 'growth' || sub.plan === 'unlimited'
    );
    
    // Check if user has unlimited plan (no usage limits)
    const isUnlimited = subscriptions.some(sub => sub.plan === 'unlimited');

    if (!hasGrowth) {
      return { 
        allowed: false, 
        error: 'Share of Model requires a Growth subscription',
        upgrade_required: true 
      };
    }

    // Check SOM usage for this month
    const licenseResponse = await fetch(
      `${supabaseUrl}/rest/v1/licenses?user_id=eq.${userId}&app_slug=eq.share-of-model&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const licenses = await licenseResponse.json();
    let license = licenses[0];

    // Create license if doesn't exist
    if (!license) {
      const createResponse = await fetch(
        `${supabaseUrl}/rest/v1/licenses`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            user_id: userId,
            email: email,
            app_slug: 'share-of-model',
            app_name: 'Share of Model Tracker',
            plan: 'growth',
            status: 'active',
            monthly_uses: 0,
            monthly_reset_at: getNextResetDate(),
            som_monthly_uses: 0,
            som_monthly_reset_at: getNextResetDate(),
          }),
        }
      );
      
      const created = await createResponse.json();
      license = Array.isArray(created) ? created[0] : created;
    }

    // Check if monthly reset is needed
    const resetDate = new Date(license.som_monthly_reset_at || license.monthly_reset_at);
    const now = new Date();
    
    if (now >= resetDate) {
      // Reset monthly usage
      await fetch(
        `${supabaseUrl}/rest/v1/licenses?id=eq.${license.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            som_monthly_uses: 0,
            som_monthly_reset_at: getNextResetDate(),
          }),
        }
      );
      license.som_monthly_uses = 0;
    }

    // Check usage limit (1 per month for Growth, unlimited for unlimited plan)
    const monthlyLimit = isUnlimited ? 999999 : 1;
    const currentUsage = license.som_monthly_uses || 0;

    if (!isUnlimited && currentUsage >= monthlyLimit) {
      return {
        allowed: false,
        error: `You've used your ${monthlyLimit} Share of Model test this month. Resets on ${formatDate(license.som_monthly_reset_at || getNextResetDate())}`,
        usage: currentUsage,
        limit: monthlyLimit,
        reset_date: license.som_monthly_reset_at,
      };
    }

    return {
      allowed: true,
      license_id: license.id,
      usage: currentUsage,
      limit: monthlyLimit,
      remaining: monthlyLimit - currentUsage,
      is_unlimited: isUnlimited,
    };

  } catch (err) {
    console.error('License check error:', err);
    return { allowed: false, error: 'Failed to verify license' };
  }
}

/**
 * Record usage after successful test
 */
async function recordUsage(env, userId, email, licenseId, details = {}) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;

  try {
    // Increment som_monthly_uses
    await fetch(
      `${supabaseUrl}/rest/v1/rpc/increment_som_usage`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ license_id: licenseId }),
      }
    );

    // Log to usage_events
    await fetch(
      `${supabaseUrl}/rest/v1/usage_events`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          email: email,
          app_slug: 'share-of-model',
          reason: 'growth',
          details: details,
        }),
      }
    );

    return true;
  } catch (err) {
    console.error('Failed to record usage:', err);
    return false;
  }
}

function getNextResetDate() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================
// SAVE TEST RESULTS TO DATABASE
// ============================================

/**
 * Save a test result and its mentions to the database
 * Auto-creates competitors that don't exist yet
 */
async function saveTestResult(env, userId, result, existingCompetitors) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;

  try {
    // Insert query result
    const resultResponse = await fetch(
      `${supabaseUrl}/rest/v1/som_query_results`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          user_id: userId,
          session_id: result.session_id,
          query_id: result.query_id,
          query_text: result.query_text,
          platform: result.platform,
          response_text: result.response_text,
          response_time_ms: result.response_time_ms,
          tested_at: new Date().toISOString(),
        }),
      }
    );

    if (!resultResponse.ok) {
      console.error('Failed to save result:', await resultResponse.text());
      return { savedResult: null, newCompetitors: [] };
    }

    const savedResults = await resultResponse.json();
    const savedResult = Array.isArray(savedResults) ? savedResults[0] : savedResults;

    // Track new competitors we create
    const newCompetitors = [];

    // Insert mentions (and auto-create competitors if needed)
    if (result.mentions && result.mentions.length > 0 && savedResult?.id) {
      const mentionsToInsert = [];
      
      for (const m of result.mentions) {
        let competitorId = m.competitor_id;
        
        // If no competitor_id, this is a new competitor we detected
        if (!competitorId && m.competitor_name) {
          // Check if competitor already exists by name
          const existingComp = existingCompetitors.find(
            c => c.name.toLowerCase() === m.competitor_name.toLowerCase()
          );
          
          if (existingComp) {
            competitorId = existingComp.id;
          } else {
            // Create new competitor
            const createCompResponse = await fetch(
              `${supabaseUrl}/rest/v1/som_competitors`,
              {
                method: 'POST',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation',
                },
                body: JSON.stringify({
                  user_id: userId,
                  name: m.competitor_name,
                  domain: null,
                  is_own_brand: false,
                }),
              }
            );
            
            if (createCompResponse.ok) {
              const newComp = await createCompResponse.json();
              const created = Array.isArray(newComp) ? newComp[0] : newComp;
              competitorId = created.id;
              newCompetitors.push(created);
              // Add to existing list so we don't create duplicates
              existingCompetitors.push(created);
            }
          }
        }
        
        if (competitorId) {
          mentionsToInsert.push({
            result_id: savedResult.id,
            competitor_id: competitorId,
            position: m.position || 1,
            sentiment: m.sentiment || 'neutral',
            is_recommendation: m.is_recommendation || false,
            has_citation: m.has_citation || false,
            citation_url: m.citation_url || null,
            context_snippet: m.context_snippet || null,
          });
        }
      }

      if (mentionsToInsert.length > 0) {
        await fetch(
          `${supabaseUrl}/rest/v1/som_mentions`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(mentionsToInsert),
          }
        );
      }
    }

    return { savedResult, newCompetitors };
  } catch (err) {
    console.error('Error saving test result:', err);
    return { savedResult: null, newCompetitors: [] };
  }
}

// ============================================
// WORKSPACE MANAGEMENT (Hidden from user)
// ============================================

/**
 * Get or create user's default workspace
 */
async function getOrCreateWorkspace(env, userId, email) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_KEY;

  try {
    // Check for existing workspace
    const response = await fetch(
      `${supabaseUrl}/rest/v1/som_workspaces?owner_user_id=eq.${userId}&select=id,name`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    const workspaces = await response.json();

    if (workspaces.length > 0) {
      return workspaces[0];
    }

    // Create default workspace
    const createResponse = await fetch(
      `${supabaseUrl}/rest/v1/som_workspaces`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          name: `${email.split('@')[0]}'s Workspace`,
          slug: userId,
          owner_user_id: userId,
          is_active: true,
        }),
      }
    );

    const created = await createResponse.json();
    return Array.isArray(created) ? created[0] : created;

  } catch (err) {
    console.error('Workspace error:', err);
    return null;
  }
}

// ============================================
// AI PLATFORM QUERYING
// ============================================

/**
 * Query a single AI platform
 */
async function queryPlatform(env, platformId, queryText) {
  const platform = PLATFORMS[platformId];
  if (!platform) {
    return { error: `Unknown platform: ${platformId}` };
  }

  // Get API key
  const apiKeyMap = {
    chatgpt: env.OPENAI_API_KEY,
    claude: env.ANTHROPIC_API_KEY,
    gemini: env.GEMINI_API_KEY,
    perplexity: env.PERPLEXITY_API_KEY,
  };

  const apiKey = apiKeyMap[platformId];
  if (!apiKey) {
    return { error: `No API key configured for ${platform.name}` };
  }

  try {
    const startTime = Date.now();

    // Gemini uses API key in URL
    const endpoint = platform.getEndpoint
      ? platform.getEndpoint(apiKey)
      : platform.endpoint;

    const headers = platform.getHeaders(apiKey);
    const payload = platform.buildPayload(queryText);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${platform.name} API error:`, errorText);
      return { 
        error: `${platform.name} API error: ${response.status}`,
        details: errorText 
      };
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    return {
      platform: platformId,
      platform_name: platform.name,
      model: platform.model,
      response_text: platform.extractResponse(data),
      citations: platform.extractCitations(data),
      response_time_ms: responseTime,
    };

  } catch (err) {
    console.error(`${platform.name} query error:`, err);
    return { error: err.message };
  }
}

// ============================================
// MENTION DETECTION & ANALYSIS
// ============================================

/**
 * Detect competitor mentions in AI response
 */
function detectMentions(responseText, competitors) {
  const mentions = [];
  const lowerResponse = responseText.toLowerCase();

  competitors.forEach(competitor => {
    // Build search terms from competitor name and domain
    const searchTerms = [competitor.name.toLowerCase()];
    
    if (competitor.domain) {
      // Add domain without TLD
      const domainBase = competitor.domain.replace(/^(www\.)?/, '').split('.')[0];
      if (domainBase.length > 2) {
        searchTerms.push(domainBase.toLowerCase());
      }
    }

    // Add any aliases
    if (competitor.aliases) {
      searchTerms.push(...competitor.aliases.map(a => a.toLowerCase()));
    }

    // Find all occurrences
    const foundPositions = [];

    searchTerms.forEach(term => {
      let searchIndex = 0;
      while (true) {
        const foundIndex = lowerResponse.indexOf(term, searchIndex);
        if (foundIndex === -1) break;

        // Check word boundaries
        const before = foundIndex > 0 ? lowerResponse[foundIndex - 1] : ' ';
        const after = foundIndex + term.length < lowerResponse.length
          ? lowerResponse[foundIndex + term.length]
          : ' ';

        if (/[\s.,;:!?()\[\]"']/.test(before) && /[\s.,;:!?()\[\]"']/.test(after)) {
          foundPositions.push(foundIndex);
        }

        searchIndex = foundIndex + 1;
      }
    });

    if (foundPositions.length > 0) {
      const firstMentionIndex = Math.min(...foundPositions);

      // Calculate position in document (which paragraph/section)
      const textBeforeMention = responseText.substring(0, firstMentionIndex);
      const paragraphNumber = (textBeforeMention.match(/\n\n/g) || []).length + 1;

      // Extract context snippet
      const snippetStart = Math.max(0, firstMentionIndex - 100);
      const snippetEnd = Math.min(responseText.length, firstMentionIndex + 150);
      const contextSnippet = responseText.substring(snippetStart, snippetEnd).trim();

      // Analyze sentiment and recommendation
      const sentiment = detectSentiment(contextSnippet, competitor.name);
      const isRecommendation = detectRecommendation(contextSnippet, competitor.name);
      const hasCitation = detectCitation(responseText, competitor);

      mentions.push({
        competitor_id: competitor.id,
        competitor_name: competitor.name,
        is_own_brand: competitor.is_own_brand,
        position: paragraphNumber,
        mention_count: foundPositions.length,
        context_snippet: contextSnippet,
        sentiment,
        is_recommendation: isRecommendation,
        has_citation: hasCitation,
        citation_url: hasCitation ? extractCitationUrl(responseText, competitor) : null,
      });
    }
  });

  // Sort by position and re-number
  mentions.sort((a, b) => a.position - b.position);
  mentions.forEach((m, i) => m.position = i + 1);

  return mentions;
}

/**
 * Use AI to extract all brand/tool names from a response
 * Returns array of { name, position, context, sentiment, is_recommendation }
 */
async function extractBrandsWithAI(env, responseText) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Extract all software tools, platforms, companies, and brand names mentioned in this text. For each one, determine:
1. The exact brand name (properly capitalized)
2. What position/order it appears in the response (1 = first mentioned, 2 = second, etc.)
3. The sentiment (positive, negative, or neutral)
4. Whether it's being recommended (true/false)

Text to analyze:
"""
${responseText.substring(0, 4000)}
"""

Return ONLY a JSON array, no other text. Example format:
[
  {"name": "Google Analytics", "position": 1, "sentiment": "positive", "is_recommendation": true},
  {"name": "HubSpot", "position": 2, "sentiment": "positive", "is_recommendation": true}
]

If no brands/tools are mentioned, return an empty array: []`
        }],
      }),
    });

    if (!response.ok) {
      console.error('AI brand extraction failed:', await response.text());
      return [];
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '[]';
    
    // Clean up response
    let cleanJson = text.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    const brands = JSON.parse(cleanJson);
    return Array.isArray(brands) ? brands : [];
  } catch (err) {
    console.error('Error extracting brands with AI:', err);
    return [];
  }
}

/**
 * Enhanced mention detection that auto-discovers new brands
 */
async function detectMentionsWithAutoDiscovery(env, responseText, existingCompetitors, userId) {
  // First, use AI to extract all brands mentioned
  const discoveredBrands = await extractBrandsWithAI(env, responseText);
  
  if (discoveredBrands.length === 0) {
    // Fall back to basic detection if AI fails
    return { mentions: detectMentions(responseText, existingCompetitors), newCompetitors: [] };
  }
  
  const mentions = [];
  const newCompetitors = [];
  const existingNames = existingCompetitors.map(c => c.name.toLowerCase());
  
  for (const brand of discoveredBrands) {
    // Check if this brand already exists in competitors
    const existingCompetitor = existingCompetitors.find(c => 
      c.name.toLowerCase() === brand.name.toLowerCase()
    );
    
    if (existingCompetitor) {
      // Use existing competitor
      mentions.push({
        competitor_id: existingCompetitor.id,
        competitor_name: existingCompetitor.name,
        is_own_brand: existingCompetitor.is_own_brand,
        position: brand.position,
        sentiment: brand.sentiment || 'neutral',
        is_recommendation: brand.is_recommendation || false,
        has_citation: false,
        citation_url: null,
      });
    } else {
      // Create new competitor - mark for creation
      const newCompetitor = {
        name: brand.name,
        is_own_brand: false,
        user_id: userId,
      };
      
      // Check if we already added this one in this batch
      const alreadyAdded = newCompetitors.find(c => c.name.toLowerCase() === brand.name.toLowerCase());
      
      if (!alreadyAdded) {
        newCompetitors.push(newCompetitor);
      }
      
      // Add mention with placeholder (will be updated after competitor is created)
      mentions.push({
        competitor_id: null, // Will be set after creation
        competitor_name: brand.name,
        is_own_brand: false,
        position: brand.position,
        sentiment: brand.sentiment || 'neutral',
        is_recommendation: brand.is_recommendation || false,
        has_citation: false,
        citation_url: null,
        _needs_competitor_creation: true,
      });
    }
  }
  
  return { mentions, newCompetitors };
}

/**
 * Detect sentiment around a mention
 */
function detectSentiment(context, brandName) {
  const lowerContext = context.toLowerCase();

  const positivePatterns = [
    /\b(best|top|leading|excellent|great|popular|recommended|powerful|robust|comprehensive)\b/i,
    /\b(highly rated|well-regarded|industry leader|go-to|favorite|preferred)\b/i,
    /\b(excels?|stands? out|shines?|impressive)\b/i,
  ];

  const negativePatterns = [
    /\b(expensive|costly|complex|difficult|steep learning curve|limited|lacking)\b/i,
    /\b(drawback|downside|weakness|issue|problem|concern)\b/i,
    /\b(avoid|caution|however|but|although)\b/i,
  ];

  const positiveCount = positivePatterns.filter(p => p.test(lowerContext)).length;
  const negativeCount = negativePatterns.filter(p => p.test(lowerContext)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * Detect if brand is being recommended
 */
function detectRecommendation(context, brandName) {
  const lowerContext = context.toLowerCase();
  const brand = brandName.toLowerCase();

  const recommendPatterns = [
    /\b(recommend|suggest|try|consider|check out|look into)\b/i,
    /\b(best (option|choice|tool|solution))\b/i,
    /\b(top (pick|choice|recommendation))\b/i,
    /\b(great for|perfect for|ideal for)\b/i,
    new RegExp(`(use|try|consider)\\s+${brand}`, 'i'),
  ];

  return recommendPatterns.some(p => p.test(lowerContext));
}

/**
 * Check if there's a citation/link for the competitor
 */
function detectCitation(responseText, competitor) {
  if (!competitor.domain) return false;

  const domainPatterns = [
    competitor.domain,
    competitor.domain.replace('www.', ''),
    `https://${competitor.domain}`,
    `http://${competitor.domain}`,
  ];

  return domainPatterns.some(d => responseText.toLowerCase().includes(d.toLowerCase()));
}

/**
 * Extract citation URL if present
 */
function extractCitationUrl(responseText, competitor) {
  if (!competitor.domain) return null;

  const urlPattern = new RegExp(
    `https?://[^\\s]*${competitor.domain.replace('.', '\\.')}[^\\s]*`,
    'i'
  );

  const match = responseText.match(urlPattern);
  return match ? match[0] : null;
}

// ============================================
// STREAMING RESPONSE HANDLER
// ============================================

/**
 * Run tests with streaming progress updates
 */
async function runTestsWithStreaming(env, queries, competitors, platforms, sessionId, workspaceId, userId) {
  const encoder = new TextEncoder();
  // Keep a mutable copy of competitors for tracking
  const knownCompetitors = [...competitors];
  
  const stream = new ReadableStream({
    async start(controller) {
      const results = [];
      const totalTests = queries.length * platforms.length;
      let completedTests = 0;
      const allDiscoveredBrands = new Map(); // Use Map to dedupe by name

      try {
        for (const query of queries) {
          for (const platformId of platforms) {
            // Send progress update
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({
                type: 'progress',
                current: completedTests + 1,
                total: totalTests,
                query: query.query_text,
                platform: PLATFORMS[platformId]?.name || platformId,
              })}\n\n`
            ));

            // Query the platform
            const response = await queryPlatform(env, platformId, query.query_text);

            if (response.error) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  query_id: query.id,
                  platform: platformId,
                  error: response.error,
                })}\n\n`
              ));
            } else {
              // Use AI to detect and discover brand mentions
              const { mentions, newCompetitors } = await detectMentionsWithAutoDiscovery(
                env, 
                response.response_text, 
                knownCompetitors,
                userId
              );
              
              // Track discovered brands (don't auto-add, let user choose)
              for (const newComp of newCompetitors) {
                const key = newComp.name.toLowerCase();
                if (!allDiscoveredBrands.has(key)) {
                  // Count how many times this brand was mentioned across all results
                  const mentionData = mentions.find(m => 
                    m.competitor_name?.toLowerCase() === key
                  );
                  allDiscoveredBrands.set(key, {
                    name: newComp.name,
                    mention_count: 1,
                    sentiment: mentionData?.sentiment || 'neutral',
                    is_recommendation: mentionData?.is_recommendation || false,
                    first_position: mentionData?.position || 99,
                  });
                } else {
                  // Increment count
                  const existing = allDiscoveredBrands.get(key);
                  existing.mention_count++;
                }
              }

              const result = {
                query_id: query.id,
                query_text: query.query_text,
                ...response,
                mentions,
                session_id: sessionId,
                workspace_id: workspaceId,
              };

              // SAVE TO DATABASE (only saves result and mentions for known competitors)
              const { savedResult } = await saveTestResult(env, userId, result, knownCompetitors);

              results.push(result);

              // Send result with full details for UI display
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'result',
                  ...result,
                  saved_id: savedResult?.id,
                })}\n\n`
              ));
            }

            completedTests++;

            // Small delay between API calls to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // Convert discovered brands map to sorted array
        const discoveredBrandsArray = Array.from(allDiscoveredBrands.values())
          .sort((a, b) => b.mention_count - a.mention_count); // Most mentioned first

        // Send completion with all results and discovered brands
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: 'complete',
            total_results: results.length,
            discovered_brands: discoveredBrandsArray,
            results,
          })}\n\n`
        ));

      } catch (err) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: 'error',
            error: err.message,
          })}\n\n`
        ));
      }

      controller.close();
    },
  });

  return stream;
}

// ============================================
// REQUEST HANDLERS
// ============================================

/**
 * Handle test request
 */
async function handleTest(env, request) {
  const body = await request.json();
  const { 
    queries, 
    competitors, 
    platforms = ['chatgpt', 'perplexity', 'claude'],
    session_id,
    user_id,
    email,
    stream = true,
  } = body;

  // Validate input
  if (!queries || !Array.isArray(queries) || queries.length === 0) {
    return json({ error: 'Queries array required' }, 400, request, env);
  }

  if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
    return json({ error: 'Competitors array required' }, 400, request, env);
  }

  if (!user_id || !email) {
    return json({ error: 'user_id and email required' }, 400, request, env);
  }

  // Check license and usage
  const licenseCheck = await checkLicenseAndUsage(env, user_id, email);
  
  if (!licenseCheck.allowed) {
    return json({
      error: licenseCheck.error,
      upgrade_required: licenseCheck.upgrade_required,
      usage: licenseCheck.usage,
      limit: licenseCheck.limit,
      reset_date: licenseCheck.reset_date,
    }, 403, request, env);
  }

  // Get or create workspace
  const workspace = await getOrCreateWorkspace(env, user_id, email);
  if (!workspace) {
    return json({ error: 'Failed to initialize workspace' }, 500, request, env);
  }

  // Record usage BEFORE running test (to prevent abuse)
  await recordUsage(env, user_id, email, licenseCheck.license_id, {
    queries_count: queries.length,
    platforms: platforms,
    session_id: session_id,
  });

  if (stream) {
    // Return streaming response
    const responseStream = await runTestsWithStreaming(
      env,
      queries,
      competitors,
      platforms,
      session_id,
      workspace.id,
      user_id
    );

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders(request, env),
      },
    });

  } else {
    // Return all results at once (non-streaming)
    const results = [];

    for (const query of queries) {
      for (const platformId of platforms) {
        const response = await queryPlatform(env, platformId, query.query_text);

        if (!response.error) {
          const mentions = detectMentions(response.response_text, competitors);
          const result = {
            query_id: query.id,
            query_text: query.query_text,
            ...response,
            mentions,
            session_id,
            workspace_id: workspace.id,
          };
          
          // SAVE TO DATABASE
          await saveTestResult(env, user_id, result);
          
          results.push(result);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return json({
      success: true,
      workspace_id: workspace.id,
      results,
      usage: {
        used: licenseCheck.usage + 1,
        limit: licenseCheck.limit,
        remaining: licenseCheck.remaining - 1,
      },
    }, 200, request, env);
  }
}

/**
 * Handle usage check request
 */
async function handleUsageCheck(env, request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  const email = url.searchParams.get('email');

  if (!userId || !email) {
    return json({ error: 'user_id and email required' }, 400, request, env);
  }

  const licenseCheck = await checkLicenseAndUsage(env, userId, email);

  return json({
    allowed: licenseCheck.allowed,
    error: licenseCheck.error,
    upgrade_required: licenseCheck.upgrade_required,
    usage: licenseCheck.usage || 0,
    limit: licenseCheck.limit || 1,
    remaining: licenseCheck.remaining || 0,
    reset_date: licenseCheck.reset_date,
  }, 200, request, env);
}

/**
 * Handle workspace info request
 */
async function handleWorkspaceInfo(env, request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  const email = url.searchParams.get('email');

  if (!userId || !email) {
    return json({ error: 'user_id and email required' }, 400, request, env);
  }

  const workspace = await getOrCreateWorkspace(env, userId, email);

  if (!workspace) {
    return json({ error: 'Failed to get workspace' }, 500, request, env);
  }

  return json({
    workspace_id: workspace.id,
    workspace_name: workspace.name,
  }, 200, request, env);
}

/**
 * Generate content ideas based on test results
 */
async function handleContentIdeas(env, request) {
  const body = await request.json();
  const { brand_name, results, competitors } = body;

  if (!brand_name || !results || results.length === 0) {
    return json({ error: 'brand_name and results required' }, 400, request, env);
  }

  // Build context from results
  const queriesAnalyzed = [...new Set(results.map(r => r.query_text))];
  const allMentions = results.flatMap(r => r.mentions || []);
  const ownBrandMentions = allMentions.filter(m => m.is_own_brand);
  const competitorMentions = allMentions.filter(m => !m.is_own_brand);
  const uniqueCompetitors = [...new Set(competitorMentions.map(m => m.competitor_name))];
  
  // Calculate stats
  const mentionRate = results.length > 0 
    ? Math.round((results.filter(r => r.mentions?.some(m => m.is_own_brand)).length / results.length) * 100)
    : 0;
  
  const avgPosition = ownBrandMentions.length > 0
    ? (ownBrandMentions.reduce((sum, m) => sum + (m.position || 0), 0) / ownBrandMentions.length).toFixed(1)
    : 'N/A';

  // Build the prompt
  const prompt = `You are a GEO (Generative Engine Optimization) content strategist. Analyze these AI search results and provide actionable content recommendations.

BRAND: ${brand_name}

QUERIES TESTED:
${queriesAnalyzed.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

CURRENT PERFORMANCE:
- Mentioned in ${mentionRate}% of AI responses
- Average position when mentioned: #${avgPosition}
- Times mentioned: ${ownBrandMentions.length}
- Top competitors appearing: ${uniqueCompetitors.slice(0, 5).join(', ') || 'None detected'}

SAMPLE AI RESPONSES (showing what AI platforms are recommending):
${results.slice(0, 3).map(r => `
Platform: ${r.platform_name || r.platform}
Query: "${r.query_text}"
Response excerpt: "${r.response_text?.substring(0, 500)}..."
Brands mentioned: ${r.mentions?.map(m => m.competitor_name).join(', ') || 'None'}
`).join('\n---\n')}

Based on this analysis, provide:

1. **Content Gaps**: What topics are AI platforms discussing that ${brand_name} should create content about?

2. **Authority Building**: What type of content would help ${brand_name} be cited more often by AI?

3. **Specific Article Ideas**: Give 5 specific blog post/article titles that would improve AI visibility for these queries.

4. **Quick Wins**: 2-3 immediate actions to improve AI mentions.

Format your response as JSON with this structure:
{
  "content_gaps": ["gap1", "gap2", "gap3"],
  "authority_tips": ["tip1", "tip2", "tip3"],
  "article_ideas": [
    {"title": "Article Title", "description": "Brief description of what to cover", "target_query": "Which query this helps with"}
  ],
  "quick_wins": ["action1", "action2", "action3"],
  "summary": "A 2-3 sentence executive summary of the recommendations"
}

Return ONLY valid JSON, no markdown or explanation.`;

  try {
    // Use Claude to generate ideas
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      return json({ error: 'Failed to generate content ideas' }, 500, request, env);
    }

    const data = await response.json();
    const responseText = data.content?.[0]?.text || '';
    
    // Parse the JSON response
    try {
      // Clean up response if it has markdown
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      const ideas = JSON.parse(cleanJson);
      return json({ success: true, ideas }, 200, request, env);
    } catch (parseErr) {
      // If parsing fails, return raw text
      console.error('Failed to parse content ideas JSON:', parseErr);
      return json({ 
        success: true, 
        ideas: {
          summary: responseText,
          content_gaps: [],
          authority_tips: [],
          article_ideas: [],
          quick_wins: [],
        }
      }, 200, request, env);
    }

  } catch (err) {
    console.error('Content ideas error:', err);
    return json({ error: err.message }, 500, request, env);
  }
}

/**
 * Handle research question - Ask AI a custom question
 */
async function handleResearch(env, request) {
  const body = await request.json();
  const { question, platform, user_id } = body;

  if (!question || !platform) {
    return json({ error: 'question and platform required' }, 400, request, env);
  }

  // Get the platform configuration
  const platformConfig = PLATFORMS[platform];
  if (!platformConfig) {
    return json({ error: 'Invalid platform' }, 400, request, env);
  }

  try {
    // Query the selected platform
    const result = await queryPlatform(env, platform, question);

    if (result.error) {
      return json({ error: result.error }, 500, request, env);
    }

    return json({ 
      success: true, 
      response: result.response_text,
      platform: platform,
      platform_name: platformConfig.name,
    }, 200, request, env);

  } catch (err) {
    console.error('Research query error:', err);
    return json({ error: err.message }, 500, request, env);
  }
}

// ============================================
// MAIN ROUTER
// ============================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }

    try {
      // Route: Run tests
      if (path === '/test' && request.method === 'POST') {
        return await handleTest(env, request);
      }

      // Route: Check usage
      if (path === '/usage' && request.method === 'GET') {
        return await handleUsageCheck(env, request);
      }

      // Route: Get workspace info
      if (path === '/workspace' && request.method === 'GET') {
        return await handleWorkspaceInfo(env, request);
      }

      // Route: Get available platforms
      if (path === '/platforms' && request.method === 'GET') {
        const availablePlatforms = Object.entries(PLATFORMS).map(([id, config]) => ({
          id,
          name: config.name,
          model: config.model,
        }));
        return json({ platforms: availablePlatforms }, 200, request, env);
      }

      // Route: Generate content ideas based on test results
      if (path === '/content-ideas' && request.method === 'POST') {
        return await handleContentIdeas(env, request);
      }

      // Route: Research - Ask AI a question
      if (path === '/research' && request.method === 'POST') {
        return await handleResearch(env, request);
      }

      // Health check
      if (path === '/' || path === '/health') {
        return json({
          status: 'ok',
          service: 'Clemelopy Share of Model Tracker',
          version: '1.0.0',
        }, 200, request, env);
      }

      return json({ error: 'Not found' }, 404, request, env);

    } catch (err) {
      console.error('Worker error:', err);
      return json({
        error: 'Internal server error',
        message: err.message,
      }, 500, request, env);
    }
  },
};