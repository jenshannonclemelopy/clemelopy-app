'use client';

import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../lib/AuthContext';

const WORKER_URL = 'https://clemelopy-geo-framework.jen-86f.workers.dev';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Module definitions for the course sidebar
const MODULES = [
  { id: 'welcome', name: 'Welcome', icon: '/icons/wave.svg', phase: 'welcome' },
  { id: 'orientation', name: 'Getting Started', icon: '/icons/orchard-ecosystem-framework.png', phase: 'orientation' },
  { id: 'roots', name: 'Roots & Foundation', icon: '/icons/riits.png', phase: 'pillar_core' },
  { id: 'soil', name: 'Soil', icon: '/icons/soil.png', phase: 'pillar_core' },
  { id: 'trunk', name: 'Trunk', icon: '/icons/trunk.png', phase: 'pillar_authority' },
  { id: 'branches', name: 'Branches', icon: '/icons/branches.png', phase: 'hub_structure' },
  { id: 'leaves', name: 'Leaves', icon: '/icons/leaves.png', phase: 'hub_structure' },
  { id: 'fruit', name: 'Fruit', icon: '/icons/fruit.png', phase: 'schematics' },
  { id: 'pollinators', name: 'Pollinators', icon: '/icons/pollinators.png', phase: 'schematics' },
  { id: 'network', name: 'Underground Network', icon: '/icons/Underground Network.png', phase: 'maintenance' },
  { id: 'cultivation', name: 'Cultivation', icon: '/icons/cultivate.png', phase: 'maintenance' },
  { id: 'harvest', name: 'Your Orchard Blueprint', icon: '/icons/clipboard.svg', phase: 'harvest' },
  { id: 'forward', name: 'Growing Forward', icon: '/icons/growing-forward.svg', phase: 'complete' },
];

// Fallback emojis if icons don't exist
const MODULE_EMOJIS: Record<string, string> = {
  welcome: '👋',
  orientation: '🌳',
  roots: '🌱',
  soil: '🌍',
  trunk: '🪵',
  branches: '🌿',
  leaves: '🍃',
  fruit: '🍊',
  pollinators: '🐝',
  network: '🕸️',
  cultivation: '🌻',
  harvest: '📋',
  forward: '🚀',
};

