import React, { Suspense, useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import SEOHead from './components/SEOHead';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Sections (with proper imports)
import HeroSection from './components/sections/HeroSection';
import DetailsSection from './components/sections/DetailsSection';
import LocationSection from './components/sections/LocationSection';
import RegistrySection from './components/sections/RegistrySection';
import RSVPSection from './components/sections/RSVPSection';

// Utilities
import { initializeAnalytics } from './utils/analytics';
import { initializeSecurity } from './utils/security';
import { initializePerformanceTracking } from './utils/performance';

// Styles
import './styles/design-system.css';
import './index.css';

const WeddingWebsite: React.FC = () => {
  useEffect(() => {
    // Initialize all production systems
    const initializeApp = async () => {
      try {
        // Initialize security measures
        initializeSecurity();
        
        // Initialize analytics and tracking
        initializeAnalytics();
        
        // Initialize performance monitoring
        initializePerformanceTracking();
        
        // Set up global error handling
        window.addEventListener('unhandledrejection', (event) => {
          console.error('Unhandled promise rejection:', event.reason);
        });
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  const LoadingFallback = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" color="primary" />
        <p className="mt-4 body-base" style={{ color: 'var(--color-gray-600)' }}>
          Loading wedding details...
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* SEO and Meta Tags */}
      <SEOHead />
      
      {/* Navigation */}
      <Navigation />
      
      {/* Main Content */}
      <main>
        <AnimatePresence mode="wait">
          <Suspense fallback={<LoadingFallback />}>
            
            {/* Hero Section */}
            <motion.section
              id="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <HeroSection />
            </motion.section>

            {/* Details Section */}
            <motion.section
              id="details"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <DetailsSection />
            </motion.section>

            {/* Location Section */}
            <motion.section
              id="location"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <LocationSection />
            </motion.section>

            {/* Registry Section */}
            <motion.section
              id="registry"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <RegistrySection />
            </motion.section>

            {/* RSVP Section */}
            <motion.section
              id="rsvp"
              className="rsvp-section"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <RSVPSection />
            </motion.section>

          </Suspense>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/" element={<WeddingWebsite />} />
            <Route path="/guest/:token" element={<WeddingWebsite />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
