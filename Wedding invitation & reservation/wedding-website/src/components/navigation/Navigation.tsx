import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useScrollSpy } from '../../hooks/useScrollSpy';
import { useGuestAuth } from '../../hooks/useGuestAuth';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { guest, isAuthenticated } = useGuestAuth();
  
  const { activeSection, scrollToSection, registerSection } = useScrollSpy(80);

  const navigationItems = [
    { id: 'hero', name: 'Home' },
    { id: 'details', name: 'Details' },
    { id: 'location', name: 'Location' },
    { id: 'registry', name: 'Registry' },
    { id: 'rsvp', name: 'RSVP' },
  ];

  useEffect(() => {
    // Register all sections
    navigationItems.forEach(item => {
      registerSection(item.id, item.name);
    });
  }, [registerSection]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigationClick = (sectionId: string) => {
    scrollToSection(sectionId);
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo/Brand */}
            <motion.div
              className="flex-shrink-0 cursor-pointer"
              onClick={() => handleNavigationClick('hero')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <h1 className={`text-xl lg:text-2xl font-serif transition-colors ${
                isScrolled ? 'text-gray-800' : 'text-white'
              }`}>
                S & M
              </h1>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigationClick(item.id)}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    activeSection === item.id
                      ? isScrolled
                        ? 'text-rose-600'
                        : 'text-white'
                      : isScrolled
                      ? 'text-gray-700 hover:text-rose-600'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item.name}
                  {activeSection === item.id && (
                    <motion.div
                      layoutId="activeIndicator"
                      className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                        isScrolled ? 'bg-rose-600' : 'bg-white'
                      }`}
                      initial={false}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Guest Info */}
            {isAuthenticated && guest && (
              <div className="hidden lg:flex items-center">
                <div className={`text-sm ${
                  isScrolled ? 'text-gray-600' : 'text-white/80'
                }`}>
                  Welcome, {guest.firstName}
                </div>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`inline-flex items-center justify-center p-2 rounded-md transition-colors ${
                  isScrolled
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    : 'text-white hover:text-white hover:bg-white/10'
                }`}
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="lg:hidden bg-white/95 backdrop-blur-md border-b border-gray-200"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {/* Guest greeting on mobile */}
                {isAuthenticated && guest && (
                  <div className="px-3 py-2 text-sm text-gray-600 border-b border-gray-200 mb-2">
                    Welcome, {guest.firstName}!
                  </div>
                )}

                {navigationItems.map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => handleNavigationClick(item.id)}
                    className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      activeSection === item.id
                        ? 'text-rose-600 bg-rose-50'
                        : 'text-gray-700 hover:text-rose-600 hover:bg-gray-50'
                    }`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {item.name}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={closeMobileMenu}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;