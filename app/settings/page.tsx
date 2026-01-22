'use client';

import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { useTour } from '../hooks/useTour';
import { useRouter } from 'next/navigation';
import PageTour from '../components/PageTour';
import TourHelpButton from '../components/TourHelpButton';
import { usePageTour } from '../hooks/usePageTour';
import { settingsTourSteps } from '../components/settingsTourSteps';

interface PhoneNumber {
  countryCode: string;
  number: string;
}

interface SubscriptionData {
  plan: string;
  status: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  pack_remaining: number;
  monthly_reset_at: string;
}

interface Invoice {
  id: string;
  number: string;
  amount_paid: number;
  currency: string;
  created: number;
  due_date: number;
  paid: boolean;
  invoice_pdf: string;
  status: string;
}

interface DeletedTodo {
  id: string;
  task: string;
  project_title: string;
  priority: 'high' | 'medium' | 'low';
  deleted_at: string;
}

interface DeletedProject {
  id: string;
  project_title: string | null;
  deleted_at: string;
}

interface DeletedFolder {
  id: string;
  name: string;
  color: string;
  deleted_at: string;
}


// Deleted Items Section Component
function DeletedItemsSection({ user }: { user: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deletedTodos, setDeletedTodos] = useState<DeletedTodo[]>([]);
  const [deletedProjects, setDeletedProjects] = useState<DeletedProject[]>([]);
  const [deletedFolders, setDeletedFolders] = useState<DeletedFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'todos' | 'folders' | 'projects'>('todos');
  const [isRecovering, setIsRecovering] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchDeletedItems = async () => {
    if (!user?.id) {
      console.log('DeletedItemsSection: No user or user.id found', user);
      return;
    }
    
    console.log('DeletedItemsSection: Fetching for user.id:', user.id);
    setIsLoading(true);
    
    try {
      const { data: todosData, error: todosError } = await supabase
        .from('user_todos')
        .select('id, task, project_title, priority, deleted_at')
        .eq('user_id', user.id)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

      console.log('DeletedItemsSection: Todos result:', { todosData, todosError });
      if (todosError) throw todosError;
      setDeletedTodos(todosData || []);

      const { data: foldersData, error: foldersError } = await supabase
        .from('todo_folders')
        .select('id, name, color, deleted_at')
        .eq('user_id', user.id)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

      console.log('DeletedItemsSection: Folders result:', { foldersData, foldersError });
      if (foldersError) throw foldersError;
      setDeletedFolders(foldersData || []);

      const { data: projectsData, error: projectsError } = await supabase
        .from('geo_linking_projects_real')
        .select('id, project_title, deleted_at')
        .eq('user_id', user.id)
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

      console.log('DeletedItemsSection: Projects result:', { projectsData, projectsError });
      if (projectsError) throw projectsError;
      setDeletedProjects(projectsData || []);
    } catch (err) {
      console.error('DeletedItemsSection: Error fetching deleted items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded && user) {
      fetchDeletedItems();
    }
  }, [isExpanded, user]);

  const recoverTodo = async (todoId: string) => {
    setIsRecovering(todoId);
    try {
      const { error } = await supabase
        .from('user_todos')
        .update({ is_deleted: false, deleted_at: null })
        .eq('id', todoId);

      if (error) throw error;
      setDeletedTodos(deletedTodos.filter(t => t.id !== todoId));
    } catch (err) {
      console.error('Error recovering todo:', err);
      alert('Failed to recover item. Please try again.');
    } finally {
      setIsRecovering(null);
    }
  };

  const permanentlyDeleteTodo = async (todoId: string) => {
    if (!confirm('Permanently delete this item? This cannot be undone.')) return;
    
    setIsDeleting(todoId);
    try {
      const { error } = await supabase
        .from('user_todos')
        .delete()
        .eq('id', todoId);

      if (error) throw error;
      setDeletedTodos(deletedTodos.filter(t => t.id !== todoId));
    } catch (err) {
      console.error('Error permanently deleting todo:', err);
      alert('Failed to delete item. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const recoverProject = async (projectId: string) => {
    setIsRecovering(projectId);
    try {
      const { error } = await supabase
        .from('geo_linking_projects_real')
        .update({ is_deleted: false, deleted_at: null })
        .eq('id', projectId);

      if (error) throw error;
      setDeletedProjects(deletedProjects.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Error recovering project:', err);
      alert('Failed to recover project. Please try again.');
    } finally {
      setIsRecovering(null);
    }
  };

  const permanentlyDeleteProject = async (projectId: string) => {
    if (!confirm('Permanently delete this project? This cannot be undone.')) return;
    
    setIsDeleting(projectId);
    try {
      const { error } = await supabase
        .from('geo_linking_projects_real')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      setDeletedProjects(deletedProjects.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Error permanently deleting project:', err);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const recoverFolder = async (folderId: string) => {
    setIsRecovering(folderId);
    try {
      const folder = deletedFolders.find(f => f.id === folderId);
      
      // Recover the folder
      const { error } = await supabase
        .from('todo_folders')
        .update({ is_deleted: false, deleted_at: null })
        .eq('id', folderId);

      if (error) throw error;
      
      // Also recover any tasks that were in this folder (same name)
      if (folder) {
        await supabase
          .from('user_todos')
          .update({ is_deleted: false, deleted_at: null })
          .eq('user_id', user.id)
          .eq('project_title', folder.name)
          .eq('is_deleted', true);
        
        // Refresh todos list to show recovered tasks
        const { data: todosData } = await supabase
          .from('user_todos')
          .select('id, task, project_title, priority, deleted_at')
          .eq('user_id', user.id)
          .eq('is_deleted', true)
          .order('deleted_at', { ascending: false });
        
        setDeletedTodos(todosData || []);
      }
      
      setDeletedFolders(deletedFolders.filter(f => f.id !== folderId));
    } catch (err) {
      console.error('Error recovering folder:', err);
      alert('Failed to recover folder. Please try again.');
    } finally {
      setIsRecovering(null);
    }
  };

  const permanentlyDeleteFolder = async (folderId: string) => {
    const folder = deletedFolders.find(f => f.id === folderId);
    if (!confirm(`Permanently delete "${folder?.name}" folder and all tasks inside it? This cannot be undone.`)) return;
    
    setIsDeleting(folderId);
    try {
      // First permanently delete any tasks in this folder
      if (folder) {
        await supabase
          .from('user_todos')
          .delete()
          .eq('user_id', user.id)
          .eq('project_title', folder.name);
        
        // Refresh todos list
        const { data: todosData } = await supabase
          .from('user_todos')
          .select('id, task, project_title, priority, deleted_at')
          .eq('user_id', user.id)
          .eq('is_deleted', true)
          .order('deleted_at', { ascending: false });
        
        setDeletedTodos(todosData || []);
      }
      
      // Then delete the folder
      const { error } = await supabase
        .from('todo_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      setDeletedFolders(deletedFolders.filter(f => f.id !== folderId));
    } catch (err) {
      console.error('Error permanently deleting folder:', err);
      alert('Failed to delete folder. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const emptyTrash = async () => {
    if (!confirm('Permanently delete all items in trash? This cannot be undone.')) return;
    
    setIsLoading(true);
    try {
      const { error: todosError } = await supabase
        .from('user_todos')
        .delete()
        .eq('user_id', user.id)
        .eq('is_deleted', true);

      if (todosError) throw todosError;

      const { error: foldersError } = await supabase
        .from('todo_folders')
        .delete()
        .eq('user_id', user.id)
        .eq('is_deleted', true);

      if (foldersError) throw foldersError;

      const { error: projectsError } = await supabase
        .from('geo_linking_projects_real')
        .delete()
        .eq('user_id', user.id)
        .eq('is_deleted', true);

      if (projectsError) throw projectsError;

      setDeletedTodos([]);
      setDeletedFolders([]);
      setDeletedProjects([]);
    } catch (err) {
      console.error('Error emptying trash:', err);
      alert('Failed to empty trash. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDeletedDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysUntilPermanentDelete = (dateString: string): number => {
    const deletedDate = new Date(dateString);
    const deleteByDate = new Date(deletedDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const now = new Date();
    return Math.max(0, Math.ceil((deleteByDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const totalDeletedItems = deletedTodos.length + deletedFolders.length + deletedProjects.length;

  return (
    <div className="glass-card p-6 mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(46, 42, 39, 0.1)' }}>
            <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-[#1a1a1a] font-medium" style={{ fontFamily: 'Montserrat Alternates' }}>
              Deleted Items
              {totalDeletedItems > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full" style={{ background: 'rgba(46, 42, 39, 0.1)', color: '#1a1a1a' }}>
                  {totalDeletedItems}
                </span>
              )}
            </p>
            <p className="text-sm text-[#4a4642]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
              Recover deleted to-dos, folders, and projects within 14 days
            </p>
          </div>
        </div>
        <svg 
          className={`w-5 h-5 text-[#1a1a1a]/70 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.4)' }}>
          {/* Tabs */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('todos')}
                className={`px-4 py-2 text-sm font-medium transition-all rounded-[14px] border border-white/50 ${
                  activeTab === 'todos' 
                    ? 'bg-gradient-to-r from-[#0D7871] to-[#065f5b] text-white shadow-[0_4px_15px_rgba(13,120,113,0.3)]' 
                    : 'bg-white/50 text-[#1a1a1a]'
                }`}
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                To-Dos ({deletedTodos.length})
              </button>
              <button
                onClick={() => setActiveTab('folders')}
                className={`px-4 py-2 text-sm font-medium transition-all rounded-[14px] border border-white/50 ${
                  activeTab === 'folders' 
                    ? 'bg-gradient-to-r from-[#0D7871] to-[#065f5b] text-white shadow-[0_4px_15px_rgba(13,120,113,0.3)]' 
                    : 'bg-white/50 text-[#1a1a1a]'
                }`}
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                Folders ({deletedFolders.length})
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`px-4 py-2 text-sm font-medium transition-all rounded-[14px] border border-white/50 ${
                  activeTab === 'projects' 
                    ? 'bg-gradient-to-r from-[#0D7871] to-[#065f5b] text-white shadow-[0_4px_15px_rgba(13,120,113,0.3)]' 
                    : 'bg-white/50 text-[#1a1a1a]'
                }`}
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                Projects ({deletedProjects.length})
              </button>
            </div>

            {totalDeletedItems > 0 && (
              <button
                onClick={emptyTrash}
                disabled={isLoading}
                className="text-sm font-medium transition-colors disabled:opacity-50 px-3 py-1.5 rounded-lg bg-white/70 border border-red-700/30"
                style={{ fontFamily: 'Inter', fontWeight: 600, color: '#b91c1c' }}
              >
                Empty Trash
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-6 h-6 animate-spin text-[#0D7871]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : activeTab === 'todos' ? (
            deletedTodos.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-white/50">
                  <svg className="w-6 h-6 text-[#6b6560]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-[#4a4642]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>No deleted to-dos</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {deletedTodos.map((todo) => {
                  const daysLeft = getDaysUntilPermanentDelete(todo.deleted_at);
                  return (
                    <div 
                      key={todo.id} 
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-white/60 transition bg-white/40"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="text-sm text-[#1a1a1a] truncate" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                          {todo.task}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#6b6560]" style={{ fontFamily: 'Inter' }}>
                            {todo.project_title}
                          </span>
                          <span className="text-xs text-[#1a1a1a]/30">•</span>
                          <span className="text-xs text-[#6b6560]" style={{ fontFamily: 'Inter' }}>
                            Deleted {formatDeletedDate(todo.deleted_at)}
                          </span>
                          <span className="text-xs text-[#1a1a1a]/30">•</span>
                          <span className={`text-xs ${daysLeft <= 3 ? 'text-red-500' : 'text-[#6b6560]'}`} style={{ fontFamily: 'Inter' }}>
                            {daysLeft} days left
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => recoverTodo(todo.id)}
                          disabled={isRecovering === todo.id}
                          className="px-3 py-1.5 text-xs font-medium text-[#006b63] hover:bg-[#00A99D]/10 rounded-lg transition disabled:opacity-50"
                          style={{ fontFamily: 'Inter', fontWeight: 500 }}
                        >
                          {isRecovering === todo.id ? 'Recovering...' : 'Recover'}
                        </button>
                        <button
                          onClick={() => permanentlyDeleteTodo(todo.id)}
                          disabled={isDeleting === todo.id}
                          className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          style={{ fontFamily: 'Inter', fontWeight: 500 }}
                        >
                          {isDeleting === todo.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === 'folders' ? (
            deletedFolders.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-white/50">
                  <svg className="w-6 h-6 text-[#6b6560]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <p className="text-[#4a4642]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>No deleted folders</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {deletedFolders.map((folder) => {
                  const daysLeft = getDaysUntilPermanentDelete(folder.deleted_at);
                  // Count tasks in this folder
                  const tasksInFolder = deletedTodos.filter(t => t.project_title === folder.name).length;
                  return (
                    <div 
                      key={folder.id} 
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-white/60 transition bg-white/40"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: folder.color || '#FAA819' }}
                        >
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-[#1a1a1a] truncate" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                            {folder.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {tasksInFolder > 0 && (
                              <>
                                <span className="text-xs text-[#6b6560]" style={{ fontFamily: 'Inter' }}>
                                  {tasksInFolder} task{tasksInFolder !== 1 ? 's' : ''}
                                </span>
                                <span className="text-xs text-[#1a1a1a]/30">•</span>
                              </>
                            )}
                            <span className="text-xs text-[#6b6560]" style={{ fontFamily: 'Inter' }}>
                              Deleted {formatDeletedDate(folder.deleted_at)}
                            </span>
                            <span className="text-xs text-[#1a1a1a]/30">•</span>
                            <span className={`text-xs ${daysLeft <= 3 ? 'text-red-500' : 'text-[#6b6560]'}`} style={{ fontFamily: 'Inter' }}>
                              {daysLeft} days left
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => recoverFolder(folder.id)}
                          disabled={isRecovering === folder.id}
                          className="px-3 py-1.5 text-xs font-medium text-[#006b63] hover:bg-[#00A99D]/10 rounded-lg transition disabled:opacity-50"
                          style={{ fontFamily: 'Inter', fontWeight: 500 }}
                        >
                          {isRecovering === folder.id ? 'Recovering...' : 'Recover'}
                        </button>
                        <button
                          onClick={() => permanentlyDeleteFolder(folder.id)}
                          disabled={isDeleting === folder.id}
                          className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          style={{ fontFamily: 'Inter', fontWeight: 500 }}
                        >
                          {isDeleting === folder.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : activeTab === 'projects' ? (
            deletedProjects.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-white/50">
                  <svg className="w-6 h-6 text-[#6b6560]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <p className="text-[#4a4642]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>No deleted projects</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {deletedProjects.map((project) => {
                  const daysLeft = getDaysUntilPermanentDelete(project.deleted_at);
                  return (
                    <div 
                      key={project.id} 
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-white/60 transition bg-white/40"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="text-sm text-[#1a1a1a] truncate" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                          {project.project_title || 'Unnamed Project'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#6b6560] font-mono truncate" style={{ fontFamily: 'monospace' }}>
                            {project.id}
                          </span>
                          <span className="text-xs text-[#1a1a1a]/30">•</span>
                          <span className="text-xs text-[#6b6560]" style={{ fontFamily: 'Inter' }}>
                            Deleted {formatDeletedDate(project.deleted_at)}
                          </span>
                          <span className="text-xs text-[#1a1a1a]/30">•</span>
                          <span className={`text-xs ${daysLeft <= 3 ? 'text-red-500' : 'text-[#6b6560]'}`} style={{ fontFamily: 'Inter' }}>
                            {daysLeft} days left
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => recoverProject(project.id)}
                          disabled={isRecovering === project.id}
                          className="px-3 py-1.5 text-xs font-medium text-[#006b63] hover:bg-[#00A99D]/10 rounded-lg transition disabled:opacity-50"
                          style={{ fontFamily: 'Inter', fontWeight: 500 }}
                        >
                          {isRecovering === project.id ? 'Recovering...' : 'Recover'}
                        </button>
                        <button
                          onClick={() => permanentlyDeleteProject(project.id)}
                          disabled={isDeleting === project.id}
                          className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          style={{ fontFamily: 'Inter', fontWeight: 500 }}
                        >
                          {isDeleting === project.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : null}

          <p className="text-xs text-[#6b6560] mt-4 text-center" style={{ fontFamily: 'Inter' }}>
            Items are automatically permanently deleted after 14 days
          </p>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Settings page tour
  const { showTour, hasCompletedTour: hasCompletedSettingsTour, startTour, closeTour, completeTour, skipTour } = usePageTour('settings', true);
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [aptUnitSuite, setAptUnitSuite] = useState('');
  const [city, setCity] = useState('');
  const [stateProv, setStateProv] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showPhotoOrInitials, setShowPhotoOrInitials] = useState<'photo' | 'initials'>('initials');
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Preference states
  const [sidebarMode, setSidebarMode] = useState<'expanded' | 'collapsed' | 'always-collapsed'>('collapsed');
  const [showWeather, setShowWeather] = useState(true);
  
  // Billing states
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  
  // UI states
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // Tour state (for home tour reset feature)
  const { hasCompletedTour: hasCompletedHomeTour, resetTour } = useTour();
  const [tourResetMessage, setTourResetMessage] = useState(false);

  // 2FA states
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [is2FALoading, setIs2FALoading] = useState(true);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isUnenrolling, setIsUnenrolling] = useState(false);

  // AAL2 verification states (for password change when 2FA is enabled)
  const [showAAL2Modal, setShowAAL2Modal] = useState(false);
  const [aal2Code, setAAL2Code] = useState('');
  const [isVerifyingAAL2, setIsVerifyingAAL2] = useState(false);
  const [aal2Error, setAAL2Error] = useState<string | null>(null);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setEmail(profile.email || '');
      setWebsiteUrl(profile.website_url || '');
      setBusinessName(profile.business_name || '');
      setEmployeeCount(profile.employee_count || '');
      setStreetAddress((profile as any).street_address || '');
      setAptUnitSuite((profile as any).apt_unit_suite || '');
      setCity((profile as any).city || '');
      setStateProv((profile as any).state || '');
      setZip((profile as any).zip || '');
      setCountry((profile as any).country || '');
      setProfilePhoto(profile.profile_photo || null);
      
      const phone = (profile as any).phone_number as PhoneNumber | null;
      if (phone) {
        setPhoneCountryCode(phone.countryCode || '+1');
        setPhoneNumber(phone.number || '');
      }
    }
  }, [profile]);

  // Load billing data
  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
      fetchInvoices();
    }
  }, [user]);

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSidebarMode = localStorage.getItem('sidebarMode');
      if (savedSidebarMode === 'expanded' || savedSidebarMode === 'collapsed' || savedSidebarMode === 'always-collapsed') {
        setSidebarMode(savedSidebarMode);
      }
      const savedWeather = localStorage.getItem('showWeather');
      setShowWeather(savedWeather !== 'false');
      
      const savedPhotoMode = localStorage.getItem('showPhotoOrInitials');
      if (savedPhotoMode === 'photo' || savedPhotoMode === 'initials') {
        setShowPhotoOrInitials(savedPhotoMode);
      }
    }
  }, []);

  // Listen for sidebar mode changes from Layout
  useEffect(() => {
    const handleModeChange = (e: CustomEvent) => {
      setSidebarMode(e.detail);
    };
    window.addEventListener('sidebarModeChange', handleModeChange as EventListener);
    return () => window.removeEventListener('sidebarModeChange', handleModeChange as EventListener);
  }, []);

  // Fetch subscription data
  const fetchSubscriptionData = async () => {
    setLoadingBilling(true);
    setBillingError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/billing/subscription', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          setSubscriptionData(null);
        } else {
          throw new Error(errorData.error || 'Failed to fetch subscription');
        }
      } else {
        const data = await response.json();
        setSubscriptionData(data);
      }
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      setBillingError(error.message || 'Failed to load billing information');
    } finally {
      setLoadingBilling(false);
    }
  };

  // Fetch invoices
  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    setInvoicesError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/billing/invoice', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          setInvoices([]);
        } else {
          throw new Error(errorData.error || 'Failed to fetch invoices');
        }
      } else {
        const data = await response.json();
        setInvoices(data);
      }
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      setInvoicesError(error.message || 'Failed to load transaction history');
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Open billing portal
  const handleOpenBillingPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to open billing portal');
      const data = await response.json();
      window.open(data.url, '_blank');
    } catch (error: any) {
      console.error('Error opening portal:', error);
      setSaveMessage({ type: 'error', text: 'Failed to open billing portal' });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  // Handle profile photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setSaveMessage({ type: 'error', text: 'Please upload a JPG, PNG, GIF, or WebP image.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage({ type: 'error', text: 'Image must be less than 5MB.' });
      return;
    }

    setIsUploadingPhoto(true);
    setSaveMessage(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_photo: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      setProfilePhoto(publicUrl);
      setShowPhotoOrInitials('photo');
      localStorage.setItem('showPhotoOrInitials', 'photo');
      setSaveMessage({ type: 'success', text: 'Profile photo updated!' });
      refreshProfile();
    } catch (error: any) {
      console.error('Photo upload error:', error);
      setSaveMessage({ type: 'error', text: error.message || 'Failed to upload photo. Make sure the avatars bucket exists and is public.' });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Handle profile save
  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          website_url: websiteUrl,
          business_name: businessName,
          employee_count: employeeCount,
          street_address: streetAddress,
          apt_unit_suite: aptUnitSuite,
          city: city,
          state: stateProv,
          zip: zip,
          country: country,
          phone_number: { countryCode: phoneCountryCode, number: phoneNumber },
        })
        .eq('id', user.id);

      if (error) throw error;

      setSaveMessage({ type: 'success', text: 'Profile saved successfully!' });
      refreshProfile();
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error('Save error:', error);
      setSaveMessage({ type: 'error', text: error.message || 'Failed to save profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Execute the actual password change (called after AAL2 verification if needed)
  const executePasswordChange = async () => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setIsPasswordModalOpen(false), 1500);
    } catch (error: any) {
      console.error('Password error:', error);
      setPasswordMessage({ type: 'error', text: error.message || 'Failed to update password.' });
    }
  };

  // Handle AAL2 verification (for password change when 2FA is enabled)
  const handleAAL2Verify = async () => {
    if (!aal2Code || aal2Code.length !== 6) {
      setAAL2Error('Please enter a valid 6-digit code.');
      return;
    }

    if (!factorId) {
      setAAL2Error('Authentication error. Please refresh and try again.');
      return;
    }

    setIsVerifyingAAL2(true);
    setAAL2Error(null);

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: aal2Code,
      });

      if (verifyError) throw verifyError;

      setShowAAL2Modal(false);
      setAAL2Code('');
      
      await executePasswordChange();
    } catch (err: any) {
      console.error('AAL2 verification error:', err);
      setAAL2Error('Invalid verification code. Please try again.');
      setAAL2Code('');
    } finally {
      setIsVerifyingAAL2(false);
    }
  };

  // Handle password change - checks for AAL2 requirement first
  const handleChangePassword = async () => {
    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }

    if (!newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    try {
      // First, verify the current password by attempting to sign in
      const userEmail = user?.email;
      if (!userEmail) {
        setPasswordMessage({ type: 'error', text: 'Unable to verify user email.' });
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        setPasswordMessage({ type: 'error', text: 'Current password is incorrect.' });
        return;
      }

      // Check if user has 2FA enabled - if so, we need AAL2
      if (is2FAEnabled && factorId) {
        setShowAAL2Modal(true);
        return;
      }

      // No 2FA, proceed directly with password change
      await executePasswordChange();
    } catch (error: any) {
      console.error('Password error:', error);
      setPasswordMessage({ type: 'error', text: error.message || 'Failed to update password.' });
    }
  };

  // Handle sidebar mode change
  const handleSidebarModeChange = (mode: 'expanded' | 'collapsed' | 'always-collapsed') => {
    setSidebarMode(mode);
    localStorage.setItem('sidebarMode', mode);
    window.dispatchEvent(new CustomEvent('sidebarModeChange', { detail: mode }));
  };

  // Handle weather toggle
  const handleWeatherToggle = (show: boolean) => {
    setShowWeather(show);
    localStorage.setItem('showWeather', String(show));
    window.dispatchEvent(new CustomEvent('weatherToggleChange', { detail: show }));
  };

  // Handle photo/initials toggle
  const handlePhotoModeChange = (mode: 'photo' | 'initials') => {
    setShowPhotoOrInitials(mode);
    localStorage.setItem('showPhotoOrInitials', mode);
  };

  const router = useRouter();

  // Handle tour restart
  const handleRestartTour = () => {
    resetTour();
    setTourResetMessage(true);
    setTimeout(() => {
      router.push('/');
    }, 1000);
  };

  // Check 2FA status on mount
  useEffect(() => {
    const check2FAStatus = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;
        
        const totpFactor = data?.totp?.[0];
        if (totpFactor && totpFactor.status === 'verified') {
          setIs2FAEnabled(true);
          setFactorId(totpFactor.id);
        } else {
          setIs2FAEnabled(false);
          setFactorId(null);
        }
      } catch (err) {
        console.error('Error checking 2FA status:', err);
      } finally {
        setIs2FALoading(false);
      }
    };

    if (user) {
      check2FAStatus();
    }
  }, [user]);

  // Start 2FA enrollment
  const handleEnable2FA = async () => {
    setTwoFAError(null);
    setIsEnrolling(true);
    
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Clemelopy Authenticator'
      });
      
      if (error) throw error;
      
      if (data) {
        setQrCodeUrl(data.totp.qr_code);
        setTotpSecret(data.totp.secret);
        setFactorId(data.id);
        setShow2FAModal(true);
      }
    } catch (err: any) {
      console.error('Error enabling 2FA:', err);
      setTwoFAError(err.message || 'Failed to enable 2FA');
    } finally {
      setIsEnrolling(false);
    }
  };

  // Verify and complete 2FA enrollment
  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setTwoFAError('Please enter a 6-digit code');
      return;
    }
    
    if (!factorId) {
      setTwoFAError('No factor ID found. Please try again.');
      return;
    }
    
    setTwoFAError(null);
    setIsEnrolling(true);
    
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factorId
      });
      
      if (challengeError) throw challengeError;
      
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId,
        challengeId: challengeData.id,
        code: verificationCode
      });
      
      if (verifyError) throw verifyError;
      
      setIs2FAEnabled(true);
      setShow2FAModal(false);
      setVerificationCode('');
      setQrCodeUrl(null);
      setTotpSecret(null);
      setSaveMessage({ type: 'success', text: 'Two-factor authentication enabled successfully!' });
    } catch (err: any) {
      console.error('Error verifying 2FA:', err);
      setTwoFAError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsEnrolling(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }
    
    if (!factorId) {
      setTwoFAError('No factor ID found');
      return;
    }
    
    setIsUnenrolling(true);
    setTwoFAError(null);
    
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factorId
      });
      
      if (error) throw error;
      
      setIs2FAEnabled(false);
      setFactorId(null);
      setSaveMessage({ type: 'success', text: 'Two-factor authentication has been disabled.' });
    } catch (err: any) {
      console.error('Error disabling 2FA:', err);
      setTwoFAError(err.message || 'Failed to disable 2FA');
    } finally {
      setIsUnenrolling(false);
    }
  };

  // Cancel 2FA enrollment
  const handleCancel2FA = async () => {
    if (factorId && !is2FAEnabled) {
      try {
        await supabase.auth.mfa.unenroll({ factorId });
      } catch (err) {
        console.error('Error canceling 2FA enrollment:', err);
      }
    }
    setShow2FAModal(false);
    setVerificationCode('');
    setQrCodeUrl(null);
    setTotpSecret(null);
    setTwoFAError(null);
    setFactorId(null);
  };

  // Delete account handler
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE' || !user) return;
    
    setIsDeletingAccount(true);
    
    try {
      // First, get the user's license data before deleting (may not exist)
      const { data: licenseData } = await supabase
        .from('licenses')
        .select('free_runs_used, pack_remaining')
        .eq('email', user.email)
        .maybeSingle();
      
      // Check if email is already in burned_emails (repeat deleter)
      const { data: existingBurned } = await supabase
        .from('burned_emails')
        .select('signup_count, free_runs_used')
        .eq('email', user.email)
        .maybeSingle();
      
      if (existingBurned) {
        // Update existing burned record - increment signup count, keep highest free_runs_used
        const { error: burnedUpdateError } = await supabase
          .from('burned_emails')
          .update({
            original_user_id: user.id,
            free_runs_used: Math.max(existingBurned.free_runs_used, licenseData?.free_runs_used || 0),
            pack_remaining: licenseData?.pack_remaining || 0,
            burned_at: new Date().toISOString(),
            signup_count: existingBurned.signup_count + 1
          })
          .eq('email', user.email);
        
        if (burnedUpdateError) {
          console.error('Error updating burned_emails:', burnedUpdateError);
          throw burnedUpdateError;
        }
      } else {
        // Insert new burned record
        const { error: burnedError } = await supabase
          .from('burned_emails')
          .insert({
            email: user.email,
            original_user_id: user.id,
            free_runs_used: licenseData?.free_runs_used || 0,
            pack_remaining: licenseData?.pack_remaining || 0,
            signup_count: 1
          });
        
        if (burnedError) {
          console.error('Error inserting burned_emails:', burnedError);
          throw burnedError;
        }
      }

      // Delete user's todos
      const { error: todosError } = await supabase
        .from('user_todos')
        .delete()
        .eq('user_id', user.id);
      
      if (todosError) {
        console.error('Error deleting todos:', todosError);
        // Don't throw - continue with deletion
      }
      
      // Delete user's todo folders
      const { error: foldersError } = await supabase
        .from('todo_folders')
        .delete()
        .eq('user_id', user.id);
      
      if (foldersError) {
        console.error('Error deleting todo folders:', foldersError);
        // Don't throw - continue with deletion
      }
      
      // Delete user's geo linking projects
      const { error: projectsError } = await supabase
        .from('geo_linking_projects_real')
        .delete()
        .eq('user_id', user.id);
      
      if (projectsError) {
        console.error('Error deleting geo projects:', projectsError);
        // Don't throw - continue with deletion
      }
      
      // Delete user's support tickets
      const { error: ticketsError } = await supabase
        .from('support_tickets')
        .delete()
        .eq('user_id', user.id);
      
      if (ticketsError) {
        console.error('Error deleting support tickets:', ticketsError);
        // Don't throw - continue with deletion
      }
      
      // Delete user's notifications
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
      
      if (notificationsError) {
        console.error('Error deleting notifications:', notificationsError);
        // Don't throw - continue with deletion
      }
      
      // Delete user's usage events
      const { error: usageError } = await supabase
        .from('usage_events')
        .delete()
        .eq('user_id', user.id);
      
      if (usageError) {
        console.error('Error deleting usage events:', usageError);
        // Don't throw - continue with deletion
      }
      
      // Delete user's notification preferences
      const { error: notifError } = await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', user.id);
      
      if (notifError) {
        console.error('Error deleting notification preferences:', notifError);
        // Don't throw - continue with deletion
      }
        
      // Delete user's licenses
      const { error: licensesError } = await supabase
        .from('licenses')
        .delete()
        .eq('email', user.email);

      if (licensesError) {
        console.error('Error deleting licenses:', licensesError);
        // Don't throw - continue with deletion
      }

      // Delete user's profile (MUST BE LAST before auth - parent table)
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileDeleteError) {
        console.error('Error deleting profile:', profileDeleteError);
        throw profileDeleteError;
      }

      // Delete from auth.users using the database function
      const { error: authDeleteError } = await supabase.rpc('delete_user_completely');
      
      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError);
        // Don't throw - user data is already deleted, just sign out
      }

      // Sign out the user
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) throw signOutError;
      
      // Redirect to home page
      window.location.href = '/?account_deleted=true';
      
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('There was an error deleting your account. Please contact support.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Get initials for avatar
  const getInitials = () => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || email?.[0]?.toUpperCase() || '?';
  };

  // Format phone for display
  const formatPhoneDisplay = () => {
    if (!phoneNumber) return '—';
    return `${phoneCountryCode} ${phoneNumber}`;
  };

  // Format address for display
  const formatAddressDisplay = () => {
    const parts = [streetAddress, aptUnitSuite, city, stateProv, zip, country].filter(Boolean);
    const uniqueParts = parts.filter((part, index, arr) => 
      arr.findIndex(p => p.toLowerCase() === part.toLowerCase()) === index
    );
    return uniqueParts.length > 0 ? uniqueParts.join(', ') : '—';
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Layout activeNav="settings">
      {/* Skip to main content link */}
      <a 
        href="#settings-main" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-[#005a54] focus:rounded-lg focus:font-semibold"
        style={{ fontFamily: 'Montserrat Alternates' }}
      >
        Skip to main content
      </a>

      <main id="settings-main" role="main">
        {/* Header - Frosted Glass Container */}
        <header 
          className="rounded-2xl p-8 mb-8 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          }}
        >
          {/* Tour Button - Top Right */}
          <div className="absolute top-4 right-4">
            <TourHelpButton onClick={startTour} hasCompleted={hasCompletedSettingsTour} />
          </div>
          <h1 
            className="text-3xl lg:text-4xl mb-2" 
            style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
          >
            <span className="text-[#2d2926]">Manage your </span>
            <span 
              style={{ 
                background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              settings
            </span>
          </h1>
          <p 
            className="text-base max-w-2xl text-[#4a4642]"
            style={{ fontFamily: 'Inter', fontWeight: 500 }}
          >
            Update your account settings and profile information
          </p>
        </header>

        {/* Main Glassmorphic Container */}
        <div className="glass-container">
          {/* Save Message */}
          {saveMessage && (
            <div 
              className={`p-4 rounded-xl mb-6 ${saveMessage.type === 'success' ? 'bg-[#00A99D]/10 border border-[#00A99D]/30' : 'bg-red-50 border border-red-200'}`}
              role="status"
              aria-live="polite"
            >
              <p className={`text-sm ${saveMessage.type === 'success' ? 'text-[#006b63]' : 'text-red-600'}`} style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                {saveMessage.text}
              </p>
            </div>
          )}

          {/* Tour Reset Message */}
          {tourResetMessage && (
            <div className="p-4 rounded-xl mb-6 bg-[#00A99D]/10 border border-[#00A99D]/30" role="status" aria-live="polite">
              <p className="text-sm text-[#006b63]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                Tour has been reset! Go to the Dashboard to start the tour.
              </p>
            </div>
          )}

          {/* Profile Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Profile Photo Card */}
            <section className="glass-card p-6 overflow-hidden" data-tour="settings-profile-display" aria-labelledby="profile-display-heading">
              <h2 id="profile-display-heading" className="text-[#1a1a1a] mb-6" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
                Profile Display
            </h2>
            
            {/* Side by Side Options - Stack on small screens */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Photo Option */}
              <div 
                className="flex-1 p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  border: showPhotoOrInitials === 'photo' ? '2px solid #00A99D' : '1px solid rgba(255, 255, 255, 0.5)',
                  background: showPhotoOrInitials === 'photo' ? 'rgba(0, 169, 157, 0.1)' : 'transparent'
                }}
                onClick={() => profilePhoto && handlePhotoModeChange('photo')}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-[#1a1a1a] font-medium" style={{ fontFamily: 'Montserrat Alternates' }}>Photo</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${showPhotoOrInitials === 'photo' ? 'border-[#00A99D] bg-[#00A99D]' : 'border-white/60'}`}>
                    {showPhotoOrInitials === 'photo' && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="relative mx-auto w-full aspect-square max-w-[128px] mb-3">
                  {profilePhoto ? (
                    <div className="w-full h-full rounded-2xl overflow-hidden shadow-md">
                      <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div 
                      className="w-full h-full rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden border-white/50 bg-white/30"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="12" y="18" width="40" height="40" rx="6" fill="#e0e0e0" transform="rotate(-12 32 38)"/>
                        <rect x="28" y="18" width="40" height="40" rx="6" fill="#d0d0d0" transform="rotate(8 48 38)"/>
                        <circle cx="40" cy="32" r="5" fill="#b0b0b0"/>
                        <path d="M30 52 L40 40 L46 48 L52 42 L62 52 Z" fill="#b0b0b0"/>
                      </svg>
                    </div>
                  )}
                  
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                      <svg className="w-6 h-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>

                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handlePhotoUpload} />
                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  disabled={isUploadingPhoto}
                  className="w-full py-2 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all disabled:opacity-50"
                  style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, background: 'linear-gradient(135deg, #FAA819, #E99502)' }}
                >
                  {isUploadingPhoto ? 'Uploading...' : profilePhoto ? 'Change Photo' : 'Upload Photo'}
                </button>
                <p className="text-xs text-[#6b6560] text-center mt-2" style={{ fontFamily: 'Inter' }}>JPG, PNG, GIF, WebP • Max 5MB</p>
              </div>

              {/* Initials Option */}
              <div 
                className="flex-1 p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  border: showPhotoOrInitials === 'initials' ? '2px solid #00A99D' : '1px solid rgba(255, 255, 255, 0.5)',
                  background: showPhotoOrInitials === 'initials' ? 'rgba(0, 169, 157, 0.1)' : 'transparent'
                }}
                onClick={() => handlePhotoModeChange('initials')}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-[#1a1a1a] font-medium" style={{ fontFamily: 'Montserrat Alternates' }}>Initials</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${showPhotoOrInitials === 'initials' ? 'border-[#00A99D] bg-[#00A99D]' : 'border-white/60'}`}>
                    {showPhotoOrInitials === 'initials' && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="mx-auto w-full aspect-square max-w-[128px] mb-3 flex items-center justify-center">
                  <div 
                    className="w-28 h-28 rounded-full flex items-center justify-center relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(165deg, rgba(255,255,255,0.95) 0%, rgba(240,245,250,0.9) 40%, rgba(220,230,240,0.85) 70%, rgba(200,215,230,0.8) 100%)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2), 0 4px 10px rgba(0, 0, 0, 0.1), inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -2px 6px rgba(0,0,0,0.08)',
                      border: '1px solid rgba(255,255,255,0.6)',
                    }}
                  >
                    {/* Top shine - crisp highlight */}
                    <div 
                      className="absolute rounded-full"
                      style={{
                        top: '8%',
                        left: '15%',
                        width: '50%',
                        height: '35%',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 60%, transparent 100%)',
                        filter: 'blur(2px)',
                        pointerEvents: 'none',
                      }}
                    />

                    <span 
                      className="text-5xl relative z-10" 
                      style={{ 
                        fontFamily: 'Montserrat Alternates', 
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {getInitials()}
                    </span>
                  </div>
                </div>

                <div className="text-center py-2">
                  <p className="text-sm text-[#1a1a1a]/70" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Display your initials</p>
                  <p className="text-xs text-[#6b6560] mt-1" style={{ fontFamily: 'Inter' }}>Based on your name</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 text-center border-t border-white/40">
              <h3 className="text-lg text-[#1a1a1a]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>{firstName} {lastName}</h3>
              <p className="text-sm text-[#5c5652]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{email}</p>
            </div>
          </section>

          {/* Profile Information Card */}
          <section className="lg:col-span-2 p-6 glass-card" data-tour="settings-profile-info" aria-labelledby="profile-info-heading">
            <div className="flex items-center justify-between mb-6">
              <h2 id="profile-info-heading" className="text-[#1a1a1a]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Profile Information</h2>
              <button 
                onClick={() => setIsEditModalOpen(true)} 
                className="flex items-center gap-2 font-medium transition-colors px-3 py-1.5 rounded-lg bg-white/70 border border-[#006b63]/20" 
                style={{ fontFamily: 'Inter', fontWeight: 600, color: '#006b63' }} 
                aria-label="Edit profile information"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
            </div>

            {/* Personal Information */}
            <div className="mb-6">
              <h3 className="text-sm text-[#0D7871] uppercase tracking-wider mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-[#0D7871]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#0D7871]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[#4a4642] uppercase tracking-wider" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Full Name</p>
                    <p className="text-[#1a1a1a]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{firstName} {lastName || '—'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-[#0D7871]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#0D7871]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#4a4642] uppercase tracking-wider" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Email</p>
                    <p className="text-[#1a1a1a] break-all" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{email || '—'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-[#0D7871]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#0D7871]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[#4a4642] uppercase tracking-wider" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Phone</p>
                    <p className="text-[#1a1a1a]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{formatPhoneDisplay()}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-[#0D7871]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#0D7871]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#4a4642] uppercase tracking-wider" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Address</p>
                    <p className="text-[#1a1a1a] text-sm" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{formatAddressDisplay()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div>
              <h3 className="text-sm text-[#0D7871] uppercase tracking-wider mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-[#0D7871]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#0D7871]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[#4a4642] uppercase tracking-wider" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Business Name</p>
                    <p className="text-[#1a1a1a]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{businessName || '—'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-[#0D7871]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#0D7871]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[#4a4642] uppercase tracking-wider" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Company Size</p>
                    <p className="text-[#1a1a1a]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{employeeCount ? `${employeeCount} employees` : '—'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 md:col-span-2">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-[#0D7871]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#0D7871]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#4a4642] uppercase tracking-wider" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Website</p>
                    <p className="text-[#1a1a1a]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                      {websiteUrl ? (
                        <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[#006b63] hover:underline break-all">{websiteUrl}</a>
                      ) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Billing Section */}
        <section className="glass-card p-6 mb-6" data-tour="settings-billing" aria-labelledby="billing-heading">
          <h2 id="billing-heading" className="text-[#1a1a1a] mb-6" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Billing & Subscription</h2>

          {billingError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 mb-6" role="alert">
              <p className="text-sm text-red-600" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{billingError}</p>
            </div>
          )}

{loadingBilling ? (
  <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
    <svg className="w-6 h-6 animate-spin text-[#0D7871]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
) : subscriptionData && subscriptionData.plan !== 'free' && subscriptionData.stripe_subscription_id ? (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 rounded-xl bg-white/40 border border-white/50">
        <p className="text-xs text-[#4a4642] uppercase tracking-wider mb-2" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Current Plan</p>
        <p className="text-lg text-[#1a1a1a] capitalize" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
          {subscriptionData.plan === 'monthly' ? 'Monthly Subscription' : 'Pay-Per-Use'}
        </p>
      </div>

      <div className="p-4 rounded-xl bg-white/40 border border-white/50">
        <p className="text-xs text-[#4a4642] uppercase tracking-wider mb-2" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Status</p>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${subscriptionData.status === 'active' ? 'bg-[#00A99D]' : 'bg-red-50'}`}></div>
          <p className="text-lg text-[#1a1a1a] capitalize" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>{subscriptionData.status}</p>
        </div>
      </div>
    </div>

    {subscriptionData.plan === 'pack' && subscriptionData.pack_remaining !== null && (
      <div className="p-4 rounded-xl bg-[#00A99D]/10 border border-[#00A99D]/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#006b63] uppercase tracking-wider mb-2" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Remaining Credits</p>
            <p className="text-2xl text-[#006b63]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>{subscriptionData.pack_remaining} runs</p>
          </div>
          <svg className="w-12 h-12 text-[#006b63]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
          </svg>
        </div>
      </div>
    )}

    {subscriptionData.plan === 'monthly' && subscriptionData.monthly_reset_at && (
      <div className="p-4 rounded-xl bg-[#FAA819]/10 border border-[#FAA819]/30">
        <p className="text-xs text-[#0D7871] uppercase tracking-wider mb-2" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Next Billing Date</p>
        <p className="text-lg text-[#1a1a1a]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
          {new Date(subscriptionData.monthly_reset_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    )}

    <div className="flex gap-3 pt-4">
      <button
        onClick={handleOpenBillingPortal}
        disabled={isOpeningPortal}
        className="flex-1 px-6 py-3 bg-[#00A99D] hover:bg-[#0D7871] text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ fontFamily: 'Montserrat Alternates' }}
      >
        {isOpeningPortal ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Opening Portal...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Manage Subscription
          </>
        )}
      </button>
      <button
        onClick={fetchSubscriptionData}
        disabled={loadingBilling}
        className="px-6 py-3 rounded-xl font-semibold hover:bg-white/60 transition-colors disabled:opacity-50 bg-white/50 border border-white/60 text-[#1a1a1a]"
        style={{ fontFamily: 'Montserrat Alternates' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  </div>
) : (
  <div className="p-6 text-center">
    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-white/50">
      <svg className="w-8 h-8 text-[#6b6560]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    </div>
    <p className="text-lg text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Free Plan</p>
    <p className="text-[#4a4642] mb-4" style={{ fontFamily: 'Inter', fontWeight: 500 }}>You're currently on the free plan</p>
    <a 
      href="/pricing" 
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:shadow-lg"
      style={{ fontFamily: 'Montserrat Alternates', background: 'linear-gradient(135deg, #FAA819, #E99502)' }}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
      Upgrade Now
    </a>
  </div>
)}
        </section>

        {/* Transaction History Section */}
        <section className="glass-card p-6 mb-6" data-tour="settings-transactions" aria-labelledby="transactions-heading">
          <h2 id="transactions-heading" className="text-[#1a1a1a] mb-6" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Transaction History</h2>

          {invoicesError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 mb-6" role="alert">
              <p className="text-sm text-red-600" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{invoicesError}</p>
            </div>
          )}

          {loadingInvoices ? (
            <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
              <svg className="w-6 h-6 animate-spin text-[#0D7871]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.4)' }}>
                    <th className="text-left py-3 px-4 text-xs text-[#4a4642] uppercase tracking-wider" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Invoice</th>
                    <th className="text-left py-3 px-4 text-xs text-[#4a4642] uppercase tracking-wider" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Date</th>
                    <th className="text-left py-3 px-4 text-xs text-[#4a4642] uppercase tracking-wider" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Amount</th>
                    <th className="text-left py-3 px-4 text-xs text-[#4a4642] uppercase tracking-wider" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Status</th>
                    <th className="text-left py-3 px-4 text-xs text-[#4a4642] uppercase tracking-wider" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-white/30 transition-colors" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>
                      <td className="py-4 px-4 text-[#1a1a1a]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{invoice.number}</td>
                      <td className="py-4 px-4 text-[#1a1a1a]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{formatDate(invoice.created)}</td>
                      <td className="py-4 px-4 text-[#1a1a1a]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{formatCurrency(invoice.amount_paid, invoice.currency)}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${invoice.paid ? 'bg-[#00A99D]/10 text-[#006b63]' : 'bg-yellow-100 text-yellow-800'}`} style={{ fontFamily: 'Inter' }}>
                          {invoice.paid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-[#006b63] hover:text-[#0D7871] font-semibold transition-colors flex items-center gap-1" style={{ fontFamily: 'Inter' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-[#4a4642]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>No transactions yet</p>
            </div>
          )}

          <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.4)' }}>
            <button onClick={fetchInvoices} disabled={loadingInvoices} className="px-4 py-2 text-sm text-[#006b63] hover:text-[#0D7871] font-semibold transition-colors disabled:opacity-50 flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Transactions
            </button>
          </div>
        </section>

        {/* Security Section */}
        <section className="glass-card p-6 mb-6" data-tour="settings-security" aria-labelledby="security-heading">
          <h2 id="security-heading" className="text-[#1a1a1a] mb-6" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Security</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.4)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0D7871]/10 flex items-center justify-center" aria-hidden="true">
                  <svg className="w-5 h-5 text-[#0D7871]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#1a1a1a] font-medium" style={{ fontFamily: 'Montserrat Alternates' }}>Password</p>
                  <p className="text-sm text-[#4a4642]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Update your password to keep your account secure</p>
                </div>
              </div>
              <button onClick={() => setIsPasswordModalOpen(true)} className="text-[#006b63] hover:text-[#0D7871] font-medium transition-colors" style={{ fontFamily: 'Inter', fontWeight: 600 }}>
                Change Password
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${is2FAEnabled ? 'bg-[#00A99D]/10' : 'bg-[#0D7871]/10'}`}>
                  <svg className={`w-5 h-5 ${is2FAEnabled ? 'text-[#006b63]' : 'text-[#0D7871]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#1a1a1a] font-medium" style={{ fontFamily: 'Montserrat Alternates' }}>Two-Factor Authentication</p>
                  <p className="text-sm text-[#4a4642]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                    {is2FAEnabled ? 'Your account is protected with 2FA' : 'Add an extra layer of security to your account'}
                  </p>
                </div>
              </div>
              {is2FALoading ? (
                <svg className="w-5 h-5 animate-spin text-[#6b6560]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : is2FAEnabled ? (
                <button onClick={handleDisable2FA} disabled={isUnenrolling} className="text-red-500 hover:text-red-600 font-medium transition-colors disabled:opacity-50" style={{ fontFamily: 'Inter', fontWeight: 600 }}>
                  {isUnenrolling ? 'Disabling...' : 'Disable'}
                </button>
              ) : (
                <button onClick={handleEnable2FA} disabled={isEnrolling} className="text-[#006b63] hover:text-[#0D7871] font-medium transition-colors disabled:opacity-50" style={{ fontFamily: 'Inter', fontWeight: 600 }}>
                  {isEnrolling ? 'Setting up...' : 'Enable'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="glass-card p-6 mb-6" data-tour="settings-preferences" aria-labelledby="preferences-heading">
          <h2 id="preferences-heading" className="text-[#1a1a1a] mb-6" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Preferences</h2>

          <div className="space-y-4">
            {/* Sidebar Mode */}
            <div className="py-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.4)' }}>
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div>
      <p className="text-[#1a1a1a] font-medium" style={{ fontFamily: 'Montserrat Alternates' }}>Sidebar Display Mode</p>
      <p className="text-sm text-[#4a4642]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Choose how you want the navigation sidebar to behave</p>
    </div>
    <div className="flex gap-2" role="group" aria-label="Sidebar display mode options">
      <button
        onClick={() => handleSidebarModeChange('always-collapsed')}
        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
          sidebarMode === 'always-collapsed' 
            ? 'bg-[#0D7871] text-white' 
            : 'bg-white/60 text-[#1a1a1a] hover:bg-white/80 border border-white/60'
        }`}
        style={{ fontFamily: 'Inter', fontWeight: 600 }}
        aria-pressed={sidebarMode === 'always-collapsed'}
      >
        Collapsed
      </button>
      <button
        onClick={() => handleSidebarModeChange('collapsed')}
        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
          sidebarMode === 'collapsed' 
            ? 'bg-[#0D7871] text-white' 
            : 'bg-white/60 text-[#1a1a1a] hover:bg-white/80 border border-white/60'
        }`}
        style={{ fontFamily: 'Inter', fontWeight: 600 }}
        aria-pressed={sidebarMode === 'collapsed'}
      >
        On Hover
      </button>
      <button
        onClick={() => handleSidebarModeChange('expanded')}
        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
          sidebarMode === 'expanded' 
            ? 'bg-[#0D7871] text-white' 
            : 'bg-white/60 text-[#1a1a1a] hover:bg-white/80 border border-white/60'
        }`}
        style={{ fontFamily: 'Inter', fontWeight: 600 }}
        aria-pressed={sidebarMode === 'expanded'}
      >
        Expanded
      </button>
    </div>
  </div>
</div>

            {/* Restart Tour */}
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.4)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(219, 39, 119, 0.1)' }}>
                  <svg className="w-5 h-5" style={{ color: '#db2777' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#1a1a1a] font-medium" style={{ fontFamily: 'Montserrat Alternates' }}>Workspace Tour</p>
                  <p className="text-sm text-[#4a4642]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                    {hasCompletedHomeTour ? "You've completed the tour. Restart anytime!" : 'Take a guided tour of the workspace features'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleRestartTour} 
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2" 
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 600,
                  color: '#db2777',
                  background: 'rgba(219, 39, 119, 0.1)',
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restart Tour
              </button>
            </div>
          </div>
        </section>

        {/* Deleted Items Section */}
        <div className="mb-6" data-tour="settings-deleted-items">
          <DeletedItemsSection user={user} />
        </div>

        {/* Email Preferences Section */}
        <section className="glass-card p-6 mb-6" aria-labelledby="email-prefs-heading">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#00A99D]/10 flex items-center justify-center" aria-hidden="true">
              <svg className="w-5 h-5 text-[#006b63]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 id="email-prefs-heading" className="text-[#1a1a1a]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Email Preferences</h2>
              <p className="text-sm text-[#4a4642]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                Manage your newsletter and notification subscriptions
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.05)', border: '1px solid rgba(0, 169, 157, 0.2)' }}>
            <p className="text-[#1a1a1a] mb-3" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
              To manage your email subscriptions, look for the <strong>"Manage Preferences"</strong> link at the bottom of any Clemelopy email.
            </p>
            <p className="text-sm text-[#4a4642]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
              From there you can subscribe or unsubscribe from our newsletter, product updates, and other communications.
            </p>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="glass-card p-6 border-red-200/60" data-tour="settings-danger-zone" aria-labelledby="danger-zone-heading">
          <h2 id="danger-zone-heading" className="text-red-600 mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Danger Zone</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#1a1a1a] font-medium" style={{ fontFamily: 'Montserrat Alternates' }}>Delete Account</p>
              <p className="text-sm text-[#4a4642]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Permanently delete your account and all associated data. This action cannot be undone.</p>
            </div>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2 border-2 border-red-600 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
              style={{ fontFamily: 'Inter', fontWeight: 600 }}
            >
              Delete Account
            </button>
          </div>
        </section>
      </div>

  {/* Edit Profile Modal */}
{isEditModalOpen && (
  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="glass-modal w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div 
        className="p-6 flex items-center justify-between shrink-0 border-b border-black/10 bg-white/95"
      >
        <h2 className="text-xl text-[#1a1a1a]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>Edit Profile</h2>
        <button onClick={() => setIsEditModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center transition-colors">
          <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Personal Information */}
        <div>
          <h3 className="text-sm text-[#0D7871] uppercase tracking-wider mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" style={{ fontFamily: 'Inter', fontWeight: 500 }} />
            </div>
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" style={{ fontFamily: 'Inter', fontWeight: 500 }} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>Phone Number</label>
              <div className="flex gap-2">
                <select value={phoneCountryCode} onChange={(e) => setPhoneCountryCode(e.target.value)} className="w-24 px-3 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                  <option value="+61">+61</option>
                  <option value="+49">+49</option>
                  <option value="+33">+33</option>
                </select>
                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="(555) 555-5555" className="flex-1 px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" style={{ fontFamily: 'Inter', fontWeight: 500 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h3 className="text-sm text-[#0D7871] uppercase tracking-wider mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>Street Address</label>
              <input type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" style={{ fontFamily: 'Inter', fontWeight: 500 }} />
            </div>
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>Apt / Unit / Suite</label>
              <input type="text" value={aptUnitSuite} onChange={(e) => setAptUnitSuite(e.target.value)} className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" style={{ fontFamily: 'Inter', fontWeight: 500 }} />
            </div>
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>City</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" style={{ fontFamily: 'Inter', fontWeight: 500 }} />
            </div>
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>State / Province</label>
              <input type="text" value={stateProv} onChange={(e) => setStateProv(e.target.value)} className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" style={{ fontFamily: 'Inter', fontWeight: 500 }} />
            </div>
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>ZIP / Postal Code</label>
              <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" style={{ fontFamily: 'Inter', fontWeight: 500 }} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>Country</label>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" style={{ fontFamily: 'Inter', fontWeight: 500 }} />
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div>
          <h3 className="text-sm text-[#0D7871] uppercase tracking-wider mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>Business Name</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" style={{ fontFamily: 'Inter', fontWeight: 500 }} />
            </div>
            <div>
              <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>Number of Employees</label>
              <select value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                <option value="">Select</option>
                <option value="Just me">Just me</option>
                <option value="2-10">2-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="500+">500+</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>Website URL</label>
              <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" style={{ fontFamily: 'Inter', fontWeight: 500 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Fixed */}
      <div className="p-6 flex justify-end gap-3 shrink-0 border-t border-black/10 bg-white/95"
      >
        <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 rounded-xl text-[#1a1a1a] font-medium hover:bg-black/5 transition-colors bg-white/80 border border-black/10" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Cancel</button>
        <button onClick={handleSaveProfile} disabled={isSaving} className="px-6 py-3 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', background: 'linear-gradient(135deg, #FAA819, #E99502)' }}>
          {isSaving ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : 'Save Changes'}
        </button>
      </div>
    </div>
  </div>
)}

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md glass-modal">
            <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <h2 className="text-xl text-[#1a1a1a]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>Change Password</h2>
              <button onClick={() => { setIsPasswordModalOpen(false); setPasswordMessage(null); }} className="w-8 h-8 rounded-lg hover:bg-white/60 flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {passwordMessage && (
                <div 
                  role={passwordMessage.type === 'error' ? 'alert' : 'status'}
                  aria-live={passwordMessage.type === 'error' ? 'assertive' : 'polite'}
                  className={`p-4 rounded-xl ${passwordMessage.type === 'success' ? 'bg-[#00A99D]/10 border border-[#00A99D]/30' : 'bg-red-50 border border-red-200'}`}
                >
                  <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-[#166534]' : 'text-[#b91c1c]'}`} style={{ fontFamily: 'Inter', fontWeight: 500 }}>{passwordMessage.text}</p>
                </div>
              )}

              <div>
                <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPassword ? "text" : "password"} 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    className="w-full px-4 py-3 pr-12 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6b6560] hover:text-[#1a1a1a] transition-colors"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="w-full px-4 py-3 pr-12 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6b6560] hover:text-[#1a1a1a] transition-colors"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>Confirm New Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="w-full px-4 py-3 pr-12 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6b6560] hover:text-[#1a1a1a] transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <button onClick={() => { setIsPasswordModalOpen(false); setPasswordMessage(null); }} className="px-6 py-3 rounded-xl text-[#1a1a1a] font-medium hover:bg-white/60 transition-colors bg-white/50 border border-white/60" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleChangePassword} className="px-6 py-3 bg-[#00A99D] hover:bg-[#0D7871] text-white rounded-xl font-semibold transition-colors" style={{ fontFamily: 'Montserrat Alternates' }}>Update Password</button>
            </div>
          </div>
        </div>
      )}

      {/* AAL2 Verification Modal */}
      {showAAL2Modal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md glass-modal">
            <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <h2 className="text-xl text-[#1a1a1a]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>
                Verify Your Identity
              </h2>
              <button 
                onClick={() => { 
                  setShowAAL2Modal(false); 
                  setAAL2Code(''); 
                  setAAL2Error(null); 
                }} 
                className="w-8 h-8 rounded-lg hover:bg-white/60 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)' }}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="text-[#1a1a1a] mb-2" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                  Two-factor authentication is enabled on your account.
                </p>
                <p className="text-sm text-[#6b6560]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                  Enter the 6-digit code from your authenticator app to continue.
                </p>
              </div>

              {aal2Error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{aal2Error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>
                  Verification Code
                </label>
                <input
                  type="text"
                  value={aal2Code}
                  onChange={(e) => setAAL2Code(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-6 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <button 
                onClick={() => { 
                  setShowAAL2Modal(false); 
                  setAAL2Code(''); 
                  setAAL2Error(null); 
                }} 
                className="px-6 py-3 rounded-xl text-[#1a1a1a] font-medium hover:bg-white/60 transition-colors bg-white/50 border border-white/60" 
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={handleAAL2Verify}
                disabled={isVerifyingAAL2 || aal2Code.length !== 6}
                className="px-6 py-3 bg-[#00A99D] hover:bg-[#0D7871] text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ fontFamily: 'Montserrat Alternates' }}
              >
                {isVerifyingAAL2 ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : 'Verify & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md glass-modal">
            <div className="p-6" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <h2 className="text-xl text-red-500" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>Delete Account</h2>
            </div>

            <div className="p-6">
              <p className="text-[#1a1a1a] mb-4" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                This action is <strong>permanent</strong> and cannot be undone. All your data, projects, and settings will be permanently deleted.
              </p>
              <p className="text-[#1a1a1a] mb-4" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                Type <strong>DELETE</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors glass-input"
              />
            </div>

            <div className="p-6 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <button onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmText(''); }} className="px-6 py-3 rounded-xl text-[#1a1a1a] font-medium hover:bg-white/60 transition-colors bg-white/50 border border-white/60" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Cancel</button>
              <button 
                onClick={handleDeleteAccount} 
                disabled={deleteConfirmText !== 'DELETE' || isDeletingAccount} 
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" 
                style={{ fontFamily: 'Montserrat Alternates' }}
              >
                {isDeletingAccount ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md glass-modal">
            <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <h2 className="text-xl text-[#1a1a1a]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}>
                Set Up Two-Factor Authentication
              </h2>
              <button onClick={handleCancel2FA} className="w-8 h-8 rounded-lg hover:bg-white/60 flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {twoFAError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600" style={{ fontFamily: 'Inter', fontWeight: 500 }}>{twoFAError}</p>
                </div>
              )}

              <div className="text-center">
                <p className="text-[#1a1a1a] mb-4" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                
                {qrCodeUrl && (
                  <div className="p-4 rounded-xl inline-block mb-4" style={{ background: 'white', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                )}
                
                {totpSecret && (
                  <div className="mb-4">
                    <p className="text-xs text-[#4a4642] mb-2" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
                      Or enter this code manually:
                    </p>
                    <code className="px-4 py-2 rounded-lg text-sm font-mono text-[#1a1a1a] select-all bg-white/50 border border-white/60">
                      {totpSecret}
                    </code>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-[#1a1a1a] mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}>
                  Enter the 6-digit code from your app
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#005a54] transition-colors glass-input"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-6 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <button onClick={handleCancel2FA} className="px-6 py-3 rounded-xl text-[#1a1a1a] font-medium hover:bg-white/60 transition-colors bg-white/50 border border-white/60" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
                Cancel
              </button>
              <button
                onClick={handleVerify2FA}
                disabled={isEnrolling || verificationCode.length !== 6}
                className="px-6 py-3 bg-[#00A99D] hover:bg-[#0D7871] text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ fontFamily: 'Montserrat Alternates' }}
              >
                {isEnrolling ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : 'Verify & Enable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Page Tour */}
      <PageTour
        isOpen={showTour}
        onClose={closeTour}
        onComplete={completeTour}
        onSkip={skipTour}
        steps={settingsTourSteps}
        tourName="Settings Tour"
      />
      </main>
    </Layout>
  );
}