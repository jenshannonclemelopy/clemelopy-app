import puppeteer from "@cloudflare/puppeteer";
/* ===========================
Clemelopy GEO Map Service (Cloudflare Worker)
UPDATED FOR NEXT.JS / SUPABASE JWT AUTH
=========================== */

// Safe Base64 Encoding for UTF-8 strings in Cloudflare Workers
function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

/* ------------ CORS / JSON ------------- */

function corsHeaders(request, env, allowIframe = false) {
  const origin = request.headers.get("Origin") || "";
  
  // Allowed origins for your Next.js app
  const allowedOrigins = [
    "https://app.clemelopy.com",
    "https://clemelopy.com",
    "http://localhost:3000",
    "http://localhost:3001",
  ];

  // Allow additional origin from environment variable
  if (env.ALLOW_ORIGIN) {
    allowedOrigins.push(env.ALLOW_ORIGIN);
  }
  
  // Check if origin is allowed (exact match or localhost with any port)
  const isAllowed =
    allowedOrigins.includes(origin) ||
    origin.startsWith("http://localhost:");

  const headers = {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://app.clemelopy.com",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Action-Key, x-clemelopy-key",
    "Access-Control-Max-Age": "86400",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer-when-downgrade",
    "Permissions-Policy":
      "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
  };

  // Only add X-Frame-Options if not allowing iframe embedding
  if (!allowIframe) {
    headers["X-Frame-Options"] = "DENY";
  }

  return headers;
}

function jsonWithCors(request, env, body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request, env),
    },
  });
}

/* ------------ Helpers ------------- */
function asText(x) {
  return String(x || "").replace(/\u00A0/g, " ");
}

function htmlEscape(s) {
  return asText(s).replace(/[&<>"']/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c])
  );
}

function normEmail(email) {
  return (email || "").trim().toLowerCase();
}

function generateSmartTitle(map) {
  const primary = map?.entity_highlights?.primary || map?.entity_highlights?.root;
  if (Array.isArray(primary) && primary.length > 0) {
    return `${primary.slice(0, 2).join(" & ")} — GEO Linking Map`;
  }
  return "GEO Linking Map";
}

/* ------------ Rate Limiting ------------- */
const rateLimitMap = new Map();

function checkRateLimit(identifier, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitMap.get(identifier) || { count: 0, resetAt: now + windowMs };
  
  // Reset if window expired
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }
  
  record.count++;
  rateLimitMap.set(identifier, record);
  
  // Clean up old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }
  
  return {
    allowed: record.count <= maxRequests,
    remaining: Math.max(0, maxRequests - record.count),
  };
}

/* ------------ Supabase (Service-side) ------------- */
function getSupabase(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase env vars missing");
  }
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, "");
  const baseHeaders = {
    "Content-Type": "application/json",
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    Prefer: "return=representation",
  };

  async function rpc(path, { method = "GET", headers = {}, body } = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...baseHeaders, ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      console.error("Supabase error", { path, status: res.status, text });
      throw new Error(
        (data && (data.message || data.error)) ||
          `Supabase error ${res.status}`
      );
    }
    return data;
  }

  return {
    get: (table, query = "") => rpc(`/rest/v1/${table}${query}`),
    insert: (table, body) =>
      rpc(`/rest/v1/${table}`, { method: "POST", body }),
    patch: (table, query, body) =>
      rpc(`/rest/v1/${table}${query}`, { method: "PATCH", body }),
  };
}

/* Save GEO Linking project into Supabase */
async function saveProjectToSupabase(env, projectId, browser_url, file_url, thumb_url, email, extra = {}) {
  const supa = getSupabase(env);
  const map = extra.mapJson || {};

  const row = {
    email: normEmail(email),
    project_title: extra.project_title || "Untitled Project",
    browser_url: browser_url,
    pdf_url: file_url,
    thumbnail: thumb_url,
    map: map,
    source_url: extra.source_url || null,
    verification_report: extra.verificationReport || null,
    // Map the orchard framework fields to database columns
    overview_summary: map.overview_summary || map.trunk || null,
    root_ideas: map.roots || null,
    branch_topics: map.branches || null,
    fruit_examples: map.fruit || null,
    external_sources: map.pollinators || null,
    internal_links: map.underground_network || null,
    anchor_suggestions: map.soil || null,
    contextual_links: map.leaves || null,
    action_checklist: map.cultivation_plan || null,
  };
  const query = `?id=eq.${projectId}`;
  await supa.patch("geo_linking_projects_real", query, row);
}

/* ------------ Supabase Entitlements ------------- */
const APP_SLUG = "geo-linking-strategy-map";
const FREE_LIFETIME_CAP = 3;
const MONTHLY_CAP = 15;

async function sbGetOrCreateLicense(env, email, appSlug = APP_SLUG) {
  const supa = getSupabase(env);
  const e = normEmail(email);
  const found = await supa.get(
    "licenses",
    `?email=eq.${encodeURIComponent(e)}&app_slug=eq.${encodeURIComponent(
      appSlug
    )}&limit=1`
  );
  if (Array.isArray(found) && found.length > 0) return found[0];
  const inserted = await supa.insert("licenses", [
    {
      email: e,
      app_slug: appSlug,
      plan: "free",
      status: "active",
      pack_remaining: 3,
      lifetime_uses: 0,
      monthly_uses: 0,
      monthly_reset: null,
    },
  ]);
  if (!Array.isArray(inserted) || !inserted[0]) {
    throw new Error("Failed to create license");
  }
  return inserted[0];
}

function needsMonthlyResetSB(monthly_reset) {
  if (!monthly_reset) return true;
  const last = new Date(monthly_reset);
  if (Number.isNaN(last.getTime())) return true;
  const now = new Date();
  return (
    last.getUTCFullYear() !== now.getUTCFullYear() ||
    last.getUTCMonth() !== now.getUTCMonth()
  );
}

async function sbCheckEntitlement(env, email, appSlug = APP_SLUG) {
  const lic = await sbGetOrCreateLicense(env, email, appSlug);
  const plan = (lic.plan || "none").toLowerCase();
  const status = (lic.status || "active").toLowerCase();
  const pack = Number(lic.pack_remaining || 0);
  const life = Number(lic.lifetime_uses || 0);
  const rawMonthlyUses = Number(lic.monthly_uses || 0);
  const monthlyUses = needsMonthlyResetSB(lic.monthly_reset)
    ? 0
    : rawMonthlyUses;

  // ADMIN EMAIL WHITELIST - unlimited access
  const adminEmails = [
    'jen@clemelopy.com',
    'support@clemelopy.com',
    'jen@jenshannon.com',
  ];
  const normalizedEmail = normEmail(email);
  if (adminEmails.includes(normalizedEmail)) {
    return {
      allowed: true,
      reason: "admin-unlimited",
      license: lic,
    };
  }

  // ADMIN UNLIMITED PLAN OVERRIDE
  if (plan === "unlimited" && status === "active") {
    return {
      allowed: true,
      reason: "admin-unlimited",
      license: lic,
    };
  }

  if (plan === "monthly" && status === "active") {
    if (monthlyUses < MONTHLY_CAP) {
      return {
        allowed: true,
        reason: "monthly",
        license: lic,
        monthly_uses: monthlyUses,
      };
    }

    return {
      allowed: false,
      reason: "paywall",
      license: lic,
      paywall: {
        code: "PAYWALL",
        message: `You've reached your monthly limit of ${MONTHLY_CAP} maps on this plan.`,
      },
    };
  }

  if (plan === "pack" && status === "active" && pack > 0) {
    return { allowed: true, reason: "pack", license: lic };
  }

  // Handle 'free' plan users with pack_remaining (free trial runs)
  if (plan === "free" && status === "active" && pack > 0) {
    return { allowed: true, reason: "pack", license: lic };
  }

  // Handle 'none' plan users - also use pack_remaining for consistency
  if (plan === "none" && status === "active" && pack > 0) {
    return { allowed: true, reason: "pack", license: lic };
  }

  return {
    allowed: false,
    reason: "paywall",
    license: lic,
    paywall: {
      code: "PAYWALL",
      message:
        "Your available runs are used. Subscribe to get 8 strategies per month.",
    },
  };
}

async function sbRecordUsage(env, { license, reason, appSlug = APP_SLUG, email }) {
  if (!license || !license.id) {
    console.warn("sbRecordUsage: missing license id");
    return;
  }
  const supa = getSupabase(env);
  const today = new Date().toISOString().slice(0, 10);
  const plan = (license.plan || "none").toLowerCase();
  const status = (license.status || "active").toLowerCase();
  let lifetime_uses = Number(license.lifetime_uses || 0) + 1;
  let pack_remaining = Number(license.pack_remaining || 0);
  let monthly_uses = Number(license.monthly_uses || 0);
  let monthly_reset = license.monthly_reset;

  if (reason === "pack" && plan === "pack" && status === "active" && pack_remaining > 0) {
    pack_remaining -= 1;
  }

  if (reason === "monthly" && plan === "monthly" && status === "active") {
    if (needsMonthlyResetSB(monthly_reset)) {
      monthly_uses = 1;
      monthly_reset = today;
    } else {
      monthly_uses += 1;
    }
  }

  await supa.patch(
    "licenses",
    `?id=eq.${encodeURIComponent(license.id)}`,
    {
      lifetime_uses,
      pack_remaining,
      monthly_uses,
      monthly_reset,
      last_used: today,
    }
  );

  try {
    await supa.insert("usage_events", [
      {
        email: normEmail(email || license.email),
        app_slug: appSlug,
        reason,
      },
    ]);
  } catch (e) {
    console.warn("sbRecordUsage: failed to insert usage_events", e?.message);
  }
}

/* ------------ Safety / Moderation ------------- */
function keywordBlocklistHit(text) {
  const t = (text || "").toLowerCase();
  const patterns = [
    /how\s+to\s+make\s+(?:a\s+)?(?:bomb|explosive|molotov)/i,
    /\bkill\s+(?:myself|him|her|them)\b/i,
    /\bsuicide\b/i,
    /\bcredit\s*card\s+number\b/i,
    /\bssn\b|\bsocial\s*security\s*number\b/i,
    /\bchild\s*(?:sexual|porn|abuse)\b/i,
    /\bmake\s+(?:fentanyl|meth|explosives?)\b/i,
  ];
  return patterns.some((rx) => rx.test(t));
}

async function openAIModerationGuard(env, text) {
  try {
    const resp = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: (text || "").slice(0, 20000),
      }),
    });
    const data = await resp.json();
    const result = data?.results?.[0];
    return { flagged: !!result?.flagged, categories: result?.categories || {} };
  } catch (err) {
    console.warn("openai.moderation.failed", err);
    return { flagged: false, categories: {} };
  }
}

async function isBlocked(env, userText) {
  if (keywordBlocklistHit(userText)) {
    return { blocked: true, reason: "Keyword policy violation" };
  }
  const mod = await openAIModerationGuard(env, userText);
  if (mod.flagged) {
    return { blocked: true, reason: "Moderation policy violation" };
  }
  return { blocked: false, reason: "" };
}

const ICON_URLS = {
  roots: "https://pub-e49fdaa41a7742348f86c232911c92a5.r2.dev/Riits.png",
  soil: "https://pub-e49fdaa41a7742348f86c232911c92a5.r2.dev/Soil.png",
  trunk: "https://pub-e49fdaa41a7742348f86c232911c92a5.r2.dev/Trunk.png",
  branches: "https://pub-e49fdaa41a7742348f86c232911c92a5.r2.dev/Branches.png",
  leaves: "https://pub-e49fdaa41a7742348f86c232911c92a5.r2.dev/Leaves.png",
  fruit: "https://pub-e49fdaa41a7742348f86c232911c92a5.r2.dev/Fruit.png",
  pollinators: "https://pub-e49fdaa41a7742348f86c232911c92a5.r2.dev/Pollinators.png",
  network: "https://pub-e49fdaa41a7742348f86c232911c92a5.r2.dev/Underground%20Network.png",
  ecosystem: "https://pub-e49fdaa41a7742348f86c232911c92a5.r2.dev/Orchard%20Illustration%20Horizontal%20Largev1.svg",
  logo: "https://pub-e49fdaa41a7742348f86c232911c92a5.r2.dev/Clemelopy%20Logo%20Web%20Optimized.png",
};

/* ============================================================
   BROWSER RENDERING - PDF GENERATION (REPLACES CLOUDCONVERT)
   ============================================================ */

