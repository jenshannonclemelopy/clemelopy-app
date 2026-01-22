'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Image from 'next/image';
import Link from 'next/link';
import BlueprintWaitlistModal from '../components/BlueprintWaitlistModal';

// Image Lightbox Component with zoom
function ImageLightbox({ 
  isOpen, 
  onClose, 
  src, 
  alt 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  src: string; 
  alt: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset zoom and position when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 3));
      if (e.key === '-') setZoom(z => Math.max(z - 0.25, 0.5));
      if (e.key === '0') { setZoom(1); setPosition({ x: 0, y: 0 }); }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(Math.max(z + delta, 0.5), 3));
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Close lightbox"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
        <button
          onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(z - 0.25, 0.5)); }}
          className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
          aria-label="Zoom out"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35M8 11h6" />
          </svg>
        </button>
        
        <span className="text-white text-sm font-medium min-w-[60px] text-center" style={{ fontFamily: 'Inter' }}>
          {Math.round(zoom * 100)}%
        </span>
        
        <button
          onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(z + 0.25, 3)); }}
          className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
          aria-label="Zoom in"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
          </svg>
        </button>
        
        <button
          onClick={(e) => { e.stopPropagation(); setZoom(1); setPosition({ x: 0, y: 0 }); }}
          className="p-2 rounded-full hover:bg-white/20 transition-colors text-white ml-2"
          aria-label="Reset zoom"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>

      {/* Help text */}
      <div className="absolute top-4 left-4 z-10 text-white/60 text-sm" style={{ fontFamily: 'Inter' }}>
        <p>Scroll to zoom • Drag to pan • Press ESC to close</p>
      </div>

      {/* Image container */}
      <div
        className="relative overflow-hidden"
        style={{ 
          width: '90vw', 
          height: '90vh',
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-100"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          }}
        >
          <Image
            src={src}
            alt={alt}
            width={1200}
            height={840}
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
            priority
          />
        </div>
      </div>
    </div>
  );
}

interface Slide {
  eyebrow: string;
  title: string;
  content: React.ReactNode;
  hasNavigationButton?: boolean;
  nextComponentId?: string;
}

interface EcosystemComponent {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  slides: Slide[];
}

