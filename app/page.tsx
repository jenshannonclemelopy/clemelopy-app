'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import { useAuth } from './lib/AuthContext';
import { supabase } from './lib/supabase';
import TourGuide from './components/TourGuide';
import TourPrompt from './components/TourPrompt';
import { useTour } from './hooks/useTour';
import BlueprintWaitlistModal from './components/BlueprintWaitlistModal';

const WORKER_URL = 'https://linking-strategy-map.jen-86f.workers.dev';
const BLOG_WORKER_URL = 'https://clemelopy-blog-latest.jen-86f.workers.dev';


interface Project {
  id: string;
  created_at: string;
  project_title: string;
  title: string;
  pdf_url: string;
  browser_url: string;
  thumbnail: string;
}

interface TodoItem {
  id: string;
  task: string;
  completed: boolean;
  created_at: string;
}

interface BlogPost {
  title: string;
  excerpt?: string;
  description?: string;
  url?: string;
  link?: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'new' | 'update' | 'tip' | 'celebration' | 'maintenance';
  created_at: string;
}

export default function Workspace() {
  const { user, session, profile, loading } = useAuth();

  // Tour state - ONLY ONE TIME
  const {
    showTour,
    showTourPrompt,
    startTour,
    closeTour,
    completeTour,
    dismissPrompt,
    skipTour,
  } = useTour();

  const [questionAnswer, setQuestionAnswer] = useState('');
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [questionLoading, setQuestionLoading] = useState(true);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [userHasAnswered, setUserHasAnswered] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todosLoading, setTodosLoading] = useState(true);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogLoading, setBlogLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [showWaitlist, setShowWaitlist] = useState(false);

  // Auth protection - redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  // Onboarding protection - redirect if onboarding not completed
  useEffect(() => {
    if (!loading && user && profile && profile.onboarding_completed === false) {
      window.location.href = '/onboarding';
    }
  }, [user, profile, loading]);

  // Get user's first name
  const userName = profile?.first_name || user?.email?.split('@')[0] || 'there';

  // Fetch announcements from Supabase
  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('id, title, message, type, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        setAnnouncements(data || []);
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setAnnouncements([]);
      } finally {
        setAnnouncementsLoading(false);
      }
    }

    fetchAnnouncements();
  }, []);

  // Fetch projects
  useEffect(() => {
    async function fetchProjects() {
      if (!session?.access_token) {
        setProjectsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${WORKER_URL}/my-projects`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();
        // ... rest of your code
        if (response.ok && data.ok) {
          setProjects((data.projects || []).slice(0, 3));
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
      } finally {
        setProjectsLoading(false);
      }
    }

    fetchProjects();
  }, [session]);

  // Fetch todos directly from Supabase
  useEffect(() => {
    async function fetchTodos() {
      if (!user) {
        setTodosLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_todos')
          .select('id, task, completed, created_at')
          .eq('user_id', user.id)
          .eq('completed', false)
          .or('is_deleted.is.null,is_deleted.eq.false')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        setTodos(data || []);
      } catch (err) {
        console.error('Error fetching todos:', err);
      } finally {
        setTodosLoading(false);
      }
    }

    fetchTodos();
  }, [user]);

  // Fetch current question of the week and check if user answered
  useEffect(() => {
    async function fetchCurrentQuestion() {
      try {
        const { data, error } = await supabase
          .from('question_of_the_week')
          .select('id, question')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0 && data[0].question) {
          setCurrentQuestion(data[0].question);
          setCurrentQuestionId(data[0].id);
          
          // Check if user has already answered this question
          if (user) {
            const { data: userResponse, error: responseError } = await supabase
              .from('question_responses')
              .select('id')
              .eq('user_id', user.id)
              .eq('question_id', data[0].id)
              .limit(1);

            if (!responseError && userResponse && userResponse.length > 0) {
              setUserHasAnswered(true);
            }
          }
        } else {
          setCurrentQuestion('What overwhelms you the most about optimizing your site in the age of generative search?');
        }
      } catch (err) {
        console.error('Error fetching question:', err);
        setCurrentQuestion('What overwhelms you the most about optimizing your site in the age of generative search?');
      } finally {
        setQuestionLoading(false);
      }
    }

    if (user) {
      fetchCurrentQuestion();
    }
  }, [user, supabase]);

  // Fetch blog posts
  useEffect(() => {
    async function fetchBlogPosts() {
      try {
        const response = await fetch(BLOG_WORKER_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.title && !Array.isArray(data)) {
            setBlogPosts([data]);
          } else if (Array.isArray(data)) {
            setBlogPosts(data.slice(0, 2));
          } else if (data.posts) {
            setBlogPosts(data.posts.slice(0, 2));
          } else if (data.items) {
            setBlogPosts(data.items.slice(0, 2));
          }
        }
      } catch (err) {
        console.error('Error fetching blog posts:', err);
      } finally {
        setBlogLoading(false);
      }
    }

    fetchBlogPosts();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getProjectName = (project: Project) => {
    return project.title || project.project_title || 'Untitled Project';
  };

  // Trigger confetti effect
  const triggerConfetti = useCallback(() => {
    if (typeof window === 'undefined') return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    canvas.setAttribute('aria-hidden', 'true'); // Hide from screen readers
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; life: number; decay: number }[] = [];
    const particleCount = 50;
    const emoji = '🍊';

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2 + 1.5,
        life: 1,
        decay: Math.random() * 0.003 + 0.002,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '2.5rem Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let activeParticles = false;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.vy;
        p.vy += 0.08;
        p.x += p.vx;
        p.life -= p.decay;

        if (p.life > 0) {
          activeParticles = true;
          ctx.globalAlpha = p.life;
          ctx.fillText(emoji, p.x, p.y);
        }
      }

      ctx.globalAlpha = 1;

      if (activeParticles) {
        requestAnimationFrame(animate);
      } else {
        document.body.removeChild(canvas);
      }
    };

    animate();
  }, []);

  // Handle submitting question response
  const handleSubmitQuestion = async () => {
    if (!questionAnswer.trim() || !user || !currentQuestionId) return;

    setSubmittingQuestion(true);
    try {
      const { error } = await supabase
        .from('question_responses')
        .insert({
          user_id: user.id,
          question_id: currentQuestionId,
          response: questionAnswer,
        });

      if (error) throw error;
      
      triggerConfetti();
      
      setQuestionSubmitted(true);
      setUserHasAnswered(true);
    } catch (err) {
      console.error('Error submitting question:', err);
      alert('Failed to submit your response. Please try again.');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  // Get random fun fact about clementines
  const getRandomClementineFact = useCallback(() => {
    const facts = [
      "Did you know? Clementines are seedless oranges packed with vitamin C – perfect for staying healthy while optimizing!",
      "Fun fact: Clementines were named after Father Clément Rodier, a French missionary in Algeria. Your orange has a name origin story!",
      "Did you know? One clementine provides about 60% of your daily vitamin C needs. Feed your brain, feed your optimization!",
      "Fun fact: Clementines are actually a hybrid between sweet oranges and mandarins – blended perfection, like your content strategy!",
      "Did you know? The sweetest clementines are picked between November and January. Patience pays off!",
      "Fun fact: Clementines have thin skin that's super easy to peel – much easier than implementing GEO! (Almost.)",
      "Fun fact: Spain is the world's largest exporter of clementines. They know quality when they see it!",
      "Fun fact: Clementines have been cultivated for over 2,500 years. Your content strategy? Just getting started!",
      "Did you know? A clementine's bright color comes from carotenoids – the same compound that helps your eyes. Vision matters!",
      "Fun fact: Clementines are naturally sweet because of their higher sugar content. Sweetness without artificial additives – authentic like great content!",
      "Did you know? Clementines grow on trees that can live for over 100 years. Build for longevity, not just quick wins!",
      "Fun fact: A single clementine tree can produce up to 200 fruits per year. Consistency is key!",
    ];
    
    return facts[Math.floor(Math.random() * facts.length)];
  }, []);

  // Get announcement icon based on type
  const getAnnouncementIcon = (type: Announcement['type']) => {
    switch (type) {
      case 'new':
        return '✨';
      case 'update':
        return '🔄';
      case 'tip':
        return '💡';
      case 'celebration':
        return '🎉';
      case 'maintenance':
        return '🔧';
      default:
        return '📢';
    }
  };

  // Get announcement type label for screen readers
  const getAnnouncementTypeLabel = (type: Announcement['type']) => {
    switch (type) {
      case 'new':
        return 'New feature';
      case 'update':
        return 'Update';
      case 'tip':
        return 'Tip';
      case 'celebration':
        return 'Celebration';
      case 'maintenance':
        return 'Maintenance';
      default:
        return 'Announcement';
    }
  };

  // Common focus styles for accessibility - meets WCAG 2.1 AA 3:1 contrast requirement
  const focusStyles = {
    outline: '2px solid #005a54',
    outlineOffset: '2px',
  };

  // Styles as objects for cleaner JSX
  const styles = {
    mainContainer: {
      background: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      borderRadius: '32px',
      padding: '32px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    },
    orangeAccentCard: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 250, 243, 0.9) 50%, rgba(250, 168, 25, 0.1) 100%)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.6)',
      borderRadius: '24px',
      boxShadow: '0 8px 32px rgba(250, 168, 25, 0.15)',
    },
    tealCard: {
      background: 'linear-gradient(135deg, rgba(0, 169, 157, 0.95) 0%, rgba(13, 120, 113, 0.95) 100%)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '24px',
      boxShadow: '0 8px 32px rgba(0, 169, 157, 0.25)',
    },
    glassCard: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.5) 50%, rgba(0, 169, 157, 0.1) 100%)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.6)',
      borderRadius: '24px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
    },
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)' }}>
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Don't render dashboard if no user (redirect is happening via useEffect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)' }}>
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Don't render dashboard if onboarding not completed (redirect is happening via useEffect)
  if (profile && profile.onboarding_completed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)' }}>
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Don't render dashboard if onboarding not completed (redirect is happening via useEffect)
  if (profile && profile.onboarding_completed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)' }}>
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Layout activeNav="workspace">
      {/* Skip to main content link for keyboard users */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-[#005a54] focus:rounded-lg focus:font-semibold"
        style={{ fontFamily: 'Montserrat Alternates' }}
      >
        Skip to main content
      </a>

      <main id="main-content" role="main" aria-label="Dashboard workspace">
        {/* Header - Frosted Glass Container */}
        <header 
          className="rounded-2xl p-8 mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(250, 168, 25, 0.05) 100%)',
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
            <span style={{ color: '#1a1a1a' }}>Welcome back, </span>
            <span 
              style={{ 
                background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {userName}!
            </span>
          </h1>
          <p 
  className="text-base text-[#4a4642]"
  style={{ fontFamily: 'Inter', fontWeight: 500 }}
>
🌻 How can we help you grow forward today?
</p>
        </header>

        {/* Main Glassmorphic Container */}
        <div
          data-tour="welcome-hero"
          style={styles.mainContainer}
        >
          {/* Three Column Layout - Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
            {/* LEFT: Create Linking Strategy - PRIMARY CTA */}
          <section 
            data-tour="create-cta" 
            className="lg:col-span-1 p-8 flex flex-col justify-between transition-transform duration-300 hover:scale-[1.02]"
            style={styles.orangeAccentCard}
            aria-labelledby="create-map-heading"
          >
            <div>
              <span 
                className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4"
                style={{ 
                  background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                  fontFamily: 'Montserrat Alternates',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(250, 168, 25, 0.3)',
                }}
              >
                START HERE
              </span>
              <h2 
                id="create-map-heading"
                className="text-2xl mb-3"
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  fontWeight: 700,
                  color: '#1a1a1a',
                }}
              >
                Create Your First Map
              </h2>
              <p 
                className="text-sm mb-6" 
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 500,
                  color: '#4a4642',
                }}
              >
                Generate a strategic linking map to optimize your site's internal structure.
              </p>

              <ul className="space-y-2 mb-8" aria-label="Features">
                {['AI-powered analysis', 'Instant PDF', 'Easy to use'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)' }}
                    >
                      <svg 
                        className="w-3 h-3 text-white" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span 
                      className="text-sm" 
                      style={{ 
                        fontFamily: 'Inter', 
                        fontWeight: 500,
                        color: '#1a1a1a',
                      }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <a 
              href="/tools/linking-strategy"
              className="block w-full px-6 py-3 rounded-xl font-bold text-center transition-all duration-300 hover:scale-105 focus:scale-105"
              style={{ 
                fontFamily: 'Montserrat Alternates',
                background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 16px rgba(0, 169, 157, 0.35)',
              }}
              onFocus={(e) => Object.assign(e.currentTarget.style, focusStyles)}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
                e.currentTarget.style.outlineOffset = '0';
              }}
              aria-label="Get started creating your first linking strategy map"
            >
              Get Started <span aria-hidden="true">→</span>
            </a>
          </section>

          {/* CENTER: To-Do List */}
          <section 
            className="lg:col-span-1 p-6"
            style={styles.glassCard}
            aria-labelledby="tasks-heading"
          >
            <h2 
              id="tasks-heading"
              className="text-lg mb-4 text-[#1a1a1a]" 
              style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
            >
              Your Tasks
            </h2>

            {todosLoading ? (
              <div 
                className="flex items-center justify-center py-8"
                role="status"
                aria-label="Loading tasks"
              >
                <div 
                  className="w-8 h-8 border-2 border-[#00A99D] border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                <span className="sr-only">Loading your tasks...</span>
              </div>
            ) : todos.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-3xl mb-2 block" aria-hidden="true">✨</span>
                <p 
                  className="text-sm text-[#4a4642]" 
                  style={{ fontFamily: 'Inter', fontWeight: 500 }}
                >
                  All caught up!
                </p>
              </div>
            ) : (
              <div>
                <ul className="space-y-2" aria-label="Task list">
                  {todos.map((todo) => (
                    <li 
                      key={todo.id}
                      className="flex items-start gap-2 p-3 rounded-xl transition-all duration-300 hover:scale-[1.02]"
                      style={{
                        background: 'rgba(0, 169, 157, 0.1)',
                        border: '1px solid rgba(0, 169, 157, 0.2)',
                      }}
                    >
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            await supabase
                              .from('user_todos')
                              .update({ completed: true })
                              .eq('id', todo.id);
                            setTodos(prev => prev.filter(t => t.id !== todo.id));
                          } catch (err) {
                            console.error('Error completing task:', err);
                          }
                        }}
                        className="w-5 h-5 rounded border-2 border-[#00A99D] shrink-0 mt-0.5 flex items-center justify-center hover:bg-[#00A99D] transition-colors group"
                        aria-label={`Mark "${todo.task}" as complete`}
                      >
                        <svg 
                          className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <a 
                        href="/to-do"
                        className="text-sm text-[#1a1a1a] line-clamp-2 flex-1 hover:text-[#006b63] transition-colors cursor-pointer" 
                        style={{ fontFamily: 'Inter', fontWeight: 500 }}
                      >
                        {todo.task}
                      </a>
                    </li>
                  ))}
                </ul>
                <a 
                  href="/to-do" 
                  className="block text-center text-sm text-[#006b63] hover:text-[#005a54] font-semibold pt-4 transition-colors duration-200"
                  style={{ fontFamily: 'Montserrat Alternates' }}
                  onFocus={(e) => Object.assign(e.currentTarget.style, focusStyles)}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.outlineOffset = '0';
                  }}
                >
                  View all tasks <span aria-hidden="true">→</span>
                </a>
              </div>
            )}
          </section>

          {/* RIGHT: Question of the Week */}
          <section 
            className="lg:col-span-1 p-6"
            style={styles.tealCard}
            aria-labelledby="question-heading"
          >
            <h2 
              id="question-heading"
              className="text-lg mb-4" 
              style={{ 
                fontFamily: 'Montserrat Alternates', 
                fontWeight: 600,
                color: '#ffffff',
              }}
            >
              Question of the Week <span aria-hidden="true">💭</span>
            </h2>
            
            {questionLoading ? (
              <div 
                className="flex items-center justify-center py-6"
                role="status"
                aria-label="Loading question"
              >
                <div 
                  className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  aria-hidden="true"
                />
                <span className="sr-only">Loading question of the week...</span>
              </div>
            ) : userHasAnswered ? (
              <div className="text-center py-6">
                <span className="text-6xl mb-4 block" aria-hidden="true">🍊</span>
                <p 
                  className="text-base font-semibold mb-3" 
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    color: '#ffffff',
                  }}
                >
                  Until next week's question...
                </p>
                <p 
                  className="text-base" 
                  style={{ 
                    fontFamily: 'Montserrat Alternates', 
                    fontWeight: 400,
                    color: '#ffffff',
                  }}
                >
                  {getRandomClementineFact()}
                </p>
              </div>
            ) : !questionSubmitted ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitQuestion();
                }}
              >
                <label 
                  htmlFor="question-answer"
                  className="text-sm mb-3 block" 
                  style={{ 
                    fontFamily: 'Inter', 
                    fontWeight: 500,
                    color: '#ffffff',
                  }}
                >
                  {currentQuestion}
                </label>
                <textarea
                  id="question-answer"
                  value={questionAnswer}
                  onChange={(e) => setQuestionAnswer(e.target.value)}
                  className="w-full rounded-xl p-3 text-sm mb-2"
                  style={{ 
                    fontFamily: 'Inter', 
                    fontWeight: 500,
                    background: 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                  }}
                  rows={2}
                  placeholder="Share your thoughts..."
                  aria-describedby="question-help"
                  onFocus={(e) => {
                    e.currentTarget.style.outline = '2px solid #ffffff';
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.outlineOffset = '0';
                  }}
                />
                <span id="question-help" className="sr-only">
                  Enter your response to the question of the week
                </span>
                <button 
                  type="submit"
                  disabled={!questionAnswer.trim() || submittingQuestion}
                  className="w-full py-2 px-3 rounded-xl font-semibold transition-all duration-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 focus:scale-105"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'rgba(255, 255, 255, 0.35)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = '2px solid #ffffff';
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.outlineOffset = '0';
                  }}
                  aria-busy={submittingQuestion}
                >
                  {submittingQuestion ? 'Submitting...' : 'Submit'}
                </button>
              </form>
            ) : (
              <div 
                className="text-center py-6"
                role="status"
                aria-live="polite"
              >
                <span className="text-4xl mb-3 block" aria-hidden="true">🎉</span>
                <p 
                  className="text-sm font-semibold mb-4" 
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    color: '#ffffff',
                  }}
                >
                  Amazing! Your voice matters.
                </p>
                <p 
                  className="text-sm" 
                  style={{ 
                    fontFamily: 'Inter', 
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.9)',
                  }}
                >
                  Thanks for submitting your answer to our question of the week!
                </p>
                
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <p 
                    className="text-sm italic" 
                    style={{ 
                      fontFamily: 'Inter', 
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.85)',
                    }}
                  >
                    {getRandomClementineFact()}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Two Column: Recent Projects + Orchard Ecosystem Framework */}
        <div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
          {/* LEFT: Recent Projects */}
          <section 
            data-tour="projects-section"
            className="p-6"
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.4) 50%, rgba(0, 169, 157, 0.15) 100%)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderRadius: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
            }}
            aria-labelledby="projects-heading"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 
                id="projects-heading"
                className="text-lg text-[#1a1a1a]" 
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
              >
                Recent Projects
              </h2>
              {projects.length > 0 && (
                <a 
                  href="/my-projects" 
                  className="text-sm text-[#c47f00] hover:text-[#a36a00] font-medium transition-colors duration-200"
                  style={{ fontFamily: 'Montserrat Alternates' }}
                  onFocus={(e) => Object.assign(e.currentTarget.style, focusStyles)}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.outlineOffset = '0';
                  }}
                >
                  View All <span aria-hidden="true">→</span>
                </a>
              )}
            </div>

            {projectsLoading ? (
              <div 
                className="flex items-center justify-center py-8"
                role="status"
                aria-label="Loading projects"
              >
                <div 
                  className="w-8 h-8 border-2 border-[#FAA819] border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                <span className="sr-only">Loading your projects...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-3xl mb-2 block" aria-hidden="true">📁</span>
                <p 
                  className="text-sm text-[#4a4642] mb-4" 
                  style={{ fontFamily: 'Inter', fontWeight: 500 }}
                >
                  No projects yet
                </p>
                <a 
                  href="/tools/linking-strategy" 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105"
                  style={{ 
                    fontFamily: 'Montserrat Alternates',
                    background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                    color: 'white',
                  }}
                >
                  <span aria-hidden="true">+</span> Create Your First Map
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Project Cards Grid */}
                <div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  aria-label="Project list"
                >
                  {projects.slice(0, 3).map((project) => (
                    <div 
                      key={project.id}
                      className="p-3 transition-all duration-300 hover:scale-[1.02] group"
                      style={{
                        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 60%, rgba(0, 169, 157, 0.08) 100%)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.7)',
                        borderRadius: '16px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      {/* PDF Thumbnail */}
                      <a 
                        href={`/project/${project.id}`}
                        className="block mb-3 rounded-xl overflow-hidden bg-gray-100 aspect-square relative"
                        style={{
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        }}
                      >
                        {project.thumbnail ? (
                          <img 
                            src={project.thumbnail} 
                            alt={`Preview of ${getProjectName(project)}`}
                            className="w-full h-full object-cover"
                          />
                        ) : project.browser_url || project.pdf_url ? (
                          <iframe 
                            src={`${project.browser_url || project.pdf_url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                            className="w-full h-full pointer-events-none"
                            title={`Preview of ${getProjectName(project)}`}
                            style={{ border: 'none' }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                      </a>

                      {/* Project Name */}
                      <h3 
                        className="text-sm text-[#1a1a1a] font-semibold truncate mb-3" 
                        style={{ fontFamily: 'Montserrat Alternates' }}
                      >
                        {getProjectName(project)}
                      </h3>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <a
                          href={`/project/${project.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105"
                          style={{ 
                            fontFamily: 'Montserrat Alternates',
                            background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                            color: 'white',
                          }}
                          aria-label={`View project: ${getProjectName(project)}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </a>
                        <button
                          onClick={() => {
                            if (project.pdf_url) window.open(project.pdf_url, '_blank');
                          }}
                          disabled={!project.pdf_url}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ 
                            fontFamily: 'Montserrat Alternates',
                            background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                            color: 'white',
                          }}
                          aria-label={`Download PDF for project: ${getProjectName(project)}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Start New Project Link */}
                <div className="pt-2 text-center">
                  <a 
                    href="/tools/linking-strategy" 
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      background: 'linear-gradient(135deg, rgba(250, 168, 25, 0.95) 0%, rgba(233, 149, 2, 0.95) 100%)',
                      color: 'white',
                      boxShadow: '0 4px 20px rgba(250, 168, 25, 0.25)',
                    }}
                    onFocus={(e) => Object.assign(e.currentTarget.style, focusStyles)}
                    onBlur={(e) => {
                      e.currentTarget.style.outline = 'none';
                      e.currentTarget.style.outlineOffset = '0';
                    }}
                  >
                    <span className="text-lg" aria-hidden="true">+</span> Start a new project
                  </a>
                </div>
              </div>
            )}
          </section>

          {/* RIGHT: Orchard Ecosystem Framework CTA */}
          <section 
            data-tour="orchard-framework"
            className="p-6 flex flex-col justify-center items-center"
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.4) 50%, rgba(250, 168, 25, 0.15) 100%)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderRadius: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
            }}
            aria-labelledby="orchard-heading"
          >
            {/* Orchard Icon */}
            <img 
              src="/icons/orchard-ecosystem-framework.png" 
              alt="" 
              className="w-48 h-48 mb-4"
              aria-hidden="true"
            />
            
            <h2 
              id="orchard-heading"
              className="text-3xl mb-5 text-center" 
              style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
            >
              The{' '}
              <span 
                style={{ 
                  background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Orchard Ecosystem
              </span>
              {' '}Framework<span style={{ color: '#1a1a1a' }}>™</span>
            </h2>

            <p 
              className="text-lg text-[#4a4642] mb-6 text-center" 
              style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, lineHeight: 1.6 }}
            >
              Everything inside Clemelopy is built on this framework — take a few minutes to explore it before you start running maps or tackling to-dos.
            </p>

            {/* CTA */}
            <a 
              href="/learn" 
              className="w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 text-center"
              style={{ 
                fontFamily: 'Montserrat Alternates',
                background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                color: 'white',
                boxShadow: '0 4px 20px rgba(0, 169, 157, 0.25)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid #005a54';
                e.currentTarget.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
                e.currentTarget.style.outlineOffset = '0';
              }}
            >
              Explore the Orchard Ecosystem Framework
              <span aria-hidden="true">→</span>
            </a>
          </section>
        </div>

        {/* Two Column: Coming Soon + Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* LEFT 2/3: Coming Soon - GEO Framework */}
          <section 
            className="lg:col-span-2 p-8"
            style={styles.glassCard}
            aria-labelledby="coming-soon-heading"
          >
            <div className="flex items-start gap-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                }}
                aria-hidden="true"
              >
                <span className="text-3xl">🚀</span>
              </div>
              <div className="flex-1">
                <span 
                  className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3"
                  style={{ 
                    background: 'rgba(0, 169, 157, 0.15)',
                    color: '#006b63',
                    fontFamily: 'Montserrat Alternates' 
                  }}
                >
                  COMING SOON
                </span>
                <h2 
                  id="coming-soon-heading"
                  className="text-2xl mb-3 text-[#1a1a1a]" 
                  style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                >
                  The Clemelopy GEO Blueprint
                </h2>
                <p 
                  className="text-[#4a4642] mb-5" 
                  style={{ fontFamily: 'Inter', fontWeight: 500 }}
                >
                  A guided conversational experience to help you gain clarity in your business and create a comprehensive blueprint to optimize your entire site for generative engines.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => setShowWaitlist(true)}
                    className="px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:scale-105 focus:scale-105"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)',
                      color: 'white',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = '2px solid #005a54';
                      e.currentTarget.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.outline = 'none';
                      e.currentTarget.style.outlineOffset = '0';
                    }}
                  >
                    Notify Me When It's Ready
                  </button>
                  <a 
                    href="https://clemelopy.com/blueprint"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:scale-105 focus:scale-105"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      background: 'rgba(255, 255, 255, 0.5)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(0, 169, 157, 0.3)',
                      color: '#006b63',
                    }}
                    onFocus={(e) => Object.assign(e.currentTarget.style, focusStyles)}
                    onBlur={(e) => {
                      e.currentTarget.style.outline = 'none';
                      e.currentTarget.style.outlineOffset = '0';
                    }}
                  >
                    Learn More
                    <span className="sr-only"> about the Clemelopy GEO Blueprint (opens in new tab)</span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT 1/3: Announcements */}
          <section 
            className="lg:col-span-1 p-6"
            style={styles.tealCard}
            aria-labelledby="announcements-heading"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl" aria-hidden="true">📢</span>
              <h2 
                id="announcements-heading"
                className="text-lg" 
                style={{ 
                  fontFamily: 'Montserrat Alternates', 
                  fontWeight: 600,
                  color: '#ffffff',
                }}
              >
                Announcements
              </h2>
            </div>

            {announcementsLoading ? (
              <div 
                className="flex items-center justify-center py-8"
                role="status"
                aria-label="Loading announcements"
              >
                <div 
                  className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  aria-hidden="true"
                />
                <span className="sr-only">Loading announcements...</span>
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-3xl mb-2 block" aria-hidden="true">✨</span>
                <p 
                  className="text-sm" 
                  style={{ 
                    fontFamily: 'Inter', 
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.85)',
                  }}
                >
                  No announcements yet
                </p>
              </div>
            ) : (
              <ul className="space-y-3" aria-label="Announcements list">
                {announcements.map((announcement) => (
                  <li 
                    key={announcement.id}
                    className="p-4 rounded-xl transition-transform duration-300 hover:scale-[1.02]"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '16px',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span 
                        className="text-xl shrink-0" 
                        aria-hidden="true"
                      >
                        {getAnnouncementIcon(announcement.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="sr-only">{getAnnouncementTypeLabel(announcement.type)}:</span>
                        <h3 
                          className="text-sm font-semibold mb-1 line-clamp-1"
                          style={{ 
                            fontFamily: 'Montserrat Alternates',
                            color: '#ffffff',
                          }}
                        >
                          {announcement.title}
                        </h3>
                        <p 
                          className="text-xs line-clamp-2"
                          style={{ 
                            fontFamily: 'Inter', 
                            fontWeight: 500,
                            color: 'rgba(255, 255, 255, 0.9)',
                          }}
                        >
                          {announcement.message}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* View All Link */}
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
              <a 
                href="/announcements" 
                className="text-sm font-semibold flex items-center justify-center gap-1 transition-colors duration-200"
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  color: '#ffffff',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #ffffff';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.outlineOffset = '0';
                }}
              >
                View all announcements <span aria-hidden="true">→</span>
              </a>
            </div>
          </section>
        </div>

        {/* Latest from the Blog */}
        <section className="mb-8" aria-labelledby="blog-heading">
          <h2 
            id="blog-heading"
            className="text-xl mb-6 text-[#1a1a1a]" 
            style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
          >
            Latest from the Blog
          </h2>
          {blogLoading ? (
            <div 
              className="flex items-center justify-center py-12"
              role="status"
              aria-label="Loading blog posts"
            >
              <div 
                className="w-8 h-8 border-2 border-[#FAA819] border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              <span className="sr-only">Loading blog posts...</span>
            </div>
          ) : blogPosts.length === 0 ? (
            <div 
              className="p-8 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.5) 50%, rgba(0, 169, 157, 0.1) 100%)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                borderRadius: '24px',
              }}
            >
              <p 
                className="text-[#4a4642]" 
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                No blog posts available yet. Check back soon!
              </p>
            </div>
          ) : (
            <ul 
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
              aria-label="Blog posts"
            >
              {blogPosts.map((post, index) => (
                <li key={index}>
                  <a
                    href={post.url || post.link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
                    style={{
                      background: index === 0 
                        ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 60%, rgba(250, 168, 25, 0.1) 100%)'
                        : 'linear-gradient(145deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 60%, rgba(0, 169, 157, 0.1) 100%)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.7)',
                      borderRadius: '20px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                    }}
                    onFocus={(e) => Object.assign(e.currentTarget.style, focusStyles)}
                    onBlur={(e) => {
                      e.currentTarget.style.outline = 'none';
                      e.currentTarget.style.outlineOffset = '0';
                    }}
                  >
                    {/* Header with gradient and minimalist icon */}
                    <div 
                      className="h-48 flex items-center justify-center"
                      style={{
                        background: index === 0 
                          ? 'linear-gradient(135deg, rgba(250, 168, 25, 0.2) 0%, rgba(0, 169, 157, 0.2) 100%)'
                          : 'linear-gradient(135deg, rgba(0, 169, 157, 0.2) 0%, rgba(250, 168, 25, 0.2) 100%)',
                      }}
                      aria-hidden="true"
                    >
                      {index === 0 ? (
                        <svg 
                          className="w-16 h-16 text-[#c47f00] opacity-60 group-hover:opacity-80 transition-opacity duration-300" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : (
                        <svg 
                          className="w-16 h-16 text-[#006b63] opacity-60 group-hover:opacity-80 transition-opacity duration-300" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="p-6">
                      <h3 
                        className="text-lg mb-2 text-[#1a1a1a] group-hover:text-[#c47f00] transition-colors duration-300 line-clamp-2" 
                        style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                      >
                        {post.title}
                        <span className="sr-only"> (opens in new tab)</span>
                      </h3>
                      <p 
                        className="text-sm text-[#4a4642] mb-3 line-clamp-2" 
                        style={{ fontFamily: 'Inter', fontWeight: 500 }}
                      >
                        {post.excerpt || post.description || 'Read more on the blog...'}
                      </p>
                      <span 
                        className="text-sm text-[#006b63] font-semibold group-hover:text-[#005a54] transition-colors duration-300" 
                        style={{ fontFamily: 'Montserrat Alternates' }}
                        aria-hidden="true"
                      >
                        Read More →
                      </span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
        </div>

     {/* Tour Components */}
     {showTour && (
          <TourGuide 
            isOpen={showTour} 
            onClose={closeTour} 
            onComplete={completeTour}
            onSkip={skipTour}
          />
        )}
        {showTourPrompt && (
          <TourPrompt 
            isVisible={showTourPrompt} 
            onStartTour={startTour} 
            onDismiss={dismissPrompt} 
          />
        )}
      </main>

      <BlueprintWaitlistModal 
        isOpen={showWaitlist} 
        onClose={() => setShowWaitlist(false)} 
      />
    </Layout>
  );
}