async function generatePDFWithBrowser(env, html) {
  console.log("Launching browser for PDF generation...");
  
  const browser = await puppeteer.launch(env.BROWSER);
  const page = await browser.newPage();
  
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdfBuffer = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '0in',
      bottom: '0in',
      left: '0in',
      right: '0in'
    },
    displayHeaderFooter: false,
    headerTemplate: `
      <div style="width: 100%; font-size: 9px; font-family: -apple-system, sans-serif; padding: 0 40px; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
          <span style="color: #718096;">GEO Linking Strategy Map</span>
          <span style="color: #00A99D; font-weight: 500;">Clemelopy</span>
        </div>
      </div>
    `,
    footerTemplate: `
      <div style="width: 100%; font-size: 10px; font-family: -apple-system, sans-serif; box-sizing: border-box;">
        <div style="background: linear-gradient(135deg, #FAA819 0%, #00A99D 100%); padding: 12px 40px; color: white;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span></span>
            <span>&copy; Clemelopy&trade; All Rights Reserved | Clemelopy.com</span>
            <span>pg. <span class="pageNumber"></span></span>
          </div>
        </div>
      </div>
    `,
  });
  
  console.log("PDF generated, size:", pdfBuffer.length, "bytes");
  
  await page.setViewport({ width: 816, height: 1056 });
  const thumbnail = await page.screenshot({
    type: 'jpeg',
    quality: 85,
  });
  
  console.log("Thumbnail generated, size:", thumbnail.length, "bytes");
  
  await browser.close();
  
  return { pdfBuffer, thumbnail };
}

/* ------------ UPDATED System prompt / OpenAI ------------- */
const SYSTEM_PROMPT = `
You are The Clemelopy GEO Linking Strategist, an expert in Generative Engine Optimization (GEO) and content strategy.

Your job is to analyze the user's content and create a comprehensive linking strategy using Clemelopy's "Orchard Ecosystem" framework.

## CRITICAL ACCURACY RULES - READ CAREFULLY

1. **ONLY extract information that is EXPLICITLY stated in the provided content**
2. **NEVER invent statistics, numbers, percentages, testimonials, or specific claims**
3. **NEVER fabricate quotes, user counts, time savings, or any quantitative data**
4. **If information doesn't exist in the content, clearly indicate it as a SUGGESTION rather than a fact**
5. **For ANY framework element: If you cannot find real content, provide helpful suggestions prefixed with "SUGGESTION:"**
6. **For pollinators: Suggest TYPES of sources, not specific articles unless you're certain they exist**
7. **For underground network: Suggest what pages SHOULD exist, not what pages DO exist**

## SUGGESTION PREFIX RULES - USE FOR ALL ELEMENTS

When you cannot find explicit content for ANY framework element, prefix your recommendation with "SUGGESTION:" so users know it's a helpful recommendation, not something already on their page.

Examples:
- roots: "SUGGESTION: Define a core theme around customer success"
- soil: "SUGGESTION: Create a consistent phrase for your main service"
- branches: "SUGGESTION: Add a section exploring common challenges"
- leaves: "SUGGESTION: Add subheadings to break up long paragraphs"
- fruit: "SUGGESTION: Include a customer testimonial or case study"
- pollinators: "SUGGESTION: Link to industry research that supports your approach"
- underground_network: "SUGGESTION: Create a FAQ page to link to from here"
- cultivation_plan: "SUGGESTION: HIGH: Add social proof near your call-to-action"

Framework elements:

- 🌱 Roots (Core Concepts) = The foundational ideas the content grows from. Themes that run consistently beneath the surface. (3-5 items) - MUST be directly evident in the content, or use SUGGESTION: prefix
- 🌾 Soil (Anchor Text) = The shared language - words used in links, how ideas are named, consistent descriptions. Natural phrases for linking. (5-8 items) - Use EXACT phrases from the content, or SUGGESTION: prefix for recommendations
- 🌳 Trunk (Page Intent) = The main purpose of the page. The single job this page is meant to do. MUST classify as one of: Informational, Navigational, Commercial, or Transactional.
- 🌿 Branches (Supporting Topics) = Related ideas that extend from your main topic. Add depth and context. (4-6 items) - Topics actually discussed or mentioned, or SUGGESTION: prefix
- 🍃 Leaves (Clarity Signals) = How the content communicates - headings, structure, flow, summaries. Recommendations for clarity. (3-5 items) - Can use SUGGESTION: prefix for improvements
- 🍊 Fruit (Proof & Outcomes) = ONLY include proof points that are EXPLICITLY stated in the content. If none exist, provide suggestions prefixed with "SUGGESTION:" (3-5 items)
- 🐝 Pollinators (External Authority) = Suggest TYPES of authoritative sources (e.g., "Industry research on meal planning benefits"), not specific articles unless certain they exist. Use SUGGESTION: prefix when recommending. (3-5 items)
- 🌐 Underground Network (Internal Connections) = Suggest page types that WOULD strengthen the ecosystem, not pages that DO exist. Use SUGGESTION: prefix. (3-5 items)
- ✅ Cultivation Plan (Action Items) = Specific, prioritized tasks to strengthen this page. Prefixed with HIGH/MEDIUM/LOW. Can also use SUGGESTION: prefix. (5-7 items)

Return a JSON object with this EXACT structure:

{
  "page_intent_type": "REQUIRED: One of: Informational, Navigational, Commercial, or Transactional",
  "page_intent": "A clear 1-2 sentence statement of the page's primary purpose and who it serves.",
  "roots": ["core concept 1", "SUGGESTION: Consider adding a theme around X"],
  "soil": ["natural anchor phrase 1", "SUGGESTION: Create consistent language for your main offering"],
  "branches": ["supporting topic 1", "SUGGESTION: Add a section about common questions"],
  "leaves": [
    {"title": "Clarity recommendation", "description": "How to improve"},
    {"title": "SUGGESTION: Add summary sections", "description": "Help readers scan key points"}
  ],
  "fruit": ["ONLY real proof from content OR 'SUGGESTION: Add testimonials showing...'"],
  "pollinators": [
    {"name": "Type of Source", "reason": "Why it adds authority", "url": null},
    {"name": "SUGGESTION: Industry research", "reason": "Would support your claims"}
  ],
  "underground_network": [
    {"title": "SUGGESTION: FAQ Page", "reason": "Would answer common questions and link naturally"},
    {"title": "SUGGESTION: Case Studies Page", "reason": "Could showcase results mentioned here"}
  ],
  "cultivation_plan": [
    "HIGH: Specific high-priority task with details",
    "SUGGESTION: MEDIUM: Consider adding customer quotes",
    "LOW: A nice-to-have enhancement"
  ]
}

PAGE INTENT TYPES - Choose the most appropriate one:
- **Informational**: Pages that educate, explain, or help someone understand something (blog posts, guides, how-tos, about pages)
- **Navigational**: Pages that help someone find a specific place or resource (homepages, landing pages, directory pages)
- **Commercial**: Pages that help someone explore options or compare solutions (product pages, service pages, comparison pages, feature pages)
- **Transactional**: Pages that help someone take action, purchase, or sign up (checkout pages, signup forms, contact pages, pricing pages)

CRITICAL RULES:
1. Be SPECIFIC to the actual content - extract real concepts and phrases
2. NEVER return empty arrays - always provide at least 2-3 items per category (use SUGGESTION: prefix if needed)
3. For soil (anchor text), use EXACT natural phrases from the content, or SUGGESTION: prefix for recommendations
4. Cultivation plan items MUST be prefixed with HIGH:, MEDIUM:, or LOW:
5. Return ONLY valid JSON - no markdown, no explanations
6. For pollinators, suggest SOURCE TYPES not specific URLs unless certain they exist
7. For cultivation_plan: Write action items as DIRECT INSTRUCTIONS using imperative mood. NEVER use third-person pronouns (her, his, their, she, he). Write as if giving instructions directly to the content owner. Good: "Add a portfolio link" Bad: "Add a link to her portfolio"
8. **NEVER INVENT STATISTICS, NUMBERS, TESTIMONIALS, OR SPECIFIC CLAIMS**
9. If the content lacks information for ANY element, suggest what COULD be added, clearly marked with "SUGGESTION:" prefix
10. For underground_network, suggest what pages SHOULD exist, not what pages DO exist (unless explicitly mentioned)
11. **ALWAYS include page_intent_type** - Classify the page as exactly one of these four types:
   - "Informational" — educational content that helps someone learn
   - "Navigational" — guides someone to a specific place or resource  
   - "Commercial" — helps someone explore options or compare solutions
   - "Transactional" — drives action like purchase, signup, or contact
`.trim();

const SYSTEM_PROMPT_PAGE_INTENT_FIX = `
## CRITICAL: Page Intent Classification

For page_intent, you MUST return an object with BOTH "type" and "description":

{
  "page_intent": {
    "type": "Informational",
    "description": "A clear 1-2 sentence statement of the page's primary purpose"
  }
}

**Intent Type Definitions (pick ONE):**
- **Informational** — Educational content that helps someone learn or understand
- **Navigational** — Guides someone to a specific place or resource
- **Commercial** — Helps someone explore options or compare solutions  
- **Transactional** — Drives action: purchase, signup, download, contact

ALWAYS include both "type" and "description". NEVER return page_intent as just a string.
`;


// ============================================================
// FIXED VERSION - Replace your getMapFromOpenAI and verification functions
// ============================================================

// The problem: Your verification functions were INSIDE getMapFromOpenAI
// They need to be OUTSIDE as separate functions

async function getMapFromOpenAI(env, content) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analyze this content and create a GEO linking strategy. Remember: ONLY extract what's actually in the content. NEVER invent statistics or testimonials. If you can't find proof points, prefix suggestions with "SUGGESTION:".\n\n${content}` },
      ],
      max_tokens: 2500,
      temperature: 0.5,  // Changed from 0.7
    }),
  });
  
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error?.message || "OpenAI request failed");
  
  let text = data?.choices?.[0]?.message?.content || "";
  text = text.trim();
  
  // Remove markdown code blocks if present
  if (text.startsWith("```")) {
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (m) text = m[1].trim();
  }

  try {
    const parsed = JSON.parse(text);
    
    // Ensure all required fields exist with proper structure
    return {
      page_intent: parsed.page_intent || "This content needs a linking strategy.",
      roots: parsed.roots || [],
      soil: parsed.soil || [],
      branches: parsed.branches || [],
      leaves: parsed.leaves || [],
      fruit: parsed.fruit || [],
      pollinators: parsed.pollinators || [],
      underground_network: parsed.underground_network || [],
      cultivation_plan: parsed.cultivation_plan || [],
    };
  } catch (e) {
    console.error("Failed to parse OpenAI response:", text);
    return {
      page_intent: "Unable to analyze content. Please try again with more detailed content.",
      roots: [],
      soil: [],
      branches: [],
      leaves: [],
      fruit: [],
      pollinators: [],
      underground_network: [],
      cultivation_plan: ["Review your content and ensure it has enough detail for analysis"],
    };
  }
}  // <-- THIS CLOSING BRACE WAS MISSING!

/* ============================================================
   VERIFICATION FUNCTIONS - THESE MUST BE OUTSIDE getMapFromOpenAI
   ============================================================ */

async function verifyMapAgainstContent(env, originalContent, generatedMap) {
  const verificationInput = `
## ORIGINAL CONTENT:
${originalContent.slice(0, 8000)}

## GENERATED ANALYSIS TO VERIFY:
${JSON.stringify(generatedMap, null, 2)}

Please verify the generated analysis against the original content. Check for any fabricated statistics, invented testimonials, or claims not supported by the original.
`;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: VERIFICATION_PROMPT },
          { role: "user", content: verificationInput },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Verification API error:", data?.error?.message);
      return { verified: false, skipped: true, reason: "API error" };
    }

    let text = data?.choices?.[0]?.message?.content || "";
    text = text.trim();

    if (text.startsWith("```")) {
      const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (m) text = m[1].trim();
    }

    return JSON.parse(text);
  } catch (e) {
    console.error("Verification parsing error:", e);
    return { verified: false, skipped: true, reason: "Parsing error" };
  }
}

