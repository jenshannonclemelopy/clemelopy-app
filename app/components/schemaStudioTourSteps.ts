import { TourStep } from './PageTour';

export const schemaStudioTourSteps: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to Schema Studio! ✨',
    content: 'Schema markup tells AI engines exactly what your page is about. This tool helps you create structured data that makes your content easier for AI to understand and cite. Let\'s explore!',
    position: 'center',
    spotlightPadding: 0,
    beforeAction: 'switchToUrl',  // Start on URL tab
  },
  {
    id: 'input-tabs',
    target: '[data-tour="schema-tabs"]',
    title: 'Choose Your Input Method',
    content: 'You can create schema markup in four different ways. Let\'s explore each one!',
    position: 'bottom',
    spotlightPadding: 12,
    beforeAction: 'switchToUrl',
  },
  {
    id: 'url-tab',
    target: '[data-tour="tab-url"]',
    title: '🔗 From URL - Automatic Analysis',
    content: 'Enter any page URL and we\'ll automatically fetch the content, analyze it, and generate the perfect schema markup. This is the fastest way to create schema!',
    position: 'bottom',
    spotlightPadding: 8,
    beforeAction: 'switchToUrl',
  },
  {
    id: 'url-input',
    target: '[data-tour="url-input"]',
    title: 'Enter Your Page URL',
    content: 'Paste the full URL of the page you want to create schema for. Our AI will fetch the content and suggest the best schema types.',
    position: 'bottom',
    spotlightPadding: 12,
    beforeAction: 'switchToUrl',
  },
  {
    id: 'paste-tab',
    target: '[data-tour="tab-paste"]',
    title: '📋 Paste Content',
    content: 'Don\'t have a live URL? Paste your page content directly and we\'ll analyze it to generate schema. Great for content you\'re still drafting!',
    position: 'bottom',
    spotlightPadding: 8,
    beforeAction: 'switchToPaste',  // Switch to Paste tab BEFORE showing this step
  },
  {
    id: 'paste-input',
    target: '[data-tour="paste-input"]',
    title: 'Paste Your Content Here',
    content: 'Copy and paste the text from your about page, service page, blog post, or any content. The more context you provide, the better the schema will be.',
    position: 'bottom',
    spotlightPadding: 12,
    beforeAction: 'switchToPaste',
  },
  {
    id: 'manual-tab',
    target: '[data-tour="tab-manual"]',
    title: '✍️ Manual Entry',
    content: 'Want complete control? Choose your schema type and fill in the fields yourself. Perfect when you know exactly what schema you need.',
    position: 'bottom',
    spotlightPadding: 8,
    beforeAction: 'switchToManual',  // Switch to Manual tab BEFORE showing this step
  },
  {
    id: 'schema-types',
    target: '[data-tour="schema-types"]',
    title: 'Choose Your Schema Type',
    content: 'Select from Person, Organization, Article, Service, Product, FAQ, HowTo, LocalBusiness, Event, or CreativeWork. Each type has specific fields optimized for AI engines.',
    position: 'bottom',
    spotlightPadding: 12,
    beforeAction: 'switchToManual',
  },
  {
    id: 'batch-tab',
    target: '[data-tour="tab-batch"]',
    title: '📚 Batch Processing',
    content: 'Need schema for your whole site? Enter up to 10 URLs and we\'ll analyze them all at once. Download all schemas in one go!',
    position: 'bottom',
    spotlightPadding: 8,
    beforeAction: 'switchToBatch',  // Switch to Batch tab BEFORE showing this step
  },
  {
    id: 'batch-input',
    target: '[data-tour="batch-input"]',
    title: 'Enter Multiple URLs',
    content: 'Add one URL per line (up to 10). We\'ll process each page and generate individual schemas you can copy or download together.',
    position: 'bottom',
    spotlightPadding: 12,
    beforeAction: 'switchToBatch',
  },
  {
    id: 'finish',
    target: null,
    title: 'You\'re Ready! 🎉',
    content: 'Start with the URL method for best results, or choose whichever input method fits your workflow. The generated schema can be copied directly into your page\'s HTML head section.',
    position: 'center',
    spotlightPadding: 0,
    beforeAction: 'switchToUrl',  // Return to URL tab at the end
  },
];
