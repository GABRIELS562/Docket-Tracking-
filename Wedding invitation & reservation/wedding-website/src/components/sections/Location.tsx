import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useScrollSpy } from '../../hooks/useScrollSpy';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../ui';
import { weddingInfo } from '../../data/weddingInfo';

export const Location: React.FC = () => {
  const { registerSection } = useScrollSpy();

  useEffect(() => {
    registerSection('location', 'Location');
    return () => {};
  }, [registerSection]);

  const getDirectionsUrl = (venue: typeof weddingInfo.venue.ceremony) => {
    const address = `${venue.address}, ${venue.city}, ${venue.state} ${venue.zipCode}`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(address)}`;
  };

  const getMapEmbedUrl = (venue: typeof weddingInfo.venue.ceremony) => {
    if (venue.coordinates) {
      return `https://maps.google.com/maps?q=${venue.coordinates.lat},${venue.coordinates.lng}&z=15&output=embed`;
    }
    const address = `${venue.address}, ${venue.city}, ${venue.state} ${venue.zipCode}`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
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
    <section id="location" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-serif text-gray-800 mb-4">
            Locations
          </h2>
          <div className="w-24 h-1 bg-rose-400 mx-auto mb-6" />
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find your way to our special day
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-12"
        >
          <motion.div variants={itemVariants}>
            <Card variant="elevated" padding="none">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-8">
                  <CardHeader>
                    <CardTitle className="flex items-center text-2xl mb-4">
                      <span className="text-3xl mr-3">💒</span>
                      Ceremony Venue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {weddingInfo.venue.ceremony.name}
                        </h3>
                        <p className="text-gray-600 mb-1">{weddingInfo.venue.ceremony.address}</p>
                        <p className="text-gray-600">
                          {weddingInfo.venue.ceremony.city}, {weddingInfo.venue.ceremony.state} {weddingInfo.venue.ceremony.zipCode}
                        </p>
                      </div>
                      
                      {weddingInfo.venue.ceremony.phone && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">📞</span>
                          <a 
                            href={`tel:${weddingInfo.venue.ceremony.phone}`}
                            className="text-rose-600 hover:text-rose-700 transition-colors"
                          >
                            {weddingInfo.venue.ceremony.phone}
                          </a>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                        <Button
                          onClick={() => window.open(getDirectionsUrl(weddingInfo.venue.ceremony), '_blank')}
                          leftIcon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                          }
                        >
                          Get Directions
                        </Button>
                        
                        {weddingInfo.venue.ceremony.website && (
                          <Button
                            variant="outline"
                            onClick={() => window.open(weddingInfo.venue.ceremony.website, '_blank')}
                            leftIcon={
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            }
                          >
                            Visit Website
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>
                
                <div className="h-64 lg:h-auto">
                  <iframe
                    src={getMapEmbedUrl(weddingInfo.venue.ceremony)}
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '300px' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Ceremony Venue Location"
                    className="rounded-r-lg"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card variant="elevated" padding="none">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-8">
                  <CardHeader>
                    <CardTitle className="flex items-center text-2xl mb-4">
                      <span className="text-3xl mr-3">🎉</span>
                      Reception Venue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {weddingInfo.venue.reception.name}
                        </h3>
                        <p className="text-gray-600 mb-1">{weddingInfo.venue.reception.address}</p>
                        <p className="text-gray-600">
                          {weddingInfo.venue.reception.city}, {weddingInfo.venue.reception.state} {weddingInfo.venue.reception.zipCode}
                        </p>
                      </div>
                      
                      {weddingInfo.venue.reception.phone && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">📞</span>
                          <a 
                            href={`tel:${weddingInfo.venue.reception.phone}`}
                            className="text-rose-600 hover:text-rose-700 transition-colors"
                          >
                            {weddingInfo.venue.reception.phone}
                          </a>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                        <Button
                          onClick={() => window.open(getDirectionsUrl(weddingInfo.venue.reception), '_blank')}
                          leftIcon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                          }
                        >
                          Get Directions
                        </Button>
                        
                        {weddingInfo.venue.reception.website && (
                          <Button
                            variant="outline"
                            onClick={() => window.open(weddingInfo.venue.reception.website, '_blank')}
                            leftIcon={
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            }
                          >
                            Visit Website
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>
                
                <div className="h-64 lg:h-auto">
                  <iframe
                    src={getMapEmbedUrl(weddingInfo.venue.reception)}
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: '300px' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Reception Venue Location"
                    className="rounded-r-lg"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card variant="outlined" padding="lg">
              <CardContent>
                <div className="text-center">
                  <h3 className="text-xl font-medium text-gray-900 mb-6">Transportation & Parking</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center">
                      <div className="text-4xl mb-3">🚗</div>
                      <h4 className="font-medium text-gray-900 mb-2">Parking</h4>
                      <p className="text-sm text-gray-600 text-center">
                        Complimentary valet parking available at both venues
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="text-4xl mb-3">🚖</div>
                      <h4 className="font-medium text-gray-900 mb-2">Rideshare</h4>
                      <p className="text-sm text-gray-600 text-center">
                        Uber and Lyft readily available in the area
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="text-4xl mb-3">🏨</div>
                      <h4 className="font-medium text-gray-900 mb-2">Hotels</h4>
                      <p className="text-sm text-gray-600 text-center">
                        Several accommodations within 2 miles of venues
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};