export default function GeoBlueprintPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationState, setConversationState] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('welcome');
  const [currentModule, setCurrentModule] = useState(1);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iconErrors, setIconErrors] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keep input focused after responses
  useEffect(() => {
    if (!isLoading && hasStarted && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, hasStarted, messages]);

  // Helper function to add delay
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const sendMessage = async (message: string) => {
    if (!message.trim() && hasStarted) return;
    
    setIsLoading(true);
    setError(null);
    
    if (message.trim()) {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);
      setInputValue('');
    }

    try {
      const response = await fetch(`${WORKER_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: message || null,
          conversation_state: conversationState,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setIsLoading(false);
        return;
      }

      // Update conversation state
      setConversationState(data.conversation_state);
      
      // Update progress
      if (data.progress_percent !== undefined) {
        setProgress(data.progress_percent);
      }
      
      // Update current module
      if (data.current_module) {
        setCurrentModule(data.current_module);
        // Map module number to phase for sidebar
        const moduleToPhase: Record<number, string> = {
          1: 'welcome',
          2: 'orientation',
          3: 'orientation',
          4: 'pillar_core',
          5: 'hub_structure',
          6: 'hub_structure',
          7: 'schematics',
          8: 'schematics',
          9: 'maintenance',
          10: 'maintenance',
          11: 'harvest',
          12: 'complete',
        };
        setCurrentPhase(moduleToPhase[data.current_module] || 'welcome');
      }

      // Handle message from worker - split by \n\n for separate bubbles
      if (data.message) {
        setIsLoading(false);
        
        // Split message by double newlines to create separate bubbles
        const messageParts = data.message.split('\n\n').filter((part: string) => part.trim());
        
        for (let index = 0; index < messageParts.length; index++) {
          const content = messageParts[index];
          
          // Show typing indicator before each message after the first
          if (index > 0) {
            setIsTyping(true);
            await delay(800 + Math.random() * 400);
            setIsTyping(false);
          }
          
          // Add the message
          const newMsg: Message = {
            id: `assistant-${Date.now()}-${index}`,
            role: 'assistant',
            content: content,
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, newMsg]);
          
          // Brief pause to let the UI update
          await delay(100);
        }
      }

    } catch (err) {
      setError('Failed to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startConversation = async () => {
    setHasStarted(true);
    await sendMessage('');
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationState(null);
    setProgress(0);
    setCurrentPhase('welcome');
    setCurrentModule(1);
    setHasStarted(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !isLoading) {
        sendMessage(inputValue);
      }
    }
  };

  // Get current module index for progress
  const getCurrentModuleIndex = () => {
    const index = MODULES.findIndex(m => m.phase === currentPhase);
    return index >= 0 ? index : 0;
  };

  // Handle icon error - fall back to emoji
  const handleIconError = (moduleId: string) => {
    setIconErrors(prev => new Set(prev).add(moduleId));
  };

  // Tour handler (placeholder)
  const handleTourClick = () => {
    console.log('Tour clicked');
  };

  return (
    <Layout activeNav="workspace">
      <main>
        {/* Page Header */}
        <PageHeader
          titleStart="GEO"
          titleEnd="Blueprint"
          subtitle="Build your personalized Generative Engine Optimization framework step by step."
          centered={true}
          showTour={false}
          onTourClick={handleTourClick}
        />

        {/* Error Banner */}
        {error && (
          <div 
            className="mb-6 flex items-start gap-3 rounded-2xl"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '16px 20px',
            }}
          >
            <svg className="w-6 h-6 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-red-800 font-medium" style={{ fontFamily: 'Montserrat Alternates' }}>{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Main Glassmorphic Container */}
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '32px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Inner Container */}
          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderRadius: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
              overflow: 'hidden',
              height: '70vh',
              maxHeight: '700px',
              minHeight: '500px',
            }}
          >
            {/* Course Layout */}
            <div className="flex h-full">
              {/* Left Sidebar - Modules */}
              <div 
                className="w-64 shrink-0 border-r overflow-y-auto p-5 hide-scrollbar relative z-10 h-full"
                style={{ 
                  borderColor: 'rgba(0, 0, 0, 0.06)',
                  background: 'rgba(255, 255, 255, 0.5)',
                  boxShadow: '6px 0 25px rgba(0, 0, 0, 0.08)',
                }}
              >
                <div className="mb-4">
                  <h3 
                    className="text-xs font-semibold uppercase tracking-wider mb-4"
                    style={{ fontFamily: 'Montserrat Alternates', color: '#6b6560' }}
                  >
                    Modules
                  </h3>
                </div>
                
                <div className="space-y-0.5">
                  {MODULES.map((module, index) => {
                    const isActive = module.phase === currentPhase;
                    const isPast = getCurrentModuleIndex() > index;
                    const useEmoji = iconErrors.has(module.id);
                    
                    return (
                      <div
                        key={module.id}
                        className="flex items-center gap-3 px-2 py-2 rounded-lg transition-all"
                        style={{
                          background: isActive 
                            ? 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)'
                            : 'transparent',
                          boxShadow: isActive 
                            ? '0 4px 15px rgba(0, 169, 157, 0.3)' 
                            : 'none',
                        }}
                      >
                        {useEmoji ? (
                          <span 
                            className="text-lg w-6 flex items-center justify-center shrink-0"
                            style={{ opacity: isActive ? 1 : isPast ? 0.9 : 0.6 }}
                          >
                            {MODULE_EMOJIS[module.id]}
                          </span>
                        ) : (
                          <img 
                            src={module.icon} 
                            alt="" 
                            className="w-6 h-6 shrink-0"
                            onError={() => handleIconError(module.id)}
                            style={{
                              opacity: isActive ? 1 : isPast ? 0.9 : 0.6,
                              filter: isActive ? 'brightness(0) invert(1)' : 'none',
                            }}
                          />
                        )}
                        <span 
                          className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}
                          style={{ 
                            fontFamily: 'Inter',
                            color: isActive ? 'white' : isPast ? '#00A99D' : '#4a4642',
                          }}
                        >
                          {module.name}
                        </span>
                        {isPast && !isActive && (
                          <svg className="w-4 h-4 ml-auto text-[#00A99D] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Start Over Button */}
                {hasStarted && (
                  <button
                    onClick={startNewChat}
                    className="mt-6 w-full text-sm transition-colors flex items-center justify-center gap-2 py-2.5 rounded-xl hover:bg-white/50"
                    style={{ fontFamily: 'Inter', color: '#6b6560' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Start Over
                  </button>
                )}
              </div>

              {/* Right Side - Chat Area with Light Orange Background */}
              <div 
                className="flex-1 flex flex-col min-w-0"
                style={{
                  background: 'linear-gradient(180deg, #fffaf3 0%, rgba(255, 250, 243, 0.7) 100%)',
                }}
              >
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
                  {!hasStarted ? (
                    /* Welcome State */
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      <div 
                        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                        style={{
                          background: 'rgba(255, 255, 255, 0.8)',
                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.6)',
                        }}
                      >
                        <img 
                          src="/images/clemelopy-icon.png" 
                          alt="Clemelopy" 
                          className="w-12 h-12"
                        />
                      </div>
                      <h2 
                        className="text-2xl mb-3" 
                        style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
                      >
                        Welcome to the GEO Blueprint Builder
                      </h2>
                      <p 
                        className="mb-8 max-w-lg" 
                        style={{ fontFamily: 'Inter', lineHeight: 1.6, color: '#4a4642' }}
                      >
                        I'll guide you through building your personalized Generative Engine Optimization framework 
                        using our Orchard Ecosystem approach. We'll explore your brand, define your pillars, 
                        and create a complete strategy together.
                      </p>
                      <button
                        onClick={startConversation}
                        className="px-8 py-4 rounded-2xl text-white font-semibold transition-all hover:scale-[1.02]"
                        style={{
                          background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                          fontFamily: 'Montserrat Alternates',
                          boxShadow: '0 4px 20px rgba(250, 168, 25, 0.3)',
                        }}
                      >
                        Start Building Your Blueprint
                      </button>
                    </div>
                  ) : (
                    /* Messages */
                    <div className="space-y-4 max-w-2xl mx-auto pb-4">
                      {messages.map((msg, index) => {
                        // Check if this is the first in a sequence of assistant messages
                        const isFirstInAssistantGroup = 
                          msg.role === 'assistant' && 
                          (index === 0 || messages[index - 1].role !== 'assistant');
                        
                        // Check if next message is also assistant (for tighter spacing)
                        const nextIsAlsoAssistant = 
                          msg.role === 'assistant' && 
                          index < messages.length - 1 && 
                          messages[index + 1].role === 'assistant';
                        
                        if (msg.role === 'user') {
                          return (
                            <div
                              key={msg.id}
                              className="flex justify-end"
                            >
                              <div
                                className="max-w-[80%] px-5 py-3 rounded-2xl"
                                style={{
                                  background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                                  color: 'white',
                                  fontFamily: 'Inter',
                                  fontSize: '16px',
                                  fontWeight: 400,
                                  lineHeight: 1.6,
                                  boxShadow: '0 4px 15px rgba(250, 168, 25, 0.25)',
                                }}
                              >
                                {msg.content.split('\n').map((line, i) => (
                                  <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        
                        // Assistant message
                        return (
                          <div
                            key={msg.id}
                            className={`flex justify-start ${nextIsAlsoAssistant ? 'mb-[-8px]' : ''}`}
                          >
                            {/* Clemelopy Avatar - only on first message in a group */}
                            {isFirstInAssistantGroup ? (
                              <div 
                                className="w-9 h-9 rounded-xl shrink-0 mr-3 flex items-center justify-center mt-1"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.9)',
                                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
                                  border: '1px solid rgba(255, 255, 255, 0.6)',
                                }}
                              >
                                <img 
                                  src="/images/clemelopy-icon.png" 
                                  alt="Clemelopy" 
                                  className="w-5 h-5"
                                />
                              </div>
                            ) : (
                              <div className="w-9 shrink-0 mr-3" /> /* Spacer for alignment */
                            )}
                            <div
                              className="max-w-[85%] px-5 py-3 rounded-2xl"
                              style={{
                                background: 'rgba(255, 255, 255, 0.92)',
                                color: '#3d3d3d',
                                fontFamily: 'Inter',
                                fontSize: '16px',
                                fontWeight: 350,
                                lineHeight: 1.65,
                                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.8)',
                              }}
                            >
                              {msg.content.split('\n').map((line, i) => (
                                <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Loading/Typing indicator */}
                      {(isLoading || isTyping) && (
                        <div className="flex justify-start">
                          {/* Clemelopy Avatar - show for initial loading, spacer for typing between messages */}
                          {isLoading && !isTyping ? (
                            <div 
                              className="w-9 h-9 rounded-xl shrink-0 mr-3 flex items-center justify-center mt-1"
                              style={{
                                background: 'rgba(255, 255, 255, 0.9)',
                                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.6)',
                              }}
                            >
                              <img 
                                src="/images/clemelopy-icon.png" 
                                alt="Clemelopy" 
                                className="w-5 h-5"
                              />
                            </div>
                          ) : (
                            <div className="w-9 shrink-0 mr-3" /> /* Spacer for alignment when typing */
                          )}
                          <div 
                            className="px-5 py-3 rounded-2xl"
                            style={{ 
                              background: 'rgba(255, 255, 255, 0.92)',
                              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.8)',
                            }}
                          >
                            <div className="flex gap-1">
                              <div className="w-2 h-2 rounded-full bg-[#00A99D]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 rounded-full bg-[#00A99D]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 rounded-full bg-[#00A99D]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input Area */}
                {hasStarted && (
                  <div 
                    className="p-4 shrink-0"
                    style={{ 
                      background: '#fffaf3',
                    }}
                  >
                    <div 
                      className="max-w-2xl mx-auto flex items-center gap-3 p-2 rounded-2xl"
                      style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        boxShadow: '0 2px 15px rgba(0, 0, 0, 0.06)',
                        border: '1px solid rgba(250, 168, 25, 0.15)',
                      }}
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your response..."
                        disabled={isLoading}
                        autoFocus
                        className="flex-1 px-4 py-3 bg-transparent focus:outline-none"
                        style={{
                          fontFamily: 'Inter',
                          fontSize: '15px',
                          color: '#1a1a1a',
                        }}
                      />
                      <button
                        onClick={() => sendMessage(inputValue)}
                        disabled={!inputValue.trim() || isLoading}
                        className="w-12 h-12 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                          boxShadow: '0 4px 15px rgba(250, 168, 25, 0.4)',
                        }}
                      >
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress Bar - White Background */}
                {hasStarted && (
                  <div 
                    className="px-6 py-3 shrink-0"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.95)',
                      borderTop: '1px solid rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div className="max-w-2xl mx-auto">
                      <div className="flex items-center justify-between mb-1.5">
                        <span 
                          className="text-xs"
                          style={{ fontFamily: 'Inter', color: '#888', fontWeight: 400 }}
                        >
                          Blueprint Progress
                        </span>
                        <span 
                          className="text-xs"
                          style={{ 
                            fontFamily: 'Inter',
                            color: '#00A99D',
                            fontWeight: 500,
                          }}
                        >
                          {progress}%
                        </span>
                      </div>
                      <div 
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'rgba(0, 0, 0, 0.05)' }}
                      >
                        <div 
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, #FAA819 0%, #E99502 40%, #00A99D 100%)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* End Course Layout */}
          </div>
          {/* End Inner Container */}
        </div>
        {/* End Main Glassmorphic Container */}
      </main>
    </Layout>
  );
}