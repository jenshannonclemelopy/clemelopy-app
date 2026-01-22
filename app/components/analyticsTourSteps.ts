import { TourStep } from './PageTour';

/**
 * Analytics Tour Steps - Disconnected State
 * Use when user hasn't connected Google Analytics yet
 */
export const analyticsTourStepsDisconnected: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to AI Traffic Analytics! 📊',
    content: 'Track how much traffic AI platforms like ChatGPT, Perplexity, and Claude are sending to your website. This helps you measure the real impact of your GEO efforts!',
    position: 'center',
    spotlightPadding: 0,
  },
  {
    id: 'connect-ga4',
    target: '[data-tour="connect-ga4"]',
    title: 'Connect Your Google Analytics',
    content: 'Click this button to securely link your GA4 property. We only request read-only access to your traffic data, and you can disconnect anytime.',
    position: 'bottom',
    spotlightPadding: 16,
  },
  {
    id: 'connection-benefits',
    target: '[data-tour="connection-benefits"]',
    title: 'Safe & Secure Connection',
    content: 'Your data stays private. We use read-only access, don\'t store your raw analytics data, and you can disconnect at any time from this page.',
    position: 'top',
    spotlightPadding: 12,
  },
  {
    id: 'finish-disconnected',
    target: null,
    title: 'Ready to Get Started! 🚀',
    content: 'Connect your Google Analytics to start tracking AI traffic. It only takes a minute and gives you valuable insights into your GEO performance!',
    position: 'center',
    spotlightPadding: 0,
  },
];

/**
 * Analytics Tour Steps - Connected State
 * Use when user has GA4 connected and viewing data
 */
export const analyticsTourStepsConnected: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to AI Traffic Analytics! 📊',
    content: 'Track how much traffic AI platforms like ChatGPT, Perplexity, and Claude are sending to your website. Let\'s explore what you can learn here!',
    position: 'center',
    spotlightPadding: 0,
  },
  {
    id: 'connected-status',
    target: '[data-tour="connected-status"]',
    title: 'You\'re Connected! ✅',
    content: 'Your Google Analytics is linked. You can see which property is connected and disconnect anytime if needed.',
    position: 'bottom',
    spotlightPadding: 12,
  },
  {
    id: 'date-range',
    target: '[data-tour="date-range"]',
    title: 'Choose Your Time Period',
    content: 'Select 7 days, 30 days, or 90 days to see AI traffic trends over different periods. Longer periods help identify patterns in your data.',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'refresh-button',
    target: '[data-tour="refresh-button"]',
    title: 'Refresh Your Data',
    content: 'Click refresh to get the latest traffic data from Google Analytics. Data is typically updated every few hours.',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'stats-cards',
    target: '[data-tour="stats-cards"]',
    title: 'Key AI Traffic Metrics',
    content: 'These cards show your most important numbers at a glance. Let\'s look at each one!',
    position: 'bottom',
    spotlightPadding: 12,
  },
  {
    id: 'ai-sessions',
    target: '[data-tour="stat-sessions"]',
    title: 'AI Sessions',
    content: 'Total visits from AI platforms. Each session represents someone who clicked through from ChatGPT, Perplexity, Claude, or other AI tools.',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'ai-users',
    target: '[data-tour="stat-users"]',
    title: 'AI Users',
    content: 'Unique visitors from AI platforms. One user might have multiple sessions, so this shows how many individuals found you through AI.',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'conversions',
    target: '[data-tour="stat-conversions"]',
    title: 'Conversions',
    content: 'Goal completions from AI traffic. This tracks when AI-referred visitors take meaningful actions like signing up, purchasing, or contacting you.',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'engagement',
    target: '[data-tour="stat-engagement"]',
    title: 'Engagement Rate',
    content: 'How engaged AI visitors are with your content. Higher engagement means AI is sending you quality traffic that\'s genuinely interested in what you offer.',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'trend-chart',
    target: '[data-tour="trend-chart"]',
    title: 'AI Traffic Trend',
    content: 'See how your AI traffic changes over time. Look for upward trends after implementing GEO improvements to your content!',
    position: 'top',
    spotlightPadding: 12,
  },
  {
    id: 'sources-chart',
    target: '[data-tour="sources-chart"]',
    title: 'Traffic by AI Platform',
    content: 'See which AI platforms send you the most traffic. This helps you understand where to focus your GEO optimization efforts.',
    position: 'left',
    spotlightPadding: 12,
  },
  {
    id: 'sources-table',
    target: '[data-tour="sources-table"]',
    title: 'Top AI Sources',
    content: 'A detailed breakdown of traffic by AI platform. See sessions, users, and engagement for each source.',
    position: 'top',
    spotlightPadding: 12,
  },
  {
    id: 'landing-pages',
    target: '[data-tour="landing-pages"]',
    title: 'Top Landing Pages',
    content: 'Which pages are AI platforms linking to? These are the pages getting cited. Optimize them further to maintain and grow your AI visibility!',
    position: 'top',
    spotlightPadding: 12,
  },
  {
    id: 'finish-connected',
    target: null,
    title: 'You\'re All Set! 🎉',
    content: 'Check back regularly to monitor your AI traffic growth. As you implement GEO best practices, you should see these numbers increase!',
    position: 'center',
    spotlightPadding: 0,
  },
];

/**
 * Helper to get the right tour steps based on connection status
 */
export function getAnalyticsTourSteps(
  connectionStatus: 'loading' | 'disconnected' | 'select_property' | 'connected'
): TourStep[] {
  if (connectionStatus === 'connected') {
    return analyticsTourStepsConnected;
  }
  return analyticsTourStepsDisconnected;
}
