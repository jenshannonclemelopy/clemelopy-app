'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import SchemaRunLimitModal from './SchemaRunLimitModal';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface SchemaField {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}

interface SchemaTypeConfig {
  name: string;
  emoji: string;
  description: string;
  fields: SchemaField[];
}

interface SchemaTypes {
  [key: string]: SchemaTypeConfig;
}

interface AnalysisResult {
  primaryType?: string;
  confidence?: string;
  reasoning?: string;
  missingFields?: string[];
  suggestions?: string[];
  extractedData?: Record<string, unknown>;
  // New fields from worker v5
  pageType?: string;
  extractedSchemaTypes?: string[];
  schemas?: Record<string, unknown>[];
  schemaScript?: string;
}

interface FormDataType {
  [key: string]: string | string[] | Record<string, unknown>[] | undefined;
  url?: string;
}

interface BatchResult {
  url: string;
  success: boolean;
  error?: string;
  analysis?: AnalysisResult;
  schema?: Record<string, unknown> | Record<string, unknown>[];
  schemaScript?: string;
}

interface HistoryItem {
  id: string;
  url: string;
  timestamp: number;
  schemaType: string;
  confidence: string;
  schema: Record<string, unknown> | Record<string, unknown>[];
  schemaScript: string;
}
interface SchemaBuilderProps {
  externalActiveTab?: string;
  onTabChange?: (tab: string) => void;
}
// ============================================
// SCHEMA TYPES CONFIGURATION
// ============================================

