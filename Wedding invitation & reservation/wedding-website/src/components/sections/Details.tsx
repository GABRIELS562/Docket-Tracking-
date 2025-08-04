import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useScrollSpy } from '../../hooks/useScrollSpy';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { weddingInfo } from '../../data/weddingInfo';

export const Details: React.FC = () => {
  const { registerSection } = useScrollSpy();

  useEffect(() => {
    registerSection('details', 'Details');
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0
    }
  };

  return (
    <section id="details" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-serif text-gray-800 mb-4">
            Wedding Details
          </h2>
          <div className="w-24 h-1 bg-rose-400 mx-auto mb-6" />
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join us for a celebration of love, laughter, and happily ever after
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
        >
          <motion.div variants={itemVariants}>
            <Card variant="elevated" padding="lg" hover>
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <span className="text-2xl mr-3">💒</span>
                  Ceremony
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(weddingInfo.date.ceremony)}</p>
                    <p className="text-gray-600">{formatTime(weddingInfo.date.ceremony)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{weddingInfo.venue.ceremony.name}</p>
                    <p className="text-gray-600">{weddingInfo.venue.ceremony.address}</p>
                    <p className="text-gray-600">
                      {weddingInfo.venue.ceremony.city}, {weddingInfo.venue.ceremony.state} {weddingInfo.venue.ceremony.zipCode}
                    </p>
                  </div>
                  {weddingInfo.venue.ceremony.website && (
                    <a
                      href={weddingInfo.venue.ceremony.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-rose-600 hover:text-rose-700 transition-colors"
                    >
                      Visit Website
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card variant="elevated" padding="lg" hover>
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <span className="text-2xl mr-3">🎉</span>
                  Reception
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(weddingInfo.date.reception)}</p>
                    <p className="text-gray-600">{formatTime(weddingInfo.date.reception)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{weddingInfo.venue.reception.name}</p>
                    <p className="text-gray-600">{weddingInfo.venue.reception.address}</p>
                    <p className="text-gray-600">
                      {weddingInfo.venue.reception.city}, {weddingInfo.venue.reception.state} {weddingInfo.venue.reception.zipCode}
                    </p>
                  </div>
                  {weddingInfo.venue.reception.website && (
                    <a
                      href={weddingInfo.venue.reception.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-rose-600 hover:text-rose-700 transition-colors"
                    >
                      Visit Website
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Card variant="filled" padding="lg">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <span className="text-2xl mr-3">⏰</span>
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weddingInfo.timeline.map((event, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex items-start space-x-4 p-3 bg-white rounded-lg shadow-sm"
                  >
                    <div className="flex-shrink-0 w-16 text-sm font-medium text-rose-600 text-right">
                      {event.time}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{event.event}</h4>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      )}
                      {event.location && (
                        <p className="text-xs text-gray-500 mt-1">📍 {event.location}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Card variant="outlined" padding="lg">
            <CardContent>
              <h3 className="text-xl font-medium text-gray-900 mb-4">Important Notes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">👗</span>
                  <span>Semi-formal attire</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">📱</span>
                  <span>Unplugged ceremony</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">🚗</span>
                  <span>Valet parking available</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};