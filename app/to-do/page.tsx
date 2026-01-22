'use client';


import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import PageTour from '../components/PageTour';
import TourHelpButton from '../components/TourHelpButton';
import { usePageTour } from '../hooks/usePageTour';
import { todoTourSteps } from '../components/todoTourSteps';

interface Todo {
  id: string;
  project_id: string;
  project_title: string;
  task: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  created_at: string;
  due_date: string | null;
  due_time: string | null;
  reminder_at: string | null;
  position?: number;
}

interface Project {
  id: string;
  project_title: string;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  position: number;
  is_collapsed: boolean;
  is_deleted?: boolean;
  deleted_at?: string;
}

interface GroupedTodos {
  [projectTitle: string]: {
    project_id: string;
    todos: Todo[];
    isFolder?: boolean;
    folderColor?: string;
    folderPosition?: number;
  };
}

type SortOption = 'created' | 'due_date' | 'priority' | 'alphabetical';

const generateICSContent = (todo: Todo): string => {
  const now = new Date();
  const uid = `${todo.id}@clemelopy.com`;
  let startDate: Date;
  let endDate: Date;
  let isAllDay = false;
  
  if (todo.due_date) {
    if (todo.due_time) {
      startDate = new Date(`${todo.due_date}T${todo.due_time}`);
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    } else {
      startDate = new Date(todo.due_date);
      endDate = new Date(todo.due_date);
      isAllDay = true;
    }
  } else {
    startDate = new Date();
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }
  
  const formatDate = (date: Date, allDay: boolean = false): string => {
    if (allDay) return date.toISOString().split('T')[0].replace(/-/g, '');
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const formatDateNow = (date: Date): string => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let alarmSection = '';
  if (todo.reminder_at) {
    const reminderDate = new Date(todo.reminder_at);
    const triggerMinutes = Math.round((startDate.getTime() - reminderDate.getTime()) / 60000);
    if (triggerMinutes > 0) {
      alarmSection = `\nBEGIN:VALARM\nACTION:DISPLAY\nDESCRIPTION:Reminder: ${todo.task}\nTRIGGER:-PT${triggerMinutes}M\nEND:VALARM`;
    }
  }

  if (isAllDay) {
    return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Clemelopy//To-Do//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nBEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${formatDateNow(now)}\nDTSTART;VALUE=DATE:${formatDate(startDate, true)}\nDTEND;VALUE=DATE:${formatDate(new Date(endDate.getTime() + 86400000), true)}\nSUMMARY:${todo.task}\nDESCRIPTION:Project: ${todo.project_title}\\nPriority: ${todo.priority}\nSTATUS:${todo.completed ? 'COMPLETED' : 'CONFIRMED'}${alarmSection}\nEND:VEVENT\nEND:VCALENDAR`;
  }

  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Clemelopy//To-Do//EN\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nBEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${formatDateNow(now)}\nDTSTART:${formatDate(startDate)}\nDTEND:${formatDate(endDate)}\nSUMMARY:${todo.task}\nDESCRIPTION:Project: ${todo.project_title}\\nPriority: ${todo.priority}\nSTATUS:${todo.completed ? 'COMPLETED' : 'CONFIRMED'}${alarmSection}\nEND:VEVENT\nEND:VCALENDAR`;
};

const generateGoogleCalendarUrl = (todo: Todo): string => {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  let dates = '';
  if (todo.due_date) {
    if (todo.due_time) {
      const start = new Date(`${todo.due_date}T${todo.due_time}`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      dates = `&dates=${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    } else {
      const dateStr = todo.due_date.replace(/-/g, '');
      dates = `&dates=${dateStr}/${dateStr}`;
    }
  }
  const title = encodeURIComponent(todo.task);
  const details = encodeURIComponent(`Project: ${todo.project_title}\nPriority: ${todo.priority}`);
  return `${baseUrl}&text=${title}&details=${details}${dates}`;
};

const downloadICS = (todo: Todo) => {
  const content = generateICSContent(todo);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${todo.task.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};


function TodosPageContent() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const { showTour, closeTour, completeTour, skipTour, startTour, hasCompletedTour } = usePageTour('todo', true);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderOrder, setFolderOrder] = useState<string[]>([]);
  const [movingFolder, setMovingFolder] = useState<{ name: string; direction: 'up' | 'down' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('created');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [newDropdownOpen, setNewDropdownOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [taskIdFromUrl, setTaskIdFromUrl] = useState<string | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newReminder, setNewReminder] = useState<string>('none');
  const [newCustomReminder, setNewCustomReminder] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#FAA819');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  // Edit folder state
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [editingFolderData, setEditingFolderData] = useState<{ id: string; name: string; color: string; isPersonalTasks?: boolean } | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderColor, setEditFolderColor] = useState('#00A99D');
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  
  // Personal Tasks folder color (from profile, default teal)
  const [personalTasksColor, setPersonalTasksColor] = useState('#00A99D');
  
  // Update Personal Tasks color when profile loads
  useEffect(() => {
    if (profile?.personal_tasks_color) {
      setPersonalTasksColor(profile.personal_tasks_color);
    }
  }, [profile]);
  
  const folderColors = [
    { value: '#FAA819', label: 'Orange' },
    { value: '#00A99D', label: 'Teal' },
    { value: '#E91E63', label: 'Pink' },
    { value: '#9C27B0', label: 'Purple' },
    { value: '#3F51B5', label: 'Indigo' },
    { value: '#2196F3', label: 'Blue' },
    { value: '#4CAF50', label: 'Green' },
    { value: '#FF5722', label: 'Red' },
  ];
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTask, setEditTask] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editReminder, setEditReminder] = useState<string>('none');
  const [editCustomReminder, setEditCustomReminder] = useState('');
  const [editFolderId, setEditFolderId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [calendarDropdownId, setCalendarDropdownId] = useState<string | null>(null);
  const [taskActionsId, setTaskActionsId] = useState<string | null>(null);
  // Bulk selection state
const [bulkSelectMode, setBulkSelectMode] = useState(false);
const [selectedTodos, setSelectedTodos] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [draggedTask, setDraggedTask] = useState<Todo | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | null>(null);

  const calendarDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const newDropdownRef = useRef<HTMLDivElement>(null);
  const taskActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && profile) { fetchTodos(); fetchProjects(); fetchFolders(); } else if (!user) { setIsLoading(false); }
  }, [user, profile]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarDropdownRef.current && !calendarDropdownRef.current.contains(e.target as Node)) setCalendarDropdownId(null);
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) setSortDropdownOpen(false);
      if (newDropdownRef.current && !newDropdownRef.current.contains(e.target as Node)) setNewDropdownOpen(false);
      if (taskActionsRef.current && !taskActionsRef.current.contains(e.target as Node)) setTaskActionsId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { const savedSort = localStorage.getItem('todoSortPreference') as SortOption; if (savedSort) setSortBy(savedSort); }, []);
  useEffect(() => { if (user) { const savedOrder = localStorage.getItem(`folderOrder_${user.id}`); if (savedOrder) { try { setFolderOrder(JSON.parse(savedOrder)); } catch (e) { console.error('Error parsing folder order:', e); } } } }, [user]);
  useEffect(() => { if (user && folderOrder.length > 0) localStorage.setItem(`folderOrder_${user.id}`, JSON.stringify(folderOrder)); }, [folderOrder, user]);

  // Check for task ID in URL and store it
  useEffect(() => {
    const taskId = searchParams.get('task');
    if (taskId) {
      setTaskIdFromUrl(taskId);
    }
  }, [searchParams]);

  // Open modal when todos are loaded and we have a task ID from URL
  useEffect(() => {
    if (taskIdFromUrl && todos.length > 0 && !isLoading && folders) {
      const todo = todos.find(t => t.id === taskIdFromUrl);
      if (todo) {
        openEditModal(todo);
        // Clear the URL parameter without refreshing
        window.history.replaceState({}, '', '/to-do');
        setTaskIdFromUrl(null);
      }
    }
  }, [taskIdFromUrl, todos, isLoading, folders]);

  const isCreatingSampleTaskRef = useRef(false);

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase.from('user_todos').select('*').eq('user_id', user?.id).eq('is_deleted', false).order('created_at', { ascending: false });
      if (error) throw error;
      
      // If user has no todos and hasn't had sample task created before, create one
      // Use ref to prevent duplicate creation from multiple calls
      if ((!data || data.length === 0) && user && profile && !profile.sample_task_created && !isCreatingSampleTaskRef.current) {
        isCreatingSampleTaskRef.current = true;
        
        const { data: newTodo, error: insertError } = await supabase
          .from('user_todos')
          .insert({
            user_id: user.id,
            task: 'Welcome to Clemelopy! 🍊 Click me to learn how tasks work.',
            project_title: 'Personal Tasks',
            priority: 'medium',
            completed: false,
            is_deleted: false,
          })
          .select()
          .single();
        
        if (!insertError && newTodo) {
          // Mark that we've created the sample task
          await supabase
            .from('profiles')
            .update({ sample_task_created: true })
            .eq('id', user.id);
          
          setTodos([newTodo]);
          setExpandedProjects(['Personal Tasks']);
          setIsLoading(false);
          return;
        }
      }
      
      setTodos(data || []);
      const projectTitles = [...new Set((data || []).map(t => t.project_title))];
      // Expand all projects by default so tasks are visible
      setExpandedProjects(projectTitles);
    } catch (err) { console.error('Error fetching todos:', err); } finally { setIsLoading(false); }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase.from('geo_linking_projects_real').select('id, project_title').eq('user_id', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (err) { console.error('Error fetching projects:', err); }
  };

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('todo_folders')
        .select('*')
        .eq('user_id', user?.id)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('position', { ascending: true });
      if (error) throw error;
      setFolders(data || []);
    } catch (err) { console.error('Error fetching folders:', err); }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      const { data, error } = await supabase.from('todo_folders').insert({ user_id: user?.id, name: newFolderName.trim(), color: newFolderColor, position: folders.length }).select().single();
      if (error) throw new Error(error.message || 'Database error');
      setFolders([...folders, data]);
      if (!expandedProjects.includes(data.name)) setExpandedProjects([...expandedProjects, data.name]);
      setNewFolderName(''); setNewFolderColor('#FAA819'); setIsFolderModalOpen(false);
    } catch (err: any) { console.error('Error creating folder:', err); alert(`Failed to create folder: ${err.message || 'Unknown error'}`); } finally { setIsCreatingFolder(false); }
  };

  const openEditFolderModal = (folderId: string, folderName: string, folderColor: string, isPersonalTasks: boolean = false) => {
    setEditingFolderData({ id: folderId, name: folderName, color: folderColor, isPersonalTasks });
    setEditFolderName(folderName);
    setEditFolderColor(folderColor);
    setIsEditFolderModalOpen(true);
  };

  const updateFolder = async () => {
    if (!editingFolderData) return;
    
    setIsSavingFolder(true);
    try {
      if (editingFolderData.isPersonalTasks) {
        // Update Personal Tasks color in profile
        const { error } = await supabase
          .from('profiles')
          .update({ personal_tasks_color: editFolderColor })
          .eq('id', user?.id);
        
        if (error) throw error;
        setPersonalTasksColor(editFolderColor);
      } else {
        // Update regular folder
        const { error } = await supabase
          .from('todo_folders')
          .update({ name: editFolderName.trim(), color: editFolderColor })
          .eq('id', editingFolderData.id);
        
        if (error) throw error;
        
        // Update local state
        setFolders(folders.map(f => 
          f.id === editingFolderData.id 
            ? { ...f, name: editFolderName.trim(), color: editFolderColor } 
            : f
        ));
        
        // Update todos that reference this folder by name
        if (editingFolderData.name !== editFolderName.trim()) {
          await supabase
            .from('user_todos')
            .update({ project_title: editFolderName.trim() })
            .eq('user_id', user?.id)
            .eq('project_title', editingFolderData.name);
          
          setTodos(todos.map(t => 
            t.project_title === editingFolderData.name 
              ? { ...t, project_title: editFolderName.trim() } 
              : t
          ));
        }
      }
      
      setIsEditFolderModalOpen(false);
      setEditingFolderData(null);
    } catch (err: any) {
      console.error('Error updating folder:', err);
      alert(`Failed to update folder: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingFolder(false);
    }
  };

  const deleteFolder = async (folderId: string) => {
    const folderToDelete = folders.find(f => f.id === folderId);
    if (!folderToDelete) return;
    
    const tasksInFolder = todos.filter(t => t.project_title === folderToDelete.name);
    const taskCount = tasksInFolder.length;
    const taskMessage = taskCount > 0 ? ` and ${taskCount} task${taskCount > 1 ? 's' : ''} inside it` : '';
    
    if (!confirm(`Delete "${folderToDelete.name}" folder${taskMessage}? You can recover everything from Settings within 14 days.`)) return;
    
    try {
      // Soft delete all tasks in this folder
      if (taskCount > 0) {
        await supabase
          .from('user_todos')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('user_id', user?.id)
          .eq('project_title', folderToDelete.name);
      }
      
      // Soft delete the folder
      const { error } = await supabase
        .from('todo_folders')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', folderId);
      
      if (error) throw error;
      
      setFolders(folders.filter(f => f.id !== folderId));
      setTodos(todos.filter(t => t.project_title !== folderToDelete.name));
    } catch (err) { 
      console.error('Error deleting folder:', err); 
      alert('Failed to delete folder. Please try again.'); 
    }
  };

  const toggleTodo = async (todoId: string, completed: boolean) => {
    try {
      const { error } = await supabase.from('user_todos').update({ completed: !completed }).eq('id', todoId);
      if (error) throw error;
      setTodos(todos.map(t => t.id === todoId ? { ...t, completed: !completed } : t));
    } catch (err) { console.error('Error updating todo:', err); }
  };

  const moveTaskToFolder = async (todoId: string, targetFolderName: string, targetFolderId: string | null) => {
    try {
      const { error } = await supabase.from('user_todos').update({ project_id: targetFolderId, project_title: targetFolderName }).eq('id', todoId);
      if (error) throw error;
      setTodos(todos.map(t => t.id === todoId ? { ...t, project_id: targetFolderId || '', project_title: targetFolderName } : t));
      if (!expandedProjects.includes(targetFolderName)) setExpandedProjects([...expandedProjects, targetFolderName]);
      setTaskActionsId(null);
    } catch (err) { console.error('Error moving task:', err); alert('Failed to move task. Please try again.'); }
  };

  const duplicateTaskToFolder = async (todo: Todo, targetFolderName: string, targetFolderId: string | null) => {
    try {
      const { data, error } = await supabase.from('user_todos').insert({ user_id: user?.id, project_id: targetFolderId, project_title: targetFolderName, task: todo.task, priority: todo.priority, completed: false, due_date: todo.due_date, due_time: todo.due_time, reminder_at: todo.reminder_at, reminder_sent: false, is_deleted: false }).select().single();
      if (error) throw error;
      setTodos([data, ...todos]);
      if (!expandedProjects.includes(targetFolderName)) setExpandedProjects([...expandedProjects, targetFolderName]);
      setTaskActionsId(null);
    } catch (err) { console.error('Error duplicating task:', err); alert('Failed to duplicate task. Please try again.'); }
  };

  const getAvailableFolders = (currentFolderName: string) => {
    const available: { id: string | null; name: string; isFolder: boolean }[] = [];
    const addedNames = new Set<string>();
    if (currentFolderName !== 'Personal Tasks') { available.push({ id: null, name: 'Personal Tasks', isFolder: false }); addedNames.add('Personal Tasks'); }
    folders.forEach(folder => { if (folder.name !== currentFolderName && !addedNames.has(folder.name)) { available.push({ id: folder.id, name: folder.name, isFolder: true }); addedNames.add(folder.name); } });
    projects.forEach(project => { const projectName = getProjectName(project); if (projectName !== currentFolderName && !addedNames.has(projectName)) { available.push({ id: project.id, name: projectName, isFolder: false }); addedNames.add(projectName); } });
    todos.forEach(todo => { if (todo.project_title && todo.project_title !== currentFolderName && todo.project_title !== 'Personal Tasks' && !addedNames.has(todo.project_title)) { available.push({ id: todo.project_id || null, name: todo.project_title, isFolder: false }); addedNames.add(todo.project_title); } });
    return available;
  };

  const getAllFoldersForDuplicate = () => {
    const available: { id: string | null; name: string; isFolder: boolean }[] = [];
    const addedNames = new Set<string>();
    available.push({ id: null, name: 'Personal Tasks', isFolder: false }); addedNames.add('Personal Tasks');
    folders.forEach(folder => { if (!addedNames.has(folder.name)) { available.push({ id: folder.id, name: folder.name, isFolder: true }); addedNames.add(folder.name); } });
    projects.forEach(project => { const projectName = getProjectName(project); if (!addedNames.has(projectName)) { available.push({ id: project.id, name: projectName, isFolder: false }); addedNames.add(projectName); } });
    todos.forEach(todo => { if (todo.project_title && todo.project_title !== 'Personal Tasks' && !addedNames.has(todo.project_title)) { available.push({ id: todo.project_id || null, name: todo.project_title, isFolder: false }); addedNames.add(todo.project_title); } });
    return available;
  };

  const deleteTodo = async (todoId: string) => {
    try {
      const { error } = await supabase.from('user_todos').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', todoId);
      if (error) throw error;
      setTodos(todos.filter(t => t.id !== todoId));
    } catch (err) { console.error('Error deleting todo:', err); }
  };

  const deleteProjectTodos = async (projectTitle: string) => {
    if (!confirm(`Delete all to-dos for "${projectTitle}"? You can recover them from Settings within 14 days.`)) return;
    try {
      const { error } = await supabase.from('user_todos').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('user_id', user?.id).eq('project_title', projectTitle);
      if (error) throw error;
      setTodos(todos.filter(t => t.project_title !== projectTitle));
    } catch (err) { console.error('Error deleting project todos:', err); }
  };

  const toggleProjectExpanded = (projectTitle: string) => { setExpandedProjects(prev => prev.includes(projectTitle) ? prev.filter(p => p !== projectTitle) : [...prev, projectTitle]); };

  const calculateReminderAt = (reminder: string, customReminder: string, dueDate: string, dueTime: string): string | null => {
    if (reminder === 'none' || !dueDate) return null;
    if (reminder === 'custom') return customReminder ? new Date(customReminder).toISOString() : null;
    const dueDateTime = dueTime ? new Date(`${dueDate}T${dueTime}`) : new Date(`${dueDate}T09:00:00`);
    let reminderDate: Date;
    switch (reminder) {
      case '15min': reminderDate = new Date(dueDateTime.getTime() - 15 * 60 * 1000); break;
      case '1hour': reminderDate = new Date(dueDateTime.getTime() - 60 * 60 * 1000); break;
      case '1day': reminderDate = new Date(dueDateTime.getTime() - 24 * 60 * 60 * 1000); break;
      default: return null;
    }
    return reminderDate.toISOString();
  };

  const getProjectName = (project: Project): string => project.project_title || 'Untitled Project';

  const createTask = async () => {
    if (!newTask.trim()) return;
    setIsCreating(true);
    try {
      const reminderAt = calculateReminderAt(newReminder, newCustomReminder, newDueDate, newDueTime);
      let projectId: string | null = null;
      let projectTitle = 'Personal Tasks';
      if (newProjectId) { const parts = newProjectId.split(':'); if (parts.length >= 3) { const [, id, ...nameParts] = parts; projectId = id; projectTitle = nameParts.join(':'); } }
      const { data, error } = await supabase.from('user_todos').insert({ user_id: user?.id, project_id: projectId, project_title: projectTitle, task: newTask.trim(), priority: newPriority, completed: false, due_date: newDueDate || null, due_time: newDueTime || null, reminder_at: reminderAt, reminder_sent: false, is_deleted: false }).select().single();
      if (error) throw new Error(error.message || 'Database error');
      setTodos([data, ...todos]);
      if (!expandedProjects.includes(projectTitle)) setExpandedProjects([...expandedProjects, projectTitle]);
      resetCreateForm(); setIsCreateModalOpen(false);
    } catch (err: any) { console.error('Error creating task:', err); alert(`Failed to create task: ${err.message || 'Unknown error'}`); } finally { setIsCreating(false); }
  };

  const resetCreateForm = () => { setNewTask(''); setNewPriority('medium'); setNewDueDate(''); setNewDueTime(''); setNewReminder('none'); setNewCustomReminder(''); setNewProjectId(''); };

  const openEditModal = (todo: Todo) => {
    setEditingTodo(todo); setEditTask(todo.task); setEditPriority(todo.priority); setEditDueDate(todo.due_date || ''); setEditDueTime(todo.due_time || '');
    if (todo.reminder_at && todo.due_date) {
      const dueDateTime = todo.due_time ? new Date(`${todo.due_date}T${todo.due_time}`) : new Date(`${todo.due_date}T09:00:00`);
      const reminderTime = new Date(todo.reminder_at);
      const diffMinutes = Math.round((dueDateTime.getTime() - reminderTime.getTime()) / 60000);
      if (diffMinutes === 15) setEditReminder('15min');
      else if (diffMinutes === 60) setEditReminder('1hour');
      else if (diffMinutes === 1440) setEditReminder('1day');
      else { setEditReminder('custom'); setEditCustomReminder(todo.reminder_at.slice(0, 16)); }
    } else { setEditReminder('none'); setEditCustomReminder(''); }
    
    // Set the folder to the task's CURRENT folder
    if (todo.project_title === 'Personal Tasks' || !todo.project_title) {
      // Personal Tasks - use empty string which maps to "Personal Tasks (No Folder)"
      setEditFolderId('');
    } else {
      const isCustomFolder = folders.some(f => f.name === todo.project_title);
      const isGeoProject = projects.some(p => getProjectName(p) === todo.project_title);
      if (isCustomFolder) { 
        const folder = folders.find(f => f.name === todo.project_title); 
        setEditFolderId(`folder:${folder?.id}:${todo.project_title}`); 
      } else if (isGeoProject) {
        setEditFolderId(`project:${todo.project_id}:${todo.project_title}`);
      } else {
        // Task is in a folder that no longer exists or isn't recognized - keep it as is
        setEditFolderId(`other:${todo.project_id || ''}:${todo.project_title}`);
      }
    }
    setIsEditModalOpen(true);
  };

  const saveEditTodo = async () => {
    if (!editingTodo || !editTask.trim()) return;
    setIsSaving(true);
    try {
      const reminderAt = calculateReminderAt(editReminder, editCustomReminder, editDueDate, editDueTime);
      let projectId: string | null = null;
      let projectTitle = 'Personal Tasks';
      if (editFolderId) { const parts = editFolderId.split(':'); if (parts.length >= 3) { const [, id, ...nameParts] = parts; projectId = id; projectTitle = nameParts.join(':'); } }
      const { error } = await supabase.from('user_todos').update({ task: editTask.trim(), priority: editPriority, due_date: editDueDate || null, due_time: editDueTime || null, reminder_at: reminderAt, reminder_sent: false, project_id: projectId, project_title: projectTitle }).eq('id', editingTodo.id);
      if (error) throw error;
      setTodos(todos.map(t => t.id === editingTodo.id ? { ...t, task: editTask.trim(), priority: editPriority, due_date: editDueDate || null, due_time: editDueTime || null, reminder_at: reminderAt, project_id: projectId || '', project_title: projectTitle } : t));
      if (!expandedProjects.includes(projectTitle)) setExpandedProjects([...expandedProjects, projectTitle]);
      setIsEditModalOpen(false); setEditingTodo(null);
    } catch (err) { console.error('Error updating todo:', err); alert('Failed to update task. Please try again.'); } finally { setIsSaving(false); }
  };
// Bulk selection functions
const toggleBulkSelectMode = () => {
  setBulkSelectMode(!bulkSelectMode);
  setSelectedTodos(new Set());
};

const toggleSelectTodo = (todoId: string) => {
  setSelectedTodos(prev => {
    const newSet = new Set(prev);
    if (newSet.has(todoId)) {
      newSet.delete(todoId);
    } else {
      newSet.add(todoId);
    }
    return newSet;
  });
};

const selectAllInFolder = (folderTodos: Todo[]) => {
  const folderIds = folderTodos.map(t => t.id);
  const allSelected = folderIds.every(id => selectedTodos.has(id));
  
  setSelectedTodos(prev => {
    const newSet = new Set(prev);
    if (allSelected) {
      folderIds.forEach(id => newSet.delete(id));
    } else {
      folderIds.forEach(id => newSet.add(id));
    }
    return newSet;
  });
};

const bulkCompleteTodos = async () => {
  if (selectedTodos.size === 0) return;
  
  try {
    const { error } = await supabase
      .from('user_todos')
      .update({ completed: true })
      .in('id', Array.from(selectedTodos));
    
    if (error) throw error;
    
    setTodos(todos.map(t => 
      selectedTodos.has(t.id) ? { ...t, completed: true } : t
    ));
    setSelectedTodos(new Set());
    setBulkSelectMode(false);
  } catch (err) {
    console.error('Error completing todos:', err);
    alert('Failed to complete tasks. Please try again.');
  }
};

const bulkDeleteTodos = async () => {
  if (selectedTodos.size === 0) return;
  
  if (!confirm(`Delete ${selectedTodos.size} selected task${selectedTodos.size > 1 ? 's' : ''}? You can recover them from Settings within 14 days.`)) return;
  
  try {
    const { error } = await supabase
      .from('user_todos')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .in('id', Array.from(selectedTodos));
    
    if (error) throw error;
    
    setTodos(todos.filter(t => !selectedTodos.has(t.id)));
    setSelectedTodos(new Set());
    setBulkSelectMode(false);
  } catch (err) {
    console.error('Error deleting todos:', err);
    alert('Failed to delete tasks. Please try again.');
  }
};

// Drag and drop handlers
const handleDragStart = (e: React.DragEvent, todo: Todo) => {
  if (bulkSelectMode) return; // Disable drag in bulk select mode
  setDraggedTask(todo);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', todo.id);
  // Add visual feedback
  setTimeout(() => {
    (e.target as HTMLElement).style.opacity = '0.5';
  }, 0);
};

const handleDragEnd = (e: React.DragEvent) => {
  (e.target as HTMLElement).style.opacity = '1';
  setDraggedTask(null);
  setDragOverTaskId(null);
  setDragOverPosition(null);
};

const handleDragOver = (e: React.DragEvent, todoId: string) => {
  e.preventDefault();
  if (!draggedTask || draggedTask.id === todoId) return;
  
  e.dataTransfer.dropEffect = 'move';
  
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const midpoint = rect.top + rect.height / 2;
  const position = e.clientY < midpoint ? 'above' : 'below';
  
  setDragOverTaskId(todoId);
  setDragOverPosition(position);
};

const handleDragLeave = (e: React.DragEvent) => {
  const relatedTarget = e.relatedTarget as HTMLElement;
  if (!relatedTarget || !(e.currentTarget as HTMLElement).contains(relatedTarget)) {
    setDragOverTaskId(null);
    setDragOverPosition(null);
  }
};

const handleDrop = async (e: React.DragEvent, targetTodo: Todo, projectTodos: Todo[]) => {
  e.preventDefault();
  
  if (!draggedTask || draggedTask.id === targetTodo.id) {
    setDraggedTask(null);
    setDragOverTaskId(null);
    setDragOverPosition(null);
    return;
  }

  // Only allow reordering within the same folder
  if (draggedTask.project_title !== targetTodo.project_title) {
    setDraggedTask(null);
    setDragOverTaskId(null);
    setDragOverPosition(null);
    return;
  }

  const draggedIndex = projectTodos.findIndex(t => t.id === draggedTask.id);
  const targetIndex = projectTodos.findIndex(t => t.id === targetTodo.id);
  
  if (draggedIndex === -1 || targetIndex === -1) return;

  // Calculate new order
  const newTodos = [...projectTodos];
  newTodos.splice(draggedIndex, 1);
  
  const insertIndex = dragOverPosition === 'above' ? 
    (draggedIndex < targetIndex ? targetIndex - 1 : targetIndex) : 
    (draggedIndex < targetIndex ? targetIndex : targetIndex + 1);
  
  newTodos.splice(insertIndex, 0, draggedTask);

  // Update positions in database
  try {
    const updates = newTodos.map((todo, index) => ({
      id: todo.id,
      position: index
    }));

    for (const update of updates) {
      await supabase
        .from('user_todos')
        .update({ position: update.position })
        .eq('id', update.id);
    }

    // Update local state
    setTodos(prevTodos => {
      const otherTodos = prevTodos.filter(t => t.project_title !== targetTodo.project_title);
      const updatedProjectTodos = newTodos.map((todo, index) => ({ ...todo, position: index }));
      return [...otherTodos, ...updatedProjectTodos];
    });
  } catch (err) {
    console.error('Error reordering tasks:', err);
  }

  setDraggedTask(null);
  setDragOverTaskId(null);
  setDragOverPosition(null);
};


  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    localStorage.setItem('todoSortPreference', newSort);
    setSortDropdownOpen(false);
  };

  const sortTodos = (todosToSort: Todo[]): Todo[] => {
    const sorted = [...todosToSort];
    switch (sortBy) {
      case 'due_date': return sorted.sort((a, b) => { if (!a.due_date && !b.due_date) return 0; if (!a.due_date) return 1; if (!b.due_date) return -1; const dateA = a.due_time ? `${a.due_date}T${a.due_time}` : a.due_date; const dateB = b.due_time ? `${b.due_date}T${b.due_time}` : b.due_date; return dateA.localeCompare(dateB); });
      case 'priority': const priorityOrder = { high: 0, medium: 1, low: 2 }; return sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      case 'alphabetical': return sorted.sort((a, b) => a.task.toLowerCase().localeCompare(b.task.toLowerCase()));
      case 'created': default: 
        // If tasks have position values, use them for manual ordering; otherwise fall back to created_at
        return sorted.sort((a, b) => {
          if (a.position !== undefined && b.position !== undefined) {
            return a.position - b.position;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }
  };

  const formatDueDateTime = (todo: Todo): string | null => {
    if (!todo.due_date) return null;
    const date = new Date(todo.due_date + 'T00:00:00');
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (todo.due_time) { const [hours, minutes] = todo.due_time.split(':'); const time = new Date(); time.setHours(parseInt(hours), parseInt(minutes)); const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); return `${dateStr} at ${timeStr}`; }
    return dateStr;
  };

  const isOverdue = (todo: Todo): boolean => { if (!todo.due_date || todo.completed) return false; const now = new Date(); const dueDate = todo.due_time ? new Date(`${todo.due_date}T${todo.due_time}`) : new Date(`${todo.due_date}T23:59:59`); return now > dueDate; };
  const isDueToday = (todo: Todo): boolean => { if (!todo.due_date || todo.completed) return false; const today = new Date().toISOString().split('T')[0]; return todo.due_date === today; };
  const getSortLabel = (option: SortOption): string => { switch (option) { case 'created': return 'Date Created'; case 'due_date': return 'Due Date'; case 'priority': return 'Priority'; case 'alphabetical': return 'Alphabetical'; default: return 'Sort'; } };

  const filteredTodos = todos.filter(t => { if (filter === 'active') return !t.completed; if (filter === 'completed') return t.completed; return true; });

  const groupedTodos: GroupedTodos = filteredTodos.reduce((acc, todo) => { const title = todo.project_title; if (!acc[title]) acc[title] = { project_id: todo.project_id, todos: [] }; acc[title].todos.push(todo); return acc; }, {} as GroupedTodos);
  folders.forEach(folder => { if (!groupedTodos[folder.name]) groupedTodos[folder.name] = { project_id: folder.id, todos: [], isFolder: true, folderColor: folder.color, folderPosition: folder.position }; else { groupedTodos[folder.name].isFolder = true; groupedTodos[folder.name].folderColor = folder.color; groupedTodos[folder.name].folderPosition = folder.position; } });
  Object.keys(groupedTodos).forEach(projectTitle => { groupedTodos[projectTitle].todos = sortTodos(groupedTodos[projectTitle].todos); });

  const getSortedFolderKeys = () => {
    const keys = Object.keys(groupedTodos);
    if (folderOrder.length > 0) { const orderedKeys = folderOrder.filter(k => keys.includes(k)); const newKeys = keys.filter(k => !folderOrder.includes(k)); return [...orderedKeys, ...newKeys]; }
    return keys.sort((a, b) => { if (a === 'Personal Tasks') return -1; if (b === 'Personal Tasks') return 1; const aData = groupedTodos[a]; const bData = groupedTodos[b]; const aIsCustomFolder = aData.isFolder === true; const bIsCustomFolder = bData.isFolder === true; if (aIsCustomFolder && !bIsCustomFolder) return -1; if (!aIsCustomFolder && bIsCustomFolder) return 1; if (aIsCustomFolder && bIsCustomFolder) { const aPos = aData.folderPosition ?? 999; const bPos = bData.folderPosition ?? 999; return aPos - bPos; } return a.localeCompare(b); });
  };

  const sortedFolderKeys = getSortedFolderKeys();

  const moveFolderInOrder = (folderName: string, direction: 'up' | 'down') => {
    const currentOrder = folderOrder.length > 0 ? folderOrder.filter(k => sortedFolderKeys.includes(k)) : [...sortedFolderKeys];
    sortedFolderKeys.forEach(k => { if (!currentOrder.includes(k)) currentOrder.push(k); });
    const currentIndex = currentOrder.indexOf(folderName);
    if (currentIndex === -1) return;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= currentOrder.length) return;
    setMovingFolder({ name: folderName, direction });
    setTimeout(() => { const newOrder = [...currentOrder]; [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]]; setFolderOrder(newOrder); setMovingFolder(null); }, 150);
  };

  const totalTodos = todos.length;
  const completedTodos = todos.filter(t => t.completed).length;
  const activeTodos = totalTodos - completedTodos;

  if (isLoading) {
    return (
      <Layout activeNav="to-do">
        <main id="todos-main" role="main">
          {/* Header - Frosted Glass Container */}
          <header 
            className="rounded-2xl p-8 mb-8"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            }}
          >
            <h1 
              className="text-3xl lg:text-4xl mb-2" 
              style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
            >
              <span style={{ color: '#1a1a1a' }}>My </span>
              <span 
                style={{ 
                  background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                To-Do List
              </span>
            </h1>
            <p 
              className="text-base max-w-2xl"
              style={{ 
                fontFamily: 'Inter', 
                fontWeight: 500,
                color: '#4a4642',
              }}
            >
              Track your progress, manage action items from your GEO Linking Strategy projects, and stay organized.
            </p>
          </header>
          <div className="flex items-center justify-center py-20">
            <div className="text-center" role="status" aria-live="polite">
              <div className="w-16 h-16 border-4 border-[#FAA819] border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true"></div>
              <p style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>Loading to-dos...</p>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout activeNav="to-do">
        <main id="todos-main" role="main">
          {/* Header - Frosted Glass Container */}
          <header 
            className="rounded-2xl p-8 mb-8"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            }}
          >
            <h1 
              className="text-3xl lg:text-4xl mb-2" 
              style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
            >
              <span style={{ color: '#1a1a1a' }}>My </span>
              <span 
                style={{ 
                  background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                To-Do List
              </span>
            </h1>
            <p 
              className="text-base max-w-2xl"
              style={{ 
                fontFamily: 'Inter', 
                fontWeight: 500,
                color: '#4a4642',
              }}
            >
              Track your progress, manage action items from your GEO Linking Strategy projects, and stay organized.
            </p>
          </header>
          <div style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '32px', padding: '48px' }} className="text-center">
            <h2 className="text-2xl mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>Sign in to view your to-dos</h2>
            <p style={{ fontFamily: 'Inter', color: '#4a4642' }}>Your action items from GEO Linking projects will appear here.</p>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout activeNav="to-do">
      {/* Skip to main content link */}
      <a 
        href="#todos-main" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-[#005a54] focus:rounded-lg focus:font-semibold"
        style={{ fontFamily: 'Montserrat Alternates' }}
      >
        Skip to main content
      </a>

      <main id="todos-main" role="main">
        {/* Header - Frosted Glass Container */}
        <header 
          className="rounded-2xl p-8 mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 
                className="text-3xl lg:text-4xl mb-2" 
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
              >
                <span style={{ color: '#1a1a1a' }}>My </span>
                <span 
                  style={{ 
                    background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  To-Do List
                </span>
              </h1>
              <p 
                className="text-base max-w-2xl"
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 500,
                  color: '#4a4642',
                }}
              >
                Track your progress, manage action items from your GEO Linking Strategy projects, and stay organized.
              </p>
            </div>
            <TourHelpButton onClick={startTour} hasCompleted={hasCompletedTour} />
          </div>
        </header>

      {/* Main Glassmorphic Container */}
      <div style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '32px', padding: '32px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}>
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3" data-tour="todo-stats">
            <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
              <span className="text-lg font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#1a1a1a' }}>{totalTodos}</span>
              <span className="text-xs" style={{ fontFamily: 'Inter', color: '#4a4642' }}>Total</span>
            </div>
            <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
              <span className="text-lg font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#db2777' }}>{activeTodos}</span>
              <span className="text-xs" style={{ fontFamily: 'Inter', color: '#db2777' }}>Active</span>
            </div>
            <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
              <span className="text-lg font-bold" style={{ fontFamily: 'Montserrat Alternates', color: '#006b63' }}>{completedTodos}</span>
              <span className="text-xs" style={{ fontFamily: 'Inter', color: '#006b63' }}>Done</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={newDropdownRef} data-tour="todo-new-button">
            <button onClick={() => setNewDropdownOpen(!newDropdownOpen)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, background: 'linear-gradient(135deg, #0D7871, #065f5b)', color: 'white', boxShadow: '0 4px 15px rgba(0, 169, 157, 0.3)' }} aria-expanded={newDropdownOpen} aria-haspopup="true">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New
              <svg className={`w-4 h-4 transition-transform ${newDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {newDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl z-20 py-2" role="menu" style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)' }}>
                <button onClick={() => { setIsCreateModalOpen(true); setNewDropdownOpen(false); }} className="w-full px-4 py-3 text-left hover:bg-[#FAA819]/10 flex items-center gap-3 transition" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a' }} role="menuitem">
                  <svg className="w-5 h-5 text-[#db2777]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  New Task
                </button>
                <div className="px-4 py-3 hover:bg-[#00A99D]/10 transition">
                  <button onClick={() => { setIsFolderModalOpen(true); setNewDropdownOpen(false); }} className="w-full text-left flex items-center gap-3" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a' }} role="menuitem">
                    <svg className="w-5 h-5 text-[#006b63]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                    New Folder
                  </button>
                  <p className="text-xs mt-1 ml-8" style={{ fontFamily: 'Inter', color: '#6b6560' }}>
                    Tip: Folders are also auto-created from your Linking Strategy projects
                  </p>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        
       {/* Filter Tabs + Sort */}
       <div className="flex items-center justify-between mb-6">
          {/* Left: Filter Tabs */}
          <div className="flex gap-2" role="tablist" aria-label="Filter tasks" data-tour="todo-filters">
            {[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'completed', label: 'Completed' }].map((tab) => (
              <button 
                key={tab.key} 
                onClick={() => setFilter(tab.key as typeof filter)} 
                className="px-6 py-3 text-sm transition-all"
                role="tab"
                aria-selected={filter === tab.key}
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  fontWeight: 500, 
                  borderRadius: '14px',
                  background: filter === tab.key ? 'linear-gradient(135deg, #00A99D, #0D7871)' : 'rgba(255, 255, 255, 0.5)', 
                  color: filter === tab.key ? 'white' : '#1a1a1a', 
                  boxShadow: filter === tab.key ? '0 4px 15px rgba(0, 169, 157, 0.3)' : 'none',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  transition: 'all 0.3s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: Settings, Select, Sort */}
          <div className="flex items-center gap-2" data-tour="todo-actions">
            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-3 rounded-xl transition-all hover:scale-105"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
              }}
              aria-label="To-Do Settings"
            >
              <svg className="w-5 h-5" style={{ color: '#1a1a1a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Bulk Select Toggle */}
            <button
              onClick={toggleBulkSelectMode}
              className={`flex items-center gap-2 px-4 py-3 text-sm transition-all rounded-xl ${bulkSelectMode ? 'text-white' : ''}`}
              style={{
                fontFamily: 'Montserrat Alternates',
                fontWeight: 500,
                background: bulkSelectMode ? 'linear-gradient(135deg, #FAA819, #E99502)' : 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                color: bulkSelectMode ? '#1a1a1a' : '#1a1a1a',
              }}
              aria-pressed={bulkSelectMode}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {bulkSelectMode ? 'Cancel' : 'Select'}
            </button>

            {/* Sort Dropdown */}
            <div className="relative" ref={sortDropdownRef}>
              <button 
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)} 
                className="flex items-center gap-2 px-6 py-3 text-sm transition-all"
                aria-expanded={sortDropdownOpen}
                aria-haspopup="true"
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  fontWeight: 500, 
                  borderRadius: '14px',
                  color: '#1a1a1a', 
                  background: 'rgba(255, 255, 255, 0.5)', 
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  transition: 'all 0.3s ease',
                }}
              >
                <svg className="w-4 h-4" style={{ color: '#1a1a1a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                {getSortLabel(sortBy)}
                <svg className={`w-4 h-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} style={{ color: '#1a1a1a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {sortDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-lg z-20 py-1" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)' }}>
                  {(['created', 'due_date', 'priority', 'alphabetical'] as SortOption[]).map((option) => (
                    <button key={option} onClick={() => handleSortChange(option)} className={`w-full px-4 py-2 text-left text-sm transition flex items-center justify-between ${sortBy === option ? 'bg-[#FAA819]/10' : 'hover:bg-[#fafafa]'}`} style={{ fontFamily: 'Inter', fontWeight: 500, color: sortBy === option ? '#FAA819' : '#2e2a27' }}>
                      {getSortLabel(option)}
                      {sortBy === option && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {bulkSelectMode && selectedTodos.size > 0 && (
          <div 
            className="mb-6 p-4 rounded-xl flex items-center justify-between"
            style={{
              background: 'linear-gradient(135deg, rgba(250,168,25,0.15) 0%, rgba(250,168,25,0.05) 100%)',
              border: '1px solid rgba(250,168,25,0.3)',
            }}
          >
            <span className="text-sm font-medium" style={{ fontFamily: 'Inter', color: '#1a1a1a' }}>
              {selectedTodos.size} task{selectedTodos.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={bulkCompleteTodos}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{
                  fontFamily: 'Montserrat Alternates',
                  background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                  color: 'white',
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Complete
              </button>
              <button
                onClick={bulkDeleteTodos}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 bg-red-500 text-white"
                style={{ fontFamily: 'Montserrat Alternates' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        )}
        {/* Todo List */}
        <div data-tour="todo-task-list">
        {Object.keys(groupedTodos).length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.6)', borderRadius: '20px' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.2), rgba(0, 169, 157, 0.2))' }}>
              <svg className="w-10 h-10 text-[#db2777]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <h3 className="text-xl mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>{filter === 'all' ? 'No to-dos yet' : filter === 'active' ? 'No active to-dos' : 'No completed to-dos'}</h3>
            <p className="mb-6" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>{filter === 'all' ? 'Create your first task or generate a GEO Linking Strategy.' : filter === 'active' ? 'Great job! All your tasks are complete.' : 'Complete some tasks to see them here.'}</p>
            {filter === 'all' && (
              <button onClick={() => setIsCreateModalOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, background: 'linear-gradient(135deg, #FAA819, #E99502)', color: 'white', boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create Your First Task
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedFolderKeys.map((projectTitle) => {
              const { project_id, todos: projectTodos, isFolder, folderColor } = groupedTodos[projectTitle];
              const isExpanded = expandedProjects.includes(projectTitle);
              const projectCompleted = projectTodos.filter(t => t.completed).length;
              const projectTotal = projectTodos.length;
              const progress = projectTotal > 0 ? Math.round((projectCompleted / projectTotal) * 100) : 0;

              return (
                <div key={projectTitle} className={`rounded-2xl transition-all duration-150 ${movingFolder?.name === projectTitle ? movingFolder.direction === 'up' ? '-translate-y-2' : 'translate-y-2' : ''}`} style={{ background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.6)', borderRadius: '20px' }}>
                  <div className="flex items-center gap-4 p-4 cursor-pointer rounded-2xl transition" onClick={() => toggleProjectExpanded(projectTitle)}>
                  {bulkSelectMode ? (
  <input
    type="checkbox"
    checked={projectTodos.length > 0 && projectTodos.every(t => selectedTodos.has(t.id))}
    onChange={(e) => { e.stopPropagation(); selectAllInFolder(projectTodos); }}
    onClick={(e) => e.stopPropagation()}
    className="w-5 h-5 rounded border-2 border-[#dedede] text-[#006b63] focus:ring-[#00A99D] cursor-pointer"
  />
) : (
  <button style={{ color: '#6b6560' }}><svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {/* Icon/badge to distinguish folder types */}
                        {isFolder || projectTitle === 'Personal Tasks' ? (
                          // Custom folder or Personal Tasks - show folder icon
                          <div className="flex items-center gap-1.5" title={projectTitle === 'Personal Tasks' ? 'Personal Tasks' : 'Custom folder'}>
                            <svg className="w-4 h-4" style={{ color: projectTitle === 'Personal Tasks' ? personalTasksColor : (folderColor || '#00A99D') }} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                            </svg>
                          </div>
                        ) : (
                          // Linking Strategy project - show link icon
                          <div className="flex items-center gap-1.5" title="Created from Linking Strategy">
                            <svg className="w-4 h-4 text-[#db2777]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </div>
                        )}
                        <h3 className="text-lg" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>{projectTitle}</h3>
                        {/* Type badge */}
                        {isFolder ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(0, 169, 157, 0.1)', color: '#006b63' }}>Custom</span>
                        ) : projectTitle !== 'Personal Tasks' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(219, 39, 119, 0.1)', color: '#db2777' }}>Linking Strategy</span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(0, 169, 157, 0.15)', color: '#006b63' }}>{projectCompleted}/{projectTotal}</span>
                      </div>
                      {projectTotal > 0 ? (
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 h-2 rounded-full overflow-hidden max-w-xs" style={{ background: 'rgba(255, 255, 255, 0.5)' }}><div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: 'linear-gradient(135deg, #00A99D, #0D7871)' }} /></div>
                          <span className="text-xs" style={{ color: '#4a4642' }}>{progress}%</span>
                        </div>
                      ) : <p className="text-xs mt-1" style={{ fontFamily: 'Inter', color: '#6b6560' }}>No tasks yet — click + New to add one</p>}
                    </div>
                    <div className="flex items-center gap-1" data-tour="todo-folder-controls">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          // Set the folder for new task and open modal
                          if (isFolder) {
                            const folder = folders.find(f => f.name === projectTitle);
                            setNewProjectId(folder ? `folder:${folder.id}:${projectTitle}` : '');
                          } else if (projectTitle === 'Personal Tasks') {
                            setNewProjectId('');
                          } else {
                            setNewProjectId(`project:${project_id}:${projectTitle}`);
                          }
                          setIsCreateModalOpen(true);
                        }} 
                        className="p-2 rounded-lg hover:bg-[#0D7871]/15 transition-colors" 
                        style={{ color: '#0D7871', background: 'rgba(0, 169, 157, 0.1)' }} 
                        title="Add task to this folder"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      {/* Edit button for custom folders and Personal Tasks */}
                      {(isFolder || projectTitle === 'Personal Tasks') && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (projectTitle === 'Personal Tasks') {
                              openEditFolderModal('personal', 'Personal Tasks', personalTasksColor, true);
                            } else {
                              const folder = folders.find(f => f.name === projectTitle);
                              if (folder) openEditFolderModal(folder.id, folder.name, folder.color || '#00A99D', false);
                            }
                          }} 
                          className="p-1.5 rounded hover:bg-white/50 transition-colors" 
                          style={{ color: '#6b6560' }} 
                          title="Edit folder"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); moveFolderInOrder(projectTitle, 'up'); }} className="p-1.5 rounded" style={{ color: '#6b6560' }} title="Move up"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
                      <button onClick={(e) => { e.stopPropagation(); moveFolderInOrder(projectTitle, 'down'); }} className="p-1.5 rounded" style={{ color: '#6b6560' }} title="Move down"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                      {project_id && !isFolder && <a href={`/project/${project_id}`} onClick={(e) => e.stopPropagation()} className="p-2 rounded-lg" style={{ color: '#6b6560' }} title="View Project"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>}
                      <button onClick={(e) => { e.stopPropagation(); if (isFolder) { const folder = folders.find(f => f.name === projectTitle); if (folder) deleteFolder(folder.id); } else deleteProjectTodos(projectTitle); }} className="p-2 rounded-lg" style={{ color: '#6b6560' }} title={isFolder ? "Delete Folder" : "Delete All Tasks"}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.4)' }}>
                      {projectTodos.length > 0 && projectTodos.map((todo, index) => (
                        <div 
                          key={todo.id} 
                          draggable={!bulkSelectMode && sortBy === 'created'}
                          onDragStart={(e) => handleDragStart(e, todo)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, todo.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, todo, projectTodos)}
                          data-tour={todo.task.includes('Welcome') ? 'todo-sample-task' : undefined}
                          className={`flex items-start gap-4 p-4 transition ${draggedTask?.id === todo.id ? 'opacity-50' : ''}`} 
                          style={{ 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.3)', 
                            background: dragOverTaskId === todo.id 
                              ? (dragOverPosition === 'above' ? 'linear-gradient(to bottom, rgba(0, 169, 157, 0.2) 0%, transparent 50%)' : 'linear-gradient(to top, rgba(0, 169, 157, 0.2) 0%, transparent 50%)')
                              : (todo.completed ? 'rgba(255, 255, 255, 0.2)' : 'transparent'), 
                            position: 'relative', 
                            zIndex: taskActionsId === todo.id ? 100 : 'auto',
                            cursor: !bulkSelectMode && sortBy === 'created' ? 'grab' : 'default',
                          }}
                        >
                          {/* Drag Handle - only show when sorting by created/manual */}
                          {!bulkSelectMode && sortBy === 'created' && (
                            <div className="flex items-center self-center cursor-grab active:cursor-grabbing" style={{ color: '#6b6560' }} title="Drag to reorder">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="9" cy="6" r="1.5" />
                                <circle cx="15" cy="6" r="1.5" />
                                <circle cx="9" cy="12" r="1.5" />
                                <circle cx="15" cy="12" r="1.5" />
                                <circle cx="9" cy="18" r="1.5" />
                                <circle cx="15" cy="18" r="1.5" />
                              </svg>
                            </div>
                          )}
                          {bulkSelectMode ? (
  <input
    type="checkbox"
    checked={selectedTodos.has(todo.id)}
    onChange={() => toggleSelectTodo(todo.id)}
    className="mt-1 w-5 h-5 rounded border-2 border-[#FAA819] text-[#db2777] focus:ring-[#FAA819] cursor-pointer"
  />
) : (
  <input
    type="checkbox"
    checked={todo.completed}
    onChange={() => toggleTodo(todo.id, todo.completed)}
    className="mt-1 w-5 h-5 rounded border-2 border-[#dedede] text-[#006b63] focus:ring-[#00A99D] cursor-pointer"
  />
)}
                          <div className="flex-1 min-w-0">
                            <button onClick={() => openEditModal(todo)} className={`text-left text-sm transition-colors ${todo.completed ? 'line-through' : ''}`} style={{ fontFamily: 'Inter', fontWeight: 500, color: todo.completed ? '#6b6560' : '#1a1a1a' }}>{todo.task}</button>
                            {todo.due_date && (
                              <div className="flex items-center gap-2 mt-1">
                                <button 
                                  onClick={() => openEditModal(todo)} 
                                  className={`flex items-center gap-1.5 hover:opacity-70 transition-opacity ${isOverdue(todo) ? 'text-red-500' : isDueToday(todo) ? 'text-[#db2777]' : ''}`}
                                  style={{ color: isOverdue(todo) || isDueToday(todo) ? undefined : '#6b6560' }}
                                  title="Click to edit due date"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                  <span className={`text-xs ${isOverdue(todo) ? 'font-medium' : isDueToday(todo) ? 'font-medium' : ''}`}>{isOverdue(todo) ? 'Overdue: ' : isDueToday(todo) ? 'Due today: ' : ''}{formatDueDateTime(todo)}</span>
                                </button>
                                {todo.reminder_at && (
                                  <button 
                                    onClick={() => openEditModal(todo)} 
                                    className="flex items-center gap-1 text-xs text-[#006b63] hover:opacity-70 transition-opacity"
                                    title="Click to edit reminder"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    Reminder set
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${todo.priority === 'high' ? 'bg-red-100 text-red-700' : todo.priority === 'medium' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}`}>{todo.priority}</span>
                            <div className="flex items-center gap-1" data-tour="todo-task-actions">
                            <div className="relative" ref={calendarDropdownId === todo.id ? calendarDropdownRef : null}>
                              <button onClick={(e) => { e.stopPropagation(); setCalendarDropdownId(calendarDropdownId === todo.id ? null : todo.id); }} className="p-1.5 rounded" style={{ color: '#6b6560' }} title="Add to calendar"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button>
                              {calendarDropdownId === todo.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg z-20 py-1" style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)' }}>
                                  <button onClick={() => { downloadICS(todo); setCalendarDropdownId(null); }} className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAA819]/10 flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a' }}><svg className="w-4 h-4" style={{ color: '#6b6560' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Download .ics</button>
                                  <a href={generateGoogleCalendarUrl(todo)} target="_blank" rel="noopener noreferrer" onClick={() => setCalendarDropdownId(null)} className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAA819]/10 flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a' }}><svg className="w-4 h-4" style={{ color: '#6b6560' }} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm0 22c-5.514 0-10-4.486-10-10S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10zm-1-7h2v2h-2v-2zm0-8h2v6h-2V7z"/></svg>Google Calendar</a>
                                  <a href={`https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(todo.task)}&body=${encodeURIComponent(`Project: ${todo.project_title}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => setCalendarDropdownId(null)} className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAA819]/10 flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a' }}><svg className="w-4 h-4" style={{ color: '#6b6560' }} viewBox="0 0 24 24" fill="currentColor"><path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h10.7q.45 0 .75.3.3.31.3.75V6h.7q.46 0 .8.33.33.33.33.8V12zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3-2.83v-1.5h-3zm-2-2.25v-7.5h-5.5v7.5z"/></svg>Outlook</a>
                                </div>
                              )}
                            </div>
                            <div className="relative" ref={taskActionsId === todo.id ? taskActionsRef : null}>
                              <button onClick={(e) => { e.stopPropagation(); setTaskActionsId(taskActionsId === todo.id ? null : todo.id); }} className="p-1.5 rounded" style={{ color: '#6b6560' }} title="More actions"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
                              {taskActionsId === todo.id && (
                                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg z-30 py-1 max-h-80 overflow-y-auto"  style={{
                                  background: 'white',
                                  border: '1px solid rgba(0,0,0,0.1)',
                                  minWidth: '180px',
                                  zIndex: 9999,
                                }}
                              >
                                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6560', borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>Move to</div>
                                  {getAvailableFolders(todo.project_title).length > 0 ? getAvailableFolders(todo.project_title).map((folder) => (
                                    <button key={`move-${folder.name}`} onClick={() => moveTaskToFolder(todo.id, folder.name, folder.id)} className="w-full px-4 py-2 text-left text-sm hover:bg-[#00A99D]/10 flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a' }}><svg className="w-4 h-4 text-[#006b63]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>{folder.name}</button>
                                  )) : <p className="px-4 py-2 text-xs italic" style={{ color: '#6b6560' }}>No other folders available</p>}
                                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide mt-1" style={{ color: '#6b6560', borderTop: '1px solid rgba(255, 255, 255, 0.3)', borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>Duplicate to</div>
                                  {getAllFoldersForDuplicate().map((folder) => (
                                    <button key={`dup-${folder.name}`} onClick={() => duplicateTaskToFolder(todo, folder.name, folder.id)} className="w-full px-4 py-2 text-left text-sm hover:bg-[#FAA819]/10 flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a' }}><svg className="w-4 h-4 text-[#db2777]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>{folder.name}{folder.name === todo.project_title && <span className="text-xs ml-1" style={{ color: '#6b6560' }}>(current)</span>}</button>
                                  ))}
                                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.3)', marginTop: '4px' }}>
                                    <button onClick={() => { deleteTodo(todo.id); setTaskActionsId(null); }} className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2" style={{ fontFamily: 'Inter', fontWeight: 500 }}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Delete task</button>
                                  </div>
                                </div>
                              )}
                            </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add task button at bottom of folder */}
                      <button
                        onClick={() => {
                          if (isFolder) {
                            const folder = folders.find(f => f.name === projectTitle);
                            setNewProjectId(folder ? `folder:${folder.id}:${projectTitle}` : '');
                          } else if (projectTitle === 'Personal Tasks') {
                            setNewProjectId('');
                          } else {
                            setNewProjectId(`project:${project_id}:${projectTitle}`);
                          }
                          setIsCreateModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 p-3 text-sm transition-colors hover:bg-[#00A99D]/5 rounded-b-2xl"
                        style={{ color: '#0D7871', fontFamily: 'Inter', fontWeight: 500 }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add task
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* To-Do Page Tour */}
      {/* Tour action handler for opening/closing modals */}
      <PageTour
        
  isOpen={showTour}
  onClose={closeTour}
  onComplete={completeTour}
  onSkip={skipTour}
  steps={todoTourSteps}
  tourName="To-Do Tour"
  onAction={(action) => {
          if (action === 'openTaskModal') {
            // Find the sample task and open its edit modal
            const sampleTask = todos.find(t => t.task.includes('Welcome'));
            if (sampleTask) {
              openEditModal(sampleTask);
            }
          } else if (action === 'closeTaskModal') {
            setIsEditModalOpen(false);
            setEditingTodo(null);
          }
        }}
      />

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md max-h-[90vh] flex flex-col" style={{ background: 'rgba(255, 255, 255, 0.92)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)', overflow: 'hidden' }}>
            <div className="p-6 shrink-0" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700, color: '#1a1a1a' }}>Create New Task</h2>
                <button onClick={() => { setIsCreateModalOpen(false); resetCreateForm(); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.05)' }}><svg className="w-5 h-5" style={{ color: '#1a1a1a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Task <span className="text-red-500">*</span></label>
                <textarea value={newTask} onChange={(e) => setNewTask(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl focus:outline-none resize-none" style={{ fontFamily: 'Inter', fontWeight: 500, background: 'rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#1a1a1a' }} placeholder="What needs to be done?" autoFocus />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Folder <span style={{ color: '#737373', fontWeight: 400 }}>(optional)</span></label>
                <select value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)} className="w-full px-4 py-3 rounded-xl focus:outline-none" style={{ fontFamily: 'Inter', fontWeight: 500, background: 'rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#1a1a1a' }}>
                  <option value="">Personal Tasks (No Folder)</option>
                  {folders.length > 0 && <optgroup label="My Folders">{folders.map(folder => <option key={`folder-${folder.id}`} value={`folder:${folder.id}:${folder.name}`}>{folder.name}</option>)}</optgroup>}
                  {projects.length > 0 && <optgroup label="From Linking Strategies">{projects.map(project => <option key={`project-${project.id}`} value={`project:${project.id}:${getProjectName(project)}`}>{getProjectName(project)}</option>)}</optgroup>}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Priority</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((priority) => (
                    <button key={priority} onClick={() => setNewPriority(priority)} className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold capitalize transition ${newPriority === priority ? priority === 'high' ? 'bg-red-100 text-red-700 border-2 border-red-300' : priority === 'medium' ? 'bg-gray-100 text-gray-700 border-2 border-gray-300' : 'bg-green-100 text-green-700 border-2 border-green-300' : ''}`} style={{ fontFamily: 'Montserrat Alternates', background: newPriority !== priority ? 'rgba(0, 0, 0, 0.03)' : undefined, border: newPriority !== priority ? '1px solid rgba(0, 0, 0, 0.1)' : undefined, color: newPriority !== priority ? '#525252' : undefined }}>{priority}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Due Date <span style={{ color: '#737373', fontWeight: 400 }}>(optional)</span></label>
                <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-full px-4 py-3 rounded-xl focus:outline-none" style={{ fontFamily: 'Inter', fontWeight: 500, background: 'rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#1a1a1a' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Due Time <span style={{ color: '#737373', fontWeight: 400 }}>(optional)</span></label>
                <input type="time" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)} className="w-full px-4 py-3 rounded-xl focus:outline-none" style={{ fontFamily: 'Inter', fontWeight: 500, background: 'rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#1a1a1a' }} />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Set Reminder</label>
                <select value={newReminder} onChange={(e) => setNewReminder(e.target.value)} className="w-full px-4 py-3 rounded-xl focus:outline-none" style={{ fontFamily: 'Inter', fontWeight: 500, background: 'rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#1a1a1a' }} disabled={!newDueDate}>
                  <option value="none">No reminder</option><option value="15min">15 minutes before</option><option value="1hour">1 hour before</option><option value="1day">1 day before</option><option value="custom">Custom time</option>
                </select>
                {!newDueDate && <p className="text-xs mt-1" style={{ fontFamily: 'Inter', color: '#737373' }}>Set a due date first to enable reminders</p>}
              </div>
              {newReminder === 'custom' && (
                <div>
                  <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Custom Reminder Time</label>
                  <input type="datetime-local" value={newCustomReminder} onChange={(e) => setNewCustomReminder(e.target.value)} className="w-full px-4 py-3 rounded-xl focus:outline-none" style={{ fontFamily: 'Inter', fontWeight: 500, background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.6)', color: '#1a1a1a' }} />
                </div>
              )}
            </div>
            <div className="p-6 flex justify-end gap-3 shrink-0" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <button onClick={() => { setIsCreateModalOpen(false); resetCreateForm(); }} className="px-6 py-3 rounded-xl" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, background: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#1a1a1a' }}>Cancel</button>
              <button onClick={createTask} disabled={isCreating || !newTask.trim()} className="px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, background: 'linear-gradient(135deg, #FAA819, #E99502)', color: 'white', boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)' }}>
                {isCreating ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Creating...</> : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingTodo && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md max-h-[90vh] flex flex-col" data-tour="task-modal" style={{ background: 'rgba(255, 255, 255, 0.92)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)', overflow: 'hidden' }}>
            <div className="p-6 shrink-0" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700, color: '#1a1a1a' }}>Edit Task</h2>
                <button onClick={() => { setIsEditModalOpen(false); setEditingTodo(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.05)' }}><svg className="w-5 h-5" style={{ color: '#1a1a1a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <p className="text-xs mt-1" style={{ fontFamily: 'Inter', color: '#737373' }}>Project: {editingTodo.project_title}</p>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Task</label>
                <textarea value={editTask} onChange={(e) => setEditTask(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl focus:outline-none resize-none" style={{ fontFamily: 'Inter', fontWeight: 500, background: 'rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#1a1a1a' }} placeholder="What needs to be done?" />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Folder</label>
                <select value={editFolderId} onChange={(e) => setEditFolderId(e.target.value)} className="w-full px-4 py-3 rounded-xl focus:outline-none" style={{ fontFamily: 'Inter', fontWeight: 500, background: 'rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#1a1a1a' }}>
                  <option value="">Personal Tasks (No Folder)</option>
                  {folders.length > 0 && <optgroup label="My Folders">{folders.map(folder => <option key={`folder-${folder.id}`} value={`folder:${folder.id}:${folder.name}`}>{folder.name}</option>)}</optgroup>}
                  {projects.length > 0 && <optgroup label="From Linking Strategies">{projects.map(project => <option key={`project-${project.id}`} value={`project:${project.id}:${getProjectName(project)}`}>{getProjectName(project)}</option>)}</optgroup>}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Priority</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((priority) => (
                    <button key={priority} onClick={() => setEditPriority(priority)} className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold capitalize transition ${editPriority === priority ? priority === 'high' ? 'bg-red-100 text-red-700 border-2 border-red-300' : priority === 'medium' ? 'bg-gray-100 text-gray-700 border-2 border-gray-300' : 'bg-green-100 text-green-700 border-2 border-green-300' : ''}`} style={{ fontFamily: 'Montserrat Alternates', background: editPriority !== priority ? 'rgba(0, 0, 0, 0.03)' : undefined, border: editPriority !== priority ? '1px solid rgba(0, 0, 0, 0.1)' : undefined, color: editPriority !== priority ? '#525252' : undefined }}>{priority}</button>
                  ))}
                </div>
              </div>
              <div data-tour="task-due-date">
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Due Date</label>
                <input 
                  type="date" 
                  value={editDueDate} 
                  onChange={(e) => setEditDueDate(e.target.value)} 
                  className="w-full px-4 py-3 rounded-xl focus:outline-none" 
                  style={{ 
                    fontFamily: 'Inter', 
                    fontWeight: 500, 
                    background: editDueDate ? 'rgba(0, 0, 0, 0.03)' : 'rgba(250, 168, 25, 0.08)', 
                    border: editDueDate ? '1px solid rgba(0, 0, 0, 0.1)' : '2px dashed rgba(250, 168, 25, 0.4)', 
                    color: '#1a1a1a' 
                  }} 
                />
                {!editDueDate && (
                  <p className="text-xs mt-1.5 flex items-center gap-1" style={{ fontFamily: 'Inter', color: '#db2777' }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Add a due date to set reminders
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Due Time <span style={{ color: '#737373', fontWeight: 400 }}>(optional)</span></label>
                <input 
                  type="time" 
                  value={editDueTime} 
                  onChange={(e) => setEditDueTime(e.target.value)} 
                  disabled={!editDueDate}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                  style={{ 
                    fontFamily: 'Inter', 
                    fontWeight: 500, 
                    background: 'rgba(0, 0, 0, 0.03)', 
                    border: '1px solid rgba(0, 0, 0, 0.1)', 
                    color: '#1a1a1a' 
                  }} 
                />
                {!editDueDate && (
                  <p className="text-xs mt-1.5" style={{ fontFamily: 'Inter', color: '#737373' }}>
                    Set a due date first to add a time
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Set Reminder</label>
                <select 
                  value={editReminder} 
                  onChange={(e) => setEditReminder(e.target.value)} 
                  disabled={!editDueDate}
                  className="w-full px-4 py-3 rounded-xl focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                  style={{ 
                    fontFamily: 'Inter', 
                    fontWeight: 500, 
                    background: !editDueDate ? 'rgba(0, 0, 0, 0.02)' : 'rgba(0, 0, 0, 0.03)', 
                    border: '1px solid rgba(0, 0, 0, 0.1)', 
                    color: !editDueDate ? '#737373' : '#2e2a27' 
                  }}
                >
                  <option value="none">No reminder</option><option value="15min">15 minutes before</option><option value="1hour">1 hour before</option><option value="1day">1 day before</option><option value="custom">Custom time</option>
                </select>
                {!editDueDate && (
                  <p className="text-xs mt-1.5 flex items-center gap-1 p-2 rounded-lg" style={{ fontFamily: 'Inter', color: '#db2777', background: 'rgba(219, 39, 119, 0.1)' }}>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>A due date is required to set a reminder</span>
                  </p>
                )}
              </div>
              {editReminder === 'custom' && (
                <div>
                  <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Custom Reminder Time</label>
                  <input type="datetime-local" value={editCustomReminder} onChange={(e) => setEditCustomReminder(e.target.value)} className="w-full px-4 py-3 rounded-xl focus:outline-none" style={{ fontFamily: 'Inter', fontWeight: 500, background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.6)', color: '#1a1a1a' }} />
                </div>
              )}
            </div>
            <div className="p-6 flex justify-end gap-3 shrink-0" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <button onClick={() => { setIsEditModalOpen(false); setEditingTodo(null); }} className="px-6 py-3 rounded-xl" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, background: 'rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#1a1a1a' }}>Cancel</button>
              <button onClick={saveEditTodo} disabled={isSaving || !editTask.trim()} className="px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, background: 'linear-gradient(135deg, #FAA819, #E99502)', color: 'white', boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)' }}>
                {isSaving ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

{/* Settings Modal */}
{isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md" style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.18)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' }}>
            <div className="p-6" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700, color: '#1a1a1a' }}>To-Do Settings</h2>
                <button onClick={() => setIsSettingsModalOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.5)' }}>
                  <svg className="w-5 h-5" style={{ color: '#1a1a1a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Default Sort */}
              <div>
                <label className="block text-sm mb-3" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>Default Sort Order</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'created', label: 'Date Created' },
                    { value: 'due_date', label: 'Due Date' },
                    { value: 'priority', label: 'Priority' },
                    { value: 'alphabetical', label: 'Alphabetical' },
                  ] as { value: SortOption; label: string }[]).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${sortBy === option.value ? 'text-white' : ''}`}
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: 500,
                        background: sortBy === option.value ? 'linear-gradient(135deg, #00A99D, #0D7871)' : 'rgba(255, 255, 255, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.6)',
                        color: sortBy === option.value ? 'white' : '#2e2a27',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#1a1a1a]/50 mt-2" style={{ fontFamily: 'Inter' }}>Your preference is saved automatically</p>
              </div>

              {/* Default Filter */}
              <div>
                <label className="block text-sm mb-3" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>Default Filter</label>
                <div className="flex gap-2">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'active', label: 'Active' },
                    { key: 'completed', label: 'Completed' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key as typeof filter)}
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${filter === tab.key ? 'text-white' : ''}`}
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: 500,
                        background: filter === tab.key ? 'linear-gradient(135deg, #00A99D, #0D7871)' : 'rgba(255, 255, 255, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.6)',
                        color: filter === tab.key ? 'white' : '#2e2a27',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manage Folders */}
              <div>
                <label className="block text-sm mb-3" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>Your Folders</label>
                {folders.length > 0 ? (
                  <div className="space-y-2">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.6)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: folder.color }} />
                          <span className="text-sm" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#1a1a1a' }}>{folder.name}</span>
                        </div>
                        <button
                          onClick={() => deleteFolder(folder.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Delete folder"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#1a1a1a]/50" style={{ fontFamily: 'Inter' }}>No custom folders yet</p>
                )}
                <button
                  onClick={() => { setIsSettingsModalOpen(false); setIsFolderModalOpen(true); }}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    fontFamily: 'Montserrat Alternates',
                    background: 'rgba(0, 169, 157, 0.1)',
                    border: '1px solid rgba(0, 169, 157, 0.3)',
                    color: '#006b63',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Folder
                </button>
              </div>
            </div>

            <div className="p-6" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="w-full py-3 rounded-xl font-medium"
                style={{
                  fontFamily: 'Montserrat Alternates',
                  background: 'linear-gradient(135deg, #FAA819, #E99502)',
                  color: 'white',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm" style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.18)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' }}>
            <div className="p-6" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700, color: '#1a1a1a' }}>Create New Folder</h2>
                <button onClick={() => { setIsFolderModalOpen(false); setNewFolderName(''); setNewFolderColor('#FAA819'); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.5)' }}><svg className="w-5 h-5" style={{ color: '#1a1a1a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Folder Name <span className="text-red-500">*</span></label>
                <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full px-4 py-3 rounded-xl focus:outline-none" style={{ fontFamily: 'Inter', fontWeight: 500, background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.6)', color: '#1a1a1a' }} placeholder="e.g., Work, Personal, Q1 Goals..." autoFocus />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Color</label>
                <div className="flex flex-wrap gap-2">
                  {folderColors.map((color) => (
                    <button key={color.value} onClick={() => setNewFolderColor(color.value)} className={`w-10 h-10 rounded-lg transition-all ${newFolderColor === color.value ? 'ring-2 ring-offset-2 ring-[#2e2a27] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: color.value }} title={color.label} />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <button onClick={() => { setIsFolderModalOpen(false); setNewFolderName(''); setNewFolderColor('#FAA819'); }} className="px-6 py-3 rounded-xl" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#1a1a1a' }}>Cancel</button>
              <button onClick={createFolder} disabled={isCreatingFolder || !newFolderName.trim()} className="px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, background: 'linear-gradient(135deg, #00A99D, #0D7871)', color: 'white', boxShadow: '0 4px 15px rgba(0, 169, 157, 0.3)' }}>
                {isCreatingFolder ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Creating...</> : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Folder Modal */}
      {isEditFolderModalOpen && editingFolderData && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm" style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.18)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' }}>
            <div className="p-6" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700, color: '#1a1a1a' }}>
                  {editingFolderData.isPersonalTasks ? 'Edit Personal Tasks' : 'Edit Folder'}
                </h2>
                <button onClick={() => { setIsEditFolderModalOpen(false); setEditingFolderData(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.5)' }}>
                  <svg className="w-5 h-5" style={{ color: '#1a1a1a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Only show name field for custom folders, not Personal Tasks */}
              {!editingFolderData.isPersonalTasks && (
                <div>
                  <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Folder Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={editFolderName} 
                    onChange={(e) => setEditFolderName(e.target.value)} 
                    className="w-full px-4 py-3 rounded-xl focus:outline-none" 
                    style={{ fontFamily: 'Inter', fontWeight: 500, background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.6)', color: '#1a1a1a' }} 
                    placeholder="e.g., Work, Personal, Q1 Goals..." 
                    autoFocus 
                  />
                </div>
              )}
              <div>
                <label className="block text-sm mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#1a1a1a' }}>Color</label>
                <div className="flex flex-wrap gap-2">
                  {folderColors.map((color) => (
                    <button 
                      key={color.value} 
                      onClick={() => setEditFolderColor(color.value)} 
                      className={`w-10 h-10 rounded-lg transition-all ${editFolderColor === color.value ? 'ring-2 ring-offset-2 ring-[#2e2a27] scale-110' : 'hover:scale-105'}`} 
                      style={{ backgroundColor: color.value }} 
                      title={color.label} 
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <button 
                onClick={() => { setIsEditFolderModalOpen(false); setEditingFolderData(null); }} 
                className="px-6 py-3 rounded-xl" 
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(0, 0, 0, 0.1)', color: '#1a1a1a' }}
              >
                Cancel
              </button>
              <button 
                onClick={updateFolder} 
                disabled={isSavingFolder || (!editingFolderData.isPersonalTasks && !editFolderName.trim())} 
                className="px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50" 
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, background: 'linear-gradient(135deg, #00A99D, #0D7871)', color: 'white', boxShadow: '0 4px 15px rgba(0, 169, 157, 0.3)' }}
              >
                {isSavingFolder ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
      </main>
    </Layout>
  );
}
// Loading component for Suspense fallback
function TodosLoading() {
  return (
    <Layout activeNav="to-do">
      <main className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div 
            className="w-12 h-12 rounded-full mx-auto mb-4 animate-pulse"
            style={{ 
              background: 'linear-gradient(135deg, #FAA819, #E99502)',
            }}
          />
          <p 
            className="text-base"
            style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
          >
            Loading your tasks...
          </p>
        </div>
      </main>
    </Layout>
  );
}

// Main export wrapped in Suspense
export default function TodosPage() {
  return (
    <Suspense fallback={<TodosLoading />}>
      <TodosPageContent />
    </Suspense>
  );
}