function applyVerificationCorrections(originalMap, verificationResult) {
  if (!verificationResult || verificationResult.skipped) {
    return originalMap;
  }

  const correctedMap = { ...originalMap };

  // Helper to check if an item is a placeholder/garbage value
  function isPlaceholderItem(item) {
    if (!item || typeof item !== 'string') return true;
    const lower = item.toLowerCase().trim();
    // Catch all variations: "corrected item", "corrected_item", "correcteditem", numbered versions, etc.
    if (/corrected[\s_-]?item/i.test(item)) return true;
    if (/^item\s*\d*$/i.test(lower)) return true;  // "item 1", "item2", etc.
    if (/^placeholder/i.test(lower)) return true;
    if (/^example\s*\d*$/i.test(lower)) return true;
    if (lower.length < 3) return true;  // Too short to be meaningful
    return false;
  }

  if (verificationResult.corrections) {
    for (const [field, correctedItems] of Object.entries(verificationResult.corrections)) {
      if (Array.isArray(correctedItems) && correctedItems.length > 0) {
        // Filter out generic placeholder values
        const filtered = correctedItems.filter(item => !isPlaceholderItem(item));
        if (filtered.length > 0) {
          correctedMap[field] = filtered;
        }
      }
    }
  }

  if (verificationResult.issues && verificationResult.issues.length > 0) {
    const highSeverityIssues = verificationResult.issues.filter(i => i.severity === "high");
    
    for (const issue of highSeverityIssues) {
      if (issue.field === "fruit" && !verificationResult.corrections?.fruit) {
        correctedMap.fruit = correctedMap.fruit.map((item, idx) => {
          if (idx === issue.item_index) {
            // Provide specific recommendations based on issue type
            let suggestion = "Add verifiable proof point";
            if (issue.issue_type === "fabricated_statistic") {
              suggestion = "Add real metrics or testimonials";
            } else if (issue.issue_type === "invented_testimonial") {
              suggestion = "Include actual customer feedback";
            } else if (issue.recommendation) {
              suggestion = issue.recommendation.replace(/^SUGGESTION:\s*/, "");
            }
            return `SUGGESTION: ${suggestion}`;
          }
          return item;
        });
      }
    }
  }
  
  // If fruit is empty or all items were removed, add helpful suggestions
  // Also check if items are placeholder garbage values
  const fruitIsInvalid = !correctedMap.fruit || 
    correctedMap.fruit.length === 0 || 
    correctedMap.fruit.every(item => {
      if (!item || typeof item !== 'string') return true;
      const lower = item.toLowerCase().trim();
      if (/corrected[\s_-]?item/i.test(item)) return true;
      if (/^item\s*\d*$/i.test(lower)) return true;
      if (/^placeholder/i.test(lower)) return true;
      if (lower.length < 3) return true;
      return false;
    });
    
  if (fruitIsInvalid) {
    correctedMap.fruit = [
      "SUGGESTION: Add customer testimonials or reviews",
      "SUGGESTION: Include case studies or success stories",
      "SUGGESTION: Share measurable results or outcomes"
    ];
  }

  return correctedMap;
}

function flagSuspiciousContent(map, originalContent) {
  const warnings = [];
  const contentLower = (originalContent || "").toLowerCase();
  
  const suspiciousPatterns = {
    statistics: /\b(\d+%|\d{1,3}(,\d{3})*\+?|\bover\s+\d+|\bmore\s+than\s+\d+|\b\d+x\b)/gi,
    testimonials: /\b(users?\s+report|customers?\s+say|clients?\s+have|testimonials?\s+show|feedback\s+indicates)/gi,
    timeframes: /\b(\d+%\s+reduction|\d+%\s+increase|\d+\s+hours?\s+saved|\d+x\s+faster)/gi,
  };

  if (map.fruit) {
    map.fruit.forEach((item, idx) => {
      const itemStr = typeof item === 'string' ? item : JSON.stringify(item);
      
      if (itemStr.toUpperCase().startsWith("SUGGESTION:")) {
        return;
      }

      const statsMatch = itemStr.match(suspiciousPatterns.statistics);
      if (statsMatch) {
        const found = statsMatch.some(stat => contentLower.includes(stat.toLowerCase()));
        if (!found) {
          warnings.push({
            field: "fruit",
            index: idx,
            type: "unverified_statistic",
            content: itemStr,
            flagged_text: statsMatch.join(", "),
            severity: "high",
          });
        }
      }

      const testimMatch = itemStr.match(suspiciousPatterns.testimonials);
      if (testimMatch) {
        warnings.push({
          field: "fruit",
          index: idx,
          type: "testimonial_language",
          content: itemStr,
          flagged_text: testimMatch.join(", "),
          severity: "medium",
        });
      }
    });
  }

  if (map.cultivation_plan) {
    map.cultivation_plan.forEach((item, idx) => {
      const itemStr = typeof item === 'string' ? item : JSON.stringify(item);
      const statsMatch = itemStr.match(suspiciousPatterns.statistics);
      if (statsMatch) {
        warnings.push({
          field: "cultivation_plan",
          index: idx,
          type: "specific_claim_in_action",
          content: itemStr,
          flagged_text: statsMatch.join(", "),
          severity: "low",
        });
      }
    });
  }

  return warnings;
}

function cleanMapBasedOnFlags(map, flags) {
  if (!flags || flags.length === 0) {
    return map;
  }

  const cleanedMap = JSON.parse(JSON.stringify(map));
  const highSeverityFlags = flags.filter(f => f.severity === "high");
  
  for (const flag of highSeverityFlags) {
    if (flag.field === "fruit" && cleanedMap.fruit[flag.index]) {
      cleanedMap.fruit[flag.index] = `SUGGESTION: Add verifiable proof point (original contained unverified claim: "${flag.flagged_text}")`;
    }
  }

  return cleanedMap;
}

async function generateVerifiedMap(env, content) {
  console.log("Step 1: Generating initial map...");
  const initialMap = await getMapFromOpenAI(env, content);
  
  console.log("Step 2: Running automated flag detection...");
  const autoFlags = flagSuspiciousContent(initialMap, content);
  console.log(`Automated flags found: ${autoFlags.length}`);
  
  let verificationResult = null;
  let finalMap = initialMap;
  
  console.log("Step 3: Running AI verification...");
  verificationResult = await verifyMapAgainstContent(env, content, initialMap);
  console.log(`Verification result: ${verificationResult.verified ? 'PASSED' : 'ISSUES FOUND'}`);
  
  if (!verificationResult.verified && verificationResult.corrections) {
    console.log("Step 4: Applying corrections...");
    finalMap = applyVerificationCorrections(initialMap, verificationResult);
  }
  
  if (autoFlags.length > 0) {
    console.log("Step 5: Final cleanup based on flags...");
    finalMap = cleanMapBasedOnFlags(finalMap, autoFlags);
  }
  
  const verificationReport = {
    auto_flags: autoFlags,
    ai_verification: verificationResult ? {
      verified: verificationResult.verified,
      confidence_score: verificationResult.confidence_score,
      issues_count: verificationResult.issues?.length || 0,
      summary: verificationResult.summary,
    } : null,
    corrections_applied: verificationResult?.corrections ? Object.keys(verificationResult.corrections).length > 0 : false,
  };
  
  return {
    map: finalMap,
    verificationReport,
  };
}
// Convert ALL emojis (including multi-codepoint) into Twemoji CDN <img> tags
function replaceEmojiWithTwemoji(html) {
  return html.replace(
    /\p{Extended_Pictographic}/gu,
    (match) => {
      const codePointHex = match.codePointAt(0).toString(16);
      const url = `https://twemoji.maxcdn.com/v/latest/72x72/${codePointHex}.png`;
      return `
        <img src="${url}" 
             style="height:1em;width:1em;vertical-align:-0.1em;display:inline-block;" />`;
    }
  );
}

const VERIFICATION_PROMPT = `
You are a fact-checker for GEO linking strategy content. Your job is to verify that the generated analysis accurately reflects the source content WITHOUT hallucinations or fabrications.

## Your Task

Compare the ORIGINAL CONTENT against the GENERATED ANALYSIS and check for:

1. **Fabricated Statistics**: Any numbers, percentages, user counts, or quantitative claims that don't appear in the original
2. **Invented Testimonials**: Any quotes or testimonial-style claims not in the original
3. **False Specifics**: Specific claims about outcomes, results, or benefits not supported by the original
4. **Misattributions**: Claims attributed to the content that aren't actually there
5. **Hallucinated Proof Points**: "Fruit" items that state facts not present in the original

## Response Format

Return a JSON object:

{
  "verified": true/false,
  "confidence_score": 0-100,
  "issues": [
    {
      "field": "fruit",
      "item_index": 0,
      "original_text": "The problematic text from the analysis",
      "issue_type": "fabricated_statistic",
      "severity": "high",
      "recommendation": "Remove this fabricated claim"
    }
  ],
  "corrections": {
    "fruit": ["SUGGESTION: Add customer testimonials with specific outcomes", "SUGGESTION: Include case study results or metrics"]
  },
  "summary": "Brief explanation of verification results"
}

## CRITICAL: Corrections Format
- When providing corrections, write ACTUAL helpful suggestions
- NEVER use placeholder text like "corrected item 1", "corrected item 2", "item 1", etc.
- Every correction must be a complete, meaningful suggestion starting with "SUGGESTION:"
- If you cannot provide a meaningful correction, omit the corrections field entirely

## Severity Levels
- **high**: Fabricated statistics, fake testimonials, invented specific claims
- **medium**: Overly specific claims that extrapolate beyond content
- **low**: Minor phrasing that could be misinterpreted

## Rules
1. Be strict - if a specific claim can't be found in the original, flag it
2. Numbers and percentages are RED FLAGS - verify each one exists in original
3. Testimonial-style language ("users report...", "customers say...") must be verified
4. "SUGGESTION:" prefixed items are OK and should NOT be flagged
5. Generic best practices in "leaves" and "cultivation_plan" are OK
`.trim();

