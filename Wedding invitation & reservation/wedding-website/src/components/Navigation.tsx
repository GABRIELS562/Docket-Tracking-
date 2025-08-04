import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollSpy } from '../hooks/useScrollSpy';

export const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { sections, scrollToSection, activeSection } = useScrollSpy();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavClick = (sectionId: string) => {
    scrollToSection(sectionId);
    setIsMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 'var(--z-fixed)',
        height: 'var(--header-height)',
        backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(10px)' : 'none',
        boxShadow: isScrolled ? 'var(--shadow-lg)' : 'none',
        transition: 'all var(--transition-base)'
      }}
    >
      <div className="container" style={{ height: '100%' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          height: '100%'
        }}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            style={{ cursor: 'pointer' }}
            onClick={() => handleNavClick('hero')}
          >
            <h1 className="heading-tertiary script-text" style={{
              color: isScrolled ? 'var(--color-primary)' : 'white',
              transition: 'color var(--transition-base)',
              margin: 0
            }}>
              Sarah & Michael
            </h1>
          </motion.div>

          <div style={{ 
            display: 'none',
            alignItems: 'center',
            gap: 'var(--space-8)'
          }} className="nav-desktop">
            {sections.map((section) => (
              <motion.button
                key={section.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNavClick(section.id)}
                className="heading-quaternary"
                style={{
                  position: 'relative',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: activeSection === section.id
                    ? (isScrolled ? 'var(--color-primary)' : 'white')
                    : (isScrolled ? 'var(--color-gray-600)' : 'rgba(255, 255, 255, 0.8)'),
                  transition: 'all var(--transition-base)',
                  padding: 'var(--space-2) 0'
                }}
                onMouseEnter={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.color = isScrolled ? 'var(--color-primary)' : 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeSection !== section.id) {
                    e.currentTarget.style.color = isScrolled ? 'var(--color-gray-600)' : 'rgba(255, 255, 255, 0.8)';
                  }
                }}
              >
                {section.name}
                {activeSection === section.id && (
                  <motion.div
                    layoutId="activeSection"
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      left: 0,
                      right: 0,
                      height: '2px',
                      backgroundColor: isScrolled ? 'var(--color-primary)' : 'white',
                      borderRadius: 'var(--radius-full)'
                    }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>
            ))}
          </div>

          <div className="nav-mobile">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleMenu}
              className="btn btn-ghost"
              style={{
                padding: 'var(--space-2)',
                color: isScrolled ? 'var(--color-gray-600)' : 'white',
                backgroundColor: isScrolled ? 'transparent' : 'rgba(255, 255, 255, 0.1)'
              }}
            >
              <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
                />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderTop: '1px solid var(--color-gray-200)'
            }}
            className="nav-mobile-menu"
          >
            <div className="container" style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {sections.map((section) => (
                  <motion.button
                    key={section.id}
                    whileHover={{ x: 10 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNavClick(section.id)}
                    className="body-base"
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-lg)',
                      fontWeight: 'var(--font-medium)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: activeSection === section.id ? 'var(--color-primary-light)' : 'transparent',
                      color: activeSection === section.id ? 'var(--color-primary)' : 'var(--color-gray-600)',
                      borderLeft: activeSection === section.id ? '4px solid var(--color-primary)' : 'none',
                      transition: 'all var(--transition-base)'
                    }}
                    onMouseEnter={(e) => {
                      if (activeSection !== section.id) {
                        e.currentTarget.style.backgroundColor = 'var(--color-gray-50)';
                        e.currentTarget.style.color = 'var(--color-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeSection !== section.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-gray-600)';
                      }
                    }}
                  >
                    {section.name}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @media (min-width: 768px) {
          .nav-desktop {
            display: flex !important;
          }
          .nav-mobile {
            display: none;
          }
        }
        @media (max-width: 767px) {
          .nav-mobile-menu {
            display: block;
          }
        }
      `}</style>
    </motion.nav>
  );
};