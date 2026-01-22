'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import Layout from '../../components/Layout';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';

interface LeafItem {
  title: string;
  description: string;
}

interface PollinatorItem {
  name: string;
  reason: string;
  url?: string | null;
}

interface NetworkItem {
  title: string;
  reason: string;
}

interface ProjectData {
  id: string;
  created_at: string;
  updated_at: string;
  project_title: string;
  title: string;
  pdf_url: string;
  browser_url: string;
  thumbnail: string;
  source_url?: string;
  map: {
    page_intent?: string | { type: string; description: string };
    page_intent_type?: string;
    roots?: string[];
    soil?: string[];
    branches?: string[];
    leaves?: LeafItem[];
    fruit?: string[];
    pollinators?: PollinatorItem[];
    underground_network?: NetworkItem[];
    cultivation_plan?: string[];
    // Legacy field names
    overview_summary?: string;
    entity_highlights?: { root?: string[]; branch?: string[]; fruit?: string[] };
    internal_links?: string[];
    external_links?: string[];
    anchor_suggestions?: string[];
    action_checklist?: string[];
  };
}

export default function ProjectView() {
  const params = useParams();
  const projectId = params?.id as string;
  const { user, loading: authLoading } = useAuth();

  // Light mode colors
  const colors = {
    text: '#2e2a27',
    textMuted: 'rgba(46, 42, 39, 0.6)',
    textLight: 'rgba(46, 42, 39, 0.4)',
    textHover: 'rgba(46, 42, 39, 0.8)',
    cardBg: 'rgba(255, 255, 255, 0.65)',
    cardBorder: 'rgba(255, 255, 255, 0.7)',
    containerBg: 'rgba(255, 255, 255, 0.45)',
    containerBorder: 'rgba(255, 255, 255, 0.5)',
    inputBg: 'rgba(255, 255, 255, 0.5)',
    inputBorder: 'rgba(255, 255, 255, 0.6)',
    tabBg: 'rgba(255, 255, 255, 0.6)',
    modalBg: 'rgba(255, 255, 255, 0.7)',
    // Ecosystem colors
    rootBg: 'rgba(250, 168, 25, 0.15)',
    rootText: '#E99502',
    branchBg: 'rgba(0, 169, 157, 0.15)',
    branchText: '#00A99D',
    soilBg: 'rgba(139, 115, 85, 0.15)',
    soilText: '#6B5344',
    fruitBg: 'rgba(255, 107, 53, 0.15)',
    fruitText: '#FF6B35',
  };

  const [project, setProject] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [checkedItems, setCheckedItems] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'ecosystem' | 'links' | 'actions'>('overview');
  const [isSaving, setIsSaving] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedOverview, setEditedOverview] = useState('');
  const [editedRootKeywords, setEditedRootKeywords] = useState<string[]>([]);
  const [editedBranchKeywords, setEditedBranchKeywords] = useState<string[]>([]);
  const [editedFruitKeywords, setEditedFruitKeywords] = useState<string[]>([]);
  const [editedSoil, setEditedSoil] = useState<string[]>([]);
  const [editedLeaves, setEditedLeaves] = useState<LeafItem[]>([]);
  const [editedInternalLinks, setEditedInternalLinks] = useState<NetworkItem[]>([]);
  const [editedExternalLinks, setEditedExternalLinks] = useState<PollinatorItem[]>([]);
  const [editedActions, setEditedActions] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isAddingTodos, setIsAddingTodos] = useState(false);
  const [todoSuccess, setTodoSuccess] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Glassmorphic style constants - theme aware
  const glassCard = {
    background: colors.cardBg,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: '20px',
  };

  const glassModal = {
    background: colors.modalBg,
    backdropFilter: 'blur(40px)',
    WebkitBackdropFilter: 'blur(40px)',
    border: `1px solid ${'rgba(255, 255, 255, 0.18)'}`,
    borderRadius: '24px',
  };

  useEffect(() => {
    async function fetchProject() {
      if (authLoading) return;
      if (!projectId || !user) {
        setIsLoading(false);
        return;
      }
      try {
        const { data, error: fetchError } = await supabase
          .from('geo_linking_projects_real')
          .select('*')
          .eq('id', projectId)
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .single();
        if (fetchError) throw new Error(fetchError.message);
        if (!data) throw new Error('Project not found');
        setProject(data);
        setEditedName(data.title || data.project_title || 'Untitled Project');
        initializeEditState(data.map);
      } catch (err: any) {
        console.error('Error fetching project:', err);
        setError(err.message || 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    }
    fetchProject();
  }, [projectId, user, authLoading]);

  const initializeEditState = (map: any) => {
    if (!map) return;
    
    // Page intent can be string or object
    const pageIntent = typeof map.page_intent === 'object' 
      ? map.page_intent.description 
      : (map.page_intent || map.overview_summary || '');
    setEditedOverview(pageIntent);
    
    // Ecosystem elements
    setEditedRootKeywords(map.roots || map.entity_highlights?.root || []);
    setEditedBranchKeywords(map.branches || map.entity_highlights?.branch || []);
    setEditedFruitKeywords(map.fruit || map.entity_highlights?.fruit || []);
    setEditedSoil(map.soil || map.anchor_suggestions || []);
    setEditedLeaves(map.leaves || []);
    
    // Links - handle both object and string formats
    const internalLinks = (map.underground_network || []).map((item: any) => 
      typeof item === 'string' ? { title: item, reason: '' } : item
    );
    const externalLinks = (map.pollinators || []).map((item: any) => 
      typeof item === 'string' ? { name: item, reason: '', url: null } : item
    );
    setEditedInternalLinks(internalLinks);
    setEditedExternalLinks(externalLinks);
    
    // Actions
    setEditedActions(map.cultivation_plan || map.action_checklist || []);
  };

  const getProjectName = () => project?.title || project?.project_title || 'Untitled Project';
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  
  const copyToClipboard = (text: string) => { 
    navigator.clipboard.writeText(text); 
  };

  const getPageIntentType = () => {
    const map = project?.map;
    if (!map) return 'Informational';
    if (map.page_intent_type) return map.page_intent_type;
    if (typeof map.page_intent === 'object' && map.page_intent.type) return map.page_intent.type;
    return 'Informational';
  };

  const getPageIntentDescription = () => {
    const map = project?.map;
    if (!map) return '';
    if (typeof map.page_intent === 'object') return map.page_intent.description || '';
    return map.page_intent || map.overview_summary || '';
  };

  const handleSaveName = async () => {
    if (!project) return;
    try {
      setIsSaving(true);
      const { error: updateError } = await supabase
        .from('geo_linking_projects_real')
        .update({ title: editedName, project_title: editedName })
        .eq('id', project.id);
      if (updateError) throw updateError;
      setProject({ ...project, title: editedName, project_title: editedName });
      setIsEditingName(false);
    } catch (err: any) { 
      alert('Failed to update project name'); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleSaveChanges = async () => {
    if (!project) return;
    try {
      setIsSaving(true);
      const updatedMap = {
        ...project.map,
        page_intent: editedOverview,
        roots: editedRootKeywords,
        branches: editedBranchKeywords,
        fruit: editedFruitKeywords,
        soil: editedSoil,
        leaves: editedLeaves,
        underground_network: editedInternalLinks,
        pollinators: editedExternalLinks,
        cultivation_plan: editedActions,
        // Keep legacy fields in sync
        overview_summary: editedOverview,
        entity_highlights: { 
          root: editedRootKeywords, 
          branch: editedBranchKeywords, 
          fruit: editedFruitKeywords 
        },
        anchor_suggestions: editedSoil,
        action_checklist: editedActions,
      };
      const { error: updateError } = await supabase
        .from('geo_linking_projects_real')
        .update({ map: updatedMap })
        .eq('id', project.id);
      if (updateError) throw updateError;
      setProject({ ...project, map: updatedMap });
      setIsEditing(false);
    } catch (err: any) { 
      alert('Failed to save changes'); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleCancelEdit = () => { 
    initializeEditState(project?.map); 
    setIsEditing(false); 
  };

  const handleAddAllToTodos = async () => {
    if (!project || !user) return;
    const actionItems = project.map?.cultivation_plan || project.map?.action_checklist || [];
    if (actionItems.length === 0) return;
    
    setIsAddingTodos(true);
    setTodoSuccess(false);
    
    try {
      const { data: existingTodos, error: fetchError } = await supabase
        .from('user_todos')
        .select('task')
        .eq('user_id', user.id)
        .eq('project_id', project.id);
      
      if (fetchError) throw fetchError;
      
      const existingTasks = new Set((existingTodos || []).map(t => t.task.toLowerCase().trim()));
      
      const newTodos: any[] = [];
      
      actionItems.forEach((item: string) => {
        let priority = 'medium';
        let task = item;
        if (item.toUpperCase().startsWith('HIGH:')) { 
          priority = 'high'; 
          task = item.substring(5).trim(); 
        } else if (item.toUpperCase().startsWith('MEDIUM:')) { 
          priority = 'medium'; 
          task = item.substring(7).trim(); 
        } else if (item.toUpperCase().startsWith('LOW:')) { 
          priority = 'low'; 
          task = item.substring(4).trim(); 
        }
        
        if (!existingTasks.has(task.toLowerCase().trim())) {
          newTodos.push({ 
            user_id: user.id, 
            project_id: project.id, 
            project_title: project.title || project.project_title || 'Untitled Project', 
            task, 
            priority, 
            completed: false 
          });
        }
      });
      
      if (newTodos.length === 0) {
        alert('All action items have already been added to your to-do list.');
        setIsAddingTodos(false);
        return;
      }
      
      const { error } = await supabase.from('user_todos').insert(newTodos);
      if (error) throw error;
      
      setTodoSuccess(true);
      setTimeout(() => setTodoSuccess(false), 5000);
      
    } catch (err: any) { 
      console.error('Error adding todos:', err); 
      alert('Failed to add to-dos. Please try again.');
    } finally { 
      setIsAddingTodos(false); 
    }
  };

  const handleDownload = () => { 
    if (project?.pdf_url) window.open(project.pdf_url, '_blank'); 
  };

  const handleDelete = async () => {
    if (!project) return;
    try {
      const { error: deleteError } = await supabase
        .from('geo_linking_projects_real')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', project.id)
        .eq('user_id', user?.id);
      if (deleteError) throw deleteError;
      window.location.href = '/my-projects';
    } catch (err: any) { 
      alert('Failed to delete project'); 
    }
  };

  const toggleCheckItem = (index: number) => { 
    setCheckedItems(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]); 
  };
  
  const addKeyword = (type: 'root' | 'branch' | 'fruit' | 'soil') => {
    if (!newKeyword.trim()) return;
    if (type === 'root') setEditedRootKeywords([...editedRootKeywords, newKeyword.trim()]);
    if (type === 'branch') setEditedBranchKeywords([...editedBranchKeywords, newKeyword.trim()]);
    if (type === 'fruit') setEditedFruitKeywords([...editedFruitKeywords, newKeyword.trim()]);
    if (type === 'soil') setEditedSoil([...editedSoil, newKeyword.trim()]);
    setNewKeyword('');
  };
  
  const removeKeyword = (type: 'root' | 'branch' | 'fruit' | 'soil', index: number) => {
    if (type === 'root') setEditedRootKeywords(editedRootKeywords.filter((_, i) => i !== index));
    if (type === 'branch') setEditedBranchKeywords(editedBranchKeywords.filter((_, i) => i !== index));
    if (type === 'fruit') setEditedFruitKeywords(editedFruitKeywords.filter((_, i) => i !== index));
    if (type === 'soil') setEditedSoil(editedSoil.filter((_, i) => i !== index));
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <Layout activeNav="my-projects">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#FAA819] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#2e2a27]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
              Loading project...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <Layout activeNav="my-projects">
        <div className="flex items-center gap-2 text-sm mb-6 -mt-2" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
          <a href="/my-projects" className="text-[#00A99D] hover:text-[#0D7871] transition-colors">My Projects</a>
          <span className="text-[#2e2a27]">→</span>
          <span className="text-[#2e2a27]">Error</span>
        </div>
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '20px',
            padding: '32px',
          }}
          className="text-center"
        >
          <h3 className="text-xl text-red-600 font-semibold mb-2" style={{ fontFamily: 'Montserrat Alternates' }}>
            {error || 'Project not found'}
          </h3>
          <a 
            href="/my-projects" 
            className="inline-block px-6 py-3 rounded-xl font-semibold transition-all"
            style={{ 
              background: colors.inputBg,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${colors.inputBorder}`,
              color: colors.text,
              fontFamily: 'Montserrat Alternates' 
            }}
          >
            ← Back to My Projects
          </a>
        </div>
      </Layout>
    );
  }

  const mapData = project.map || {};

  return (
    <Layout activeNav="my-projects">
      {/* Breadcrumb - Outside main container */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
        <a href="/my-projects" className="text-[#00A99D] hover:text-[#0D7871] transition-colors">My Projects</a>
        <span style={{ color: colors.textLight }}>→</span>
        <span style={{ color: colors.textMuted }}>{getProjectName()}</span>
      </div>

      {/* Main Glassmorphic Container */}
      <div style={{ 
        background: colors.containerBg, 
        backdropFilter: 'blur(20px)', 
        WebkitBackdropFilter: 'blur(20px)', 
        border: `1px solid ${colors.containerBorder}`, 
        borderRadius: '32px', 
        padding: '32px', 
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' 
      }}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Column - PDF Preview */}
          <div className="space-y-6">
            <div style={{ ...glassCard, borderRadius: '24px', overflow: 'hidden' }}>
              {/* PDF Header with gradient */}
              <div 
                className="p-4 flex items-center justify-between"
                style={{
                  background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                }}
              >
                <h2 className="text-white font-semibold flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF Preview
                </h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleDownload} 
                    disabled={!project.pdf_url} 
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-105" 
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.25)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      color: 'white',
                      fontFamily: 'Montserrat Alternates' 
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                    title="View fullscreen"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* PDF Viewer */}
              <div className="p-4" style={{ background: 'rgba(46, 42, 39, 0.8)', height: '600px' }}>
                {(project.browser_url || project.pdf_url) ? (
                  <iframe 
                    src={project.browser_url || project.pdf_url} 
                    className="w-full h-full rounded-xl bg-white" 
                    title="GEO Linking Map PDF" 
                    style={{ border: 'none' }} 
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-white flex items-center justify-center flex-col gap-4">
                    <p className="text-[#2e2a27]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                      PDF preview not available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Project Details */}
          <div className="space-y-6">
            {/* Project Info Card */}
            <div style={glassCard} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={editedName} 
                        onChange={(e) => setEditedName(e.target.value)} 
                        className="text-2xl px-3 py-2 rounded-xl focus:outline-none flex-1"
                        style={{ 
                          fontFamily: 'Montserrat Alternates', 
                          fontWeight: 700,
                          color: colors.text,
                          background: colors.inputBg,
                          backdropFilter: 'blur(10px)',
                          border: '2px solid #FAA819',
                        }} 
                        autoFocus 
                      />
                      <button 
                        onClick={handleSaveName} 
                        disabled={isSaving} 
                        className="p-2 rounded-xl transition-all disabled:opacity-50 hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                          color: 'white',
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => { setIsEditingName(false); setEditedName(getProjectName()); }} 
                        className="p-2 rounded-xl transition-all hover:scale-105"
                        style={{
                          background: colors.inputBg,
                          backdropFilter: 'blur(10px)',
                          border: `1px solid ${colors.inputBorder}`,
                          color: colors.text,
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl text-[#2e2a27]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>
                        {getProjectName()}
                      </h1>
                      <button 
                        onClick={() => setIsEditingName(true)} 
                        className="p-1.5 text-[#2e2a27] hover:text-[#FAA819] hover:bg-[#FAA819]/10 rounded-lg transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <span 
                    className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium"
                    style={{ 
                      background: colors.branchBg,
                      color: '#00A99D',
                      fontFamily: 'Montserrat Alternates' 
                    }}
                  >
                    Linking Strategy
                  </span>
                </div>
                <button 
                  onClick={() => setShowDeleteModal(true)} 
                  className="p-2 text-[#2e2a27] hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-1 gap-4 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.4)' }}>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                    }}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-[#2e2a27]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Created</p>
                    <p className="text-sm text-[#2e2a27] font-medium" style={{ fontFamily: 'Inter' }}>{formatDate(project.created_at)}</p>
                  </div>
                </div>
                
                {project.source_url && (
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                      }}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#2e2a27]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Source URL</p>
                      <a 
                        href={project.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-[#00A99D] hover:text-[#0D7871] font-medium truncate block transition" 
                        style={{ fontFamily: 'Inter' }}
                      >
                        {project.source_url}
                      </a>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(project.source_url || '')} 
                      className="p-2 text-[#2e2a27] hover:text-[#00A99D] hover:bg-[#00A99D]/10 rounded-lg transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs Card */}
            <div style={{ ...glassCard, borderRadius: '24px', overflow: 'hidden' }}>
              {/* Tab Navigation */}
              <div className="flex" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.4)' }}>
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'ecosystem', label: 'Ecosystem' },
                  { key: 'links', label: 'Links' },
                  { key: 'actions', label: 'Action Items' }
                ].map((tab) => (
                  <button 
                    key={tab.key} 
                    onClick={() => setActiveTab(tab.key as any)} 
                    className="flex-1 py-4 px-4 text-sm transition-all"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      fontWeight: 500,
                      background: activeTab === tab.key 
                        ? 'linear-gradient(135deg, rgba(0, 169, 157, 0.95) 0%, rgba(13, 120, 113, 0.95) 100%)'
                        : 'transparent',
                      color: activeTab === tab.key ? 'white' : colors.textMuted,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6" style={{ background: colors.tabBg, borderRadius: '0 0 20px 20px' }}>
                {/* Edit/Save/Cancel Buttons */}
                <div className="flex justify-end mb-4">
                  {!isEditing ? (
                    <button 
                      onClick={() => setIsEditing(true)} 
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#FAA819] hover:bg-[#FAA819]/10 rounded-xl transition" 
                      style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleCancelEdit} 
                        className="px-4 py-2 text-sm rounded-xl transition-all"
                        style={{ 
                          fontFamily: 'Montserrat Alternates',
                          fontWeight: 500,
                          background: colors.inputBg,
                          backdropFilter: 'blur(10px)',
                          border: `1px solid ${colors.inputBorder}`,
                          color: colors.text,
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveChanges} 
                        disabled={isSaving} 
                        className="px-4 py-2 text-sm rounded-xl transition-all disabled:opacity-50 hover:scale-105"
                        style={{ 
                          fontFamily: 'Montserrat Alternates',
                          fontWeight: 500,
                          background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                          color: 'white',
                        }}
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Page Intent Type Badge */}
                    <div className="flex items-center gap-3 mb-2">
                      <span 
                        className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide"
                        style={{ 
                          background: getPageIntentType() === 'Transactional' ? 'rgba(250, 168, 25, 0.2)' :
                                     getPageIntentType() === 'Commercial' ? 'rgba(0, 169, 157, 0.2)' :
                                     getPageIntentType() === 'Navigational' ? 'rgba(99, 102, 241, 0.2)' :
                                     'rgba(46, 42, 39, 0.1)',
                          color: getPageIntentType() === 'Transactional' ? '#E99502' :
                                 getPageIntentType() === 'Commercial' ? '#00A99D' :
                                 getPageIntentType() === 'Navigational' ? '#6366F1' :
                                 '#525252',
                          fontFamily: 'Montserrat Alternates',
                        }}
                      >
                        🌳 {getPageIntentType()} Intent
                      </span>
                    </div>

                    {/* Page Intent Description */}
                    <div>
                      <h3 className="text-lg mb-3" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: colors.text }}>
                        Trunk (Page Intent)
                      </h3>
                      {isEditing ? (
                        <textarea 
                          value={editedOverview} 
                          onChange={(e) => setEditedOverview(e.target.value)} 
                          className="w-full h-32 p-4 rounded-xl focus:outline-none"
                          style={{ 
                            fontFamily: 'Inter', 
                            fontWeight: 500,
                            color: colors.text,
                            background: colors.inputBg,
                            backdropFilter: 'blur(10px)',
                            border: '2px solid #FAA819',
                          }} 
                          placeholder="Describe the main purpose of this page..." 
                        />
                      ) : (
                        <p className="leading-relaxed text-[#2e2a27]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                          {getPageIntentDescription() || 'No page intent available. Click Edit to add one.'}
                        </p>
                      )}
                    </div>

                    {/* Leaves - Clarity Signals */}
                    {(mapData.leaves && mapData.leaves.length > 0) && (
                      <div>
                        <h3 className="text-base mb-3 flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: colors.text }}>
                          <span className="text-lg">🍃</span> Leaves (Clarity Signals)
                        </h3>
                        <div className="space-y-2">
                          {mapData.leaves.map((leaf: LeafItem, i: number) => (
                            <div 
                              key={i} 
                              className="p-3 rounded-xl"
                              style={{
                                background: colors.inputBg,
                                border: '1px solid rgba(0, 169, 157, 0.2)',
                              }}
                            >
                              <h4 className="text-sm font-semibold mb-1" style={{ fontFamily: 'Inter', color: colors.text }}>
                                {leaf.title}
                              </h4>
                              <p className="text-xs" style={{ fontFamily: 'Inter', color: colors.textMuted }}>
                                {leaf.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Ecosystem Tab - Shows Roots, Branches, Soil, Fruit */}
                {activeTab === 'ecosystem' && (
                  <div className="space-y-6">
                    {/* Roots - Core Concepts */}
                    <div>
                      <h3 className="text-sm mb-3 flex items-center gap-2 text-[#E99502]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
                        <span className="text-lg">🌱</span> Roots (Core Concepts)
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(isEditing ? editedRootKeywords : (mapData.roots || [])).map((kw: string, i: number) => (
                          <span 
                            key={i} 
                            className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 bg-[#FAA819]/15 text-[#E99502]"
                            style={{ 
                              fontFamily: 'Inter', 
                              fontWeight: 500,
                            }}
                          >
                            {kw}
                            {isEditing && (
                              <button onClick={() => removeKeyword('root', i)} className="hover:text-red-500">×</button>
                            )}
                          </span>
                        ))}
                        {isEditing && (
                          <input 
                            type="text" 
                            placeholder="Add + Enter" 
                            className="px-3 py-1.5 rounded-lg text-sm w-28 focus:outline-none"
                            style={{
                              background: colors.inputBg,
                              border: '1px dashed #FAA819',
                              color: colors.text,
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { addKeyword('root'); } }} 
                            value={newKeyword} 
                            onChange={(e) => setNewKeyword(e.target.value)} 
                          />
                        )}
                        {!isEditing && (mapData.roots || []).length === 0 && (
                          <span className="text-[#2e2a27] text-sm italic">No root concepts defined</span>
                        )}
                      </div>
                    </div>

                    {/* Branches - Supporting Topics */}
                    <div>
                      <h3 className="text-sm mb-3 flex items-center gap-2 text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
                        <span className="text-lg">🌿</span> Branches (Supporting Topics)
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(isEditing ? editedBranchKeywords : (mapData.branches || [])).map((kw: string, i: number) => (
                          <span 
                            key={i} 
                            className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 bg-[#00A99D]/15 text-[#00A99D]"
                            style={{ 
                              fontFamily: 'Inter', 
                              fontWeight: 500,
                            }}
                          >
                            {kw}
                            {isEditing && (
                              <button onClick={() => removeKeyword('branch', i)} className="hover:text-red-500">×</button>
                            )}
                          </span>
                        ))}
                        {!isEditing && (mapData.branches || []).length === 0 && (
                          <span className="text-[#2e2a27] text-sm italic">No supporting topics defined</span>
                        )}
                      </div>
                    </div>

                    {/* Soil - Anchor Text */}
                    <div>
                      <h3 className="text-sm mb-3 flex items-center gap-2 text-[#6B5344]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
                        <span className="text-lg">🌾</span> Soil (Anchor Text Phrases)
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(isEditing ? editedSoil : (mapData.soil || [])).map((text: string, i: number) => (
                          <span 
                            key={i} 
                            className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 group cursor-pointer bg-[#8B7355]/15 text-[#6B5344]"
                            style={{ 
                              fontFamily: 'Inter', 
                              fontWeight: 500,
                            }}
                            onClick={() => !isEditing && copyToClipboard(text)}
                            title={!isEditing ? 'Click to copy' : undefined}
                          >
                            "{text}"
                            {isEditing && (
                              <button onClick={(e) => { e.stopPropagation(); removeKeyword('soil', i); }} className="hover:text-red-500">×</button>
                            )}
                            {!isEditing && (
                              <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </span>
                        ))}
                        {isEditing && (
                          <input 
                            type="text" 
                            placeholder="Add + Enter" 
                            className="px-3 py-1.5 rounded-lg text-sm w-28 focus:outline-none"
                            style={{
                              background: colors.inputBg,
                              border: '1px dashed #8B7355',
                              color: colors.text,
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { addKeyword('soil'); } }} 
                            value={newKeyword} 
                            onChange={(e) => setNewKeyword(e.target.value)} 
                          />
                        )}
                        {!isEditing && (mapData.soil || []).length === 0 && (
                          <span className="text-[#2e2a27] text-sm italic">No anchor text phrases defined</span>
                        )}
                      </div>
                    </div>

                    {/* Fruit - Proof Points */}
                    <div>
                      <h3 className="text-sm mb-3 flex items-center gap-2 text-[#FF6B35]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
                        <span className="text-lg">🍊</span> Fruit (Proof Points)
                      </h3>
                      <div className="space-y-2">
                        {(isEditing ? editedFruitKeywords : (mapData.fruit || [])).map((item: string, i: number) => {
                          const isSuggestion = item.toUpperCase().startsWith('SUGGESTION:');
                          const displayText = isSuggestion ? item.substring(11).trim() : item;
                          
                          return (
                            <div 
                              key={i} 
                              className="flex items-start gap-2 p-3 rounded-xl"
                              style={{
                                background: isSuggestion ? 'rgba(255, 107, 53, 0.08)' : 'rgba(255, 107, 53, 0.15)',
                                border: isSuggestion ? '1px dashed rgba(255, 107, 53, 0.4)' : '1px solid rgba(255, 107, 53, 0.2)',
                              }}
                            >
                              {isSuggestion && (
                                <span 
                                  className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
                                  style={{ background: 'rgba(255, 107, 53, 0.2)', color: '#FF6B35' }}
                                >
                                  Suggestion
                                </span>
                              )}
                              <span className="flex-1 text-sm text-[#2e2a27]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                                {displayText}
                              </span>
                              {isEditing && (
                                <button onClick={() => removeKeyword('fruit', i)} className="text-[#2e2a27] hover:text-red-500">×</button>
                              )}
                            </div>
                          );
                        })}
                        {!isEditing && (mapData.fruit || []).length === 0 && (
                          <p className="text-[#2e2a27] text-sm italic">No proof points defined</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Links Tab */}
                {activeTab === 'links' && (
                  <div className="space-y-6">
                    {/* Underground Network - Internal Links */}
                    <div>
                      <h3 className="text-sm text-[#FAA819] mb-3 flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
                        <span className="text-lg">🌐</span> Underground Network (Internal Links)
                      </h3>
                      <div className="space-y-2">
                        {(isEditing ? editedInternalLinks : (mapData.underground_network || [])).map((item: any, i: number) => {
                          const link = typeof item === 'string' ? { title: item, reason: '' } : item;
                          return (
                            <div 
                              key={i} 
                              className="p-3 rounded-xl"
                              style={{ 
                                background: colors.inputBg,
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(250, 168, 25, 0.2)',
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <svg className="w-4 h-4 text-[#FAA819] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-[#2e2a27]" style={{ fontFamily: 'Inter' }}>
                                    {link.title}
                                  </p>
                                  {link.reason && (
                                    <p className="text-xs text-[#2e2a27] mt-1" style={{ fontFamily: 'Inter' }}>
                                      {link.reason}
                                    </p>
                                  )}
                                </div>
                                {isEditing && (
                                  <button 
                                    onClick={() => setEditedInternalLinks(editedInternalLinks.filter((_, idx) => idx !== i))} 
                                    className="text-[#2e2a27] hover:text-red-500"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {!isEditing && (mapData.underground_network || []).length === 0 && (
                          <p className="text-[#2e2a27] text-sm italic">No internal link suggestions</p>
                        )}
                      </div>
                    </div>

                    {/* Pollinators - External Links */}
                    <div>
                      <h3 className="text-sm text-[#00A99D] mb-3 flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
                        <span className="text-lg">🐝</span> Pollinators (External Authority)
                      </h3>
                      <div className="space-y-2">
                        {(isEditing ? editedExternalLinks : (mapData.pollinators || [])).map((item: any, i: number) => {
                          const link = typeof item === 'string' ? { name: item, reason: '', url: null } : item;
                          return (
                            <div 
                              key={i} 
                              className="p-3 rounded-xl"
                              style={{ 
                                background: colors.inputBg,
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(0, 169, 157, 0.2)',
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <svg className="w-4 h-4 text-[#00A99D] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-[#2e2a27]" style={{ fontFamily: 'Inter' }}>
                                    {link.name}
                                  </p>
                                  {link.reason && (
                                    <p className="text-xs text-[#2e2a27] mt-1" style={{ fontFamily: 'Inter' }}>
                                      {link.reason}
                                    </p>
                                  )}
                                  {link.url && (
                                    <a 
                                      href={link.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-[#00A99D] hover:underline mt-1 block"
                                    >
                                      {link.url}
                                    </a>
                                  )}
                                </div>
                                {isEditing && (
                                  <button 
                                    onClick={() => setEditedExternalLinks(editedExternalLinks.filter((_, idx) => idx !== i))} 
                                    className="text-[#2e2a27] hover:text-red-500"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {!isEditing && (mapData.pollinators || []).length === 0 && (
                          <p className="text-[#2e2a27] text-sm italic">No external link suggestions</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions Tab */}
                {activeTab === 'actions' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg text-[#2e2a27] flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
                        <span className="text-lg">✅</span> Cultivation Plan
                      </h3>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-[#00A99D] font-medium" style={{ fontFamily: 'Inter' }}>
                          {checkedItems.length} / {(isEditing ? editedActions : (mapData.cultivation_plan || [])).length} complete
                        </span>
                        {!isEditing && (mapData.cultivation_plan || []).length > 0 && (
                          <button 
                            onClick={handleAddAllToTodos} 
                            disabled={isAddingTodos} 
                            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl transition-all disabled:opacity-50 hover:scale-105"
                            style={{ 
                              fontFamily: 'Montserrat Alternates',
                              fontWeight: 600,
                              background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                              color: 'white',
                            }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {isAddingTodos ? 'Adding...' : 'Add All to To-Do'}
                          </button>
                        )}
                      </div>
                    </div>

                    {todoSuccess && (
                      <div 
                        className="mb-4 p-3 rounded-xl flex items-center gap-2"
                        style={{
                          background: colors.branchBg,
                          border: '1px solid rgba(0, 169, 157, 0.3)',
                          color: '#00A99D',
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium" style={{ fontFamily: 'Inter' }}>Added to your To-Do list!</span>
                        <a href="/todos" className="ml-auto text-sm underline hover:no-underline">View To-Dos →</a>
                      </div>
                    )}

                    {(isEditing ? editedActions : (mapData.cultivation_plan || [])).length > 0 ? (
                      <div className="space-y-2">
                        {(isEditing ? editedActions : (mapData.cultivation_plan || [])).map((item: string, i: number) => {
                          let priority = 'medium';
                          let displayText = item;
                          if (item.toUpperCase().startsWith('HIGH:')) { 
                            priority = 'high'; 
                            displayText = item.substring(5).trim(); 
                          } else if (item.toUpperCase().startsWith('MEDIUM:')) { 
                            priority = 'medium'; 
                            displayText = item.substring(7).trim(); 
                          } else if (item.toUpperCase().startsWith('LOW:')) { 
                            priority = 'low'; 
                            displayText = item.substring(4).trim(); 
                          }
                          
                          return (
                            <label 
                              key={i} 
                              className={`flex items-start gap-3 p-4 rounded-xl transition-all ${!isEditing ? 'cursor-pointer' : ''}`}
                              style={{
                                background: checkedItems.includes(i) 
                                  ? 'rgba(0, 169, 157, 0.15)' 
                                  : 'rgba(255, 255, 255, 0.5)',
                                backdropFilter: 'blur(10px)',
                                border: checkedItems.includes(i) 
                                  ? '1px solid rgba(0, 169, 157, 0.3)' 
                                  : '1px solid rgba(255, 255, 255, 0.6)',
                              }}
                            >
                              {!isEditing && (
                                <input 
                                  type="checkbox" 
                                  checked={checkedItems.includes(i)} 
                                  onChange={() => toggleCheckItem(i)} 
                                  className="mt-0.5 w-5 h-5 rounded border-2 border-[#dedede] text-[#00A99D] focus:ring-[#00A99D] cursor-pointer" 
                                />
                              )}
                              {isEditing ? (
                                <div className="flex-1 flex items-center gap-2">
                                  <input 
                                    type="text" 
                                    value={item} 
                                    onChange={(e) => { 
                                      const newActions = [...editedActions]; 
                                      newActions[i] = e.target.value; 
                                      setEditedActions(newActions); 
                                    }} 
                                    className="flex-1 px-2 py-1 rounded-lg focus:outline-none"
                                    style={{ 
                                      fontFamily: 'Inter', 
                                      fontWeight: 500,
                                      background: colors.inputBg,
                                      border: `1px solid ${colors.inputBorder}`,
                                      color: colors.text,
                                    }} 
                                  />
                                  <button 
                                    onClick={() => setEditedActions(editedActions.filter((_, idx) => idx !== i))} 
                                    className="text-[#2e2a27] hover:text-red-500"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <div className="flex-1 flex items-start justify-between gap-3">
                                  <span 
                                    className={`text-sm leading-relaxed ${
                                      checkedItems.includes(i) 
                                        ? 'text-[#2e2a27] line-through' 
                                        : 'text-[#2e2a27]'
                                    }`} 
                                    style={{ fontFamily: 'Inter', fontWeight: 500 }}
                                  >
                                    {displayText}
                                  </span>
                                  <span 
                                    className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                                      priority === 'high' 
                                        ? 'bg-red-100 text-red-700' 
                                        : priority === 'medium' 
                                          ? 'bg-amber-100 text-amber-700' 
                                          : 'bg-green-100 text-green-700'
                                    }`}
                                  >
                                    {priority}
                                  </span>
                                </div>
                              )}
                            </label>
                          );
                        })}
                        {isEditing && (
                          <div className="p-3">
                            <input 
                              type="text" 
                              placeholder="Add action item + Enter" 
                              className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none"
                              style={{
                                background: colors.inputBg,
                                border: '1px dashed #00A99D',
                                color: colors.text,
                              }}
                              onKeyDown={(e) => { 
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) { 
                                  setEditedActions([...editedActions, e.currentTarget.value.trim()]); 
                                  e.currentTarget.value = ''; 
                                } 
                              }} 
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[#2e2a27] text-center py-8" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                        No action items available. Click Edit to add some.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal - Glassmorphic */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div 
            className="max-w-md w-full p-8"
            style={glassModal}
          >
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
              }}
            >
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-2xl text-[#2e2a27] mb-4 text-center" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
              Delete Project?
            </h3>
            <p className="text-[#2e2a27] mb-6 text-center" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
              Are you sure you want to delete "<strong className="text-[#2e2a27]">{getProjectName()}</strong>"? 
              You can recover it from Settings within 14 days.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteModal(false)} 
                className="flex-1 px-6 py-3 rounded-xl transition-all hover:scale-105"
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  fontWeight: 600,
                  background: colors.inputBg,
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${colors.inputBorder}`,
                  color: colors.text,
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete} 
                className="flex-1 px-6 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all hover:scale-105" 
                style={{ fontFamily: 'Montserrat Alternates' }}
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen PDF Modal */}
      {isFullscreen && project?.pdf_url && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black/50">
            <h3 className="text-white font-semibold" style={{ fontFamily: 'Montserrat Alternates' }}>
              {getProjectName()}
            </h3>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1">
            <iframe
              src={`${project.pdf_url}#toolbar=1&navpanes=0&view=FitH`}
              className="w-full h-full"
              title="PDF Preview Fullscreen"
            />
          </div>
        </div>
      )}
    </Layout>
  );
}