/* ------------ Build HTML for PDF (v32 - Fixed Issues) ------------- */
function buildHtml(map, brand, options = {}) {
  // Auto-detect page_intent_type if not provided
  if (!map.page_intent_type && map.page_intent) {
    const desc = (map.page_intent || '').toLowerCase();
    if (desc.includes('purchase') || desc.includes('sign up') || desc.includes('buy') || desc.includes('action') || desc.includes('transact')) {
      map.page_intent_type = 'Transactional';
    } else if (desc.includes('compare') || desc.includes('explore') || desc.includes('option') || desc.includes('evaluat')) {
      map.page_intent_type = 'Commercial';
    } else if (desc.includes('find') || desc.includes('navigate') || desc.includes('locate') || desc.includes('directory')) {
      map.page_intent_type = 'Navigational';
    } else {
      map.page_intent_type = 'Informational';
    }
  }

  const projectTitle = brand?.project_title || brand?.title || "GEO Linking Strategy Map";
  const sourceUrl = brand?.source_url || "";
  const geoFrameworkLink = options.geoFrameworkLink || "https://clemelopy.com/blueprint";
  const generatedDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  function esc(str = "") {
    return String(str).replace(/[&<>'"]/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[c]));
  }

  // Helper to check if item is a suggestion
  function isSuggestionItem(item) {
    if (!item || typeof item !== 'string') return false;
    return item.toUpperCase().startsWith("SUGGESTION:");
  }

  // Helper to format suggestion text with lightbulb
  function formatSuggestion(item) {
    if (!item || typeof item !== 'string') return '';
    return item.replace(/^SUGGESTION:\s*/i, '💡 ');
  }

  // Helper to render tags (for roots and branches) - NOW WITH SUGGESTION SUPPORT
  function renderTags(items, tagClass, emptyMessage) {
    const defaultMessages = {
      'roots': '💡 Consider defining 2-3 core themes that run through your content',
      'branches': '💡 Add sections that explore related subtopics to build depth'
    };
    const fallbackMsg = emptyMessage || defaultMessages[tagClass] || 'No items identified';
    
    if (!Array.isArray(items) || items.length === 0) {
      return '<div class="tag-list"><span class="tag ' + tagClass + ' suggestion">' + fallbackMsg + '</span></div>';
    }
    return '<div class="tag-list">' + items.map(item => {
      const itemStr = typeof item === 'string' ? item : (item.name || item.title || '');
      const isSuggestion = isSuggestionItem(itemStr);
      const displayText = isSuggestion ? formatSuggestion(itemStr) : itemStr;
      const extraClass = isSuggestion ? ' suggestion' : '';
      return '<span class="tag ' + tagClass + extraClass + '">' + esc(displayText) + '</span>';
    }).join('') + '</div>';
  }

  // Helper to render fruit items with SUGGESTION handling
  function renderFruit(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '<div class="tag-list"><span class="tag fruit suggestion">💡 No proof points found - consider adding testimonials or case studies</span></div>';
    }
    return '<div class="tag-list">' + items.map(item => {
      const itemStr = typeof item === 'string' ? item : (item.name || item.title || '');
      const isSuggestion = isSuggestionItem(itemStr);
      const displayText = isSuggestion ? formatSuggestion(itemStr) : itemStr;
      const extraClass = isSuggestion ? ' suggestion' : '';
      return '<span class="tag fruit' + extraClass + '">' + esc(displayText) + '</span>';
    }).join('') + '</div>';
  }

  // Helper to render anchor text items (soil) - NOW WITH SUGGESTION SUPPORT
  function renderAnchors(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '<div class="tag-list"><span class="tag soil suggestion">💡 Look for phrases you repeat naturally when describing your work</span></div>';
    }
    return '<div class="tag-list">' + items.map(item => {
      const itemStr = typeof item === 'string' ? item : '';
      const isSuggestion = isSuggestionItem(itemStr);
      if (isSuggestion) {
        return '<span class="tag soil suggestion">' + esc(formatSuggestion(itemStr)) + '</span>';
      }
      return '<span class="tag soil">"' + esc(itemStr) + '"</span>';
    }).join('') + '</div>';
  }

  // Helper to render link items (for pollinators and underground network) - NOW WITH SUGGESTION SUPPORT
  function renderLinkItems(items, iconEmoji, emptyMessage) {
    iconEmoji = iconEmoji || "🔗";
    const defaultEmpty = {
      title: "No suggestions available",
      desc: "Add your own in the dashboard"
    };
    
    if (!Array.isArray(items) || items.length === 0) {
      const msg = emptyMessage || defaultEmpty;
      return '<div class="link-item suggestion-item"><div class="link-icon">💡</div><div class="link-content"><h5>' + msg.title + '</h5><p>' + msg.desc + '</p></div></div>';
    }
    return items.map(function(item) {
      var title = typeof item === 'string' ? item.split(':')[0] : (item.name || item.title || '');
      var desc = typeof item === 'string' ? item.split(':').slice(1).join(':').trim() : (item.reason || item.description || '');
      var isSuggestion = isSuggestionItem(title);
      var icon = isSuggestion ? '💡' : iconEmoji;
      var extraClass = isSuggestion ? ' suggestion-item' : '';
      if (isSuggestion) {
        title = formatSuggestion(title);
      }
      return '<div class="link-item' + extraClass + '"><div class="link-icon">' + icon + '</div><div class="link-content"><h5>' + esc(title) + '</h5>' + (desc ? '<p>' + esc(desc) + '</p>' : '') + '</div></div>';
    }).join('');
  }

  // Helper to render clarity recommendations (leaves) - NOW WITH SUGGESTION SUPPORT
  function renderLeaves(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '<div class="link-item suggestion-item"><div class="link-icon">💡</div><div class="link-content"><h5>Add clear headings and structure</h5><p>Break content into scannable sections with descriptive headers</p></div></div>';
    }
    return items.map(function(item) {
      var title = typeof item === 'string' ? item : (item.title || '');
      var desc = typeof item === 'object' ? (item.description || '') : '';
      var isSuggestion = isSuggestionItem(title);
      var icon = isSuggestion ? '💡' : '📋';
      var extraClass = isSuggestion ? ' suggestion-item' : '';
      if (isSuggestion) {
        title = formatSuggestion(title);
      }
      return '<div class="link-item' + extraClass + '"><div class="link-icon">' + icon + '</div><div class="link-content"><h5>' + esc(title) + '</h5>' + (desc ? '<p>' + esc(desc) + '</p>' : '') + '</div></div>';
    }).join('');
  }

  // Helper to render checklist items (cultivation plan) - NOW WITH SUGGESTION SUPPORT
  function renderChecklist(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '<div class="checklist-item suggestion-item"><div class="checkbox">💡</div><span class="checklist-text">Review your content and identify one area to strengthen first</span><span class="priority medium">MEDIUM</span></div>';
    }
    return items.map(function(item) {
      var priority = 'medium';
      var text = String(item);
      var isSuggestion = isSuggestionItem(text);
      
      // Handle SUGGESTION: prefix
      if (isSuggestion) {
        text = formatSuggestion(text);
      }
      
      // Handle priority prefixes
      if (text.toUpperCase().startsWith('HIGH:')) {
        priority = 'high';
        text = text.substring(5).trim();
      } else if (text.toUpperCase().startsWith('MEDIUM:')) {
        priority = 'medium';
        text = text.substring(7).trim();
      } else if (text.toUpperCase().startsWith('LOW:')) {
        priority = 'low';
        text = text.substring(4).trim();
      }
      
      var checkboxContent = isSuggestion ? '💡' : '';
      var extraClass = isSuggestion ? ' suggestion-item' : '';
      return '<div class="checklist-item' + extraClass + '"><div class="checkbox">' + checkboxContent + '</div><span class="checklist-text">' + esc(text) + '</span><span class="priority ' + priority + '">' + priority.toUpperCase() + '</span></div>';
    }).join('');
  }

  return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'    <meta charset="UTF-8">\n' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'    <title>' + esc(projectTitle) + ' - GEO Linking Strategy Map</title>\n' +
