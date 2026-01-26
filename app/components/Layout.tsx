'use client';

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import MobileNudge from './MobileNudge';
import EmailConfirmationBanner from '../components/EmailConfirmationBanner';

type NavItem = 'workspace' | 'my-projects' | 'tools' | 'linking-strategy' | 'schema-studio' | 'learn' | 'to-do' | 'support' | 'settings' | 'logout' | 'geo-blueprint';

interface LayoutProps {
  children: ReactNode;
  activeNav: NavItem;
  pageBackground?: string; // Allow pages to set custom background
  pageTitle?: string; // Optional page title with gradient styling
  pageSubtitle?: string; // Optional subtitle under the title
}

interface Notification {
  id: string;
  user_id: string;
  todo_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  profile_photo: string | null;
}

interface WeatherData {
  temperature: number;
  condition: string;
  city: string;
  state: string;
}

interface SearchResult {
  id: string;
  title: string;
  type: 'todo' | 'project';
  metadata?: string;
  link?: string;
}

interface NavItemConfig {
  key: string;
  label: string;
  href: string;
  icon: string;
  submenu?: { key: string; label: string; href: string; icon: string }[];
}

// Note: Font faces and scrollbar-hide styles should be in globals.css


function NotificationCenter({ isExpanded }: { isExpanded: boolean }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Try to generate any new notifications first (if RPC exists)
      try {
        await supabase.rpc('generate_task_notifications');
      } catch (err) {
        // RPC may not exist, that's okay
      }

      // Fetch notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.length);
      }
      setLoading(false);
    };

    fetchNotifications();

    // Real-time subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    // Refresh every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    setNotifications(notifications.filter(n => n.id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'due_today':
        return (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'reminder':
        return (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
      default: // due_tomorrow
        return (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
    }
  };

  // Collapsed sidebar view - just show bell icon
  if (!isExpanded) {
    return (
      <div className="flex justify-center pb-4">
        <a data-tour="notifications" href="/to-do" className="relative p-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 hover:bg-white/25 transition-colors">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E99502] rounded-full flex items-center justify-center text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </a>
      </div>
    );
  }

  // Expanded sidebar view - show full notification panel
  return (
    <div data-tour="notifications" className="px-6 pb-4" style={{ width: '288px' }}>
      <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Montserrat Alternates' }}>Notifications</h3>
          {notifications.length > 0 && (
            <button onClick={markAllAsRead} className="text-xs text-white/70 hover:text-white transition-colors" style={{ fontFamily: 'Inter' }}>
              Clear all
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-4 text-white/70">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <p className="text-xs" style={{ fontFamily: 'Inter' }}>All caught up!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className="flex items-start gap-3 p-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors cursor-pointer group"
                onClick={() => markAsRead(notification.id)}
              >
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ fontFamily: 'Montserrat Alternates' }}>{notification.title}</p>
                  <p className="text-[10px] text-white/70 truncate" style={{ fontFamily: 'Inter' }}>{notification.message}</p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 text-white/50 hover:text-white transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <a 
          href="/to-do" 
          className="mt-3 block text-center text-xs text-white/70 hover:text-white transition-colors py-2 border-t border-white/10"
          style={{ fontFamily: 'Inter' }}
        >
          View all tasks →
        </a>
      </div>
    </div>
  );
}


function HeaderSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const searchResults: SearchResult[] = [];

      // Search todos
      const { data: todos } = await supabase
        .from('todos')
        .select('id, task, folder')
        .eq('user_id', user.id)
        .ilike('task', `%${query}%`)
        .limit(5);

      if (todos) {
        todos.forEach(todo => {
          searchResults.push({
            id: todo.id,
            title: todo.task,
            type: 'todo',
            metadata: todo.folder || 'Uncategorized',
            link: '/to-do'
          });
        });
      }

      // Search projects
      const { data: projects } = await supabase
        .from('linking_strategy_maps')
        .select('id, project_title, browser_url')
        .eq('user_id', user.id)
        .ilike('project_title', `%${query}%`)
        .limit(5);

      if (projects) {
        projects.forEach(project => {
          searchResults.push({
            id: project.id,
            title: project.project_title || 'Untitled Project',
            type: 'project',
            link: `/my-projects/${project.id}`
          });
        });
      }

      setResults(searchResults);
      setLoading(false);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div ref={searchRef} className="relative w-72">
      <div 
        className="flex items-center gap-3 px-4 py-2 rounded-2xl transition-all"
        style={{
          background: 'rgba(255, 255, 255, 0.35)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div 
          className="shrink-0 flex items-center justify-center"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
          }}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search projects and tasks..."
          className="flex-1 bg-transparent outline-none text-sm text-[#2e2a27] placeholder-[#2e2a27]/50"
          style={{ fontFamily: 'Inter', fontWeight: 500 }}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
          }}
        >
          {loading ? (
            <div className="p-4 text-center">
              <div className="w-5 h-5 border-2 border-[#00A99D]/30 border-t-[#00A99D] rounded-full animate-spin mx-auto" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-[#2e2a27]/60" style={{ fontFamily: 'Inter' }}>
              No results found
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {results.map((result) => (
                <a
                  key={result.id}
                  href={result.link}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#00A99D]/10 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: result.type === 'project' 
                        ? 'linear-gradient(135deg, #FAA819, #E99502)' 
                        : 'linear-gradient(135deg, #00A99D, #0D7871)',
                    }}
                  >
                    {result.type === 'project' ? (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2e2a27] truncate" style={{ fontFamily: 'Montserrat Alternates' }}>
                      {result.title}
                    </p>
                    {result.metadata && (
                      <p className="text-xs text-[#2e2a27]/60 truncate" style={{ fontFamily: 'Inter' }}>
                        {result.metadata}
                      </p>
                    )}
                  </div>
                  <span 
                    className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: result.type === 'project' ? 'rgba(250, 168, 25, 0.15)' : 'rgba(0, 169, 157, 0.15)',
                      color: result.type === 'project' ? '#E99502' : '#00A99D',
                      fontFamily: 'Inter',
                      fontWeight: 600,
                    }}
                  >
                    {result.type === 'project' ? 'Project' : 'Task'}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default function Layout({ children, activeNav, pageBackground, pageTitle, pageSubtitle }: LayoutProps) {
  const router = useRouter();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showPhoto, setShowPhoto] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [sidebarMode, setSidebarMode] = useState<'expanded' | 'collapsed' | 'always-collapsed'>('expanded');
  const [isHovered, setIsHovered] = useState(false);
  const [sidebarTop, setSidebarTop] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    };
    checkAuth();

    const saved = localStorage.getItem('sidebarMode');
    if (saved === 'expanded' || saved === 'collapsed' || saved === 'always-collapsed') {
      setSidebarMode(saved);
    }
  }, [router]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, profile_photo')
          .eq('id', user.id)
          .single();
        if (profile) setUserProfile(profile);
      }
    };

    fetchUserProfile();

    if (typeof window !== 'undefined') {
      const preference = localStorage.getItem('showPhotoOrInitials');
      setShowPhoto(preference !== 'initials');
    }

    const handleStorageChange = () => {
      const preference = localStorage.getItem('showPhotoOrInitials');
      setShowPhoto(preference !== 'initials');
    };
    window.addEventListener('storage', handleStorageChange);
    
    const checkPhotoPreference = () => {
      const preference = localStorage.getItem('showPhotoOrInitials');
      setShowPhoto(preference !== 'initials');
    };
    const interval = setInterval(checkPhotoPreference, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const formatDate = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return now.toLocaleDateString('en-US', options);
    };

    setCurrentDate(formatDate());

    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const midnightTimeout = setTimeout(() => setCurrentDate(formatDate()), msUntilMidnight);
    return () => clearTimeout(midnightTimeout);
  }, []);



  useEffect(() => {
    const handleModeChange = (e: CustomEvent) => setSidebarMode(e.detail);
    window.addEventListener('sidebarModeChange', handleModeChange as EventListener);
    return () => window.removeEventListener('sidebarModeChange', handleModeChange as EventListener);
  }, []);

  // Determine if sidebar should be wide
  // - 'expanded': always wide
  // - 'collapsed': wide on hover
  // - 'always-collapsed': never wide
  const isExpanded = sidebarMode === 'expanded' || (sidebarMode === 'collapsed' && isHovered);

  useEffect(() => {
    const handleScroll = () => {
      if (!sidebarRef.current) return;
      const sidebarHeight = sidebarRef.current.offsetHeight;
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;
      if (sidebarHeight > viewportHeight) {
        const maxTop = sidebarHeight - viewportHeight;
        const newTop = Math.min(scrollY, maxTop);
        setSidebarTop(-newTop);
      } else {
        setSidebarTop(0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isExpanded]);

  // Updated nav items with Tools dropdown
  const navItems: NavItemConfig[] = [
    { key: 'workspace', label: 'Workspace', href: '/', icon: '/icons/home.svg' },
    { key: 'my-projects', label: 'My Projects', href: '/my-projects', icon: '/icons/projects.svg' },
    { key: 'geo-blueprint', label: 'GEO Blueprint', href: '/geo-blueprint', icon: '/icons/blueprint.svg' },
    { 
      key: 'tools', 
      label: 'Tools', 
      href: '#', 
      icon: '/icons/tools.svg',
      submenu: [
        { key: 'analytics', label: 'Analytics', href: '/tools/analytics', icon: '/icons/analytics.svg' },
        { key: 'linking-strategy', label: 'Linking Strategy', href: '/tools/linking-strategy', icon: '/icons/link.svg' },
        { key: 'schema-studio', label: 'Schema Studio', href: '/tools/schema-studio', icon: '/icons/schema.svg' },
      ]
    },
    { key: 'learn', label: 'Learn', href: '/learn', icon: '/icons/learn.svg?v=3' },
    { key: 'to-do', label: 'To-Do', href: '/to-do', icon: '/icons/todo.svg' },
    { key: 'support', label: 'Support', href: '/support', icon: '/icons/support.svg' },
    { key: 'settings', label: 'Settings', href: '/settings', icon: '/icons/settings.svg' },
    { key: 'logout', label: 'Logout', href: '/logout', icon: '/icons/logout.svg' },
  ];

  const [expandedNavItem, setExpandedNavItem] = useState<string | null>(null);

  // Check if Tools should be highlighted (when a child route is active)
  const isToolsActive = activeNav === 'tools' || activeNav === 'linking-strategy' || activeNav === 'schema-studio';

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: 'url(/images/app-background.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="w-12 h-12 border-4 border-[#FAA819] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/images/app-background.svg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            zIndex: -1,
          }}
        />
        <div className="flex" style={{ minHeight: '100vh' }}>
          <div className="w-72 bg-linear-to-b from-[#FAA819] via-[#E99502] via-30% to-[#00A99D] to-70% flex flex-col">
            <div className="flex-1" />
          </div>
          <div className="flex-1 flex flex-col">
            <header 
              className="relative z-50"
              style={{
                background: 'rgba(255, 255, 255, 0.65)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '2px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1), 0 1px 0 rgba(255, 255, 255, 0.3) inset, 0 -1px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <div className="flex items-center justify-between p-6 gap-6">
                <div className="h-12 w-32 bg-gray-100 rounded animate-pulse" />
                <div className="flex-1 text-center">
                  <div className="h-6 w-64 mx-auto bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-10 w-64 bg-gray-100 rounded animate-pulse" />
              </div>
            </header>
            <div className="flex-1 p-8">
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Fixed gradient background - stays in place while content scrolls */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url(/images/app-background.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          zIndex: -1,
        }}
      />
      
      <div className="flex" style={{ minHeight: '100vh' }}>

        <div 
    ref={sidebarRef}
    data-tour="sidebar"
    className={`bg-linear-to-b from-[#FAA819] via-[#E99502] via-30% to-[#00A99D] to-70% flex flex-col sticky ${isExpanded ? 'w-72' : 'w-[100px]'}`}
        style={{ 
          top: `${sidebarTop}px`, 
          height: 'fit-content', 
          minHeight: '100vh',
          transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={() => sidebarMode === 'collapsed' && setIsHovered(true)}
        onMouseLeave={() => sidebarMode === 'collapsed' && setIsHovered(false)}
      >
        <div className={`p-6 border-b border-white/20 flex ${!isExpanded ? 'justify-center' : 'justify-end'}`}>
          <button 
            onClick={() => {
              // Cycle through modes: expanded -> collapsed -> always-collapsed -> expanded
              let newMode: 'expanded' | 'collapsed' | 'always-collapsed';
              if (sidebarMode === 'expanded') {
                newMode = 'collapsed';
              } else if (sidebarMode === 'collapsed') {
                newMode = 'always-collapsed';
              } else {
                newMode = 'expanded';
              }
              setSidebarMode(newMode);
              localStorage.setItem('sidebarMode', newMode);
              window.dispatchEvent(new CustomEvent('sidebarModeChange', { detail: newMode }));
            }}
            className="text-white/80 w-7 h-7 hover:text-white transition-colors"
            title={
              sidebarMode === 'expanded' 
                ? 'Switch to hover-expand mode' 
                : sidebarMode === 'collapsed' 
                  ? 'Switch to always-collapsed mode'
                  : 'Switch to always-expanded mode'
            }
          >
            <img 
              src={!isExpanded ? "/icons/double-right-caret.svg" : "/icons/double-left-caret.svg"}
              alt={!isExpanded ? "Expand" : "Collapse"}
              className="w-full h-full"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-hidden">
  {navItems.map((item) => {
    const isActive = item.submenu 
      ? (activeNav === item.key || item.submenu.some(sub => sub.key === activeNav))
      : activeNav === item.key;
    const isDropdownOpen = expandedNavItem === item.key;
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    
    // Determine data-tour attribute
    const dataTour = item.key === 'to-do' ? 'todo-nav' : item.key === 'settings' ? 'settings-nav' : item.key === 'my-projects' ? 'sidebar-my-projects' : item.key === 'tools' ? 'tools-nav' : undefined;
    
    // Items with submenus
    if (hasSubmenu) {
      return (
        <div key={item.key} data-tour={dataTour}>
          <div 
            className={`relative py-4 text-white font-medium flex items-center cursor-pointer transition-all duration-300 ${!isExpanded ? 'justify-center px-2' : 'gap-3 px-4'}`}
            style={{
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              border: isActive ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid transparent',
              boxShadow: isActive ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none',
              borderRadius: '15px'
            }}
            onClick={() => {
              if (isExpanded) {
                setExpandedNavItem(isDropdownOpen ? null : item.key);
              }
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'rgba(0, 169, 157, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }
            }}
          >
            <img src={item.icon} alt={item.label} className="w-7 h-7 max-w-7 max-h-7 shrink-0 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            <span className={`whitespace-nowrap transition-all duration-300 flex-1 ${!isExpanded ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>{item.label}</span>
            {isExpanded && (
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
          
          {/* Submenu */}
          {isExpanded && isDropdownOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {item.submenu!.map((subItem) => {
                const isSubActive = activeNav === subItem.key;
                return (
                  <a 
                    key={subItem.key} 
                    href={subItem.href}
                    className={`py-3 text-white/90 flex items-center gap-3 px-4 rounded-xl transition-all duration-200 ${isSubActive ? 'bg-white/15 border border-white/20' : 'hover:bg-white/10'}`}
                  >
                    <img src={subItem.icon} alt={subItem.label} className="w-5 h-5 shrink-0" style={{ filter: 'brightness(0) invert(1)' }} />
                    <span className="text-sm">{subItem.label}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      );
    }
   
    // Regular items without submenus
    if (isActive) {
      return (
        <div 
          key={item.key}
          data-tour={dataTour}
          className={`relative py-4 text-white font-medium flex items-center transition-all duration-300 ${!isExpanded ? 'justify-center px-2' : 'gap-3 px-4'}`}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            borderRadius: '15px'
          }}
        >
        <img src={item.icon} alt={item.label} className="w-7 h-7 max-w-7 max-h-7 shrink-0 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          <span className={`whitespace-nowrap transition-all duration-300 ${!isExpanded ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>{item.label}</span>
        </div>
      );
    }
    
    return (
      <a key={item.key} href={item.href} className="block" data-tour={dataTour}>
        <div 
          className={`py-4 text-white/90 cursor-pointer flex items-center rounded-[15px] transition-all duration-300 ${!isExpanded ? 'justify-center px-2' : 'gap-3 px-4'}`}
          style={{ border: '1px solid transparent', boxShadow: 'none' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 169, 157, 0.25)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <img src={item.icon} alt={item.label} className="w-7 h-7 shrink-0" style={{ filter: 'brightness(0) invert(1)' }} />
          <span className={`whitespace-nowrap transition-all duration-300 ${!isExpanded ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>{item.label}</span>
        </div>
      </a>
    );
  })}
</nav>

        <NotificationCenter isExpanded={isExpanded} />
        <Link 
          href="/settings"
          className={`p-6 border-t border-white/20 flex transition-all duration-300 hover:bg-white/10 cursor-pointer ${!isExpanded ? 'justify-center' : 'items-center gap-3'}`}
        >
          <div className={`text-right flex-1 whitespace-nowrap transition-all duration-300 ${!isExpanded ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
            <div className="text-sm font-semibold text-white" style={{ fontFamily: 'Montserrat Alternates' }}>
              {userProfile?.first_name && userProfile?.last_name 
                ? `${userProfile.first_name} ${userProfile.last_name}`
                : userProfile?.email?.split('@')[0] || 'User'}
            </div>
            <div className="text-xs text-white/80" style={{ fontFamily: 'Inter', fontWeight: 500 }}>
              {userProfile?.email || ''}
            </div>
          </div>
          {showPhoto && userProfile?.profile_photo && !imageError ? (
            <img 
              src={userProfile.profile_photo} 
              alt="Profile"
              className="w-10 h-10 rounded-lg shrink-0 object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center relative overflow-hidden" 
              style={{ 
                fontFamily: 'Montserrat Alternates',
                background: 'linear-gradient(165deg, rgba(255,255,255,0.95) 0%, rgba(240,245,250,0.9) 40%, rgba(220,230,240,0.85) 70%, rgba(200,215,230,0.8) 100%)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255,255,255,0.9), inset 0 -1px 3px rgba(0,0,0,0.08)',
                border: '1px solid rgba(255,255,255,0.6)',
              }}
            >
              {/* Top shine */}
              <div 
                className="absolute rounded-full"
                style={{
                  top: '8%',
                  left: '15%',
                  width: '50%',
                  height: '35%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.3) 60%, transparent 100%)',
                  filter: 'blur(1px)',
                  pointerEvents: 'none',
                }}
              />

              <span
                className="relative z-10 text-sm"
                style={{
                  background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 700,
                }}
              >
                {userProfile?.first_name && userProfile?.last_name 
                  ? `${userProfile.first_name.charAt(0)}${userProfile.last_name.charAt(0)}`.toUpperCase()
                  : userProfile?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </Link>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Full-width glassmorphic header */}
        <header 
          data-tour="header" 
          className="relative z-50 glass-header"
        >
          <div className="flex items-center justify-between" style={{ padding: 'clamp(12px, 2vw, 24px) clamp(16px, 3vw, 32px)', gap: 'clamp(16px, 4vw, 64px)' }}>
            <div className="shrink-0">
              <img src="/clemelopy-logo.svg" alt="Clemelopy" style={{ height: 'clamp(16px, 2.5vw, 32px)', width: 'auto' }} />
            </div>
            <div className="text-center">
              <div className="text-[#00A99D] whitespace-nowrap" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: 'clamp(11px, 1.5vw, 18px)' }}>
                {currentDate ? `Today is ${currentDate}.` : 'Loading...'}
              </div>
            </div>
            <HeaderSearch />
          </div>
        </header>

        {/* Main content area with padding */}
        <div className="flex-1 p-8" style={{ paddingTop: '90px' }}>
          {/* Page Header - renders if pageTitle is provided */}
          {pageTitle && (
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl mb-3" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 800 }}>
                <span className="page-title-main">{pageTitle.split('|')[0]}</span>
                {pageTitle.includes('|') && (
                  <span 
                    style={{ 
                      background: 'linear-gradient(90deg, #FAA819, #E99502, #00A99D)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >{pageTitle.split('|')[1]}</span>
                )}
              </h1>
              {pageSubtitle && (
                <p className="max-w-xl mx-auto page-subtitle">
                  {pageSubtitle}
                </p>
              )}
            </div>
          )}

          <main className="flex-1">{children}</main>
          <MobileNudge />
        </div>

        {/* Full-width glassmorphic footer */}
        <footer className="glass-footer">
          <div className="text-center py-5 px-8">
            <p className="text-sm page-subtitle">
              <a href="https://clemelopy.com/" target="_blank" rel="noopener noreferrer" className="text-[#0D7871] hover:text-[#0D7871] transition-colors">© {new Date().getFullYear()} Clemelopy™</a>
              <span className="mx-3 text-[#00A99D]/40">|</span>
              <a href="https://clemelopy.com/terms" target="_blank" rel="noopener noreferrer" className="text-[#0D7871] hover:text-[#0D7871] transition-colors">Terms of Use</a>
              <span className="mx-3 text-[#00A99D]/40">|</span>
              <a href="https://clemelopy.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#0D7871] hover:text-[#0D7871] transition-colors">Privacy Policy</a>
              <span className="mx-3 text-[#00A99D]/40">|</span>
              <a href="https://clemelopy.com/aiterms" target="_blank" rel="noopener noreferrer" className="text-[#0D7871] hover:text-[#0D7871] transition-colors">AI Terms</a>
              <span className="mx-3 text-[#00A99D]/40">|</span>
              <a href="https://clemelopy.com/accessibility" target="_blank" rel="noopener noreferrer" className="text-[#0D7871] hover:text-[#0D7871] transition-colors">Accessibility</a>
            </p>
          </div>
        </footer>
      </div>
    </div>
    </>
  );
}