const SCHEMA_TYPES: SchemaTypes = {
  person: {
    name: 'Person',
    emoji: '👤',
    description: 'Personal about pages, bios, team profiles',
    fields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true },
      { key: 'givenName', label: 'First Name', type: 'text' },
      { key: 'familyName', label: 'Last Name', type: 'text' },
      { key: 'jobTitle', label: 'Job Title / Role', type: 'text' },
      { key: 'description', label: 'Bio / Description', type: 'textarea', rows: 4 },
      { key: 'url', label: 'Profile URL', type: 'url' },
      { key: 'image', label: 'Photo URL', type: 'url' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'telephone', label: 'Phone', type: 'tel' },
      { key: 'worksFor', label: 'Organization / Company', type: 'text' },
      { key: 'sameAs', label: 'Social Media URLs', type: 'textarea', placeholder: 'One URL per line\nhttps://linkedin.com/in/...\nhttps://instagram.com/...', rows: 3 },
      { key: 'knowsAbout', label: 'Skills & Expertise', type: 'textarea', placeholder: 'Comma-separated: Design, Illustration, Woodworking...', rows: 2 },
      { key: 'hasCredential', label: 'Credentials & Certifications', type: 'textarea', placeholder: 'One per line:\nImmersion Certified Designer\nMBA, Harvard Business School', rows: 3 },
      { key: 'interests', label: 'Interests & Hobbies', type: 'textarea', placeholder: 'Comma-separated: Gardening, Gaming, Martial Arts...', rows: 2 },
      { key: 'award', label: 'Awards & Recognitions', type: 'textarea', placeholder: 'One per line', rows: 2 },
      { key: 'alumniOf', label: 'Education / Alumni Of', type: 'textarea', placeholder: 'One institution per line', rows: 2 },
    ]
  },
  organization: {
    name: 'Organization',
    emoji: '🏢',
    description: 'Company pages, about us',
    fields: [
      { key: 'name', label: 'Organization Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { key: 'url', label: 'Website URL', type: 'url' },
      { key: 'logo', label: 'Logo URL', type: 'url' },
      { key: 'email', label: 'Contact Email', type: 'email' },
      { key: 'telephone', label: 'Phone', type: 'tel' },
      { key: 'foundingDate', label: 'Founding Date', type: 'text', placeholder: 'YYYY-MM-DD or YYYY' },
      { key: 'address', label: 'Address', type: 'textarea', rows: 2 },
      { key: 'sameAs', label: 'Social Media URLs', type: 'textarea', placeholder: 'One URL per line', rows: 3 },
    ]
  },
  article: {
    name: 'Article',
    emoji: '📄',
    description: 'Blog posts, news, guides',
    fields: [
      { key: 'headline', label: 'Headline / Title', type: 'text', required: true },
      { key: 'author', label: 'Author Name', type: 'text', required: true },
      { key: 'datePublished', label: 'Date Published', type: 'date' },
      { key: 'dateModified', label: 'Date Modified', type: 'date' },
      { key: 'description', label: 'Description / Summary', type: 'textarea', rows: 3 },
      { key: 'image', label: 'Featured Image URL', type: 'url' },
    ]
  },
  service: {
    name: 'Service',
    emoji: '🛠️',
    description: 'Service offerings, packages',
    fields: [
      { key: 'name', label: 'Service Name', type: 'text', required: true },
      { key: 'provider', label: 'Provider / Company', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { key: 'serviceType', label: 'Service Type / Category', type: 'text' },
      { key: 'areaServed', label: 'Area Served', type: 'text', placeholder: 'e.g., Jacksonville, FL or Nationwide' },
    ]
  },
  product: {
    name: 'Product',
    emoji: '🛍️',
    description: 'Products for sale',
    fields: [
      { key: 'name', label: 'Product Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { key: 'image', label: 'Product Image URL', type: 'url' },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'sku', label: 'SKU', type: 'text' },
      { key: 'price', label: 'Price', type: 'text', placeholder: '29.99' },
      { key: 'currency', label: 'Currency', type: 'text', placeholder: 'USD' },
    ]
  },
  faq: {
    name: 'FAQPage',
    emoji: '❓',
    description: 'FAQ sections, Q&A',
    fields: [
      { key: 'questions', label: 'Questions & Answers', type: 'faq-builder' },
    ]
  },
  howto: {
    name: 'HowTo',
    emoji: '📋',
    description: 'Tutorials, step-by-step guides',
    fields: [
      { key: 'name', label: 'Guide Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
      { key: 'totalTime', label: 'Total Time', type: 'text', placeholder: 'PT30M (30 minutes)' },
      { key: 'steps', label: 'Steps', type: 'steps-builder' },
    ]
  },
  localbusiness: {
    name: 'LocalBusiness',
    emoji: '📍',
    description: 'Local businesses with locations',
    fields: [
      { key: 'name', label: 'Business Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
      { key: 'telephone', label: 'Phone', type: 'tel' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'address', label: 'Full Address', type: 'textarea', rows: 2 },
      { key: 'priceRange', label: 'Price Range', type: 'text', placeholder: '$$' },
      { key: 'openingHours', label: 'Hours', type: 'text', placeholder: 'Mo-Fr 09:00-17:00' },
    ]
  },
  event: {
    name: 'Event',
    emoji: '🎉',
    description: 'Events, workshops, webinars',
    fields: [
      { key: 'name', label: 'Event Name', type: 'text', required: true },
      { key: 'startDate', label: 'Start Date & Time', type: 'datetime-local', required: true },
      { key: 'endDate', label: 'End Date & Time', type: 'datetime-local' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
      { key: 'location', label: 'Location / Venue', type: 'text' },
      { key: 'organizer', label: 'Organizer', type: 'text' },
    ]
  },
  creativework: {
    name: 'CreativeWork',
    emoji: '🎨',
    description: 'Art, portfolios, creative projects',
    fields: [
      { key: 'name', label: 'Work Title', type: 'text', required: true },
      { key: 'creator', label: 'Creator / Artist', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
      { key: 'dateCreated', label: 'Date Created', type: 'date' },
      { key: 'artMedium', label: 'Medium / Materials', type: 'text', placeholder: 'e.g., Oil on canvas, Digital, Wood' },
      { key: 'genre', label: 'Genre / Category', type: 'text' },
      { key: 'image', label: 'Image URL', type: 'url' },
    ]
  }
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function SchemaBuilder({ externalActiveTab, onTabChange }: SchemaBuilderProps = {}) {
  // State with proper types
  const [activeTab, setActiveTab] = useState<string>('url');
  const [selectedType, setSelectedType] = useState<string>('');
  const [formData, setFormData] = useState<FormDataType>({});
  const [generatedSchema, setGeneratedSchema] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  
  // URL input state
  const [urlInput, setUrlInput] = useState<string>('');
  const [contentInput, setContentInput] = useState<string>('');
  const [batchUrls, setBatchUrls] = useState<string>('');
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchProgress, setBatchProgress] = useState<string>('');
  
  // Export format
  const [exportFormat, setExportFormat] = useState<string>('raw');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Usage limit modal state
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_SCHEMA_API_URL || '';

  // Fetch current user on mount for usage tracking
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // Sync with external tab control (for tour)
  useEffect(() => {
    if (externalActiveTab && externalActiveTab !== activeTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab, activeTab]);

  // Wrapper to notify parent of tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // ============================================
  // SAVE TO SUPABASE
  // ============================================

  const saveSchemaToDatabase = async (
    url: string,
    pageTitle: string | null,
    schemaType: string,
    confidence: string | null,
    schemaData: Record<string, unknown> | Record<string, unknown>[],
    schemaScript: string
  ): Promise<boolean> => {
    try {
      setSaveStatus('saving');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('User not logged in, schema not saved');
        setSaveStatus('idle');
        return false;
      }

      const { error } = await supabase
        .from('schema_projects')
        .insert({
          user_id: user.id,
          url,
          page_title: pageTitle,
          schema_type: schemaType,
          confidence,
          schema_data: schemaData,
          schema_script: schemaScript,
        });

      if (error) {
        console.error('Error saving schema:', error);
        setSaveStatus('error');
        return false;
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return true;
    } catch (err) {
      console.error('Error saving schema:', err);
      setSaveStatus('error');
      return false;
    }
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleFetchUrl = async (): Promise<void> => {
    if (!urlInput.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setSaveStatus('idle');

    try {
      const response = await fetch(`${API_URL}/fetch-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: urlInput.trim(),
          userId: currentUserId
        }),
      });

      const data = await response.json();

      // Check for limit reached error
      if (data.error === 'limit_reached') {
        setShowLimitModal(true);
        setIsLoading(false);
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze URL');
      }

      // Worker returns: { analysis: { pageType, extractedSchemaTypes, confidence }, schemas: [...], schemaScript: "..." }
      const schemaTypes = data.analysis?.extractedSchemaTypes || [];
      const primaryType = schemaTypes[0]?.toLowerCase() || '';
      
      // Extract page title from first schema
      const firstSchema = data.schemas?.[0] || {};
      const pageTitle = firstSchema.headline || 
                        firstSchema.name || 
                        firstSchema.title || 
                        data.analysis?.pageType ||
                        null;
      
      // Store full response data for display
      setAnalysisResult({
        ...data.analysis,
        schemas: data.schemas,
        schemaScript: data.schemaScript
      });
      setSelectedType(primaryType);
      setFormData(firstSchema);
      setGeneratedSchema(data.schemas);

      // Save to database - use the schemaScript from worker
      await saveSchemaToDatabase(
        urlInput.trim(),
        pageTitle,
        schemaTypes.join(', ') || primaryType,
        data.analysis?.confidence || null,
        data.schemas,
        data.schemaScript
      );

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeContent = async (): Promise<void> => {
    if (!contentInput.trim()) {
      setError('Please paste some content');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: contentInput.trim(),
          userId: currentUserId
        }),
      });

      const data = await response.json();

      // Check for limit reached error
      if (data.error === 'limit_reached') {
        setShowLimitModal(true);
        setIsLoading(false);
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze content');
      }

      // Worker returns: { analysis: { pageType, extractedSchemaTypes, confidence }, schemas: [...], schemaScript: "..." }
      const schemaTypes = data.analysis?.extractedSchemaTypes || [];
      const primaryType = schemaTypes[0]?.toLowerCase() || '';
      
      // Extract page title from first schema
      const firstSchema = data.schemas?.[0] || {};
      const pageTitle = firstSchema.headline || 
                        firstSchema.name || 
                        firstSchema.title || 
                        data.analysis?.pageType ||
                        'Pasted Content';
      
      // Store full response data for display
      setAnalysisResult({
        ...data.analysis,
        schemas: data.schemas,
        schemaScript: data.schemaScript
      });
      setSelectedType(primaryType);
      setFormData(firstSchema);
      setGeneratedSchema(data.schemas);

      // Save to database
      await saveSchemaToDatabase(
        'Pasted Content',
        pageTitle,
        schemaTypes.join(', ') || primaryType,
        data.analysis?.confidence || null,
        data.schemas,
        data.schemaScript
      );

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSchema = async (): Promise<void> => {
    // Manual generation - NO LIMIT (doesn't use AI)
    if (!selectedType) {
      setError('Please select a schema type');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSaveStatus('idle');

    try {
      const schemaUrl = formData.url || urlInput || '';
      
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          data: formData,
          url: schemaUrl || (typeof window !== 'undefined' ? window.location.href : ''),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate schema');
      }

      setGeneratedSchema(data.schema);

      // Save to database
      const pageTitle = (formData.headline as string) || 
                        (formData.name as string) || 
                        (formData.title as string) || 
                        'Manual Schema';
      const schemaScript = `<script type="application/ld+json">\n${JSON.stringify(data.schema, null, 2)}\n</script>`;
      await saveSchemaToDatabase(
        schemaUrl || 'Manual Entry',
        pageTitle,
        selectedType,
        null,
        data.schema,
        schemaScript
      );

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchAnalyze = async (): Promise<void> => {
    const urls = batchUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));

    if (urls.length === 0) {
      setError('Please enter at least one valid URL (starting with http:// or https://)');
      return;
    }

    if (urls.length > 10) {
      setError('Maximum 10 URLs allowed per batch');
      return;
    }

    setIsLoading(true);
    setError(null);
    setBatchResults([]);
    setBatchProgress(`Processing ${urls.length} URLs...`);

    try {
      const response = await fetch(`${API_URL}/batch-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          urls,
          userId: currentUserId
        }),
      });

      const data = await response.json();

      // Check for limit reached error
      if (data.error === 'limit_reached') {
        setShowLimitModal(true);
        setBatchProgress('');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Batch processing failed');
      }

      setBatchResults(data.results || []);
      
      // Show info about skipped URLs if any were due to limit
      let progressMessage = `Completed! ${data.results?.filter((r: BatchResult) => r.success).length || 0} of ${urls.length} URLs processed successfully.`;
      if (data.urlsSkipped && data.urlsSkipped > 0) {
        progressMessage += ` (${data.urlsSkipped} URLs skipped due to monthly limit)`;
      }
      setBatchProgress(progressMessage);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setBatchProgress('');
    } finally {
      setIsLoading(false);
    }
  };

  const copyBatchResult = (result: BatchResult): void => {
    if (result.schemaScript) {
      navigator.clipboard.writeText(result.schemaScript);
    }
  };

  const downloadAllSchemas = (): void => {
    const successfulResults = batchResults.filter(r => r.success && r.schemaScript);
    if (successfulResults.length === 0) return;

    const allSchemas = successfulResults.map(r => {
      return `<!-- Schema for: ${r.url} -->\n${r.schemaScript}\n`;
    }).join('\n\n');

    const blob = new Blob([allSchemas], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schemas-batch.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFormChange = (key: string, value: string): void => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const copyToClipboard = (): void => {
    // Use the schemaScript from analysisResult if available (from worker), otherwise format locally
    const script = analysisResult?.schemaScript || 
      (generatedSchema ? `<script type="application/ld+json">\n${JSON.stringify(generatedSchema, null, 2)}\n</script>` : '');
    
    if (script) {
      navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatForCMS = (format: string): string => {
    // Use the schemaScript from analysisResult if available (from worker), otherwise format locally
    const script = analysisResult?.schemaScript || 
      (generatedSchema ? `<script type="application/ld+json">\n${JSON.stringify(generatedSchema, null, 2)}\n</script>` : '');
    
    if (!script) return '';
    
    switch (format) {
      case 'squarespace':
        return `<!-- =============================================
    SQUARESPACE INSTRUCTIONS
    Go to: Settings > Advanced > Code Injection > Header
    Paste this entire code block there
============================================= -->

${script}`;
      case 'wordpress':
        return `<!-- =============================================
    WORDPRESS INSTRUCTIONS
    Option 1: Add to theme's header.php before </head>
    Option 2: Use plugin "Insert Headers and Footers"
    Option 3: Use theme customizer > Additional CSS/Scripts
============================================= -->

${script}`;
      case 'webflow':
        return `<!-- =============================================
    WEBFLOW INSTRUCTIONS
    Go to: Page Settings > Custom Code > Head Code
    Paste this entire code block there
============================================= -->

${script}`;
      case 'shopify':
        return `<!-- =============================================
    SHOPIFY INSTRUCTIONS
    Go to: Online Store > Themes > Edit Code
    Find theme.liquid and paste before </head>
============================================= -->

${script}`;
      case 'wix':
        return `<!-- =============================================
    WIX INSTRUCTIONS
    Go to: Settings > Custom Code > Head
    Or: Site Settings > Tracking & Analytics > Custom
    Paste this entire code block there
============================================= -->

${script}`;
      default:
        return script;
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderField = (field: SchemaField): React.ReactNode => {
    const value = formData[field.key] || '';
    
    const isArrayField = ['sameAs', 'knowsAbout', 'hasCredential', 'interests', 'award', 'alumniOf'].includes(field.key);
    
    if (isArrayField) {
      let displayValue: string;
      
      if (Array.isArray(value)) {
        if (['sameAs', 'hasCredential', 'award', 'alumniOf'].includes(field.key)) {
          displayValue = value.map(v => {
            if (typeof v === 'object' && v !== null && 'name' in v) {
              return (v as { name: string }).name;
            }
            return String(v);
          }).join('\n');
        } else {
          displayValue = value.map(v => String(v)).join(', ');
        }
      } else {
        displayValue = String(value);
      }
      
      return (
        <textarea
          value={displayValue}
          onChange={(e) => handleFormChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows || 2}
          className="w-full px-4 py-3 border border-black/10 rounded-xl text-sm bg-white/80 
                     focus:outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10
                     transition-all duration-200 resize-y min-h-[80px] font-sans"
        />
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => handleFormChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows || 3}
          className="w-full px-4 py-3 border border-black/10 rounded-xl text-sm bg-white/80 
                     focus:outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10
                     transition-all duration-200 resize-y min-h-[80px] font-sans"
        />
      );
    }

    return (
      <input
        type={field.type || 'text'}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => handleFormChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        className="w-full px-4 py-3 border border-black/10 rounded-xl text-sm bg-white/80 
                   focus:outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10
                   transition-all duration-200"
      />
    );
  };

  const renderSchemaForm = (): React.ReactNode => {
    if (!selectedType || !SCHEMA_TYPES[selectedType]) {
      return null;
    }

    const config = SCHEMA_TYPES[selectedType];

    return (
      <div className="mt-6">
        {/* Form Header */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-black/5">
          <span className="text-4xl">{config.emoji}</span>
          <div>
            <h3 className="text-xl font-bold text-[#2d2a26]">{config.name} Schema</h3>
            <p className="text-sm text-gray-500 mt-1">{config.description}</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid gap-5">
          {config.fields.map((field: SchemaField) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <label className="font-medium text-sm text-[#4a4642]">
                {field.label}
                {field.required && <span className="text-[#FAA819] ml-1">*</span>}
              </label>
              {renderField(field)}
            </div>
          ))}
        </div>

        {/* Generate Button */}
        <button 
          onClick={handleGenerateSchema}
          disabled={isLoading}
          className="w-full mt-6 py-4 px-6 bg-linear-to-r from-[#FAA819] to-[#E99502] text-white 
                     rounded-xl font-semibold text-base cursor-pointer transition-all duration-200
                     hover:translate-y-[-2px] hover:shadow-lg hover:shadow-[#FAA819]/30
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isLoading ? '⏳ Generating...' : '✨ Generate Schema Markup'}
        </button>
      </div>
    );
  };

  const renderAnalysisResult = (): React.ReactNode => {
    if (!analysisResult) return null;

    // Debug: log the analysis result
    console.log('Analysis Result:', analysisResult);

    // Handle both response formats:
    // Old format: { primaryType: 'Person', ... }
    // New format: { extractedSchemaTypes: ['Person', 'Organization'], pageType: '...', schemas: [...], schemaScript: '...' }
    const schemaTypes: string[] = analysisResult.extractedSchemaTypes || 
      (analysisResult.primaryType ? [analysisResult.primaryType] : []);
    
    const pageType = analysisResult.pageType || '';
    const schemaCount = analysisResult.schemas?.length || schemaTypes.length || 0;
    
    const confidenceColors: Record<string, string> = {
      high: 'bg-emerald-100 text-emerald-800',
      medium: 'bg-amber-100 text-amber-800',
      low: 'bg-red-100 text-red-800'
    };

    return (
      <div className="bg-white/60 rounded-2xl p-5 mb-6 border border-[#00A99D]/20">
        {/* Page Type & Schema Count */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          {pageType && (
            <p className="text-[#4a4642] font-medium text-sm">
              📄 Page Type: <span className="text-[#1a1a1a]">{pageType}</span>
            </p>
          )}
          {schemaCount > 0 && (
            <p className="text-[#4a4642] font-medium text-sm">
              📊 {schemaCount} schema{schemaCount !== 1 ? 's' : ''} generated
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {/* Schema Type Badges */}
          {schemaTypes.length > 0 ? (
            schemaTypes.map((type: string, index: number) => {
              const normalizedType = type.toLowerCase();
              const typeConfig = SCHEMA_TYPES[normalizedType];
              return (
                <span 
                  key={index}
                  className="text-white px-3.5 py-1.5 rounded-full font-semibold text-sm"
                  style={{ background: 'linear-gradient(to right, #00A99D, #008F85)' }}
                >
                  {typeConfig?.emoji || '📋'} {type}
                </span>
              );
            })
          ) : (
            <span 
              className="text-white px-3.5 py-1.5 rounded-full font-semibold text-sm"
              style={{ background: 'linear-gradient(to right, #00A99D, #008F85)' }}
            >
              📋 Unknown Type
            </span>
          )}
          
          {/* Confidence Badge */}
          {analysisResult.confidence && (
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide ${confidenceColors[analysisResult.confidence?.toLowerCase()] || confidenceColors.medium}`}>
              {analysisResult.confidence.toUpperCase()} CONFIDENCE
            </span>
          )}
        </div>
        
        {/* Extracted data summary */}
        {analysisResult.extractedData && (
          <div className="mb-3">
            <p className="text-[#4a4642] font-medium text-sm mb-2">
              📦 Extracted: {Object.keys(analysisResult.extractedData as Record<string, unknown>).length} fields
            </p>
            {typeof (analysisResult.extractedData as Record<string, unknown>).headline === 'string' && (
              <p className="text-gray-600 text-sm">
                <strong>Headline:</strong> {(analysisResult.extractedData as Record<string, unknown>).headline as string}
              </p>
            )}
            {typeof (analysisResult.extractedData as Record<string, unknown>).name === 'string' && 
             !(analysisResult.extractedData as Record<string, unknown>).headline && (
              <p className="text-gray-600 text-sm">
                <strong>Name:</strong> {(analysisResult.extractedData as Record<string, unknown>).name as string}
              </p>
            )}
          </div>
        )}
        
        {analysisResult.reasoning && (
          <p className="text-gray-600 text-sm leading-relaxed mb-3">{analysisResult.reasoning}</p>
        )}
        
        {analysisResult.missingFields && analysisResult.missingFields.length > 0 && (
          <div className="bg-[#FAA819]/10 rounded-xl p-3 mt-3">
            <strong className="block mb-2 text-[#4a4642] text-sm">📝 Missing fields you could add:</strong>
            <ul className="list-disc pl-5 text-gray-500 text-xs space-y-1">
              {analysisResult.missingFields.map((field: string, i: number) => (
                <li key={i}>{field}</li>
              ))}
            </ul>
          </div>
        )}

        {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
          <div className="bg-[#00A99D]/10 rounded-xl p-3 mt-3">
            <strong className="block mb-2 text-[#4a4642] text-sm">💡 Suggestions:</strong>
            <ul className="list-disc pl-5 text-gray-500 text-xs space-y-1">
              {analysisResult.suggestions.map((suggestion: string, i: number) => (
                <li key={i}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderGeneratedSchema = (): React.ReactNode => {
    if (!generatedSchema) return null;

    const script = formatForCMS(exportFormat);

    return (
      <div className="mt-8 pt-6 border-t-2 border-[#00A99D]/20">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-emerald-800">✅ Generated Schema</h3>
            {saveStatus === 'saving' && (
              <span className="text-xs text-gray-500 animate-pulse">💾 Saving...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-emerald-600">✓ Saved to My Projects</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-amber-600">⚠️ Not saved (login required)</span>
            )}
          </div>
          <button 
            onClick={copyToClipboard} 
            className="px-4 py-2.5 bg-linear-to-r from-[#00A99D] to-[#008F85] text-white rounded-xl 
                       font-semibold cursor-pointer transition-all duration-200
                       hover:-translate-y-px hover:shadow-lg hover:shadow-[#00A99D]/30"
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>

        <pre className="bg-[#1e1e1e] rounded-xl p-5 overflow-x-auto mb-5">
          <code className="text-[#d4d4d4] font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-break-word">
            {script}
          </code>
        </pre>

        {/* Export Formats */}
        <div className="mb-5">
          <label className="block font-medium mb-2.5 text-[#4a4642] text-sm">Export Format:</label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'raw', label: '📄 Raw HTML' },
              { key: 'squarespace', label: 'Squarespace' },
              { key: 'wordpress', label: 'WordPress' },
              { key: 'webflow', label: 'Webflow' },
              { key: 'shopify', label: 'Shopify' },
              { key: 'wix', label: 'Wix' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setExportFormat(key)}
                className={`px-4 py-2 border rounded-lg text-xs font-medium transition-all duration-200
                  ${exportFormat === key 
                    ? 'bg-linear-to-r from-[#FAA819] to-[#E99502] text-white border-transparent' 
                    : 'bg-white/60 border-black/10 text-[#4a4642] hover:bg-white/90 hover:border-[#FAA819]/40'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* CMS-specific instructions box */}
        {exportFormat !== 'raw' && (
          <div className="mb-5 p-4 bg-[#FAA819]/10 border border-[#FAA819]/30 rounded-xl">
            <h4 className="font-semibold text-[#4a4642] mb-2 flex items-center gap-2">
              <span className="text-lg">📍</span> 
              Where to add this code:
            </h4>
            {exportFormat === 'squarespace' && (
              <p className="text-sm text-gray-600">
                Go to <strong>Settings → Advanced → Code Injection → Header</strong> and paste the entire code block.
              </p>
            )}
            {exportFormat === 'wordpress' && (
              <div className="text-sm text-gray-600">
                <p className="mb-1"><strong>Option 1:</strong> Edit your theme's <code className="bg-white/50 px-1 rounded">header.php</code> and paste before <code className="bg-white/50 px-1 rounded">&lt;/head&gt;</code></p>
                <p className="mb-1"><strong>Option 2:</strong> Use a plugin like "Insert Headers and Footers" or "WPCode"</p>
                <p><strong>Option 3:</strong> Some themes have a "Custom Scripts" section in the Customizer</p>
              </div>
            )}
            {exportFormat === 'webflow' && (
              <p className="text-sm text-gray-600">
                Go to <strong>Page Settings → Custom Code → Head Code</strong> and paste the entire code block.
              </p>
            )}
            {exportFormat === 'shopify' && (
              <p className="text-sm text-gray-600">
                Go to <strong>Online Store → Themes → Actions → Edit Code</strong>, find <code className="bg-white/50 px-1 rounded">theme.liquid</code>, and paste before <code className="bg-white/50 px-1 rounded">&lt;/head&gt;</code>
              </p>
            )}
            {exportFormat === 'wix' && (
              <p className="text-sm text-gray-600">
                Go to <strong>Settings → Custom Code</strong> (or Site Settings → Tracking & Analytics → Custom), add new code to the <strong>Head</strong> section.
              </p>
            )}
          </div>
        )}

        {/* Validation Links */}
        <div className="bg-[#00A99D]/10 rounded-xl p-4">
          <p className="font-medium text-[#4a4642] text-sm mb-2">🔍 Validate your schema:</p>
          <a 
            href="https://validator.schema.org/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#00A99D] font-medium hover:underline text-sm"
          >
            Schema.org Validator
          </a>
          <span className="text-gray-500 text-sm mx-2">or</span>
          <a 
            href="https://search.google.com/test/rich-results" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#00A99D] font-medium hover:underline text-sm"
          >
            Google Rich Results Test
          </a>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="font-sans">
      <div className="bg-white/85 backdrop-blur-xl rounded-3xl p-8 shadow-lg border border-white/60">
        
        {/* Input Tabs */}
        <div data-tour="schema-tabs" className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'url', label: '🔗 From URL', tourId: 'tab-url' },
            { key: 'paste', label: '📋 Paste Content', tourId: 'tab-paste' },
            { key: 'manual', label: '✍️ Manual Entry', tourId: 'tab-manual' },
            { key: 'batch', label: '📚 Batch', tourId: 'tab-batch' }
          ].map(({ key, label, tourId }) => (
            <button
              key={key}
              data-tour={tourId}
              onClick={() => handleTabChange(key)}
              className={`px-5 py-3 rounded-xl cursor-pointer font-medium text-sm transition-all duration-200
                ${activeTab === key 
                  ? 'bg-linear-to-r from-[#FAA819] to-[#E99502] text-white shadow-md' 
                  : 'bg-white/70 text-[#4a4642] hover:bg-white/90 shadow-sm'
                }`}
              style={{
                border: activeTab === key ? 'none' : '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: activeTab === key 
                  ? '0 4px 12px rgba(250, 168, 25, 0.3)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.06)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Tab Content */}
        <div className="mb-6">
          {activeTab === 'url' && (
            <div data-tour="url-input">
              <label className="block font-medium mb-2 text-[#4a4642]">Enter your page URL</label>
              <div className="flex gap-3 flex-col sm:flex-row">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://yourwebsite.com/about"
                  className="flex-1 px-4 py-3.5 border border-black/10 rounded-xl text-base bg-white/80 
                             focus:outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10
                             transition-all duration-200"
                />
              </div>
              <button 
                onClick={handleFetchUrl}
                disabled={isLoading}
                className="w-full mt-4 py-4 px-6 bg-linear-to-r from-[#00A99D] to-[#008F85] text-white 
                           rounded-xl font-semibold text-base cursor-pointer transition-all duration-200
                           hover:translate-y-[-2px] hover:shadow-lg hover:shadow-[#00A99D]/30
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isLoading ? '⏳ Analyzing...' : '🔍 Create & Analyze'}
              </button>
            </div>
          )}

          {activeTab === 'paste' && (
            <div data-tour="paste-input">
              <label className="block font-medium mb-2 text-[#4a4642]">Paste your page content</label>
              <textarea
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                placeholder="Paste the text content from your about page, service page, or any content you want to create schema for..."
                rows={8}
                className="w-full px-4 py-3.5 border border-black/10 rounded-xl text-base bg-white/80 
                           focus:outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10
                           transition-all duration-200 resize-y min-h-[120px] font-sans"
              />
              <button 
                onClick={handleAnalyzeContent}
                disabled={isLoading}
                className="w-full mt-4 py-4 px-6 bg-linear-to-r from-[#00A99D] to-[#008F85] text-white 
                           rounded-xl font-semibold text-base cursor-pointer transition-all duration-200
                           hover:translate-y-[-2px] hover:shadow-lg hover:shadow-[#00A99D]/30
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isLoading ? '⏳ Analyzing...' : '🔍 Analyze Content'}
              </button>
            </div>
          )}

          {activeTab === 'manual' && (
            <div data-tour="manual-input">
              <h4 className="font-semibold mb-3 text-[#4a4642]">Select Schema Type</h4>
              <div data-tour="schema-types" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {Object.entries(SCHEMA_TYPES).map(([key, config]) => (
                  <div
                    key={key}
                    onClick={() => {
                      setSelectedType(key);
                      setFormData({});
                      setGeneratedSchema(null);
                    }}
                    className={`flex flex-col items-center gap-1.5 p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200
                      ${selectedType === key 
                        ? 'border-[#FAA819] bg-linear-to-br from-[#FAA819]/10 to-[#E99502]/10' 
                        : 'border-black/10 bg-white/60 hover:border-[#FAA819]/40 hover:bg-white/90'
                      }`}
                  >
                    <span className="text-3xl">{config.emoji}</span>
                    <span className="font-semibold text-xs text-[#4a4642] text-center">{config.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'batch' && (
            <div data-tour="batch-input">
              <label className="block font-medium mb-2 text-[#4a4642]">Enter multiple URLs (one per line, max 10)</label>
              <textarea
                value={batchUrls}
                onChange={(e) => setBatchUrls(e.target.value)}
                placeholder={`https://yoursite.com/about\nhttps://yoursite.com/services\nhttps://yoursite.com/contact`}
                rows={6}
                className="w-full px-4 py-3.5 border border-black/10 rounded-xl text-base bg-white/80 
                           focus:outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/10
                           transition-all duration-200 resize-y min-h-[120px] font-sans"
              />
              <button 
                onClick={handleBatchAnalyze}
                disabled={isLoading}
                className="w-full mt-4 py-4 px-6 bg-linear-to-r from-[#00A99D] to-[#008F85] text-white 
                           rounded-xl font-semibold text-base cursor-pointer transition-all duration-200
                           hover:translate-y-[-2px] hover:shadow-lg hover:shadow-[#00A99D]/30
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isLoading ? '⏳ Processing Batch...' : '🚀 Analyze All URLs'}
              </button>

              {/* Progress indicator */}
              {batchProgress && (
                <div className="mt-4 p-3 bg-[#00A99D]/10 rounded-xl text-sm text-[#00A99D] font-medium">
                  {batchProgress}
                </div>
              )}

              {/* Batch Results */}
              {batchResults.length > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-[#4a4642]">Results ({batchResults.filter(r => r.success).length}/{batchResults.length} successful)</h4>
                    <button
                      onClick={downloadAllSchemas}
                      className="px-4 py-2 bg-linear-to-r from-[#FAA819] to-[#E99502] text-white rounded-lg 
                                 text-sm font-medium hover:-translate-y-px transition-all duration-200"
                    >
                      📥 Download All
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {batchResults.map((result, index) => (
                      <div 
                        key={index}
                        className={`p-4 rounded-xl border ${
                          result.success 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={result.success ? 'text-emerald-600' : 'text-red-600'}>
                                {result.success ? '✅' : '❌'}
                              </span>
                              <span className="font-medium text-sm text-gray-700 truncate">
                                {result.url}
                              </span>
                            </div>
                            {result.success && result.analysis && (
                              <p className="text-xs text-gray-500 ml-6">
                                Type: <span className="font-medium">{result.analysis.primaryType}</span>
                                {result.analysis.confidence && (
                                  <span className="ml-2">• {result.analysis.confidence} confidence</span>
                                )}
                              </p>
                            )}
                            {!result.success && result.error && (
                              <p className="text-xs text-red-600 ml-6">{result.error}</p>
                            )}
                          </div>
                          {result.success && (
                            <button
                              onClick={() => copyBatchResult(result)}
                              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium
                                         hover:bg-gray-50 transition-colors shrink-0"
                            >
                              📋 Copy
                            </button>
                          )}
                        </div>
                        
                        {/* Expandable schema preview */}
                        {result.success && result.schemaScript && (
                          <details className="mt-3 ml-6">
                            <summary className="text-xs text-[#00A99D] cursor-pointer hover:underline">
                              View schema code
                            </summary>
                            <pre className="mt-2 p-3 bg-[#1e1e1e] rounded-lg text-xs overflow-x-auto">
                              <code className="text-[#d4d4d4]">{result.schemaScript}</code>
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Analysis Result */}
        {renderAnalysisResult()}

        {/* Schema Form */}
        {renderSchemaForm()}

        {/* Generated Schema */}
        {renderGeneratedSchema()}
      </div>

      {/* Usage Limit Modal */}
      <SchemaRunLimitModal 
        isOpen={showLimitModal} 
        onClose={() => setShowLimitModal(false)} 
      />
    </div>
  );
}