'    <link href="https://fonts.googleapis.com/css2?family=Montserrat+Alternates:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">\n' +
'    <style>\n' +
'        :root {\n' +
'            --orange: #FAA819;\n' +
'            --dark-orange: #E99502;\n' +
'            --teal: #00A99D;\n' +
'            --dark-teal: #008F85;\n' +
'            --cream: #fffaf3;\n' +
'            --purple: #8B5CF6;\n' +
'            --dark-yellow: #D4A017;\n' +
'            --text-dark: #2D3748;\n' +
'            --text-medium: #4A5568;\n' +
'            --text-light: #718096;\n' +
'        }\n' +
'        * { margin: 0; padding: 0; box-sizing: border-box; }\n' +
'        body { font-family: "Inter", sans-serif; background: white; color: var(--text-dark); line-height: 1.6; }\n' +
'        .page { width: 8.5in; min-height: 11in; margin: 0 auto; background: white; position: relative; page-break-after: always; display: flex; flex-direction: column; }\n' +
'        .page:last-child { page-break-after: auto; }\n' +
'        .cover-page { background: linear-gradient(135deg, rgba(250,168,25,0.08) 0%, rgba(255,255,255,1) 50%, rgba(0,169,157,0.08) 100%)/background: linear-gradient(180deg, rgba(255,250,243,1) 0%, rgba(250,168,25,0.08) 25%, rgba(255,255,255,1) 50%, rgba(0,169,157,0.1) 100%); display: flex; flex-direction: column; height: 10in; max-height: 10in; overflow: hidden; page-break-after: always; page-break-inside: avoid; }\n' +
'        .cover-top-bar { height: 8px; background: linear-gradient(135deg, var(--orange) 0%, var(--teal) 100%); }\n' +
'        .cover-body { flex: 1; padding: 30px 60px 15px; display: flex; flex-direction: column; overflow: hidden; }\n' +
'        .cover-content { flex: 1; display: flex; flex-direction: column; justify-content: center; }\n' +
'        .cover-badge { display: inline-flex; align-items: center; gap: 8px; background: var(--dark-orange); color: white; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; letter-spacing: 1px; margin-bottom: 30px; width: fit-content; }\n' +
'        .cover-title { font-family: "Montserrat Alternates", sans-serif; font-size: 42px; font-weight: 700; color: var(--text-dark); line-height: 1.1; margin-bottom: 15px; }\n' +
'        .cover-subtitle { font-size: 16px; color: var(--text-medium); margin-bottom: 30px; max-width: 550px; line-height: 1.5; }\n' +
'        .cover-meta { display: flex; gap: 30px; padding-top: 20px; border-top: 1px solid rgba(0,0,0,0.08); }\n' +
'        .meta-item { display: flex; align-items: center; gap: 12px; }\n' +
'        .meta-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }\n' +
'        .meta-icon.link { background: rgba(0, 169, 157, 0.15); }\n' +
'        .meta-icon.date { background: rgba(250, 168, 25, 0.15); }\n' +
'        .meta-label { font-size: 11px; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }\n' +
'        .meta-value { font-size: 14px; color: var(--text-dark); font-weight: 500; }\n' +
'        .cover-logo { text-align: center; padding: 20px 0; margin-top: auto; flex-shrink: 0; }\n' +
'        .cover-footer { background: linear-gradient(135deg, var(--orange) 0%, var(--teal) 100%); padding: 15px 40px; color: white; font-size: 12px; line-height: 1.5; flex-shrink: 0; }\n' +
'        .ecosystem-page { padding: 0; min-height: 11in; overflow: visible; display: flex; flex-direction: column; page-break-inside: avoid; }\n' +
'        .page-title-bar { background: white; padding: 25px 40px 15px;; }\n' +
'        .page-title { font-family: "Montserrat Alternates", sans-serif; font-size: 26px; font-weight: 700; color: var(--text-dark); display: block; white-space: nowrap; }\n' +
'        .gradient-text { background: linear-gradient(135deg, #FAA819 0%, #D4890F 50%, #00A99D 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; padding: 0 8px; margin: 0 -8px; }\n' +
'        .ecosystem-content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 10px 0 10px; }\n' +
'        .ecosystem-graphic { width: calc(100% - 100px); height: auto; margin: 0 50px 20px 50px; }\n' +
'        .ecosystem-description { max-width: 100%; text-align: left; padding: 0 40px; }\n' +
'        .ecosystem-description p { font-size: 14px; color: var(--text-medium); line-height: 1.6; margin-bottom: 14px; }\n' +
'        .ecosystem-description p:last-child { margin-bottom: 0; font-family: "Montserrat Alternates", sans-serif; font-weight: 500; color: var(--teal); }\n' +
'        .ecosystem-tagline { text-align: center; padding: 15px 40px 20px; font-family: "Montserrat Alternates", sans-serif; font-size: 13px; font-weight: 500; color: var(--teal); line-height: 1.5; }\n' +
'        .ecosystem-closing { text-align: center; padding: 25px 50px; font-family: "Montserrat Alternates", sans-serif; font-size: 15px; font-weight: 500; color: var(--text-medium); line-height: 1.7; }\n' +
'        .framework-icons { padding: 0 40px; }\n' +
'        .icon-row { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 15px; padding: 14px; border-radius: 12px; }\n' +
'        .icon-row.orange-bg { background: rgba(250,168,25,0.08); }\n' +
'        .icon-row.teal-bg { background: rgba(0,169,157,0.08); }\n' +
'        .icon-row.yellow-bg { background: rgba(212,180,0,0.08); }\n' +
'        .icon-row img { width: 60px; height: 60px; flex-shrink: 0; }\n' +
'        .icon-row-content h3 { font-family: "Montserrat Alternates", sans-serif; font-size: 15px; font-weight: 600; color: var(--teal); margin-bottom: 5px; }\n' +
'        .icon-row-content p { font-size: 12px; color: var(--text-medium); line-height: 1.5; margin: 0; }\n' +
'        .page-footer { background: linear-gradient(135deg, var(--orange) 0%, var(--teal) 100%); padding: 16px 40px; color: white !important; display: flex; align-items: center; position: relative; margin-top: auto; }\n' +
'        .footer-center { flex: 1; text-align: center; font-family: "Montserrat Alternates", sans-serif; font-size: 13px; font-weight: 500; color: white !important; }\n' +
'        .footer-page { position: absolute; right: 40px; font-family: "Montserrat Alternates", sans-serif; font-size: 12px; font-weight: 500; }\n' +
'        .content-page { padding: 0; min-height: 11in; height: 11in; display: flex; flex-direction: column; page-break-after: always; }\n' +
'        .content-page:last-child { page-break-after: auto; }\n' +
'        .section-header { padding: 20px 40px; color: white; display: flex; align-items: center; gap: 20px; background: #0D7871; flex-shrink: 0; }\n' +
'        .section-icon { width: 60px; height: 60px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }\n' +
'        .section-icon img { width: 100%; height: 100%; object-fit: cover; }\n' +
'        .section-title-group { flex: 1; }\n' +
'        .section-title { font-family: "Montserrat Alternates", sans-serif; font-size: 24px; font-weight: 700; margin-bottom: 2px; }\n' +
'        .section-subtitle { font-size: 13px; opacity: 0.9; }\n' +
'        .content-body { flex: 1; padding: 25px 40px; }\n' +
'        .edu-block { background: linear-gradient(135deg, rgba(0,169,157,0.08) 0%, rgba(0,169,157,0.03) 100%); border-left: 4px solid var(--teal); border-radius: 0 16px 16px 0; padding: 20px 25px; margin-bottom: 20px; }\n' +
'        .edu-block h3 { font-family: "Montserrat Alternates", sans-serif; font-size: 15px; font-weight: 600; color: var(--teal); margin-bottom: 10px; }\n' +
'        .edu-block h4 { font-family: "Montserrat Alternates", sans-serif; font-size: 13px; font-weight: 600; color: var(--dark-teal); margin-top: 12px; margin-bottom: 6px; }\n' +
'        .edu-block p { color: var(--text-medium); font-size: 13px; line-height: 1.7; }\n' +
'        .edu-block .example-text { margin: 12px 0 12px 20px; padding: 10px 15px; background: rgba(0,169,157,0.08); border-radius: 8px; font-style: italic; color: var(--teal); }\n' +
'        .data-block { background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; margin-bottom: 20px; }\n' +
'        .data-header { padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; color: white; }\n' +
'        .data-header.roots { background: #F7931E; }\n' +
'        .data-header.soil { background: #F7931E; }\n' +
'        .data-header.trunk { background: #F7931E; }\n' +
'        .data-header.branches { background: #00A99D; }\n' +
'        .data-header.leaves { background: #00A99D; }\n' +
'        .data-header.fruit { background: #D4A017; }\n' +
'        .data-header.pollinators { background: #D4A017; }\n' +
'        .data-header.network { background: #00A99D; }\n' +
'        .data-header.action { background: #0D7871; }\n' +
'        .data-header h4 { font-family: "Montserrat Alternates", sans-serif; font-size: 14px; font-weight: 600; }\n' +
'        .data-header .count { background: rgba(255,255,255,0.25); padding: 4px 12px; border-radius: 12px; font-size: 12px; }\n' +
'        .data-body { padding: 18px 20px; }\n' +
'        .tag-list { display: flex; flex-wrap: wrap; gap: 10px; }\n' +
'        .tag { padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; }\n' +
'        .tag.roots { background: rgba(247,147,30,0.15); color: #C67D18; }\n' +
'        .tag.soil { background: rgba(247,147,30,0.15); color: #C67D18; }\n' +
'        .tag.branches { background: rgba(93,138,62,0.15); color: #4A6F32; }\n' +
'        .tag.fruit { background: rgba(232,140,30,0.15); color: #B86E18; }\n' +
'        .tag.fruit.suggestion { background: rgba(139,92,246,0.15); color: #7C3AED; font-style: italic; }\n' +
'        .tag.roots.suggestion, .tag.branches.suggestion, .tag.soil.suggestion { background: rgba(139,92,246,0.15); color: #7C3AED; font-style: italic; }\n' +
'        .link-item { display: flex; align-items: flex-start; gap: 15px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }\n' +
'        .link-item:last-child { border-bottom: none; }\n' +
'        .link-item.suggestion-item { background: rgba(139,92,246,0.05); border-radius: 8px; padding: 12px; margin: 4px 0; }\n' +
'        .link-item.suggestion-item h5 { color: #7C3AED; font-style: italic; }\n' +
'        .link-icon { width: 36px; height: 36px; background: #f7f7f7; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }\n' +
'        .link-content h5 { font-size: 13px; font-weight: 600; color: var(--text-dark); margin-bottom: 3px; }\n' +
'        .link-content p { font-size: 12px; color: var(--text-light); font-style: italic; }\n' +
'        .impl-block { background: linear-gradient(135deg, rgba(250,168,25,0.08) 0%, rgba(250,168,25,0.03) 100%); border-left: 4px solid var(--orange); border-radius: 0 16px 16px 0; padding: 20px 25px; }\n' +
'        .impl-block h3 { font-family: "Montserrat Alternates", sans-serif; font-size: 15px; font-weight: 600; color: var(--dark-orange); margin-bottom: 12px; }\n' +
'        .impl-list { list-style: none; }\n' +
'        .impl-list li { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; color: var(--text-medium); font-size: 13px; }\n' +
'        .impl-list li .arrow { color: var(--orange); font-weight: bold; flex-shrink: 0; }\n' +
'        .impl-note { margin-top: 12px; font-size: 12px; font-style: italic; color: var(--text-light); }\n' +
'        /* Allow page breaks inside content body, but try to keep individual blocks together */\n' +
'        .edu-block, .data-block, .impl-block { page-break-inside: avoid; break-inside: avoid; margin-bottom: 15px; }\n' +
'        /* Don\'t force blocks to stay together if it causes large gaps */\n' +
'        .content-body { page-break-inside: auto; break-inside: auto; }\n' +
'        .section-header { page-break-after: avoid; break-after: avoid; }\n' +
'        .page-footer { page-break-before: avoid; break-before: avoid; }\n' +
'        .anchor-item { padding: 12px 18px; border-left: 3px solid #8B6914; background: #fafafa; border-radius: 0 8px 8px 0; margin-bottom: 8px; font-size: 13px; color: var(--text-dark); }\n' +
'        .checklist-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }\n' +
'        .checklist-item:last-child { border-bottom: none; }\n' +
'        .checklist-item.suggestion-item { background: rgba(139,92,246,0.05); border-radius: 8px; padding: 12px; margin: 4px 0; }\n' +
'        .checklist-item.suggestion-item .checklist-text { color: #7C3AED; font-style: italic; }\n' +
'        .checkbox { width: 20px; height: 20px; border: 2px solid #d0d0d0; border-radius: 4px; flex-shrink: 0; }\n' +
'        .checklist-text { flex: 1; font-size: 13px; color: var(--text-medium); }\n' +
'        .priority { padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }\n' +
'        .priority.high { background: #FEE2E2; color: #DC2626; }\n' +
'        .priority.medium { background: #FEF3C7; color: #D97706; }\n' +
'        .priority.low { background: #DBEAFE; color: #2563EB; }\n' +
'        .cta-list { list-style: none; padding-left: 10px; margin-bottom: 25px; }\n' +
'        .cta-list li { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; color: var(--text-medium); font-size: 14px; }\n' +
'        .cta-list li .bullet { color: var(--orange); font-weight: bold; }\n' +
'        .cta-button { display: inline-flex; align-items: center; gap: 10px; background: linear-gradient(135deg, var(--orange) 0%, var(--teal) 100%); color: white; padding: 16px 32px; border-radius: 12px; font-family: "Montserrat Alternates", sans-serif; font-size: 16px; font-weight: 600; text-decoration: none; }\n' +
'        .intent-list { list-style: none; margin: 12px 0; padding-left: 0; }\n' +
'        .intent-list li { padding: 6px 0; color: var(--text-medium); font-size: 13px; }\n' +
'        .intent-list li strong { color: var(--dark-teal); }\n' +
'        .intent-badge { display: inline-block; background: linear-gradient(135deg, var(--orange) 0%, var(--teal) 100%); color: white; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }\n' +
'    </style>\n' +
'</head>\n' +
'<body>\n' +
'\n' +
'    <!-- PAGE 1: COVER -->\n' +
'    <div class="page cover-page">\n' +
'        <div class="cover-top-bar"></div>\n' +
'        <div class="cover-body">\n' +
'            <div class="cover-content">\n' +
'                <div class="cover-badge">📊 GEO LINKING STRATEGY MAP</div>\n' +
'                <h1 class="cover-title">' + esc(projectTitle) + '</h1>\n' +
'                <p class="cover-subtitle">A comprehensive linking strategy to strengthen your content ecosystem and improve AI discoverability.</p>\n' +
'                <div class="cover-meta">\n' +
(sourceUrl ? '                    <div class="meta-item"><div class="meta-icon link">🔗</div><div><div class="meta-label">Source URL</div><div class="meta-value">' + esc(sourceUrl) + '</div></div></div>\n' : '') +
'                    <div class="meta-item"><div class="meta-icon date">📅</div><div><div class="meta-label">Generated</div><div class="meta-value">' + generatedDate + '</div></div></div>\n' +
'                </div>\n' +
'            </div>\n' +
'            <div class="cover-logo"><img src="' + ICON_URLS.logo + '" alt="Clemelopy" style="height: 70px; width: auto;"></div>\n' +
'        </div>\n' +
'        <div class="cover-footer">This strategy map analyzes your content and provides actionable recommendations for internal linking, external references, and anchor text optimization to improve your visibility in both traditional search engines and AI-powered generative engines.</div>\n' +
'    </div>\n' +
'\n' +
'    <!-- PAGE 2: ECOSYSTEM INFOGRAPHIC -->\n' +
'    <div class="page ecosystem-page">\n' +
'        <div class="cover-top-bar"></div>\n' +
'        <div class="page-title-bar"><h1 class="page-title">Understanding Your <span class="gradient-text">Orchard Ecosystem</span> Framework&trade;</h1></div>\n' +
'        <div class="ecosystem-content">\n' +
'            <img class="ecosystem-graphic" src="' + ICON_URLS.ecosystem + '" alt="Clemelopy Orchard Ecosystem">\n' +
'            <p class="ecosystem-tagline" style="color: var(--text-medium);">Clemelopy\'s Orchard Ecosystem Framework&trade; gives you a way to see your content as a living system—one that grows stronger page by page through clarity, connection, and care.</p>\n' +
'            <div class="framework-icons">\n' +
'                <div class="icon-row orange-bg"><img src="' + ICON_URLS.roots + '" alt="Roots"><div class="icon-row-content"><h3>Roots — Core Concepts</h3><p>Root concepts are the core ideas this page grows from. They\'re the themes that run quietly but consistently beneath the surface of a single page, shaping what it\'s really about.</p></div></div>\n' +
'                <div class="icon-row orange-bg"><img src="' + ICON_URLS.soil + '" alt="Soil"><div class="icon-row-content"><h3>Soil — Anchor Text</h3><p>Soil is the shared language or "anchor text" beneath your content. It\'s the words and phrases you use consistently when you name ideas, write links, and describe what you do.</p></div></div>\n' +
'            </div>\n' +
'        </div>\n' +
'        <div class="page-footer"><div class="footer-center">&copy; Clemelopy&trade; All Rights Reserved | Clemelopy.com</div><div class="footer-page">pg. 2</div></div>\n' +
'    </div>\n' +
'\n' +
'    <!-- PAGE 3: ECOSYSTEM CONTINUED -->\n' +
'    <div class="page content-page">\n' +
'        <div class="cover-top-bar"></div>\n' +
'        <div class="content-body" style="padding-top: 30px;">\n' +
'            <div class="framework-icons">\n' +
'                <div class="icon-row orange-bg"><img src="' + ICON_URLS.trunk + '" alt="Trunk"><div class="icon-row-content"><h3>Trunk — Page Intent</h3><p>The trunk represents the main purpose of a page. It\'s the single job everything else supports—every section, link, and example grows in service of that intent.</p></div></div>\n' +
'                <div class="icon-row teal-bg"><img src="' + ICON_URLS.branches + '" alt="Branches"><div class="icon-row-content"><h3>Branches — Supporting Topics</h3><p>Branches are the related ideas that grow out from your page\'s main topic. They add depth, context, and dimension to what you\'re sharing.</p></div></div>\n' +
'                <div class="icon-row teal-bg"><img src="' + ICON_URLS.network + '" alt="Underground Network"><div class="icon-row-content"><h3>Underground Network — Internal Links</h3><p>The underground network represents the internal links this page uses to connect to other related pages. These links quietly support how ideas flow from one page to another within your ecosystem.</p></div></div>\n' +
'                <div class="icon-row teal-bg"><img src="' + ICON_URLS.leaves + '" alt="Leaves"><div class="icon-row-content"><h3>Leaves — Clarity Signals</h3><p>Leaves describe how this specific page communicates. They include the headings, structure, spacing, summaries, and overall flow used on this page.</p></div></div>\n' +
'                <div class="icon-row yellow-bg"><img src="' + ICON_URLS.fruit + '" alt="Fruit"><div class="icon-row-content"><h3>Fruit — Proof &amp; Outcomes</h3><p>Fruit is the visible result of this page\'s work. It includes the examples, experiences, results, stories, or proof that show the ideas on this page in action.</p></div></div>\n' +
'                <div class="icon-row yellow-bg"><img src="' + ICON_URLS.pollinators + '" alt="Pollinators"><div class="icon-row-content"><h3>Pollinators — External Authority</h3><p>Pollinators are trusted outside sources this page references—articles, research, tools, or voices that add context and credibility to what\'s being shared here.</p></div></div>\n' +
'            </div>\n' +
'            <p class="ecosystem-closing">Together, these elements show how a single page functions as part of a larger ecosystem. When roots, soil, trunks, branches, underground networks, leaves, fruit, and pollinators work in harmony, the page becomes easier to understand, easier to navigate, and easier to place within your broader site structure.</p>\n' +
'        </div>\n' +
'        <div class="page-footer"><div class="footer-center">&copy; Clemelopy&trade; All Rights Reserved | Clemelopy.com</div><div class="footer-page">pg. 3</div></div>\n' +
'    </div>\n' +
'\n' +
'    <!-- PAGE 4: ROOTS -->\n' +
'    <div class="page content-page">\n' +
'        <div class="section-header"><div class="section-icon"><img src="' + ICON_URLS.roots + '" alt="Roots"></div><div class="section-title-group"><div class="section-title">Roots — Core Concepts</div><div class="section-subtitle">The foundational ideas your content grows from</div></div></div>\n' +
'        <div class="content-body">\n' +
'            <div class="edu-block"><h3>What Are Root Concepts?</h3><p>Just like a tree needs strong roots to stand, each page needs clear foundational ideas to stay grounded. When a page\'s root concepts are strong and consistent, both people and generative engines can easily understand the purpose of the page and the role it plays within your larger ecosystem.</p><h4>In the Orchard</h4><p>Roots anchor your page into the larger ecosystem, helping it draw strength from related content and reinforcing your authority over time.</p></div>\n' +
'            <div class="data-block"><div class="data-header roots"><h4>Your Root Concepts</h4><span class="count">' + (map?.roots || []).length + ' items</span></div><div class="data-body">' + renderTags(map?.roots, 'roots') + '</div></div>\n' +
'            <div class="impl-block"><h3>How to Implement Roots</h3><ul class="impl-list"><li><span class="arrow">→</span> Let each root concept appear naturally in your content, the way you\'d explain it to a real person</li><li><span class="arrow">→</span> Create sections or supporting pages that gently expand on each root idea</li><li><span class="arrow">→</span> Use these concepts consistently in headings and summaries so they feel familiar, not forced</li><li><span class="arrow">→</span> Connect related pages using the same language to strengthen meaning across the orchard</li></ul><p class="impl-note">If it feels clear to you, it will feel clear to AI.</p></div>\n' +
'        </div>\n' +
'        <div class="page-footer"><div class="footer-center">&copy; Clemelopy&trade; All Rights Reserved | Clemelopy.com</div><div class="footer-page">pg. 4</div></div>\n' +
'    </div>\n' +
'\n' +
'    <!-- PAGE 5: SOIL -->\n' +
'    <div class="page content-page">\n' +
'        <div class="section-header"><div class="section-icon"><img src="' + ICON_URLS.soil + '" alt="Soil"></div><div class="section-title-group"><div class="section-title">Soil — Anchor Text &amp; Language</div><div class="section-subtitle">The shared language beneath your content</div></div></div>\n' +
'        <div class="content-body">\n' +
'            <div class="edu-block"><h3>What Is Anchor Text?</h3><p>For example, if you regularly explain your work as "taking the overwhelm out of generative engine optimization," that same language should show up across your site—especially in links. An internal link might naturally read:</p><div class="example-text" style="font-size: 12px;">Clemelopy takes the overwhelm out of generative engine optimization (linked to clemelopy.com/generative-engine-optimization)</div><p>When the same language appears in your content, your links, and your page names, meaning has a place to take hold. AI can more easily understand how your pages relate, and readers experience less friction as they move through your site.</p><h4>In the Orchard</h4><p>Soil supports every tree. Good soil doesn\'t call attention to itself—it quietly makes everything stronger.</p></div>\n' +
'            <div class="data-block"><div class="data-header soil"><h4>Suggested Anchor Text Phrases</h4><span class="count">' + (map?.soil || []).length + ' items</span></div><div class="data-body">' + renderAnchors(map?.soil) + '</div></div>\n' +
'            <div class="impl-block"><h3>How to Implement Soil</h3><ul class="impl-list"><li><span class="arrow">→</span> Use clear, descriptive phrases when linking between pages</li><li><span class="arrow">→</span> Let anchor text sound like something you\'d naturally say</li><li><span class="arrow">→</span> Reuse familiar language so ideas feel connected across your site</li><li><span class="arrow">→</span> Avoid vague links like "click here" when a clearer phrase would help</li></ul></div>\n' +
'        </div>\n' +
'        <div class="page-footer"><div class="footer-center">&copy; Clemelopy&trade; All Rights Reserved | Clemelopy.com</div><div class="footer-page">pg. 5</div></div>\n' +
'    </div>\n' +
'\n' +
'    <!-- PAGE 6: TRUNK -->\n' +
'    <div class="page content-page">\n' +
'        <div class="section-header"><div class="section-icon"><img src="' + ICON_URLS.trunk + '" alt="Trunk"></div><div class="section-title-group"><div class="section-title">Trunk — Page Intent</div><div class="section-subtitle">The single job this page is meant to do</div></div></div>\n' +
'        <div class="content-body">\n' +
'            <div class="edu-block"><h3>What Is Page Intent?</h3><p>When a page has a clear trunk, the rest of the content grows in a focused, intentional way. This clarity helps generative engines understand what the page is meant to do, and helps readers move through it with clarity.</p><p style="margin-top: 12px;">Each page in your ecosystem typically falls into one of four intent types:</p><ul class="intent-list"><li><strong>Informational</strong> — to help someone learn or understand something</li><li><strong>Navigational</strong> — to guide someone to a specific place or resource</li><li><strong>Commercial</strong> — to help someone explore options or compare solutions</li><li><strong>Transactional</strong> — to help someone take action, purchase, or sign up</li></ul><h4>In the Orchard</h4><p>The trunk gives the tree structure and direction, helping both readers and AI understand how this page fits into the larger orchard.</p></div>\n' +
'            <div class="data-block"><div class="data-header trunk"><h4>Your Page Intent</h4><span class="count">Analysis</span></div><div class="data-body">' + (map?.page_intent_type ? '<span class="intent-badge">' + esc(map.page_intent_type) + '</span>' : '') + '<p style="font-size: 13px; color: #4A5568; line-height: 1.7;">' + esc(map?.page_intent || 'No page intent analysis available.') + '</p></div></div>\n' +
'            <div class="impl-block"><h3>How to Implement the Trunk</h3><ul class="impl-list"><li><span class="arrow">→</span> Be clear about the page\'s purpose early on, especially near the top</li><li><span class="arrow">→</span> Let supporting topics and examples reinforce that purpose rather than compete with it</li><li><span class="arrow">→</span> If a section doesn\'t serve the main goal, consider trimming or moving it elsewhere</li><li><span class="arrow">→</span> Think: What should someone walk away understanding after this page?</li></ul></div>\n' +
'        </div>\n' +
'        <div class="page-footer"><div class="footer-center">&copy; Clemelopy&trade; All Rights Reserved | Clemelopy.com</div><div class="footer-page">pg. 6</div></div>\n' +
'    </div>\n' +
'\n' +
'    <!-- PAGE 7: BRANCHES -->\n' +
'    <div class="page content-page">\n' +
'        <div class="section-header"><div class="section-icon"><img src="' + ICON_URLS.branches + '" alt="Branches"></div><div class="section-title-group"><div class="section-title">Branches — Supporting Topics</div><div class="section-subtitle">Related ideas that extend from your main topic</div></div></div>\n' +
'        <div class="content-body">\n' +
'            <div class="edu-block"><h3>What Are Supporting Topics?</h3><p>These are the sections, examples, or subtopics that show you don\'t just mention a topic—you explore it thoughtfully. Branches help generative engines understand the breadth of your knowledge, and they give readers clear paths to follow based on what feels most relevant to them.</p><h4>In the Orchard</h4><p>Branches reach outward, connecting this page to other parts of your site and creating natural opportunities for growth.</p></div>\n' +
'            <div class="data-block"><div class="data-header branches"><h4>Your Branch Topics</h4><span class="count">' + (map?.branches || []).length + ' items</span></div><div class="data-body">' + renderTags(map?.branches, 'branches') + '</div></div>\n' +
'            <div class="impl-block"><h3>How to Implement Branches</h3><ul class="impl-list"><li><span class="arrow">→</span> Link branch topics to supporting pages or sections where they can be explored more deeply</li><li><span class="arrow">→</span> If a branch doesn\'t have a destination yet, treat it as a future content seed</li><li><span class="arrow">→</span> Keep branch links helpful and contextual, not overwhelming</li><li><span class="arrow">→</span> Let curiosity guide the connections rather than trying to link everything at once</li></ul></div>\n' +
'        </div>\n' +
'        <div class="page-footer"><div class="footer-center">&copy; Clemelopy&trade; All Rights Reserved | Clemelopy.com</div><div class="footer-page">pg. 7</div></div>\n' +
'    </div>\n' +
'\n' +
'    <!-- PAGE 8: LEAVES -->\n' +
'    <div class="page content-page">\n' +
'        <div class="section-header"><div class="section-icon"><img src="' + ICON_URLS.leaves + '" alt="Leaves"></div><div class="section-title-group"><div class="section-title">Leaves — Clarity &amp; Comprehension</div><div class="section-subtitle">How your content communicates</div></div></div>\n' +
'        <div class="content-body">\n' +
'            <div class="edu-block"><h3>What Are Clarity Signals?</h3><p>Clear leaves help turn attention into understanding. When a page is easy to scan and follow, both people and generative engines can quickly understand what the page is about, what matters most, and how the ideas fit together—without needing extra context from elsewhere on your site.</p><h4>In the Orchard</h4><p>Leaves power the entire system. Without clarity, even strong roots and branches struggle to thrive.</p></div>\n' +
'            <div class="data-block"><div class="data-header leaves"><h4>Clarity Opportunities</h4><span class="count">Recommendations</span></div><div class="data-body">' + renderLeaves(map?.leaves) + '</div></div>\n' +
'            <div class="impl-block"><h3>How to Implement Leaves</h3><ul class="impl-list"><li><span class="arrow">→</span> Break longer sections into clear, meaningful headings</li><li><span class="arrow">→</span> Use spacing and formatting to give ideas room to breathe</li><li><span class="arrow">→</span> Add short summaries where concepts feel dense or layered</li><li><span class="arrow">→</span> Read the page once as a skimmer — does the message still make sense?</li></ul></div>\n' +
'        </div>\n' +
'        <div class="page-footer"><div class="footer-center">&copy; Clemelopy&trade; All Rights Reserved | Clemelopy.com</div><div class="footer-page">pg. 8</div></div>\n' +
'    </div>\n' +
'\n' +
'    <!-- PAGE 9: FRUIT -->\n' +
'    <div class="page content-page">\n' +
'        <div class="section-header"><div class="section-icon"><img src="' + ICON_URLS.fruit + '" alt="Fruit"></div><div class="section-title-group"><div class="section-title">Fruit — Proof &amp; Outcomes</div><div class="section-subtitle">The visible results of your work</div></div></div>\n' +
'        <div class="content-body">\n' +
'            <div class="edu-block"><h3>What Is Proof &amp; Outcomes?</h3><p>Fruit builds trust by helping readers—and generative engines—see that what\'s being shared here isn\'t just theoretical. It demonstrates how the ideas on this page show up in the real world.</p><h4>In the Orchard</h4><p>Fruit signals that a page has something meaningful to offer. It reflects maturity, credibility, and value, helping this page earn trust as part of the larger ecosystem.</p></div>\n' +
'            <div class="data-block"><div class="data-header fruit"><h4>Your Proof Points</h4><span class="count">' + (map?.fruit || []).length + ' items</span></div><div class="data-body">' + renderFruit(map?.fruit) + '</div></div>\n' +
'            <div class="impl-block"><h3>How to Implement Fruit</h3><ul class="impl-list"><li><span class="arrow">→</span> Place proof close to the claims it supports</li><li><span class="arrow">→</span> Link examples to deeper context when possible</li><li><span class="arrow">→</span> Use real outcomes instead of general statements whenever you can</li><li><span class="arrow">→</span> You don\'t need a lot of fruit — just honest, well-placed examples</li></ul></div>\n' +
'        </div>\n' +
'        <div class="page-footer"><div class="footer-center">&copy; Clemelopy&trade; All Rights Reserved | Clemelopy.com</div><div class="footer-page">pg. 9</div></div>\n' +
'    </div>\n' +
'\n' +
'    <!-- PAGE 10: POLLINATORS -->\n' +
'    <div class="page content-page">\n' +
'        <div class="section-header"><div class="section-icon"><img src="' + ICON_URLS.pollinators + '" alt="Pollinators"></div><div class="section-title-group"><div class="section-title">Pollinators — External Authority</div><div class="section-subtitle">Trusted outside sources that add credibility</div></div></div>\n' +
'        <div class="content-body">\n' +
'            <div class="edu-block"><h3>What Is External Authority?</h3><p>By including thoughtful external references, this page shows that its ideas are informed, well-supported, and part of a broader conversation. Pollinators help generative engines understand where this page fits within the larger landscape of ideas, and they help readers feel confident in what they\'re learning.</p><h4>In the Orchard</h4><p>Pollinators connect a page to the wider ecosystem beyond your site. They bring in perspective, reinforce trust, and help this page grow stronger through meaningful connections.</p></div>\n' +
'            <div class="data-block"><div class="data-header pollinators"><h4>Suggested External Links</h4><span class="count">' + (map?.pollinators || []).length + ' items</span></div><div class="data-body">' + renderLinkItems(map?.pollinators, '🔗') + '</div></div>\n' +
'            <div class="impl-block"><h3>How to Implement Pollinators</h3><ul class="impl-list"><li><span class="arrow">→</span> Link to outside sources when they genuinely support your point</li><li><span class="arrow">→</span> Choose quality over quantity</li><li><span class="arrow">→</span> Open external links in a new tab so readers don\'t lose their place</li><li><span class="arrow">→</span> Think of these links as helpful context, not endorsements</li></ul></div>\n' +
'        </div>\n' +
'        <div class="page-footer"><div class="footer-center">&copy; Clemelopy&trade; All Rights Reserved | Clemelopy.com</div><div class="footer-page">pg. 10</div></div>\n' +
'    </div>\n' +
'\n' +
'    <!-- PAGE 11: UNDERGROUND NETWORK -->\n' +
'    <div class="page content-page">\n' +
'        <div class="section-header"><div class="section-icon"><img src="' + ICON_URLS.network + '" alt="Underground Network"></div><div class="section-title-group"><div class="section-title">Underground Network — Internal Connections</div><div class="section-subtitle">The invisible web of connections between your pages</div></div></div>\n' +
'        <div class="content-body">\n' +
'            <div class="edu-block"><h3>What Are Internal Connections?</h3><p>Internal connections help generative engines understand how this page fits into the larger picture. By linking thoughtfully to related content, meaning, relevance, and authority can move naturally between pages—strengthening this page and the ecosystem around it.</p><h4>In the Orchard</h4><p>The underground network allows pages to share strength beneath the surface. It helps ideas stay connected and ensures no page exists in isolation.</p></div>\n' +
'            <div class="data-block"><div class="data-header network"><h4>Suggested Internal Links</h4><span class="count">' + (map?.underground_network || []).length + ' items</span></div><div class="data-body">' + renderLinkItems(map?.underground_network, '🔗') + '</div></div>\n' +
'            <div class="impl-block"><h3>How to Implement the Underground Network</h3><ul class="impl-list"><li><span class="arrow">→</span> Link upward to core pages that explain bigger ideas</li><li><span class="arrow">→</span> Link downward to supporting content and examples</li><li><span class="arrow">→</span> Make sure important pages aren\'t standing alone</li><li><span class="arrow">→</span> Focus on connection over quantity — a few thoughtful links go a long way</li></ul></div>\n' +
'        </div>\n' +
'        <div class="page-footer"><div class="footer-center">&copy; Clemelopy&trade; All Rights Reserved | Clemelopy.com</div><div class="footer-page">pg. 11</div></div>\n' +
'    </div>\n' +
'\n' +
'    <!-- PAGE 12: CULTIVATION PLAN -->\n' +
'    <div class="page content-page">\n' +
'        <div class="section-header"><div class="section-title-group"><div class="section-title">Cultivation Plan — What to Do Next</div><div class="section-subtitle">A simple, intentional set of actions to strengthen this page</div></div></div>\n' +
'        <div class="content-body">\n' +
'            <div class="edu-block"><h3>What Is a Cultivation Plan?</h3><p>Your cultivation plan is a simple, intentional set of actions to strengthen this page over time. Healthy orchards don\'t grow by accident. Small, thoughtful adjustments compound into long-term strength.</p><h4>In the Orchard</h4><p>Cultivation keeps the ecosystem balanced, productive, and growing season after season.</p></div>\n' +
'            <div class="data-block"><div class="data-header action"><h4>Your Action Items</h4><span class="count">' + (map?.cultivation_plan || []).length + ' items</span></div><div class="data-body">' + renderChecklist(map?.cultivation_plan) + '</div></div>\n' +
'            <div class="impl-block"><h3>How to Implement Your Cultivation Plan</h3><ul class="impl-list"><li><span class="arrow">→</span> Start with the highest-impact changes first</li><li><span class="arrow">→</span> Tackle one section at a time — there\'s no rush</li><li><span class="arrow">→</span> Revisit this page as your content evolves</li><li><span class="arrow">→</span> Remember: progress compounds in ecosystems</li></ul></div>\n' +
'        </div>\n' +
'        <div class="page-footer"><div class="footer-center">&copy; Clemelopy&trade; All Rights Reserved | Clemelopy.com</div><div class="footer-page">pg. 12</div></div>\n' +
'    </div>\n' +
'\n' +
'    <!-- PAGE 13: GEO BLUEPRINT CTA -->\n' +
'    <div class="page" style="padding: 0; background: white; display: flex; flex-direction: column;">\n' +
'        <div style="background: linear-gradient(135deg, #FAA819 0%, #00A99D 100%); padding: 35px; text-align: center;">\n' +
'            <h2 style="font-family: Montserrat Alternates, sans-serif; font-size: 26px; font-weight: 700; color: white; margin: 0; line-height: 1.3;">Want to Fully Optimize Your Ecosystem<br>for Generative Engines?</h2>\n' +
'        </div>\n' +
'        <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 30px 60px;">\n' +
'            <div style="text-align: center; margin-bottom: 25px;">\n' +
'                <h3 style="font-family: Montserrat Alternates, sans-serif; font-size: 32px; font-weight: 700; color: #2D3748; margin: 0 0 10px 0;">Clemelopy\'s GEO Blueprint</h3>\n' +
'                <span style="display: inline-block; font-family: Montserrat Alternates, sans-serif; font-size: 14px; font-weight: 600; color: #00A99D; background: rgba(0,169,157,0.1); padding: 8px 20px; border-radius: 20px;">Coming Soon</span>\n' +
'            </div>\n' +
'            <div style="background: rgba(0,169,157,0.06); border-left: 4px solid #00A99D; padding: 20px 25px; border-radius: 0 12px 12px 0; margin-bottom: 25px;">\n' +
'                <p style="font-family: Montserrat Alternates, sans-serif; font-size: 14px; color: #2D3748; line-height: 1.7; margin: 0 0 15px 0;">This Linking Strategy Map shows you how each page in your ecosystem can strategically map to other areas of your ecosystem, but linking strategy is one piece to the entire puzzle.</p>\n' +
'                <p style="font-family: Montserrat Alternates, sans-serif; font-size: 14px; color: #2D3748; line-height: 1.7; margin: 0;">The Clemelopy GEO Blueprint will walk you through a deep and strategic, module-based framework that builds the blueprint for your ecosystem from the ground up.</p>\n' +
'            </div>\n' +
'            <div style="display: flex; gap: 15px; margin-bottom: 25px;">\n' +
'                <div style="flex: 1; background: rgba(250,168,25,0.08); border-radius: 16px; padding: 20px; text-align: center;">\n' +
'                    <div style="font-size: 28px; margin-bottom: 8px;">💬</div>\n' +
'                    <h4 style="font-family: Montserrat Alternates, sans-serif; font-size: 13px; color: #C67D18; margin: 0 0 6px 0;">Conversational</h4>\n' +
'                    <p style="font-size: 11px; color: #4A5568; line-height: 1.5; margin: 0;">Asks thoughtful questions and reflects your answers back clearly</p>\n' +
'                </div>\n' +
'                <div style="flex: 1; background: rgba(0,169,157,0.08); border-radius: 16px; padding: 20px; text-align: center;">\n' +
'                    <div style="font-size: 28px; margin-bottom: 8px;">🎯</div>\n' +
'                    <h4 style="font-family: Montserrat Alternates, sans-serif; font-size: 13px; color: #0D7871; margin: 0 0 6px 0;">Strategic</h4>\n' +
'                    <p style="font-size: 11px; color: #4A5568; line-height: 1.5; margin: 0;">Helps you shape strategy in your own words as you go</p>\n' +
'                </div>\n' +
'                <div style="flex: 1; background: rgba(212,180,0,0.08); border-radius: 16px; padding: 20px; text-align: center;">\n' +
'                    <div style="font-size: 28px; margin-bottom: 8px;">✨</div>\n' +
'                    <h4 style="font-family: Montserrat Alternates, sans-serif; font-size: 13px; color: #8B6914; margin: 0 0 6px 0;">Personalized</h4>\n' +
'                    <p style="font-size: 11px; color: #4A5568; line-height: 1.5; margin: 0;">Builds a complete blueprint grounded in your story and goals</p>\n' +
'                </div>\n' +
'            </div>\n' +
'            <div style="text-align: center;"><a href="' + esc(geoFrameworkLink) + '" style="display: inline-block; background: linear-gradient(135deg, #FAA819 0%, #00A99D 100%); color: white; font-family: Montserrat Alternates, sans-serif; font-size: 16px; font-weight: 600; padding: 16px 45px; border-radius: 30px; text-decoration: none;">Explore the GEO Blueprint</a></div>\n' +
'        </div>\n' +
'        <div class="page-footer"><div class="footer-center">&copy; Clemelopy&trade; All Rights Reserved | Clemelopy.com</div><div class="footer-page">pg. 13</div></div>\n' +
'    </div>\n' +
'\n' +
'</body>\n' +
'</html>';
}

