import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useScrollSpy } from '../../hooks/useScrollSpy';
import { weddingInfo } from '../../data/weddingInfo';

export const Hero: React.FC = () => {
  const { registerSection } = useScrollSpy();

  useEffect(() => {
    registerSection('hero', 'Home');
    return () => {};
  }, [registerSection]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <section id="hero" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-100/30 to-pink-200/30" />
      
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 text-center px-4 max-w-4xl mx-auto"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="text-6xl md:text-8xl font-serif text-gray-800 mb-4">
            {weddingInfo.bride.name}
            <span className="block text-4xl md:text-6xl text-rose-600 font-light my-2">
              &
            </span>
            {weddingInfo.groom.name}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mb-8"
        >
          <p className="text-xl md:text-2xl text-gray-600 mb-2">
            are getting married!
          </p>
          <div className="w-24 h-1 bg-rose-400 mx-auto mb-6" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="text-lg md:text-xl text-gray-700 space-y-2"
        >
          <p className="font-medium">
            {formatDate(weddingInfo.date.ceremony)}
          </p>
          <p>
            Ceremony at {formatTime(weddingInfo.date.ceremony)}
          </p>
          <p className="text-base text-gray-600">
            {weddingInfo.venue.ceremony.name}
          </p>
          <p className="text-base text-gray-600">
            {weddingInfo.venue.ceremony.city}, {weddingInfo.venue.ceremony.state}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-12"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const rsvpSection = document.getElementById('rsvp');
              rsvpSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-full text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
          >
            RSVP Now
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-gray-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="absolute top-20 left-10 opacity-10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="text-6xl"
        >
          🌸
        </motion.div>
      </div>

      <div className="absolute bottom-20 right-10 opacity-10">
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="text-8xl"
        >
          💐
        </motion.div>
      </div>

      <div className="absolute top-1/2 left-5 opacity-10">
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="text-4xl"
        >
          💕
        </motion.div>
      </div>
    </section>
  );
};