const ecosystemComponents: EcosystemComponent[] = [
  {
    id: 'roots',
    name: 'Roots',
    tagline: 'Core ideas your content grows from',
    icon: '/icons/Riits.png',
    slides: [
      {
        eyebrow: 'FOUNDATION',
        title: 'What Are Roots?',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In nature, roots are the foundation of a plant. They anchor it into the soil, keep it stable against outside forces, and provide a steady base from which it can grow, stretch, and support itself over time.</p>
            <p className="mb-4 text-[#2e2a27]">Without strong roots, a plant may sprout quickly, but it cannot sustain growth. It becomes unstable, inconsistent, and vulnerable to collapse when conditions change.</p>
            <p className="text-[#00A99D] font-semibold italic" style={{ fontFamily: 'Montserrat Alternates' }}>Your content works the same way.</p>
          </>
        ),
      },
      {
        eyebrow: 'FOUNDATION',
        title: 'Roots in a Digital Ecosystem',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In the Clemelopy framework, roots are the <strong className="text-[#00A99D] italic">foundational concepts</strong> your entire digital presence grows from.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">They anchor your content to a clear purpose and give your website a stable base. Roots define what you are actually about beneath the surface — your core expertise, perspective, and the problems you consistently solve.</p>
            <p className="text-lg mb-3 font-semibold text-[#2e2a27]">When your roots are clear:</p>
            <ul className="space-y-2 mb-4 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Your content grows in a focused direction</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Your pages support one another instead of competing</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Your message stays grounded as your site expands</li>
            </ul>
            <p className="text-lg text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Roots are not individual pages or posts. They are the underlying ideas that make every page make sense in relation to the others.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Roots in Practice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">To understand roots, it helps to see what they look like in practice.</p>
            <div className="p-5 rounded-xl" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 1: XYZ Bakery</p>
              <p className="text-[#2e2a27]/70 mb-3">A small-batch bakery and café</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Roots:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Sourdough fermentation and traditional baking methods</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Local, seasonal ingredients</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Slow food and intentional craft</li>
              </ul>
            </div>
            <p className="mt-4 text-[#2e2a27]">Everything they create — their menu pages, blog posts, class offerings, and social content — grows from these core ideas. Even when they introduce new products, the foundation stays the same.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Wellness',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(0, 169, 157, 0.08)', border: '1px solid rgba(0, 169, 157, 0.2)' }}>
              <p className="text-[#00A99D] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 2: XYZ Wellness</p>
              <p className="text-[#2e2a27]/70 mb-3">A holistic physical therapy practice</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Roots:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Functional movement and injury prevention</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Education over quick fixes</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Long-term body sustainability</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">Their website doesn&apos;t just list services. It consistently teaches, explains, and reinforces these principles across pages, helping both people and AI systems understand what makes their approach distinct.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Digital',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 3: XYZ Digital</p>
              <p className="text-[#2e2a27]/70 mb-3">A consulting firm for small businesses</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Roots:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Systems over hustle</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Sustainable growth for small teams</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Clarity in operations and decision-making</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">Whether they&apos;re writing about onboarding, tools, or strategy, their content always ties back to helping businesses operate more clearly and intentionally, not just grow faster.</p>
          </>
        ),
      },
      {
        eyebrow: 'PATTERN',
        title: 'The Pattern to Notice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">In each example:</p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">1</span>
                <span className="text-[#2e2a27]">The roots stay consistent, even as offerings expand</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">2</span>
                <span className="text-[#2e2a27]">Content feels connected instead of scattered</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">3</span>
                <span className="text-[#2e2a27]">The business becomes easier to understand and recommend</span>
              </div>
            </div>
            <p className="text-[#00A99D] text-center" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Strong roots create stability first — growth follows naturally.</p>
          </>
        ),
      },
      {
        eyebrow: 'WHY IT MATTERS',
        title: 'Why Roots Matter for Growth and Visibility',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Just as plants rely on roots to stay upright and nourished, your content relies on roots to stay coherent and recognizable.</p>
            <p className="text-lg mb-3 font-semibold text-[#2e2a27]">Strong roots help:</p>
            <ul className="space-y-2 mb-4 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>People</strong> understand you faster because your message feels consistent</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>AI systems</strong> recognize patterns in what you do and when to recommend you</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>Your ecosystem</strong> scale without losing clarity or direction</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Without defined roots, content can still exist — but it grows scattered, disconnected, and harder to interpret.</p>
          </>
        ),
      },
      {
        eyebrow: 'FRAMEWORK',
        title: 'In the Orchard Ecosystem Framework™',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Roots form the <strong className="text-[#00A99D] italic">foundation layer</strong> of your orchard.</p>
            <p className="text-lg mb-3 text-[#2e2a27]">They support everything above them:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[{text: 'Trunks (each page\'s primary purpose)', color: '#00A99D'}, {text: 'Branches (supporting topics)', color: '#00A99D'}, {text: 'Leaves (clarity signals)', color: '#00A99D'}, {text: 'Fruit (proof and outcomes)', color: '#00A99D'}, {text: 'Pollinators (external credibility)', color: '#00A99D'}].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-[#2e2a27]" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                  <span style={{ color: item.color }}>↑</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-center mb-2 text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Every visible result starts below the surface.</p>
            <p className="text-[#2e2a27]">Strong roots create a digital ecosystem that can grow with intention, withstand change, and remain understandable, no matter how complex it becomes.</p>
          </>
        ),
      },
      {
        eyebrow: 'CLEMELOPY',
        title: "Clemelopy's Roots",
        content: (
          <>
            <p className="text-lg text-[#00A99D] mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>A platform for Generative Engine Optimization and AI-aware digital strategy</p>
            <p className="text-lg font-semibold mb-3 text-[#2e2a27]">Clemelopy&apos;s Roots:</p>
            <ul className="space-y-2 mb-5 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Helping businesses be clearly understood by AI and generative search</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Systems-first thinking over isolated tactics</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Long-term visibility built on clarity, structure, and intent</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Making generative engine optimization easy for non-technical business owners to understand and implement</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Everything inside Clemelopy — its frameworks, tools, and education — grows from these core ideas. As the platform expands, the foundation stays the same, keeping the ecosystem coherent and scalable.</p>
          </>
        ),
      },
      {
        eyebrow: 'UP NEXT',
        title: 'Ready to Explore Soil?',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Now that you understand how roots anchor your content, it&apos;s time to explore what nourishes them.</p>
            <p className="text-lg mb-6 text-[#2e2a27]">Soil represents the shared language beneath your content — the anchor text and natural phrases that connect your pages and help AI understand relationships across your site.</p>
            <div className="text-center">
              <button 
                onClick={() => {
                  const soilComponent = ecosystemComponents.find(c => c.id === 'soil');
                  if (soilComponent && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('openEcosystemModal', { detail: soilComponent }));
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
                style={{ background: 'linear-gradient(135deg, #00A99D, #0D7871)', fontFamily: 'Montserrat Alternates' }}
              >
                Continue Your Journey to Soil
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </>
        ),
        hasNavigationButton: true,
        nextComponentId: 'soil',
      },
    ],
  },
  {
    id: 'soil',
    name: 'Soil',
    tagline: 'The shared language beneath your content',
    icon: '/icons/Soil.png',
    slides: [
      {
        eyebrow: 'FOUNDATION',
        title: 'What Is Soil?',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In nature, soil is what surrounds the roots. It holds nutrients, retains moisture, and creates the conditions roots need to survive and grow.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">Even the strongest roots cannot thrive if the soil around them is depleted, compacted, or inconsistent. When soil lacks nutrients, dries out too quickly, or changes composition from one area to another, roots struggle to absorb what they need and growth becomes uneven.</p>
            <p className="text-[#00A99D] font-semibold italic" style={{ fontFamily: 'Montserrat Alternates' }}>Soil doesn&apos;t replace roots. It nurtures and supports them.</p>
          </>
        ),
      },
      {
        eyebrow: 'FOUNDATION',
        title: 'Soil in a Digital Ecosystem',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In the Clemelopy framework, soil is the <strong className="text-[#00A99D] italic">shared language and context</strong> that nurtures your core ideas.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">It surrounds your foundational concepts with consistent words, explanations, and framing, allowing those ideas to take hold and grow stronger over time.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">While roots define what you are about, soil determines whether those ideas are reinforced or weakened as people and AI systems move through your site.</p>
            <p className="text-lg mb-3 font-semibold text-[#2e2a27]">When your soil is healthy:</p>
            <ul className="space-y-2 mb-4 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Your core ideas are consistently reinforced</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Meaning accumulates instead of resetting on each page</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Your message feels familiar and grounded across your ecosystem</li>
            </ul>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Soil in Practice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">To understand soil, it helps to see how shared language nurtures ideas in practice.</p>
            <div className="p-5 rounded-xl" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 1: XYZ Bakery</p>
              <p className="text-[#2e2a27]/70 mb-3">A small-batch bakery and café</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Soil:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Consistent language like &quot;naturally fermented,&quot; &quot;slow process,&quot; and &quot;hand-shaped&quot;</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Repeated explanations of why fermentation matters</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Familiar phrasing across menus, blog posts, and class descriptions</li>
              </ul>
            </div>
            <p className="mt-4 text-[#2e2a27]">This shared language nurtures their roots, reinforcing what they stand for no matter where someone enters the site.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Wellness',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(0, 169, 157, 0.08)', border: '1px solid rgba(0, 169, 157, 0.2)' }}>
              <p className="text-[#00A99D] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 2: XYZ Wellness</p>
              <p className="text-[#2e2a27]/70 mb-3">A holistic physical therapy practice</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Soil:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Repeated terminology around &quot;functional movement&quot; and &quot;long-term recovery&quot;</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Shared definitions for posture, mobility, and injury prevention</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> A consistent educational tone across service pages and articles</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">Their soil nurtures understanding by surrounding their expertise with the same concepts everywhere.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Digital',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 3: XYZ Digital</p>
              <p className="text-[#2e2a27]/70 mb-3">A consulting firm for small businesses</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Soil:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Consistent phrasing around systems, sustainability, and clarity</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Repeated explanations of why structure matters</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> The same language used across strategy pages, blogs, and onboarding materials</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">Because the soil stays consistent, their ideas feel stable and intentional.</p>
          </>
        ),
      },
      {
        eyebrow: 'PATTERN',
        title: 'The Pattern to Notice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">In each example:</p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">1</span>
                <span className="text-[#2e2a27]">Language stays consistent across the ecosystem</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">2</span>
                <span className="text-[#2e2a27]">Core ideas are nurtured instead of diluted</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">3</span>
                <span className="text-[#2e2a27]">Visitors don&apos;t need to relearn terminology as they explore</span>
              </div>
            </div>
            <p className="text-[#00A99D] text-center" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Healthy soil allows meaning to deepen rather than fragment.</p>
          </>
        ),
      },
      {
        eyebrow: 'WHY IT MATTERS',
        title: 'Why Soil Matters for Growth and Visibility',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Just as roots rely on soil to absorb nutrients, your content relies on shared language to absorb meaning.</p>
            <p className="text-lg mb-3 font-semibold text-[#2e2a27]">Healthy soil helps:</p>
            <ul className="space-y-2 mb-4 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>People</strong> build understanding faster because ideas feel reinforced</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>AI systems</strong> recognize context and relationships between concepts</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>Your ecosystem</strong> scales without becoming confusing or unstable</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Without nurturing soil, even strong roots struggle to support long-term growth.</p>
          </>
        ),
      },
      {
        eyebrow: 'FRAMEWORK',
        title: 'In the Orchard Ecosystem Framework™',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Soil surrounds the roots and <strong className="text-[#00A99D] italic">supports everything above them</strong>.</p>
            <p className="text-lg mb-3 text-[#2e2a27]">It nurtures:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[{text: 'Trunks (clear page intent)', color: '#00A99D'}, {text: 'Branches (related topics)', color: '#00A99D'}, {text: 'Leaves (clarity signals)', color: '#00A99D'}, {text: 'Fruit (proof and outcomes)', color: '#00A99D'}, {text: 'Pollinators (external references)', color: '#00A99D'}].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-[#2e2a27]" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                  <span style={{ color: item.color }}>↑</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Soil is what allows meaning to move consistently throughout the ecosystem.</p>
          </>
        ),
      },
      {
        eyebrow: 'CLEMELOPY',
        title: "Clemelopy's Soil",
        content: (
          <>
            <p className="text-lg text-[#00A99D] mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>A platform for Generative Engine Optimization and AI-aware digital strategy</p>
            <p className="text-lg font-semibold mb-3 text-[#2e2a27]">Clemelopy&apos;s Soil:</p>
            <ul className="space-y-2 mb-5 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Consistent language around clarity, visibility, and understanding</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Repeated explanations of how generative engines interpret content</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Shared metaphors like ecosystems, structure, and connection</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Familiar phrasing across education, tools, and frameworks</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>This shared language nurtures Clemelopy&apos;s roots and allows the platform to grow without losing coherence.</p>
          </>
        ),
      },
      {
        eyebrow: 'UP NEXT',
        title: 'Ready to Explore the Underground Network?',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Now that you understand how soil nurtures your content, it&apos;s time to explore how ideas connect beneath the surface.</p>
            <p className="text-lg mb-6 text-[#2e2a27]">The Underground Network represents the internal links that allow meaning, authority, and context to flow between your pages — like mycelium connecting trees in a forest.</p>
            <div className="text-center">
              <button 
                onClick={() => {
                  const nextComponent = ecosystemComponents.find(c => c.id === 'underground-network');
                  if (nextComponent && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('openEcosystemModal', { detail: nextComponent }));
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
                style={{ background: 'linear-gradient(135deg, #00A99D, #0D7871)', fontFamily: 'Montserrat Alternates' }}
              >
                Continue Your Journey to Underground Network
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </>
        ),
        hasNavigationButton: true,
        nextComponentId: 'underground-network',
      },
    ],
  },
  {
    id: 'underground-network',
    name: 'Underground Network',
    tagline: 'Hidden connections between pages',
    icon: '/icons/Underground Network.png',
    slides: [
      {
        eyebrow: 'FOUNDATION',
        title: 'What Is an Underground Network?',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In nature, plants are not as independent as they appear. Beneath the soil, roots are often connected through vast underground networks of fungi and microorganisms.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">These networks allow plants to share nutrients, exchange signals, and support one another. A healthy plant can help a struggling one. Information about stress, resources, or changes in the environment travels quietly below the surface.</p>
            <p className="text-[#00A99D] font-semibold italic" style={{ fontFamily: 'Montserrat Alternates' }}>The underground network isn&apos;t visible — but it&apos;s essential.</p>
          </>
        ),
      },
      {
        eyebrow: 'FOUNDATION',
        title: 'Underground Network in a Digital Ecosystem',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In the Clemelopy framework, the underground network represents the <strong className="text-[#00A99D] italic">hidden connections between your pages</strong>.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">These are the relationships that help meaning travel across your site:</p>
            <ul className="space-y-2 mb-4 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> How pages reference one another</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> How ideas build instead of repeating</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> How context flows beneath the surface</li>
            </ul>
            <p className="text-lg text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>While roots define meaning and soil nurtures it, the underground network connects everything together.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Underground Network in Practice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">To understand the underground network, it helps to see how invisible connections work in practice.</p>
            <div className="p-5 rounded-xl" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 1: XYZ Bakery</p>
              <p className="text-[#2e2a27]/70 mb-3">A small-batch bakery and café</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Underground Network:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Blog posts link back to core baking principles</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Class pages reference ingredient sourcing pages</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Menu descriptions reinforce concepts explained elsewhere</li>
              </ul>
            </div>
            <p className="mt-4 text-[#2e2a27]">Each page strengthens the others, even when they serve different purposes.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Wellness',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(0, 169, 157, 0.08)', border: '1px solid rgba(0, 169, 157, 0.2)' }}>
              <p className="text-[#00A99D] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 2: XYZ Wellness</p>
              <p className="text-[#2e2a27]/70 mb-3">A holistic physical therapy practice</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Underground Network:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Service pages reference educational articles</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Articles connect back to core movement principles</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> FAQs tie multiple services together conceptually</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">Meaning travels between pages instead of being isolated.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Digital',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 3: XYZ Digital</p>
              <p className="text-[#2e2a27]/70 mb-3">A consulting firm for small businesses</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Underground Network:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Strategy pages connect to systems explanations</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Case studies reference frameworks used elsewhere</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Blog content reinforces concepts introduced on core pages</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">Their site functions as a system, not a collection of standalone pages.</p>
          </>
        ),
      },
      {
        eyebrow: 'PATTERN',
        title: 'The Pattern to Notice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">In each example:</p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">1</span>
                <span className="text-[#2e2a27]">Pages support one another quietly</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">2</span>
                <span className="text-[#2e2a27]">Meaning compounds instead of resetting</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">3</span>
                <span className="text-[#2e2a27]">No page exists in isolation</span>
              </div>
            </div>
            <p className="text-[#00A99D] text-center" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>The underground network makes the ecosystem stronger without being obvious.</p>
          </>
        ),
      },
      {
        eyebrow: 'WHY IT MATTERS',
        title: 'Why the Underground Network Matters',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Just as plants rely on underground networks to survive changing conditions, your content relies on internal connections to stay resilient.</p>
            <p className="text-lg mb-3 font-semibold text-[#2e2a27]">A strong underground network helps:</p>
            <ul className="space-y-2 mb-4 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>AI systems</strong> understand how ideas relate</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>People</strong> move naturally through your site</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>Your ecosystem</strong> stay stable as it grows</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Without it, content may still exist — but it becomes fragmented and fragile.</p>
          </>
        ),
      },
      {
        eyebrow: 'FRAMEWORK',
        title: 'In the Orchard Ecosystem Framework™',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">The underground network <strong className="text-[#00A99D] italic">weaves through everything below the surface</strong>.</p>
            <p className="text-lg mb-3 text-[#2e2a27]">It connects:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[{text: 'Roots (core ideas)', color: '#00A99D'}, {text: 'Soil (shared language)', color: '#00A99D'}, {text: 'Trunks (page purpose)', color: '#00A99D'}, {text: 'Branches (related topics)', color: '#00A99D'}].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-[#2e2a27]" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                  <span style={{ color: item.color }}>↔</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>It ensures meaning flows throughout the orchard instead of stopping at individual pages.</p>
          </>
        ),
      },
      {
        eyebrow: 'CLEMELOPY',
        title: "Clemelopy's Underground Network",
        content: (
          <>
            <p className="text-lg text-[#00A99D] mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>A platform for Generative Engine Optimization and AI-aware digital strategy</p>
            <p className="text-lg font-semibold mb-3 text-[#2e2a27]">Clemelopy&apos;s Underground Network:</p>
            <ul className="space-y-2 mb-5 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Frameworks reference one another instead of standing alone</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Educational content connects back to core concepts</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Tools, guides, and explanations reinforce shared ideas</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>These invisible connections allow Clemelopy to grow as a cohesive system rather than a set of disconnected resources.</p>
          </>
        ),
      },
      {
        eyebrow: 'UP NEXT',
        title: 'Moving Above Ground',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">You&apos;ve now explored everything beneath the surface:</p>
            <div className="space-y-2 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Roots</strong> define what matters</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Soil</strong> nurtures those ideas with consistent language</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Underground networks</strong> connect everything into a living system</span>
              </div>
            </div>
            <p className="text-lg mb-6 text-[#2e2a27]">Next, we move above ground to explore the Trunk — the clear purpose that gives each page its structure.</p>
            <div className="text-center">
              <button 
                onClick={() => {
                  const nextComponent = ecosystemComponents.find(c => c.id === 'trunk');
                  if (nextComponent && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('openEcosystemModal', { detail: nextComponent }));
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
                style={{ background: 'linear-gradient(135deg, #00A99D, #0D7871)', fontFamily: 'Montserrat Alternates' }}
                aria-label="Continue to learn about Trunk"
              >
                Continue Your Journey to Trunk
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </>
        ),
        hasNavigationButton: true,
        nextComponentId: 'trunk',
      },
    ],
  },
  {
    id: 'trunk',
    name: 'Trunk',
    tagline: 'The single job your page does',
    icon: '/icons/Trunk.png',
    slides: [
      {
        eyebrow: 'STRUCTURE',
        title: 'What Are Trunks?',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In nature, the trunk is the main structural support of a tree. It rises from the roots, stands upright, and gives the tree its primary shape and direction.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">A trunk has a single job: to support growth upward while connecting everything below ground to everything above it.</p>
            <p className="text-[#00A99D] font-semibold italic" style={{ fontFamily: 'Montserrat Alternates' }}>Without a strong trunk, a tree cannot stand tall — no matter how healthy its roots or soil may be.</p>
          </>
        ),
      },
      {
        eyebrow: 'STRUCTURE',
        title: 'Trunks in a Digital Ecosystem',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In the Clemelopy framework, a trunk represents <strong className="text-[#00A99D] italic">a single page and its primary purpose</strong>.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">Each page should stand for one clear idea. The trunk gives that idea structure, focus, and direction.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">While roots define what your business is about, and soil nurtures shared meaning, trunks ensure each page knows exactly why it exists.</p>
            <p className="text-lg text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>A page without a clear trunk becomes unstable — it tries to do too much and supports nothing well.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Trunks in Practice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">To understand trunks, it helps to see what focused page purpose looks like in practice.</p>
            <div className="p-5 rounded-xl" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 1: XYZ Bakery</p>
              <p className="text-[#2e2a27]/80 mb-3">A small-batch bakery and café</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Trunk:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> One page dedicated to sourdough bread</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> One clear purpose: explain, showcase, and sell their sourdough offerings</li>
              </ul>
            </div>
            <p className="mt-4 text-[#2e2a27]">That page doesn&apos;t try to teach every baking method. It stands tall around one idea.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Wellness',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(0, 169, 157, 0.08)', border: '1px solid rgba(0, 169, 157, 0.2)' }}>
              <p className="text-[#00A99D] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 2: XYZ Wellness</p>
              <p className="text-[#2e2a27]/80 mb-3">A holistic physical therapy practice</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Trunk:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> One page dedicated to injury prevention services</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> One clear purpose: educate visitors and guide them toward booking care</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">Education supports the trunk, but the page remains focused.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Digital',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 3: XYZ Digital</p>
              <p className="text-[#2e2a27]/80 mb-3">A consulting firm for small businesses</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Trunk:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> One page dedicated to systems consulting</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> One clear purpose: explain the service and who it&apos;s for</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">Other ideas branch off, but the trunk stays singular.</p>
          </>
        ),
      },
      {
        eyebrow: 'PATTERN',
        title: 'The Pattern to Notice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">In each example:</p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">1</span>
                <span className="text-[#2e2a27]">Each page has one primary job</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">2</span>
                <span className="text-[#2e2a27]">Supporting information reinforces that job instead of competing with it</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">3</span>
                <span className="text-[#2e2a27]">Pages feel confident, clear, and easy to understand</span>
              </div>
            </div>
            <p className="text-[#00A99D] text-center" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Strong trunks prevent confusion and create structural integrity.</p>
          </>
        ),
      },
      {
        eyebrow: 'WHY IT MATTERS',
        title: 'Why Trunks Matter for Growth and Visibility',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Just as a tree relies on its trunk for stability, your ecosystem relies on clear page purpose.</p>
            <p className="text-lg mb-3 font-semibold text-[#2e2a27]">Strong trunks help:</p>
            <ul className="space-y-2 mb-4 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>People</strong> immediately understand what a page is about</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>AI systems</strong> interpret intent without ambiguity</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>Your content</strong> scales without becoming bloated or unfocused</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Without a strong trunk, pages collapse under too many ideas.</p>
          </>
        ),
      },
      {
        eyebrow: 'FRAMEWORK',
        title: 'In the Orchard Ecosystem Framework™',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Trunks <strong className="text-[#00A99D] italic">rise directly from the roots and soil</strong>.</p>
            <p className="text-lg mb-3 text-[#2e2a27]">They support:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[{text: 'Branches (related ideas)', color: '#00A99D'}, {text: 'Leaves (clarity signals)', color: '#00A99D'}, {text: 'Fruit (proof and outcomes)', color: '#00A99D'}].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-[#2e2a27]" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                  <span style={{ color: item.color }}>↑</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Every page should have one trunk — even if it supports many branches.</p>
          </>
        ),
      },
      {
        eyebrow: 'CLEMELOPY',
        title: "Clemelopy's Trunks",
        content: (
          <>
            <p className="text-lg text-[#00A99D] mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>A platform for Generative Engine Optimization and AI-aware digital strategy</p>
            <p className="text-lg font-semibold mb-3 text-[#2e2a27]">Clemelopy&apos;s Trunks:</p>
            <ul className="space-y-2 mb-5 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> One page dedicated to Generative Engine Optimization</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> One page dedicated to the Orchard Ecosystem Framework™</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> One page dedicated to the Linking Strategy Map</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Each page exists for a single reason and connects cleanly into the larger ecosystem.</p>
          </>
        ),
      },
      {
        eyebrow: 'UP NEXT',
        title: 'Moving Outward and Upward',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">You&apos;ve now explored the core structure:</p>
            <div className="space-y-2 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Roots</strong> define what matters</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Soil</strong> nurtures meaning</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Underground networks</strong> connect ideas</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Trunks</strong> give each page purpose</span>
              </div>
            </div>
            <p className="text-lg mb-6 text-[#2e2a27]">Next, we explore Branches — where purpose expands into depth and dimension.</p>
            <div className="text-center">
              <button 
                onClick={() => {
                  const nextComponent = ecosystemComponents.find(c => c.id === 'branches');
                  if (nextComponent && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('openEcosystemModal', { detail: nextComponent }));
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
                style={{ background: 'linear-gradient(135deg, #00A99D, #0D7871)', fontFamily: 'Montserrat Alternates' }}
                aria-label="Continue to learn about Branches"
              >
                Continue Your Journey to Branches
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </>
        ),
        hasNavigationButton: true,
        nextComponentId: 'branches',
      },
    ],
  },
  {
    id: 'branches',
    name: 'Branches',
    tagline: 'Supporting topics that extend reach',
    icon: '/icons/Branches.png',
    slides: [
      {
        eyebrow: 'STRUCTURE',
        title: 'What Are Branches?',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In nature, branches extend outward from the trunk. They give a tree its reach, shape, and ability to spread.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">Branches grow in many directions, but they all originate from the same trunk. When branches grow without a strong trunk, they become unstable and prone to breaking.</p>
            <p className="text-[#00A99D] font-semibold italic" style={{ fontFamily: 'Montserrat Alternates' }}>Branches allow a tree to expand — without losing its center.</p>
          </>
        ),
      },
      {
        eyebrow: 'STRUCTURE',
        title: 'Branches in a Digital Ecosystem',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In the Clemelopy framework, branches are the <strong className="text-[#00A99D] italic">related ideas that extend from a page&apos;s main purpose</strong>.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">They add depth, context, and dimension to what a page is about, without changing its core focus.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">Branches help answer supporting questions, explore adjacent topics, and guide readers deeper — while still reinforcing the trunk.</p>
            <p className="text-lg text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Branches do not replace the main idea. They support it.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Branches in Practice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">To understand branches, it helps to see how supporting ideas extend from a focused page.</p>
            <div className="p-5 rounded-xl" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 1: XYZ Bakery</p>
              <p className="text-[#2e2a27]/80 mb-3">A small-batch bakery and café</p>
              <p className="font-semibold mb-1 text-[#2e2a27]">Their Trunk: <span className="font-normal">Sourdough bread</span></p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Branches:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Fermentation timelines</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Flour types</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Storage and freshness tips</li>
              </ul>
            </div>
            <p className="mt-4 text-[#2e2a27]">These topics add depth without shifting the page away from sourdough.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Wellness',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(0, 169, 157, 0.08)', border: '1px solid rgba(0, 169, 157, 0.2)' }}>
              <p className="text-[#00A99D] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 2: XYZ Wellness</p>
              <p className="text-[#2e2a27]/80 mb-3">A holistic physical therapy practice</p>
              <p className="font-semibold mb-1 text-[#2e2a27]">Their Trunk: <span className="font-normal">Injury prevention services</span></p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Branches:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Warm-up routines</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Mobility exercises</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Common causes of recurring injury</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">Each branch supports the service rather than competing with it.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Digital',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 3: XYZ Digital</p>
              <p className="text-[#2e2a27]/80 mb-3">A consulting firm for small businesses</p>
              <p className="font-semibold mb-1 text-[#2e2a27]">Their Trunk: <span className="font-normal">Systems consulting</span></p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Branches:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Workflow optimization</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Tool selection</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Documentation best practices</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">The trunk remains clear while the branches expand understanding.</p>
          </>
        ),
      },
      {
        eyebrow: 'PATTERN',
        title: 'The Pattern to Notice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">In each example:</p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">1</span>
                <span className="text-[#2e2a27]">Branches stay clearly connected to the trunk</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">2</span>
                <span className="text-[#2e2a27]">Supporting ideas feel intentional, not random</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">3</span>
                <span className="text-[#2e2a27]">Depth is added without diluting purpose</span>
              </div>
            </div>
            <p className="text-[#00A99D] text-center" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Healthy branches make content richer, not heavier.</p>
          </>
        ),
      },
      {
        eyebrow: 'WHY IT MATTERS',
        title: 'Why Branches Matter for Growth and Visibility',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Just as branches help a tree capture light and space, content branches help your pages capture understanding.</p>
            <p className="text-lg mb-3 font-semibold text-[#2e2a27]">Strong branches help:</p>
            <ul className="space-y-2 mb-4 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Answer related questions without creating new, competing pages</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Show expertise through exploration, not repetition</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Help AI systems recognize topic breadth around a core idea</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Without branches, pages feel thin. With too many trunks, ecosystems feel fragmented.</p>
          </>
        ),
      },
      {
        eyebrow: 'FRAMEWORK',
        title: 'In the Orchard Ecosystem Framework™',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Branches <strong className="text-[#00A99D] italic">extend directly from the trunk</strong>.</p>
            <p className="text-lg mb-3 text-[#2e2a27]">They support:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[{text: 'Leaves (clarity signals)', color: '#00A99D'}, {text: 'Fruit (proof and outcomes)', color: '#00A99D'}, {text: 'Pollinators (external references)', color: '#00A99D'}].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-[#2e2a27]" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                  <span style={{ color: item.color }}>↗</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Branches are where expansion happens — without losing structure.</p>
          </>
        ),
      },
      {
        eyebrow: 'CLEMELOPY',
        title: "Clemelopy's Branches",
        content: (
          <>
            <p className="text-lg text-[#00A99D] mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>A platform for Generative Engine Optimization and AI-aware digital strategy</p>
            <p className="text-lg font-semibold mb-3 text-[#2e2a27]">Clemelopy&apos;s Branches:</p>
            <ul className="space-y-2 mb-5 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Supporting explanations of GEO concepts</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Page-level education tied to a single purpose</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Examples and use cases that deepen understanding</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>These branches expand Clemelopy&apos;s pages while keeping each one grounded in a clear trunk.</p>
          </>
        ),
      },
      {
        eyebrow: 'UP NEXT',
        title: 'Where Clarity Becomes Visible',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">You&apos;ve now explored how content takes shape:</p>
            <div className="space-y-2 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Roots</strong> define what matters</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Soil</strong> nurtures meaning</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Underground networks</strong> connect ideas</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Trunks</strong> give pages purpose</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Branches</strong> extend that purpose</span>
              </div>
            </div>
            <p className="text-lg mb-6 text-[#2e2a27]">Next comes Leaves — where clarity becomes visible and understanding sharpens.</p>
            <div className="text-center">
              <button 
                onClick={() => {
                  const nextComponent = ecosystemComponents.find(c => c.id === 'leaves');
                  if (nextComponent && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('openEcosystemModal', { detail: nextComponent }));
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
                style={{ background: 'linear-gradient(135deg, #00A99D, #0D7871)', fontFamily: 'Montserrat Alternates' }}
                aria-label="Continue to learn about Leaves"
              >
                Continue Your Journey to Leaves
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </>
        ),
        hasNavigationButton: true,
        nextComponentId: 'leaves',
      },
    ],
  },
  {
    id: 'leaves',
    name: 'Leaves',
    tagline: 'Clarity signals that aid understanding',
    icon: '/icons/Leaves.png',
    slides: [
      {
        eyebrow: 'STRUCTURE',
        title: 'What Are Leaves?',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In nature, leaves are where photosynthesis happens. They capture light, convert it into energy, and power growth throughout the entire tree.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">Leaves are visible, lightweight, and abundant. Individually they may seem small, but together they sustain the whole system.</p>
            <p className="text-[#00A99D] font-semibold italic" style={{ fontFamily: 'Montserrat Alternates' }}>A tree can have strong roots and a solid trunk, but without healthy leaves, it cannot generate energy.</p>
          </>
        ),
      },
      {
        eyebrow: 'STRUCTURE',
        title: 'Leaves in a Digital Ecosystem',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In the Clemelopy framework, leaves are <strong className="text-[#00A99D] italic">clarity signals</strong>.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">They are the small, visible elements that help people and AI systems quickly understand what they&apos;re looking at and how information is organized.</p>
            <p className="text-lg text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Leaves don&apos;t introduce new ideas. They make existing ideas easier to absorb.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Leaves in Practice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">To understand leaves, it helps to see how clarity shows up in practice.</p>
            <div className="p-5 rounded-xl" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 1: XYZ Bakery</p>
              <p className="text-[#2e2a27]/80 mb-3">A small-batch bakery and café</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Leaves:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Clear section headers like &quot;Ingredients,&quot; &quot;Process,&quot; and &quot;Storage&quot;</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Short explanations for baking terms</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Cleanly labeled menus and product descriptions</li>
              </ul>
            </div>
            <p className="mt-4 text-[#2e2a27]">These signals help visitors understand the page at a glance.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Wellness',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(0, 169, 157, 0.08)', border: '1px solid rgba(0, 169, 157, 0.2)' }}>
              <p className="text-[#00A99D] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 2: XYZ Wellness</p>
              <p className="text-[#2e2a27]/80 mb-3">A holistic physical therapy practice</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Leaves:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Headings that explain services in plain language</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Brief summaries before deeper explanations</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> FAQ-style clarifications for common concerns</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">The page feels approachable instead of overwhelming.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Digital',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 3: XYZ Digital</p>
              <p className="text-[#2e2a27]/80 mb-3">A consulting firm for small businesses</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Leaves:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Clear subheadings that outline the process</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Bullet points that break down complex ideas</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Short explanations that reduce ambiguity</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">Leaves turn complexity into clarity.</p>
          </>
        ),
      },
      {
        eyebrow: 'PATTERN',
        title: 'The Pattern to Notice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">In each example:</p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">1</span>
                <span className="text-[#2e2a27]">Pages are easy to scan</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">2</span>
                <span className="text-[#2e2a27]">Meaning is visible without reading everything</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">3</span>
                <span className="text-[#2e2a27]">Structure feels intentional, not dense</span>
              </div>
            </div>
            <p className="text-[#00A99D] text-center" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Healthy leaves make content usable.</p>
          </>
        ),
      },
      {
        eyebrow: 'WHY IT MATTERS',
        title: 'Why Leaves Matter for Growth and Visibility',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Just as leaves power a tree by converting light into energy, clarity powers understanding.</p>
            <p className="text-lg mb-3 font-semibold text-[#2e2a27]">Strong leaves help:</p>
            <ul className="space-y-2 mb-4 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>People</strong> quickly determine relevance</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>AI systems</strong> interpret structure and intent</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>Your content</strong> perform better without becoming longer</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Without clear leaves, even strong content can feel heavy and confusing.</p>
          </>
        ),
      },
      {
        eyebrow: 'FRAMEWORK',
        title: 'In the Orchard Ecosystem Framework™',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Leaves <strong className="text-[#00A99D] italic">sit on branches and surround the trunk</strong>.</p>
            <p className="text-lg mb-3 text-[#2e2a27]">They support:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[{text: 'Fruit (proof and outcomes)', color: '#00A99D'}, {text: 'Pollinators (external recognition)', color: '#00A99D'}, {text: 'The overall health of the ecosystem', color: '#00A99D'}].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-[#2e2a27]" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                  <span style={{ color: item.color }}>✦</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Leaves are where structure becomes readable.</p>
          </>
        ),
      },
      {
        eyebrow: 'CLEMELOPY',
        title: "Clemelopy's Leaves",
        content: (
          <>
            <p className="text-lg text-[#00A99D] mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>A platform for Generative Engine Optimization and AI-aware digital strategy</p>
            <p className="text-lg font-semibold mb-3 text-[#2e2a27]">Clemelopy&apos;s Leaves:</p>
            <ul className="space-y-2 mb-5 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Clear section headers and page structure</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Step-by-step breakdowns of concepts</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Consistent formatting across the platform</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Simple, human-centered language</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>These clarity signals help both users and generative engines understand Clemelopy quickly and accurately.</p>
          </>
        ),
      },
      {
        eyebrow: 'UP NEXT',
        title: 'Where Value Becomes Visible',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">You&apos;ve now explored how content becomes clear:</p>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Roots</strong> define meaning</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Soil</strong> nurtures ideas</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Underground networks</strong> connect pages</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Trunks</strong> give pages purpose</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Branches</strong> expand depth</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Leaves</strong> make meaning visible</span>
              </div>
            </div>
            <p className="text-lg mb-6 text-[#2e2a27]">Next comes Fruit — the visible proof and outcomes your ecosystem produces.</p>
            <div className="text-center">
              <button 
                onClick={() => {
                  const nextComponent = ecosystemComponents.find(c => c.id === 'fruit');
                  if (nextComponent && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('openEcosystemModal', { detail: nextComponent }));
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
                style={{ background: 'linear-gradient(135deg, #00A99D, #0D7871)', fontFamily: 'Montserrat Alternates' }}
                aria-label="Continue to learn about Fruit"
              >
                Continue Your Journey to Fruit
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </>
        ),
        hasNavigationButton: true,
        nextComponentId: 'fruit',
      },
    ],
  },
  {
    id: 'fruit',
    name: 'Fruit',
    tagline: 'Proof that your ideas work',
    icon: '/icons/Fruit.png',
    slides: [
      {
        eyebrow: 'OUTPUT',
        title: 'What Is Fruit?',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In nature, fruit is the visible result of a healthy tree. It forms only after roots are strong, soil is healthy, and the trunk, branches, and leaves are working together.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">Fruit is not the tree&apos;s foundation — it is the outcome. It signals health, maturity, and successful growth.</p>
            <p className="text-[#00A99D] font-semibold italic" style={{ fontFamily: 'Montserrat Alternates' }}>Without fruit, a tree may still exist, but its purpose is harder to recognize.</p>
          </>
        ),
      },
      {
        eyebrow: 'OUTPUT',
        title: 'Fruit in a Digital Ecosystem',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In the Clemelopy framework, fruit represents <strong className="text-[#00A99D] italic">proof and outcomes</strong>.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">Fruit shows that your ideas work. It&apos;s where understanding turns into trust.</p>
            <p className="text-lg mb-3 text-[#2e2a27]">Fruit can take many forms:</p>
            <ul className="space-y-1 mb-4 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Results</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Examples</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Demonstrations</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Case studies</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Testimonials</li>
            </ul>
            <p className="text-lg text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Fruit doesn&apos;t explain what you do. It proves it.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Fruit in Practice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">To understand fruit, it helps to see how proof appears in practice.</p>
            <div className="p-5 rounded-xl" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 1: XYZ Bakery</p>
              <p className="text-[#2e2a27]/80 mb-3">A small-batch bakery and café</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Fruit:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Photos of finished loaves</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Customer reviews</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Sold-out class announcements</li>
              </ul>
            </div>
            <p className="mt-4 text-[#2e2a27]">These outcomes demonstrate quality without needing explanation.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Wellness',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(0, 169, 157, 0.08)', border: '1px solid rgba(0, 169, 157, 0.2)' }}>
              <p className="text-[#00A99D] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 2: XYZ Wellness</p>
              <p className="text-[#2e2a27]/80 mb-3">A holistic physical therapy practice</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Fruit:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Client recovery stories</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Measurable improvements in mobility</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Before-and-after testimonials</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">The results reinforce trust in their approach.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Digital',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 3: XYZ Digital</p>
              <p className="text-[#2e2a27]/80 mb-3">A consulting firm for small businesses</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Fruit:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Case studies showing process improvements</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Client success metrics</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Documented transformations</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">These examples make the value tangible.</p>
          </>
        ),
      },
      {
        eyebrow: 'PATTERN',
        title: 'The Pattern to Notice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">In each example:</p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">1</span>
                <span className="text-[#2e2a27]">Fruit appears naturally after structure is in place</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">2</span>
                <span className="text-[#2e2a27]">Proof reinforces earlier ideas</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">3</span>
                <span className="text-[#2e2a27]">Trust is earned, not claimed</span>
              </div>
            </div>
            <p className="text-[#00A99D] text-center" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Healthy ecosystems produce fruit consistently.</p>
          </>
        ),
      },
      {
        eyebrow: 'WHY IT MATTERS',
        title: 'Why Fruit Matters for Growth and Visibility',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Just as fruit attracts attention and signals maturity, proof attracts trust.</p>
            <p className="text-lg mb-3 font-semibold text-[#2e2a27]">Strong fruit helps:</p>
            <ul className="space-y-2 mb-4 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>People</strong> feel confident choosing you</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>AI systems</strong> associate your brand with successful outcomes</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>Your ecosystem</strong> convert understanding into action</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Without fruit, even clear content can feel unproven.</p>
          </>
        ),
      },
      {
        eyebrow: 'FRAMEWORK',
        title: 'In the Orchard Ecosystem Framework™',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Fruit <strong className="text-[#00A99D] italic">grows at the end of branches and among leaves</strong>.</p>
            <p className="text-lg mb-3 text-[#2e2a27]">It depends on:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[{text: 'Roots (core ideas)', color: '#00A99D'}, {text: 'Soil (nurturing language)', color: '#00A99D'}, {text: 'Underground networks (connections)', color: '#00A99D'}, {text: 'Trunks (page purpose)', color: '#00A99D'}, {text: 'Branches (supporting ideas)', color: '#00A99D'}, {text: 'Leaves (clarity signals)', color: '#00A99D'}].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-[#2e2a27]" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                  <span style={{ color: item.color }}>↓</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Fruit is the visible reward of a healthy ecosystem.</p>
          </>
        ),
      },
      {
        eyebrow: 'CLEMELOPY',
        title: "Clemelopy's Fruit",
        content: (
          <>
            <p className="text-lg text-[#00A99D] mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>A platform for Generative Engine Optimization and AI-aware digital strategy</p>
            <p className="text-lg font-semibold mb-3 text-[#2e2a27]">Clemelopy&apos;s Fruit:</p>
            <ul className="space-y-2 mb-5 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Frameworks that businesses actively use</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Clear implementation outputs</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Successful use cases and workflows</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Positive user outcomes and feedback</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>These results show that Clemelopy&apos;s system works in practice, not just in theory.</p>
          </>
        ),
      },
      {
        eyebrow: 'UP NEXT',
        title: 'How Credibility Spreads',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">You&apos;ve now explored how value becomes visible:</p>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Roots</strong> define what matters</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Soil</strong> nurtures meaning</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Underground networks</strong> connect ideas</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Trunks</strong> give pages purpose</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Branches</strong> extend understanding</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Leaves</strong> create clarity</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Fruit</strong> proves value</span>
              </div>
            </div>
            <p className="text-lg mb-6 text-[#2e2a27]">Next comes Pollinators — how credibility and recognition spread beyond your orchard.</p>
            <div className="text-center">
              <button 
                onClick={() => {
                  const nextComponent = ecosystemComponents.find(c => c.id === 'pollinators');
                  if (nextComponent && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('openEcosystemModal', { detail: nextComponent }));
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
                style={{ background: 'linear-gradient(135deg, #00A99D, #0D7871)', fontFamily: 'Montserrat Alternates' }}
                aria-label="Continue to learn about Pollinators"
              >
                Continue Your Journey to Pollinators
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </>
        ),
        hasNavigationButton: true,
        nextComponentId: 'pollinators',
      },
    ],
  },
  {
    id: 'pollinators',
    name: 'Pollinators',
    tagline: 'External voices that add credibility',
    icon: '/icons/Pollinators.png',
    slides: [
      {
        eyebrow: 'OUTPUT',
        title: 'What Are Pollinators?',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In nature, pollinators move pollen from one plant to another. They carry signals of health, spread growth, and help ecosystems expand beyond a single tree.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">Pollinators don&apos;t create fruit. They help fruit be recognized, shared, and multiplied.</p>
            <p className="text-[#00A99D] font-semibold italic" style={{ fontFamily: 'Montserrat Alternates' }}>Without pollinators, growth stays isolated.</p>
          </>
        ),
      },
      {
        eyebrow: 'OUTPUT',
        title: 'Pollinators in a Digital Ecosystem',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">In the Clemelopy framework, pollinators are <strong className="text-[#00A99D] italic">external signals of credibility and recognition</strong>.</p>
            <p className="text-lg mb-4 text-[#2e2a27]">They are how your ideas travel beyond your own site and become validated elsewhere.</p>
            <p className="text-lg text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Pollinators don&apos;t explain your work. They reinforce it from the outside.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Pollinators in Practice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">To understand pollinators, it helps to see how external validation shows up in practice.</p>
            <div className="p-5 rounded-xl" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 1: XYZ Bakery</p>
              <p className="text-[#2e2a27]/80 mb-3">A small-batch bakery and café</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Pollinators:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Local press mentions</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Food blogger reviews</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Social media shares from customers</li>
              </ul>
            </div>
            <p className="mt-4 text-[#2e2a27]">These signals spread awareness and confirm quality beyond the bakery&apos;s own site.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Wellness',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(0, 169, 157, 0.08)', border: '1px solid rgba(0, 169, 157, 0.2)' }}>
              <p className="text-[#00A99D] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 2: XYZ Wellness</p>
              <p className="text-[#2e2a27]/80 mb-3">A holistic physical therapy practice</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Pollinators:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Referrals from physicians</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Guest articles on wellness platforms</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Client testimonials shared off-site</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">External voices reinforce trust and credibility.</p>
          </>
        ),
      },
      {
        eyebrow: 'EXAMPLES',
        title: 'Example: XYZ Digital',
        content: (
          <>
            <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(250, 168, 25, 0.08)', border: '1px solid rgba(250, 168, 25, 0.2)' }}>
              <p className="text-[#E99502] mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, fontSize: '1.125rem' }}>Example 3: XYZ Digital</p>
              <p className="text-[#2e2a27]/80 mb-3">A consulting firm for small businesses</p>
              <p className="font-semibold mb-2 text-[#2e2a27]">Their Pollinators:</p>
              <ul className="space-y-1 text-[#2e2a27]">
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Podcast appearances</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Industry citations</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Client recommendations in professional communities</li>
              </ul>
            </div>
            <p className="text-[#2e2a27]">Their ideas travel farther because others carry them.</p>
          </>
        ),
      },
      {
        eyebrow: 'PATTERN',
        title: 'The Pattern to Notice',
        content: (
          <>
            <p className="text-lg mb-5 text-[#2e2a27]">In each example:</p>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">1</span>
                <span className="text-[#2e2a27]">Pollinators come from outside the ecosystem</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">2</span>
                <span className="text-[#2e2a27]">Trust is reinforced by third parties</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D] font-bold">3</span>
                <span className="text-[#2e2a27]">Recognition expands reach without extra explanation</span>
              </div>
            </div>
            <p className="text-[#00A99D] text-center" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Pollinators amplify what already works.</p>
          </>
        ),
      },
      {
        eyebrow: 'WHY IT MATTERS',
        title: 'Why Pollinators Matter for Growth and Visibility',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Just as pollinators help ecosystems spread and thrive, external signals help your content gain recognition.</p>
            <p className="text-lg mb-3 font-semibold text-[#2e2a27]">Strong pollinators help:</p>
            <ul className="space-y-2 mb-4 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>People</strong> trust you faster through third-party validation</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>AI systems</strong> associate your brand with authority</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> <strong>Your ecosystem</strong> grow beyond your own channels</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Without pollinators, even strong systems stay contained.</p>
          </>
        ),
      },
      {
        eyebrow: 'FRAMEWORK',
        title: 'In the Orchard Ecosystem Framework™',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">Pollinators <strong className="text-[#00A99D] italic">move across the entire orchard</strong>.</p>
            <p className="text-lg mb-3 text-[#2e2a27]">They interact with:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[{text: 'Fruit (results and proof)', color: '#00A99D'}, {text: 'Leaves (clear messaging)', color: '#00A99D'}, {text: 'Branches and trunks (core ideas)', color: '#00A99D'}, {text: 'The ecosystem as a whole', color: '#00A99D'}].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-[#2e2a27]" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                  <span style={{ color: item.color }}>↔</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Pollinators don&apos;t change the structure. They carry its signal outward.</p>
          </>
        ),
      },
      {
        eyebrow: 'CLEMELOPY',
        title: "Clemelopy's Pollinators",
        content: (
          <>
            <p className="text-lg text-[#00A99D] mb-4" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>A platform for Generative Engine Optimization and AI-aware digital strategy</p>
            <p className="text-lg font-semibold mb-3 text-[#2e2a27]">Clemelopy&apos;s Pollinators:</p>
            <ul className="space-y-2 mb-5 text-lg text-[#2e2a27]">
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Mentions in GEO and search discussions</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Referrals from consultants and agencies</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> User recommendations and shared frameworks</li>
              <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> External validation of Clemelopy&apos;s approach</li>
            </ul>
            <p className="text-[#00A99D]" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>These signals extend Clemelopy&apos;s reach and reinforce trust beyond the platform itself.</p>
          </>
        ),
      },
      {
        eyebrow: 'COMPLETE',
        title: 'The Complete Ecosystem',
        content: (
          <>
            <p className="text-lg mb-4 text-[#2e2a27]">You&apos;ve now explored all eight layers of the Orchard Ecosystem Framework™:</p>
            <div className="space-y-2 mb-6 text-sm">
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Roots</strong> define what matters</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Soil</strong> nurtures meaning</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Underground networks</strong> connect ideas</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Trunks</strong> give pages purpose</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Branches</strong> extend understanding</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Leaves</strong> create clarity</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Fruit</strong> proves value</span>
              </div>
              <div className="flex items-start gap-3 p-2 rounded-xl" style={{ background: 'rgba(0, 169, 157, 0.08)' }}>
                <span className="text-[#00A99D]">•</span>
                <span className="text-[#2e2a27]"><strong>Pollinators</strong> spread credibility</span>
              </div>
            </div>
            <p className="text-center text-[#00A99D] text-lg" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>Together, they form a living, scalable digital ecosystem.</p>
          </>
        ),
      },
    ],
  },
];