// Function to check the status of a CloudConvert Job
async function waitForCloudConvertJob(env, jobId) {
  const apiKey = String(env.CLOUDCONVERT_API || "").trim();
  if (!apiKey) throw new Error("CloudConvert API key missing.");

  let jobStatus = null;
  let jobData = null;
  const startTime = Date.now();
  const timeout = 60000; // 60 seconds timeout

  while (Date.now() - startTime < timeout) {
    const statusResp = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    if (!statusResp.ok) {
      throw new Error(`Failed to check CloudConvert job status: ${statusResp.status}`);
    }

    jobData = await statusResp.json();
    jobStatus = jobData.data.status;

    if (jobStatus === 'finished') {
      return jobData.data;
    }
    if (jobStatus === 'error') {
      throw new Error(`CloudConvert job failed: ${jobData.data.message || "Unknown error"}`);
    }

    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error("CloudConvert job timed out.");
}

// Function to download a file from a CloudConvert job result
async function downloadCloudConvertFile(env, fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') {
    throw new Error(`Invalid URL: ${fileUrl}`);
  }

  const downloadResp = await fetch(fileUrl);

  if (!downloadResp.ok) {
    throw new Error(`Failed to download file from CloudConvert: ${downloadResp.status}`);
  }

  return downloadResp.blob();
}

