'use client';

import { useState, useEffect } from 'react';

import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

const WORKER_URL = 'https://linking-strategy-map.jen-86f.workers.dev';

interface Project {
  id: string;
  created_at: string;
  updated_at: string;
  project_title: string;
  title: string;
  pdf_url: string;
  browser_url: string;
  thumbnail: string;
  app_slug: string;
  map: any;
}

interface SchemaProject {
  id: string;
  url: string;
  page_title: string | null;
  schema_type: string;
  confidence: string | null;
  schema_script: string;
  created_at: string;
}

export default function MyProjects() {
  const { user, session, loading: authLoading } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [schemaProjects, setSchemaProjects] = useState<SchemaProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedSchemaId, setCopiedSchemaId] = useState<string | null>(null);
  const [deletingSchemaId, setDeletingSchemaId] = useState<string | null>(null);
  
  // Accordion state - tracks which schema is expanded
  const [expandedSchemaId, setExpandedSchemaId] = useState<string | null>(null);
  const [selectedExportFormat, setSelectedExportFormat] = useState<Record<string, string>>({});

  // Fetch projects from the worker
  useEffect(() => {
    async function fetchProjects() {
      // Wait for auth to finish loading first
      if (authLoading) {
        return; // Don't do anything while auth is loading
      }
      
      // If auth is done but no user, stop loading
      if (!user || !session?.access_token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${WORKER_URL}/my-projects`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'Failed to fetch projects');
        }

        setProjects(data.projects || []);

        // Fetch Schema projects from Supabase
        const { data: schemaData, error: schemaError } = await supabase
          .from('schema_projects')
          .select('id, url, page_title, schema_type, confidence, schema_script, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (schemaError) {
          console.error('Error fetching schemas:', schemaError);
        } else {
          setSchemaProjects(schemaData || []);
        }
      } catch (err: any) {
        console.error('Error fetching projects:', err);
        setError(err.message || 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, [user, session, authLoading]);

  const filteredProjects = projects.filter(project => {
    const name = project.title || project.project_title || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredSchemas = schemaProjects.filter(schema => {
    const name = schema.page_title || schema.url || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProjectName = (project: Project) => {
    return project.title || project.project_title || 'Untitled Project';
  };

  const handleDownload = (project: Project) => {
    if (project.pdf_url) {
      window.open(project.pdf_url, '_blank');
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('This project will be moved to your deleted items folder under "settings." You can recover it for up to 14 days and then it is permanently deleted.')) {
      return;
    }

    setDeletingId(projectId);

    try {
      const { error: deleteError } = await supabase
        .from('geo_linking_projects_real')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', projectId)
        .eq('user_id', user?.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err: any) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Schema actions
  const toggleAccordion = (schemaId: string) => {
    setExpandedSchemaId(expandedSchemaId === schemaId ? null : schemaId);
  };

  const formatSchemaForExport = (script: string, format: string): string => {
    // For Raw JSON, extract just the JSON object without script tags
    if (format === 'json') {
      const jsonMatch = script.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      if (jsonMatch) {
        return jsonMatch[1].trim();
      }
      return script;
    }

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

  const copySchemaWithFormat = async (schema: SchemaProject) => {
    const format = selectedExportFormat[schema.id] || 'raw';
    const formattedScript = formatSchemaForExport(schema.schema_script, format);
    await navigator.clipboard.writeText(formattedScript);
    setCopiedSchemaId(schema.id);
    setTimeout(() => setCopiedSchemaId(null), 2000);
  };

  const setExportFormatForSchema = (schemaId: string, format: string) => {
    setSelectedExportFormat(prev => ({ ...prev, [schemaId]: format }));
  };

  const deleteSchema = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schema? This cannot be undone.')) return;
    
    setDeletingSchemaId(id);

    try {
      const { error } = await supabase
        .from('schema_projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSchemaProjects(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      console.error('Error deleting schema:', err);
      alert('Failed to delete schema. Please try again.');
    } finally {
      setDeletingSchemaId(null);
    }
  };

  const getSchemaTypeEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      person: '👤',
      organization: '🏢',
      localbusiness: '📍',
      article: '📄',
      newsarticle: '📰',
      blogposting: '✍️',
      faq: '❓',
      faqpage: '❓',
      product: '🛍️',
      service: '🔧',
      offer: '🏷️',
      event: '📅',
      course: '🎓',
      howto: '📝',
      review: '⭐',
      creativework: '🎨',
      book: '📚',
      movie: '🎬',
      podcast: '🎙️',
      videoobject: '🎬',
      recipe: '🍳',
      softwareapplication: '💻',
      webpage: '🌐',
    };
    return emojis[type?.toLowerCase()] || '📋';
  };

  // Show loading state
  if (isLoading) {
    return (
      <Layout 
        activeNav="my-projects"
        pageTitle="My |Projects"
        pageSubtitle="View and manage all your generated strategies and reports."
      >
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#FAA819] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p style={{ fontFamily: 'Inter', fontWeight: 500, color: 'rgba(46, 42, 39, 0.6)' }}>Loading your projects...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Show error state
  if (error) {
    return (
      <Layout 
        activeNav="my-projects"
        pageTitle="My |Projects"
        pageSubtitle="View and manage all your generated strategies and reports."
      >
        {/* Main Glassmorphic Container */}
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '32px',
            padding: '32px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          }}
        >
          <div 
            className="text-center py-8"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '20px',
              padding: '32px',
            }}
          >
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg text-red-800 mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
              Failed to Load Projects
            </h3>
            <p className="text-red-600 mb-4" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-red-700 px-6 py-3 rounded-xl font-semibold transition-all"
              style={{ 
                fontFamily: 'Montserrat Alternates',
                background: 'rgba(239, 68, 68, 0.15)',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      activeNav="my-projects"
      pageTitle="My |Projects"
      pageSubtitle="View and manage all your generated strategies and reports."
    >
      <main>
        {/* Search Header */}
        <header 
          className="mb-8"
          style={{
            background: 'rgba(255, 255, 255, 0.35)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '16px 24px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <label htmlFor="project-search" className="sr-only">Search projects</label>
              <input
                id="project-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-14 pr-6 py-4 rounded-[16px] text-[#1a1a1a] placeholder-[#6b6560] focus:outline-none"
                style={{ fontFamily: 'Inter', fontWeight: 500, background: 'transparent' }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #005a54';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.outlineOffset = '0';
                }}
              />
              <div 
                className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)' }}
                aria-hidden="true"
              >
                <svg 
                  className="w-4 h-4 text-white"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </header>

        {/* =============================================
            LINKING STRATEGY SECTION
        ============================================= */}
        <section className="mb-10">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔗</span>
              <h2 style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem', color: '#1a1a1a' }}>
                Linking Strategy
              </h2>
            </div>
          </div>

          {/* Main Glassmorphic Container */}
          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '32px',
              padding: '32px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            }}
          >
            {/* Header Row */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span 
                  className="text-sm"
                  style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
                >
                  {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {filteredProjects.length > 4 && (
                  <a 
                    href="/my-projects/linking-strategy"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      fontWeight: 500,
                      background: 'rgba(255, 255, 255, 0.6)',
                      border: '1px solid rgba(0, 169, 157, 0.3)',
                      borderRadius: '14px',
                      padding: '12px 24px',
                      color: '#005a54',
                      transition: 'all 0.3s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    View All →
                  </a>
                )}
                <a 
                  href="/tools/linking-strategy"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    fontWeight: 500,
                    background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '14px',
                    padding: '12px 24px',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(0, 169, 157, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span className="text-xl" aria-hidden="true">+</span> New Project
                </a>
              </div>
            </div>

            {/* Projects Grid - Show only first 4 */}
            {filteredProjects.length > 0 ? (
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" aria-label="Projects list">
                {filteredProjects.slice(0, 4).map((project) => (
                  <li 
                    key={project.id}
                    className="group"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.03) 100%)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.7)',
                      borderRadius: '20px',
                      padding: '20px',
                    }}
                  >
                    {/* Thumbnail or Icon */}
                    {project.thumbnail ? (
                      <div 
                        className="w-full h-32 rounded-xl mb-4 overflow-hidden"
                        style={{ background: 'rgba(255, 255, 255, 0.5)' }}
                      >
                        <img 
                          src={project.thumbnail} 
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ transition: 'transform 0.3s ease' }}
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                        style={{
                          background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                        }}
                        aria-hidden="true"
                      >
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                    )}

                    {/* Project Info */}
                    <h3 
                      className="text-lg mb-2 line-clamp-2 min-h-[56px] group-hover:text-[#006b63]" 
                      style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a', transition: 'color 0.3s ease' }}
                    >
                      {getProjectName(project)}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm mb-4" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <time dateTime={project.created_at}>{formatDate(project.created_at)}</time>
                    </div>

                    {/* Project Type Badge */}
                    <div className="mb-4">
                      <span 
                        className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          fontFamily: 'Montserrat Alternates',
                          background: 'rgba(0, 169, 157, 0.15)',
                          color: '#005a54',
                        }}
                      >
                        Linking Strategy
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <a
                        href={`/project/${project.id}`}
                        className="flex-1 min-w-0 py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5"
                        style={{ 
                          fontFamily: 'Montserrat Alternates',
                          fontWeight: 500,
                          background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                          color: 'white',
                          transition: 'all 0.3s ease',
                        }}
                        aria-label={`View project: ${getProjectName(project)}`}
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>View</span>
                      </a>
                      <button
                        onClick={() => handleDownload(project)}
                        disabled={!project.pdf_url}
                        className="flex-1 min-w-0 py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          fontFamily: 'Montserrat Alternates',
                          fontWeight: 500,
                          background: 'linear-gradient(135deg, #FAA819, #E99502)',
                          color: '#1a1a1a',
                          transition: 'all 0.3s ease',
                        }}
                        aria-label={`Download PDF for project: ${getProjectName(project)}`}
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        disabled={deletingId === project.id}
                        className="shrink-0 p-2 rounded-lg disabled:opacity-50"
                        style={{
                          background: 'rgba(255, 255, 255, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.7)',
                          color: '#4a4642',
                          transition: 'all 0.3s ease',
                        }}
                        aria-label={`Delete project: ${getProjectName(project)}`}
                      >
                        {deletingId === project.id ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              /* Empty State */
              <div 
                className="text-center py-12"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.03) 100%)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.7)',
                  borderRadius: '20px',
                  padding: '48px',
                }}
              >
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.2), rgba(0, 169, 157, 0.2))' }}
                  aria-hidden="true"
                >
                  <svg className="w-12 h-12" style={{ color: '#4a4642' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h2 
                  className="text-2xl mb-3" 
                  style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
                >
                  {searchQuery ? 'No projects found' : 'No projects yet'}
                </h2>
                <p 
                  className="mb-6 max-w-md mx-auto" 
                  style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
                >
                  {searchQuery 
                    ? `No projects match "${searchQuery}". Try a different search term.`
                    : 'Create your first linking strategy to get started. Your generated reports will appear here.'
                  }
                </p>
                {!searchQuery && (
                  <a
                    href="/tools/linking-strategy"
                    className="inline-flex items-center gap-2 py-3 px-6 rounded-xl"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      fontWeight: 500,
                      background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                      color: 'white',
                      boxShadow: '0 4px 15px rgba(0, 169, 157, 0.3)',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <span className="text-xl" aria-hidden="true">+</span> Create Your First Project
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        {/* =============================================
            SCHEMA MARKUP SECTION
        ============================================= */}
        <section>
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <h2 style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem', color: '#1a1a1a' }}>
                Schema Markup
              </h2>
            </div>
          </div>

          {/* Main Glassmorphic Container */}
          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '32px',
              padding: '32px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            }}
          >
            {/* Header Row */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span 
                  className="text-sm"
                  style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
                >
                  {filteredSchemas.length} schema{filteredSchemas.length !== 1 ? 's' : ''}
                </span>
              </div>
              <a 
                href="/tools/schema-studio"
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  fontWeight: 500,
                  background: 'linear-gradient(135deg, #FAA819, #E99502)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: '14px',
                  padding: '12px 24px',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span className="text-xl" aria-hidden="true">+</span> Generate Schema
              </a>
            </div>

            {/* Schemas List */}
            {filteredSchemas.length > 0 ? (
              <div className="space-y-3">
                {filteredSchemas.map((schema) => (
                  <div 
                    key={schema.id}
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(250, 168, 25, 0.03) 100%)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.7)',
                      borderRadius: '16px',
                      transition: 'all 0.3s ease',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Accordion Header */}
                    <div 
                      className="flex items-center gap-4 p-4 cursor-pointer"
                      onClick={() => toggleAccordion(schema.id)}
                    >
                      {/* Icon */}
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.2), rgba(0, 169, 157, 0.2))' }}
                      >
                        {getSchemaTypeEmoji(schema.schema_type)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="font-semibold truncate"
                          style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
                        >
                          {schema.page_title || 'Untitled Page'}
                        </h3>
                        <p 
                          className="text-sm truncate"
                          style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
                        >
                          {schema.url}
                        </p>
                      </div>

                      {/* Type Badge */}
                      <div 
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs shrink-0"
                        style={{ 
                          background: 'rgba(0, 169, 157, 0.1)', 
                          color: '#005a54',
                          fontFamily: 'Montserrat Alternates',
                          fontWeight: 500,
                        }}
                      >
                        <span className="capitalize">{schema.schema_type}</span>
                      </div>

                      {/* Date */}
                      <span 
                        className="hidden md:block text-sm shrink-0"
                        style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
                      >
                        {formatDate(schema.created_at)}
                      </span>

                      {/* Expand/Collapse Icon & Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSchema(schema.id);
                          }}
                          disabled={deletingSchemaId === schema.id}
                          className="p-2 rounded-lg disabled:opacity-50 hover:bg-white/50"
                          style={{
                            color: '#4a4642',
                            transition: 'all 0.3s ease',
                          }}
                        >
                          {deletingSchemaId === schema.id ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                        <div 
                          className="p-2 rounded-lg"
                          style={{
                            background: expandedSchemaId === schema.id ? 'rgba(0, 169, 157, 0.1)' : 'transparent',
                            color: '#00A99D',
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <svg 
                            className="w-5 h-5 transition-transform duration-300" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            style={{ transform: expandedSchemaId === schema.id ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Accordion Content */}
                    {expandedSchemaId === schema.id && (
                      <div 
                        className="px-4 pb-4 border-t"
                        style={{ borderColor: 'rgba(0, 0, 0, 0.05)' }}
                      >
                        {/* Export Format Selector */}
                        <div className="pt-4 pb-3">
                          <label 
                            className="block text-sm mb-2"
                            style={{ fontFamily: 'Inter', fontWeight: 600, color: '#4a4642' }}
                          >
                            Export Format:
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { key: 'raw', label: '📄 Raw HTML' },
                              { key: 'json', label: '{ } Raw JSON' },
                              { key: 'squarespace', label: 'Squarespace' },
                              { key: 'wordpress', label: 'WordPress' },
                              { key: 'webflow', label: 'Webflow' },
                              { key: 'shopify', label: 'Shopify' },
                              { key: 'wix', label: 'Wix' }
                            ].map(({ key, label }) => (
                              <button
                                key={key}
                                onClick={() => setExportFormatForSchema(schema.id, key)}
                                className="px-3 py-1.5 border rounded-lg text-xs font-medium transition-all duration-200"
                                style={{
                                  fontFamily: 'Montserrat Alternates',
                                  background: (selectedExportFormat[schema.id] || 'raw') === key 
                                    ? 'linear-gradient(135deg, #FAA819, #E99502)' 
                                    : 'rgba(255, 255, 255, 0.6)',
                                  color: (selectedExportFormat[schema.id] || 'raw') === key ? 'white' : '#4a4642',
                                  border: (selectedExportFormat[schema.id] || 'raw') === key 
                                    ? '1px solid transparent' 
                                    : '1px solid rgba(0, 0, 0, 0.1)',
                                }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Code Display */}
                        <div className="relative">
                          <pre 
                            className="bg-[#1e1e1e] rounded-xl p-4 overflow-x-auto text-xs"
                            style={{ maxHeight: '300px' }}
                          >
                            <code className="text-[#d4d4d4] font-mono leading-relaxed whitespace-pre-wrap">
                              {formatSchemaForExport(schema.schema_script, selectedExportFormat[schema.id] || 'raw')}
                            </code>
                          </pre>
                        </div>

                        {/* Copy Button */}
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-xs" style={{ fontFamily: 'Inter', color: '#6b7280' }}>
                            Validate: {' '}
                            <a href="https://validator.schema.org/" target="_blank" rel="noopener noreferrer" className="text-[#00A99D] hover:underline">
                              Schema.org
                            </a>
                            {' '} · {' '}
                            <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" className="text-[#00A99D] hover:underline">
                              Google Rich Results
                            </a>
                          </p>
                          <button
                            onClick={() => copySchemaWithFormat(schema)}
                            className="py-2 px-5 rounded-lg text-sm flex items-center gap-2"
                            style={{ 
                              fontFamily: 'Montserrat Alternates',
                              fontWeight: 500,
                              background: copiedSchemaId === schema.id 
                                ? 'rgba(16, 185, 129, 0.2)' 
                                : 'linear-gradient(135deg, #00A99D, #0D7871)',
                              color: copiedSchemaId === schema.id ? '#065f46' : 'white',
                              transition: 'all 0.3s ease',
                            }}
                          >
                            {copiedSchemaId === schema.id ? '✓ Copied!' : '📋 Copy Code'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div 
                className="text-center py-12"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(250, 168, 25, 0.03) 100%)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.7)',
                  borderRadius: '20px',
                  padding: '48px',
                }}
              >
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.2), rgba(0, 169, 157, 0.2))' }}
                  aria-hidden="true"
                >
                  <span className="text-4xl">📋</span>
                </div>
                <h2 
                  className="text-2xl mb-3" 
                  style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
                >
                  {searchQuery ? 'No schemas found' : 'No schemas yet'}
                </h2>
                <p 
                  className="mb-6 max-w-md mx-auto" 
                  style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
                >
                  {searchQuery 
                    ? `No schemas match "${searchQuery}". Try a different search term.`
                    : 'Generate schema markup to help AI understand your content better.'
                  }
                </p>
                {!searchQuery && (
                  <a
                    href="tools/schema-studio"
                    className="inline-flex items-center gap-2 py-3 px-6 rounded-xl"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      fontWeight: 500,
                      background: 'linear-gradient(135deg, #FAA819, #E99502)',
                      color: 'white',
                      boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <span className="text-xl" aria-hidden="true">+</span> Generate Your First Schema
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
}