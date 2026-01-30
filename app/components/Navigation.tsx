'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="marketing-nav">
      <div className="nav-container">
        <Link href="/" className="logo">
          <Image src="/images/clemelopy-logo.svg" alt="Clemelopy" width={150} height={32} style={{ width: 'auto', height: '32px' }} />
        </Link>
        
        {/* Hamburger button - mobile only */}
        <button 
          className={`hamburger-btn ${isMenuOpen ? 'open' : ''}`} 
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        
        {/* Desktop nav */}
        <div className="nav-center">
          <Link href="https://clemelopy.com/#why-beta">Beta</Link>
          <Link href="https://clemelopy.com/#workspace">Workspace</Link>
          <Link href="https://clemelopy.com/#linking-strategy">Linking Strategy</Link>
          <Link href="https://clemelopy.com/agencies">Agencies</Link>
          <Link href="https://clemelopy.com/#pricing">Pricing</Link>
          <Link href="https://clemelopy.com/#faq">FAQ</Link>
        </div>

        <div className="nav-right">
          <Link href="https://app.clemelopy.com/login" className="nav-login">Login</Link>
          <Link href="/#signup" className="nav-cta">Get Started</Link>
        </div>
        
        {/* Mobile menu */}
        <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
          <Link href="/beta" onClick={closeMenu}>Beta</Link>
          <Link href="/workspace" onClick={closeMenu}>Workspace</Link>
          <Link href="/features/linking-strategy" onClick={closeMenu}>Linking Strategy</Link>
          <Link href="/agencies" onClick={closeMenu}>Agencies</Link>
          <Link href="/pricing" onClick={closeMenu}>Pricing</Link>
          <Link href="/faq" onClick={closeMenu}>FAQ</Link>
          <div className="mobile-menu-buttons">
            <Link href="https://app.clemelopy.com/login" className="nav-login" onClick={closeMenu}>Login</Link>
            <Link href="/beta" className="nav-cta" onClick={closeMenu}>Get Started</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}