/* ------------ Auth Helpers (Supabase JWT) ------------- */

async function verifySupabaseSession(env, token) {
  if (!token) return null;

  try {
    // Split into JWT parts
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    // Decode header + payload
    const headerJson = JSON.parse(
      atob(headerB64.replace(/-/g, "+").replace(/_/g, "/"))
    );
    const payloadJson = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    );

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payloadJson.exp && payloadJson.exp < now) {
      console.error("JWT expired");
      return null;
    }

    // Fetch JWKs dynamically from Supabase (auto-rotates)
    const jwksUrl = `${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
    const jwksRes = await fetch(jwksUrl);
    const jwks = await jwksRes.json();

    // Find matching public key by "kid"
    const jwk = jwks.keys.find((key) => key.kid === headerJson.kid);
    if (!jwk) {
      console.error("No matching JWK found for kid:", headerJson.kid);
      return null;
    }

    // Import the public key
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"]
    );

    // Convert signature from Base64URL → Uint8Array
    const signature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );

    // The signed data = "<header>.<payload>"
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    // Verify ES256
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signature,
      signedData
    );

    if (!valid) {
      console.error("JWT signature invalid");
      return null;
    }

    return payloadJson; // SUCCESS
  } catch (err) {
    console.error("JWT verification error:", err);
    return null;
  }
}

async function requireAuthEmail(request, env) {
  // 1. Check for JWT (Primary Auth from Next.js app)
  const authHeader = request.headers.get("Authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const jwt = authHeader.slice("Bearer ".length);
    const user = await verifySupabaseSession(env, jwt);
    if (user?.email) return { ok: true, email: user.email };
    return { ok: false, reason: "Invalid session" };
  }


  return { ok: false, reason: "Missing auth" };
}

/* ------------ Router ------------- */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
   

    const ALL_APPS = [
      {
        slug: "geo-linking-strategy-map",
        name: "Clemelopy GEO Linking Strategy Map",
        defaultPlanLabel: "Free / Trial",
        thumbnail:
          "https://pub-e49fdaa41a7742348f86c232911c92a5.r2.dev/Clemelopy%20Linking%20Strategy%20Map%20Generator.png",
        launchBaseUrl: "https://app.clemelopy.com/linking-strategy",
      },
    ];

    const json = (body, status = 200) =>
      jsonWithCors(request, env, body, status);

    /* Preflight */
    if (request.method === "OPTIONS") {
      return new Response("", {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }

    /* Health */
    if (
      request.method === "GET" &&
      (pathname === "/" || pathname === "/health")
    ) {
      return json({ ok: true, message: "Clemelopy API is live" });
    }

    /* Download from R2 */
    if (request.method === "GET" && pathname.startsWith("/download/")) {
      const key = decodeURIComponent(pathname.replace("/download/", ""));
      const isInline = url.searchParams.get("inline") === "1";

      if (!key) {
        return json({ ok: false, error: "Missing key" }, 400);
      }

      const obj = await env.PDF_BUCKET.get(key);
      if (!obj) {
        return json({ ok: false, error: "File not found" }, 404);
      }

      const body = await obj.arrayBuffer();

      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": obj.httpMetadata?.contentType || "application/pdf",
          "Content-Disposition": isInline
            ? `inline; filename="${key.split("/").pop()}"`
            : `attachment; filename="${key.split("/").pop()}"`,
          ...corsHeaders(request, env, true), // Allow iframe embedding
        }
      });
    }

    /* Workspace Apps (Licensed) */
    if (request.method === "GET" && pathname === "/workspace-apps") {
      const auth = await requireAuthEmail(request, env);
      if (!auth.ok || !auth.email) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }
      const userEmail = normEmail(auth.email);

      let ent;
      try {
        ent = await sbCheckEntitlement(env, userEmail, APP_SLUG);
      } catch (e) {
        console.error("workspace-apps.entitlement.error", e);
        return json({ ok: false, error: "License lookup failed" }, 500);
      }

      const appDef = ALL_APPS[0];
      const licensed = !!ent.allowed;

      const apps = [
        {
          slug: appDef.slug,
          name: appDef.name,
          planLabel:
            ent.reason === "monthly"
              ? "Monthly Plan"
              : ent.reason === "pack"
              ? "Credits Pack"
              : appDef.defaultPlanLabel,
          thumbnail: appDef.thumbnail,
          launchUrl: appDef.launchBaseUrl + "?email=" + encodeURIComponent(userEmail),
          licensed,
        },
      ];
      return json({ ok: true, email: userEmail, apps });
    }

    /* Other Available Apps (currently none) */
    if (request.method === "GET" && pathname === "/available-apps") {
      const auth = await requireAuthEmail(request, env);
      if (!auth.ok || !auth.email) {
        return json({ ok: false, error: "Unauthorized" }, 401);
      }
      const userEmail = normEmail(auth.email);
      return json({ ok: true, email: userEmail, apps: [] });
    }

    /* My Projects */
    /* Preview endpoint - uses sample data, no OpenAI costs */
if (request.method === "POST" && pathname === "/preview") {
  try {
    // Sample map data for testing
    const sampleMap = {
      page_intent_type: "Informational",
      page_intent: "This page educates readers on the differences between Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO), explaining how each approach impacts search visibility and content strategy.",
      roots: ["Generative Engine Optimization", "Content Strategy", "AI Discoverability"],
      soil: ["optimize for AI engines", "GEO strategy", "content ecosystem", "AI-powered search"],
      branches: ["SEO vs GEO", "Content Structure", "Internal Linking", "Authority Building"],
      leaves: [
        { title: "Clear Headings", description: "Use descriptive H2/H3 structure" },
        { title: "Scannable Format", description: "Break content into digestible sections" }
      ],
      fruit: ["SUGGESTION: Add case study showing GEO results", "SUGGESTION: Include before/after metrics"],
      pollinators: [
        { name: "Google Search Central", reason: "Official guidance on content quality" },
        { name: "Industry Research", reason: "Third-party validation of GEO concepts" }
      ],
      underground_network: [
        { title: "GEO Glossary Page", reason: "Define key terms for newcomers" },
        { title: "Case Studies Hub", reason: "Show real-world applications" }
      ],
      cultivation_plan: [
        "HIGH: Add internal links to related GEO content",
        "HIGH: Include a clear call-to-action",
        "MEDIUM: Add schema markup for better AI understanding",
        "LOW: Create supporting FAQ section"
      ]
    };

    const body = await request.json().catch(() => ({}));
    const projectName = body.projectName || "Preview Test";
    const pageUrl = body.pageUrl || "https://example.com/test-page";

    const finalBrand = {
      project_title: projectName,
      source_url: pageUrl,
    };

    let html = buildHtml(sampleMap, finalBrand, {
      geoFrameworkLink: "https://clemelopy.com/blueprint"
    });

    html = replaceEmojiWithTwemoji(html);

    // Generate PDF
    const { pdfBuffer, thumbnail: thumbBuffer } = await generatePDFWithBrowser(env, html);

    // Upload to R2 with "preview" prefix
    const r2key = `preview/${Date.now()}_${crypto.randomUUID()}.pdf`;

    await env.PDF_BUCKET.put(r2key, pdfBuffer, {
      httpMetadata: {
        contentType: "application/pdf",
        contentDisposition: 'inline; filename="preview.pdf"',
      },
    });

    const origin = new URL(request.url).origin;
    const browser_url = `${origin}/download/${encodeURIComponent(r2key)}?inline=1`;

    return json({ ok: true, preview_url: browser_url, map: sampleMap });
  } catch (e) {
    console.error("preview.error", e);
    return json({ ok: false, error: e?.message || "Preview error" }, 500);
  }
}
if (request.method === "GET" && pathname === "/my-projects") {
  const auth = await requireAuthEmail(request, env);
  if (!auth.ok || !auth.email) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }
  const email = normEmail(auth.email);

  try {
    const supa = getSupabase(env);  // ← ADD THIS LINE
    const projects = await supa.get(
      "geo_linking_projects_real",
      `?email=eq.${encodeURIComponent(email)}&or=(is_deleted.is.null,is_deleted.eq.false)&order=created_at.desc`
    );
    return json({ ok: true, projects });
  } catch (e) {
    console.error("my-projects.error", e);
    return json(
      { ok: false, error: e?.message || "Server error" },
      500
    );
  }
}

    /* Generate */
    if (request.method === "POST" && pathname === "/generate") {
      // Rate limit: 5 requests per minute per IP
      const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
      const rateCheck = checkRateLimit(clientIP, 5, 60000);
      
      if (!rateCheck.allowed) {
        return json({ 
          ok: false, 
          code: "RATE_LIMITED",
          error: "Too many requests. Please wait a minute and try again." 
        }, 429);
      }
  
  
      try {
        // --- AUTH CHECK ---
        const auth = await requireAuthEmail(request, env);
        if (!auth.ok) {
          return json({ ok: false, error: "Unauthorized" }, 401);
        }

        const body = await request.json().catch(() => ({}));
        console.log("🔥 RAW BODY:", JSON.stringify(body, null, 2));
        console.log("🔥 body.projectId:", body.projectId);

        const {
          content = "",
          brand = null,
          projectName = "",
          pageUrl = "",
          includeGuide = true,
          appSource = "geo-linking-strategy-map",
        } = body;

        let cleanEmail;

        if (auth.emailFromInternal) {
          // Internal calls need to pass the email in the body
          cleanEmail = normEmail(body.email || "");
          if (!cleanEmail) {
            return json({ ok: false, code: "NO_EMAIL", error: "Missing email for internal request." }, 400);
          }
        } else {
          // Next.js app calls get email from the JWT
          cleanEmail = normEmail(auth.email);
        }

        const cleanContent = (content || "").trim();

        if (!cleanEmail) {
          return json(
            {
              ok: false,
              code: "NO_EMAIL",
              error: "Please sign in and try again.",
            },
            400
          );
        }

        if (cleanContent.length < 300) {
          return json(
            {
              ok: false,
              code: "CONTENT_TOO_SHORT",
              error: "Please include at least 300 characters of content.",
            },
            400
          );
        }

        const blockedResult = await isBlocked(env, cleanContent);
        if (blockedResult.blocked) {
          console.warn("blocked.content.generate", {
            email: cleanEmail,
            reason: blockedResult.reason,
          });
          return json(
            {
              ok: false,
              code: "BLOCKED",
              error: "For safety reasons, we can't generate a map from that text.",
            },
            422
          );
        }

        const ent = await sbCheckEntitlement(env, cleanEmail);
        if (!ent.allowed) {
          const pay = ent.paywall || {
            code: "PAYWALL",
            message: "Your available runs are used. Subscribe to get 8 strategies per month.",
          };
          return json(
            { ok: false, code: pay.code, error: pay.message },
            402
          );
        }

        console.log("🌳 Starting verified map generation...");
const { map, verificationReport } = await generateVerifiedMap(env, cleanContent);
console.log("✅ Verification complete:", JSON.stringify(verificationReport, null, 2));

        const finalBrand = {
          project_title: projectName || generateSmartTitle(map),
          source_url: pageUrl || "",
        };

        // Build base HTML with optional guide
        let html = buildHtml(map, finalBrand, { 
          geoFrameworkLink: "https://clemelopy.com/blueprint" 
        });

        // Convert emojis → Twemoji PNG <img> tags
        html = replaceEmojiWithTwemoji(html);


        // --- BROWSER RENDERING PDF GENERATION ---
        const { pdfBuffer, thumbnail: thumbBuffer } = await generatePDFWithBrowser(env, html);

        // Upload PDF to R2
        const r2key = `geo/${Date.now()}_${crypto.randomUUID()}.pdf`;

        await env.PDF_BUCKET.put(r2key, pdfBuffer, {
          httpMetadata: {
            contentType: "application/pdf",
            contentDisposition: 'inline; filename="clemelopy-geo-linking-strategy-map.pdf"',
          },
        });

        // Base domain from request
        const origin = new URL(request.url).origin;

        // PURE DOWNLOAD URL (forces attachment)
        const pdf_url = `${origin}/download/${encodeURIComponent(r2key)}`;

        // INLINE VIEWER URL (for your PDF Viewer component)
        const browser_url = `${origin}/download/${encodeURIComponent(r2key)}?inline=1`;

        // Upload thumbnail to R2
        let thumbUrl = null;
        if (thumbBuffer) {
          const thumbKey = r2key.replace(".pdf", ".jpg");
          await env.PDF_BUCKET.put(thumbKey, thumbBuffer, {
            httpMetadata: { contentType: "image/jpeg" }
          });
          thumbUrl = `${origin}/download/${thumbKey}`;
        }

        const projectId = String(body.projectId || "").trim();

        if (!projectId || projectId === "undefined" || projectId === "[object Object]") {
          console.error("MISSING PROJECT ID", body);
          return json({ ok: false, error: "Missing or invalid projectId" }, 400);
        }
        await saveProjectToSupabase(
          env,
          projectId,
          browser_url,
          pdf_url,
          thumbUrl,
          cleanEmail,
          {
            project_title: projectName || generateSmartTitle(map),
            mapJson: map,
            source_url: pageUrl || null,
            verificationReport: verificationReport,  // ADD THIS LINE
          }
        );

        // Record usage against license
        await sbRecordUsage(env, {
          license: ent.license,
          reason: ent.reason,
          email: cleanEmail,
        });

        return json({ 
          ok: true, 
          pdf_url, 
          map, 
          thumb_url: thumbUrl,
          verification: {
            passed: verificationReport.ai_verification?.verified ?? true,
            confidence: verificationReport.ai_verification?.confidence_score ?? 100,
            flags_found: verificationReport.auto_flags?.length ?? 0,
            corrections_applied: verificationReport.corrections_applied ?? false,
          }
        }, 200);
      } catch (e) {
        console.error("generate.error", e);
        return json(
          { ok: false, error: e?.message || "Server error" },
          500
        );
      }
    } 
    


    /* Fallback */
    return json({ ok: false, error: "Not found" }, 404);

  }
};