function EcosystemModal({ component, isOpen, onClose }: { component: EcosystemComponent | null; isOpen: boolean; onClose: () => void; }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Reset to slide 0 whenever component changes (including when navigating between components)
  useEffect(() => {
    setCurrentSlide(0);
  }, [component?.id]);

  // Also reset when modal opens
  useEffect(() => {
    if (isOpen) setCurrentSlide(0);
  }, [isOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen || !component) return;
    if (e.key === 'ArrowRight') setCurrentSlide((prev) => (prev + 1) % component.slides.length);
    else if (e.key === 'ArrowLeft') setCurrentSlide((prev) => (prev - 1 + component.slides.length) % component.slides.length);
    else if (e.key === 'Escape') onClose();
  }, [isOpen, component, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !component) return null;

  // Guard against invalid slide index during component transitions
  const safeCurrentSlide = currentSlide >= component.slides.length ? 0 : currentSlide;
  const currentSlideData = component.slides[safeCurrentSlide];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % component.slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + component.slides.length) % component.slides.length);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="absolute inset-0" style={{ backgroundImage: 'url(/images/clementine-collage.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} aria-hidden="true" />
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" aria-hidden="true" />

      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 w-12 h-12 rounded-full flex items-center justify-center text-[#2e2a27]/60 hover:text-[#2e2a27] hover:bg-black/5 transition-all z-20 focus:outline-none focus:ring-2 focus:ring-[#FAA819]"
        aria-label="Close modal"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      {/* Main container with arrows attached to glass edges */}
      <div className="relative z-10 w-full max-w-6xl mx-auto" onClick={(e) => e.stopPropagation()}>
        {/* Glass card with arrows positioned on its edges */}
        <div className="relative">
          {/* Left Arrow - on edge of glass */}
          <button 
            onClick={(e) => { e.stopPropagation(); prevSlide(); }} 
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center text-[#2e2a27]/60 hover:text-[#2e2a27] hover:scale-110 transition-all z-20 focus:outline-none focus:ring-2 focus:ring-[#FAA819]" 
            style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.9)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}
            aria-label="Previous slide"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          
          {/* Right Arrow - on edge of glass */}
          <button 
            onClick={(e) => { e.stopPropagation(); nextSlide(); }} 
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center text-[#2e2a27]/60 hover:text-[#2e2a27] hover:scale-110 transition-all z-20 focus:outline-none focus:ring-2 focus:ring-[#FAA819]" 
            style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.9)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}
            aria-label="Next slide"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          {/* Glass Card - larger */}
          <div 
            key={component.id}
            className="rounded-3xl p-10 md:p-12 text-[#2e2a27] relative overflow-hidden min-h-[500px] flex flex-col" 
            style={{ 
              background: 'rgba(255, 255, 255, 0.85)', 
              backdropFilter: 'blur(20px)', 
              WebkitBackdropFilter: 'blur(20px)', 
              border: '1px solid rgba(255, 255, 255, 0.9)', 
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.9)' 
            }}
          >
            <div className="relative z-10 flex-1 max-w-4xl mx-auto w-full">
              <div 
                className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ background: 'rgba(250, 168, 25, 0.15)', color: '#E99502', border: '1px solid rgba(250, 168, 25, 0.3)' }}
              >
                {currentSlideData.eyebrow}
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 flex-shrink-0">
                  <Image src={component.icon} alt="" width={64} height={64} className="w-full h-full object-contain" aria-hidden="true" />
                </div>
                <h2 
                id="modal-title"
                className="text-3xl md:text-4xl font-bold text-[#2e2a27]" 
                style={{ fontFamily: 'Montserrat Alternates' }}
              >
                  {currentSlideData.title}
                </h2>
              </div>
              
              <div className="text-lg text-[#2e2a27]/80 leading-relaxed" style={{ fontFamily: 'Inter' }}>
                {currentSlideData.content}
              </div>
            </div>
          </div>
        </div>

        {/* Slide indicators - below the card */}
        <div className="flex justify-center gap-2 mt-6">
          {component.slides.map((_, index) => (
            <button 
              key={index} 
              onClick={(e) => { e.stopPropagation(); setCurrentSlide(index); }} 
              className="h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[#FAA819]" 
              style={{ 
                width: index === safeCurrentSlide ? '24px' : '8px', 
                background: index === safeCurrentSlide ? '#FAA819' : 'rgba(46, 42, 39, 0.3)' 
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <div className="text-center mt-4 text-[#2e2a27]/70 text-sm">{safeCurrentSlide + 1} / {component.slides.length}</div>

        <div className="text-center mt-4 text-[#2e2a27]/60 text-xs flex items-center justify-center gap-2">
          <span className="px-2 py-1 rounded border border-[#2e2a27]/30 bg-white/60">←</span>
          <span className="px-2 py-1 rounded border border-[#2e2a27]/30 bg-white/60">→</span>
          <span className="ml-1">to navigate</span>
          <span className="mx-2">•</span>
          <span className="px-2 py-1 rounded border border-[#2e2a27]/30 bg-white/60">ESC</span>
          <span className="ml-1">to close</span>
        </div>
      </div>
    </div>
  );
}

export default function LearnPage() {
  const [selectedComponent, setSelectedComponent] = useState<EcosystemComponent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);

  const openModal = (component: EcosystemComponent) => {
    setSelectedComponent(component);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // Listen for custom event to navigate between components
  useEffect(() => {
    const handleOpenModal = (event: CustomEvent<EcosystemComponent>) => {
      setSelectedComponent(event.detail);
      // Reset to first slide handled by the modal component
    };

    window.addEventListener('openEcosystemModal', handleOpenModal as EventListener);
    return () => {
      window.removeEventListener('openEcosystemModal', handleOpenModal as EventListener);
    };
  }, []);

  return (
    <Layout activeNav="learn">
      <EcosystemModal component={selectedComponent} isOpen={isModalOpen} onClose={closeModal} />
      <BlueprintWaitlistModal isOpen={isWaitlistModalOpen} onClose={() => setIsWaitlistModalOpen(false)} />

      <div className="mx-4 mt-4 mb-8 p-6 md:p-8 rounded-[32px]" style={{ background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' }}>
        
        {/* Inner Frosted Glass Container for Header Content */}
        <div 
          className="rounded-3xl p-8 md:p-10 mb-8"
          style={{ 
            background: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: 'Montserrat Alternates' }}
            >
              <span style={{ color: '#2e2a27' }}>The </span>
              <span style={{ background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Orchard Ecosystem</span>
              <span style={{ color: '#2e2a27' }}> Framework™</span>
            </h1>
            <p 
              className="text-[#2e2a27]/80 max-w-2xl mx-auto text-lg"
              style={{ fontFamily: 'Inter' }}
            >
              Your content isn&apos;t a checklist—it&apos;s a living ecosystem. Learn how each component works together to help AI engines understand and trust your content.
            </p>
          </div>

          {/* Orchard Illustration - Clickable */}
          <div className="max-w-2xl mx-auto mb-8">
            <button
              onClick={() => setIsImageLightboxOpen(true)}
              className="relative w-full group cursor-pointer rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
              aria-label="Click to expand Orchard Ecosystem Framework illustration"
            >
              <Image 
                src="/images/Orchard Ecosystem Illustration.svg" 
                alt="The Orchard Ecosystem Framework - diagram showing how Roots, Soil, Underground Network, Trunk, Branches, Leaves, Fruit, and Pollinators work together in your content strategy" 
                width={600} 
                height={420} 
                className="w-full h-auto transition-transform duration-300 group-hover:scale-[1.02]" 
                priority 
              />
              {/* Hover overlay with magnify icon */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00A99D" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
                  </svg>
                </div>
              </div>
            </button>
            <p className="text-center text-sm text-[#2e2a27]/50 mt-2" style={{ fontFamily: 'Inter' }}>
              Click image to expand
            </p>
          </div>

          {/* Instruction Text */}
          <p 
            className="text-center text-[#2e2a27]/70 text-lg"
            style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500 }}
          >
            Click each element below to learn more and see examples to help you along your way.
          </p>
        </div>

        {/* 4x2 Grid of Component Cards */}
        <div 
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-10"
          role="list"
          aria-label="Orchard Ecosystem Framework components"
        >
          {ecosystemComponents.map((component) => (
            <button 
              key={component.id} 
              onClick={() => openModal(component)} 
              className="group p-5 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-[#FAA819] focus:ring-offset-2" 
              style={{ 
                background: 'rgba(255, 255, 255, 0.5)', 
                backdropFilter: 'blur(10px)', 
                WebkitBackdropFilter: 'blur(10px)', 
                border: '1px solid rgba(255, 255, 255, 0.6)', 
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)' 
              }}
              aria-label={`Learn more about ${component.name}: ${component.tagline}`}
            >
              {/* Large Icon on Left */}
              <div className="w-16 h-16 flex-shrink-0 transition-transform group-hover:scale-105" aria-hidden="true">
                <Image src={component.icon} alt="" width={80} height={80} className="w-full h-full object-contain" />
              </div>
              
              {/* Text Content on Right */}
              <div className="flex-1 min-w-0 pt-1 text-center sm:text-left">
                <h2 
                  className="text-lg text-[#2e2a27] mb-1" 
                  style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
                >
                  {component.name}
                </h2>
                <p 
                  className="text-sm text-[#2e2a27]/70 leading-relaxed mb-2" 
                  style={{ fontFamily: 'Inter' }}
                >
                  {component.tagline}
                </p>
                <span 
                  className="text-sm font-medium text-[#0D7871] group-hover:text-[#00A99D] transition-colors inline-flex items-center gap-1"
                  style={{ fontFamily: 'Inter' }}
                  aria-hidden="true"
                >
                  Learn more
                  <svg 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5"
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Cultivation Card - Full Width */}
        <div 
          className="rounded-2xl p-8 md:p-10 mb-6"
          style={{ 
            background: 'rgba(255, 255, 255, 0.5)', 
            backdropFilter: 'blur(10px)', 
            WebkitBackdropFilter: 'blur(10px)', 
            border: '1px solid rgba(255, 255, 255, 0.6)', 
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)' 
          }}
        >
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Icon */}
            <div className="w-24 h-24 lg:w-32 lg:h-32 flex-shrink-0 mx-auto lg:mx-0">
              <Image 
                src="/icons/cultivate.png" 
                alt="" 
                width={128} 
                height={128} 
                className="w-full h-full object-contain" 
                aria-hidden="true"
              />
            </div>
            
            {/* Content */}
            <div className="flex-1">
              <h2 
                className="text-2xl md:text-3xl font-bold text-[#2e2a27] mb-4 text-center lg:text-left"
                style={{ fontFamily: 'Montserrat Alternates' }}
              >
                Cultivation
              </h2>
              
              <p className="text-lg text-[#2e2a27] mb-4" style={{ fontFamily: 'Inter' }}>
                An orchard doesn&apos;t thrive on structure alone. It grows because it is <strong className="text-[#00A99D] italic">cultivated</strong>.
              </p>
              
              <p className="text-[#2e2a27] mb-4" style={{ fontFamily: 'Inter' }}>
                In nature, cultivation is the ongoing work of tending the soil, strengthening roots, pruning branches, and supporting healthy growth over time. It&apos;s not a one-time effort — it&apos;s a continuous practice.
              </p>
              
              <p className="text-[#2e2a27] mb-4" style={{ fontFamily: 'Inter' }}>
                In the Clemelopy framework, cultivation is the intentional process of maintaining and strengthening your digital ecosystem. It&apos;s how you:
              </p>
              
              <ul className="space-y-2 mb-6 text-[#2e2a27]" style={{ fontFamily: 'Inter' }}>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Reinforce connections between pages</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Clarify meaning as your content grows</li>
                <li className="flex items-start gap-2"><span className="text-[#00A99D]">•</span> Strengthen weak areas without rebuilding everything</li>
              </ul>
              
              <p className="text-[#00A99D] mb-6" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>
                Cultivation ensures your ecosystem stays healthy as your business evolves, instead of becoming scattered or overgrown.
              </p>
              
              <div className="p-5 rounded-xl mb-6" style={{ background: 'rgba(0, 169, 157, 0.08)', border: '1px solid rgba(0, 169, 157, 0.2)' }}>
                <p className="text-[#2e2a27] font-semibold mb-3" style={{ fontFamily: 'Montserrat Alternates' }}>How to Get Started</p>
                <div className="space-y-2 text-[#2e2a27]" style={{ fontFamily: 'Inter' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-[#00A99D] font-bold">1</span>
                    <span>Run a Linking Strategy Map to understand your current ecosystem</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[#00A99D] font-bold">2</span>
                    <span>Review the recommended connections and gaps</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-[#00A99D] font-bold">3</span>
                    <span>Use the generated to-dos to strengthen clarity, structure, and flow</span>
                  </div>
                </div>
              </div>
              
              <p className="text-[#2e2a27]/80 italic mb-6" style={{ fontFamily: 'Inter' }}>
                Cultivation doesn&apos;t mean starting over. It means tending what you&apos;ve already planted so it can grow with intention.
              </p>
              
              <div className="text-center lg:text-left">
                <Link 
                  href="/linking-strategy" 
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
                  style={{ background: 'linear-gradient(135deg, #00A99D, #0D7871)', fontFamily: 'Montserrat Alternates' }}
                >
                  Start Cultivating Your Ecosystem
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(0, 169, 157, 0.95) 0%, rgba(13, 120, 113, 0.95) 100%)', backdropFilter: 'blur(20px)', boxShadow: '0 4px 20px rgba(0, 100, 90, 0.3)' }}>
          <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Montserrat Alternates' }}>Ready to Build Your Ecosystem With Intention?</h2>
          <p className="text-white/90 mb-2 max-w-lg mx-auto" style={{ fontFamily: 'Inter' }}>The GEO Blueprint is a comprehensive, guided process to define your entire content ecosystem from the ground up.</p>
          <p className="text-white/70 mb-6 max-w-lg mx-auto text-sm" style={{ fontFamily: 'Inter' }}>Coming soon — join the waitlist to be the first to know when it launches.</p>
          <button 
            onClick={() => setIsWaitlistModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105" 
            style={{ fontFamily: 'Montserrat Alternates', background: 'white', color: '#00A99D' }}
          >
            Join the Waitlist
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
          </button>
        </div>
      </div>

      {/* Image Lightbox for Orchard Illustration */}
      <ImageLightbox
        isOpen={isImageLightboxOpen}
        onClose={() => setIsImageLightboxOpen(false)}
        src="/images/Orchard Ecosystem Illustration.svg"
        alt="The Orchard Ecosystem Framework - diagram showing how Roots, Soil, Underground Network, Trunk, Branches, Leaves, Fruit, and Pollinators work together in your content strategy"
      />
    </Layout>
  );
}