import { motion } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useGuestAuth } from '../../hooks/useGuestAuth';
import { weddingInfo } from '../../data/weddingInfo';

const HeroSection = () => {
  const { guest, isAuthenticated } = useGuestAuth();

  const scrollToNext = () => {
    const detailsSection = document.getElementById('details');
    detailsSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-white to-rose-100">
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            background: [
              'radial-gradient(circle at 20% 20%, rgba(244, 114, 182, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 80%, rgba(244, 114, 182, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 40% 40%, rgba(244, 114, 182, 0.1) 0%, transparent 50%)',
            ],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Guest Greeting */}
        {isAuthenticated && guest && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <div className="inline-block bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
              <p className="text-rose-600 font-medium">
                Welcome, {guest.firstName}!
              </p>
            </div>
          </motion.div>
        )}

        {/* Main Invitation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}
        >
          {/* Save the Date */}
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="heading-quaternary"
              style={{ 
                color: 'var(--color-gray-600)',
                letterSpacing: '0.1em',
                textAlign: 'center'
              }}
            >
              You're Invited to Celebrate
            </motion.p>
          </div>

          {/* Couple Names */}
          <div>
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="heading-hero"
              style={{ marginBottom: 'var(--space-4)' }}
            >
              <span className="script-text">{weddingInfo.bride.name}</span>
              <span style={{ 
                display: 'block', 
                fontSize: 'var(--text-4xl)', 
                fontFamily: 'var(--font-secondary)',
                fontWeight: 'var(--font-light)',
                color: 'var(--color-primary)',
                margin: 'var(--space-4) 0'
              }}>
                &
              </span>
              <span className="script-text">{weddingInfo.groom.name}</span>
            </motion.h1>
          </div>

          {/* Wedding Date */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
          >
            <div className="card card-elevated" style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: 'var(--space-8)',
              borderColor: 'var(--color-primary-light)'
            }}>
              <p className="heading-secondary" style={{ 
                color: 'var(--color-gray-800)',
                marginBottom: 'var(--space-2)'
              }}>
                {formatDate(weddingInfo.date.ceremony)}
              </p>
              <p className="body-large" style={{ color: 'var(--color-gray-600)' }}>
                {weddingInfo.date.ceremony.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <p className="body-base" style={{ 
                  color: 'var(--color-gray-700)',
                  fontWeight: 'var(--font-medium)',
                  marginBottom: 'var(--space-1)'
                }}>
                  {weddingInfo.venue.ceremony.name}
                </p>
                <p className="body-base" style={{ color: 'var(--color-gray-600)' }}>
                  {weddingInfo.venue.ceremony.city}, {weddingInfo.venue.ceremony.state}
                </p>
              </div>
            </div>
          </motion.div>

          {/* RSVP Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            style={{ textAlign: 'center' }}
          >
            <p className="body-large" style={{ color: 'var(--color-gray-600)' }}>
              Please RSVP by {weddingInfo.date.rsvpDeadline.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
            {!isAuthenticated && (
              <p className="body-small" style={{ 
                color: 'var(--color-gray-500)',
                marginTop: 'var(--space-2)'
              }}>
                Use your personalized invitation link to RSVP
              </p>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.4 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <button
          onClick={scrollToNext}
          className="group flex flex-col items-center space-y-2 hover:text-rose-600 transition-colors duration-300"
          aria-label="Scroll to details"
        >
          <span className="text-sm text-gray-600 group-hover:text-rose-600 transition-colors">
            Scroll to explore
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-6 text-gray-600 group-hover:text-rose-600 transition-colors"
          >
            <ChevronDownIcon />
          </motion.div>
        </button>
      </motion.div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-4 w-32 h-32 bg-rose-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-4 w-40 h-40 bg-pink-200/20 rounded-full blur-3xl" />
    </section>
  );
};

export default HeroSection;