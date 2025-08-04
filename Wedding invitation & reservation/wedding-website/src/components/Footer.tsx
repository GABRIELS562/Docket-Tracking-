import React from 'react';
import { motion } from 'framer-motion';
import { weddingInfo } from '../data/weddingInfo';

export const Footer: React.FC = () => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="mb-8">
            <h3 className="text-3xl font-serif mb-2">
              {weddingInfo.bride.name} & {weddingInfo.groom.name}
            </h3>
            <div className="w-16 h-1 bg-rose-400 mx-auto mb-4" />
            <p className="text-gray-300 mb-4">
              {formatDate(weddingInfo.date.ceremony)}
            </p>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Thank you for being part of our special day. We can't wait to celebrate with you!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="text-lg font-medium mb-3">Ceremony</h4>
              <div className="text-gray-300 text-sm space-y-1">
                <p>{weddingInfo.venue.ceremony.name}</p>
                <p>{weddingInfo.venue.ceremony.address}</p>
                <p>
                  {weddingInfo.venue.ceremony.city}, {weddingInfo.venue.ceremony.state} {weddingInfo.venue.ceremony.zipCode}
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-medium mb-3">Reception</h4>
              <div className="text-gray-300 text-sm space-y-1">
                <p>{weddingInfo.venue.reception.name}</p>
                <p>{weddingInfo.venue.reception.address}</p>
                <p>
                  {weddingInfo.venue.reception.city}, {weddingInfo.venue.reception.state} {weddingInfo.venue.reception.zipCode}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-gray-400 text-sm">
                Made with 💕 for our wedding day
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-gray-400">
                <button
                  onClick={() => {
                    const rsvpSection = document.getElementById('rsvp');
                    rsvpSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  RSVP
                </button>
                <button
                  onClick={() => {
                    const registrySection = document.getElementById('registry');
                    registrySection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Registry
                </button>
                <button
                  onClick={() => {
                    const locationSection = document.getElementById('location');
                    locationSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Directions
                </button>
              </div>
            </div>
          </div>

          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              repeatDelay: 3 
            }}
            className="mt-8 text-2xl"
          >
            💕
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
};