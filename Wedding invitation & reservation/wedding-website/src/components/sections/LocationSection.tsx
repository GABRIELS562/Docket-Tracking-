import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPinIcon, 
  PhoneIcon, 
  GlobeAltIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HomeIcon,
  TruckIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { weddingInfo } from '../../data/weddingInfo';

const LocationSection = () => {
  const [expandedAccommodation, setExpandedAccommodation] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(type);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatAddress = (venue: any) => {
    return `${venue.address}, ${venue.city}, ${venue.state} ${venue.zipCode}`;
  };

  const getGoogleMapsUrl = (venue: any) => {
    const address = encodeURIComponent(formatAddress(venue));
    return `https://www.google.com/maps/search/?api=1&query=${address}`;
  };

  const getDirectionsUrl = (venue: any) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${venue.coordinates.lat},${venue.coordinates.lng}`;
  };

  const toggleAccommodation = (id: string) => {
    setExpandedAccommodation(expandedAccommodation === id ? null : id);
  };

  const renderStars = (rating: number | undefined) => {
    if (!rating) return null;
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <section id="location" className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-16"
        >
          <motion.h2 
            variants={itemVariants}
            className="text-3xl lg:text-4xl font-serif text-gray-800 mb-4"
          >
            Location & Travel
          </motion.h2>
          <motion.p 
            variants={itemVariants}
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Everything you need to know about getting here and where to stay
          </motion.p>
        </motion.div>

        {/* Venue Information */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16"
        >
          {/* Ceremony Venue */}
          <motion.div variants={itemVariants} className="bg-gray-50 rounded-2xl p-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-serif text-gray-800 mb-2">Ceremony</h3>
              <p className="text-rose-600 font-medium">{weddingInfo.date.ceremony.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
              })}</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-gray-800">
                {weddingInfo.venue.ceremony.name}
              </h4>
              
              <div className="flex items-start space-x-3">
                <MapPinIcon className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-700">{formatAddress(weddingInfo.venue.ceremony)}</p>
                  <button
                    onClick={() => copyToClipboard(formatAddress(weddingInfo.venue.ceremony), 'ceremony')}
                    className="mt-1 text-sm text-rose-600 hover:text-rose-700 flex items-center"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                    {copiedAddress === 'ceremony' ? 'Copied!' : 'Copy address'}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <PhoneIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <a 
                  href={`tel:${weddingInfo.venue.ceremony.phone}`}
                  className="text-gray-700 hover:text-rose-600"
                >
                  {weddingInfo.venue.ceremony.phone}
                </a>
              </div>

              <div className="flex items-center space-x-3">
                <GlobeAltIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <a 
                  href={weddingInfo.venue.ceremony.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-rose-600"
                >
                  Visit website
                </a>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed">
                {weddingInfo.venue.ceremony.description}
              </p>

              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Parking:</strong> {weddingInfo.venue.ceremony.parkingInfo}</p>
                <p><strong>Accessibility:</strong> {weddingInfo.venue.ceremony.accessibilityInfo}</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <a
                  href={getGoogleMapsUrl(weddingInfo.venue.ceremony)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-center"
                >
                  View on Maps
                </a>
                <a
                  href={getDirectionsUrl(weddingInfo.venue.ceremony)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors text-center"
                >
                  Get Directions
                </a>
              </div>
            </div>
          </motion.div>

          {/* Reception Venue */}
          <motion.div variants={itemVariants} className="bg-gray-50 rounded-2xl p-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-serif text-gray-800 mb-2">Reception</h3>
              <p className="text-rose-600 font-medium">{weddingInfo.date.reception.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
              })}</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xl font-semibold text-gray-800">
                {weddingInfo.venue.reception.name}
              </h4>
              
              <div className="flex items-start space-x-3">
                <MapPinIcon className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-700">{formatAddress(weddingInfo.venue.reception)}</p>
                  <button
                    onClick={() => copyToClipboard(formatAddress(weddingInfo.venue.reception), 'reception')}
                    className="mt-1 text-sm text-rose-600 hover:text-rose-700 flex items-center"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                    {copiedAddress === 'reception' ? 'Copied!' : 'Copy address'}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <PhoneIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <a 
                  href={`tel:${weddingInfo.venue.reception.phone}`}
                  className="text-gray-700 hover:text-rose-600"
                >
                  {weddingInfo.venue.reception.phone}
                </a>
              </div>

              <div className="flex items-center space-x-3">
                <GlobeAltIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <a 
                  href={weddingInfo.venue.reception.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-rose-600"
                >
                  Visit website
                </a>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed">
                {weddingInfo.venue.reception.description}
              </p>

              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Parking:</strong> {weddingInfo.venue.reception.parkingInfo}</p>
                <p><strong>Accessibility:</strong> {weddingInfo.venue.reception.accessibilityInfo}</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <a
                  href={getGoogleMapsUrl(weddingInfo.venue.reception)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-center"
                >
                  View on Maps
                </a>
                <a
                  href={getDirectionsUrl(weddingInfo.venue.reception)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors text-center"
                >
                  Get Directions
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Transportation */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mb-16"
        >
          <motion.h3 
            variants={itemVariants}
            className="text-2xl font-serif text-gray-800 text-center mb-8"
          >
            Transportation
          </motion.h3>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {weddingInfo.transportation.map((transport) => (
              <motion.div 
                key={transport.id}
                variants={itemVariants}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <TruckIcon className="h-6 w-6 text-rose-500 mr-3" />
                  <h4 className="font-semibold text-gray-800">{transport.name}</h4>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{transport.description}</p>
                
                <div className="space-y-2 text-sm">
                  <p><strong>Cost:</strong> {transport.estimatedCost}</p>
                  {transport.estimatedTime && (
                    <p><strong>Time:</strong> {transport.estimatedTime}</p>
                  )}
                  {transport.notes && (
                    <p className="text-gray-600">{transport.notes}</p>
                  )}
                </div>

                {transport.website && (
                  <a
                    href={transport.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-rose-600 hover:text-rose-700 text-sm font-medium"
                  >
                    Learn more →
                  </a>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Accommodations */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mb-16"
        >
          <motion.h3 
            variants={itemVariants}
            className="text-2xl font-serif text-gray-800 text-center mb-8"
          >
            Where to Stay
          </motion.h3>
          
          <motion.div 
            variants={containerVariants}
            className="space-y-6"
          >
            {weddingInfo.accommodations.map((accommodation) => (
              <motion.div 
                key={accommodation.id}
                variants={itemVariants}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <HomeIcon className="h-5 w-5 text-rose-500 mr-2" />
                        <h4 className="text-xl font-semibold text-gray-800">
                          {accommodation.name}
                        </h4>
                        <span className="ml-3 text-lg">
                          {accommodation.priceRange}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          {renderStars(accommodation.rating)}
                          <span className="ml-1">
                            {accommodation.rating} ({accommodation.reviewCount || 0} reviews)
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-600 mb-3">{accommodation.description}</p>
                      <p className="text-sm text-gray-600 mb-3">
                        <MapPinIcon className="h-4 w-4 inline mr-1" />
                        {accommodation.distanceFromVenue}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-0 lg:space-y-2 lg:ml-6">
                      {accommodation.bookingUrl && (
                        <a
                          href={accommodation.bookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-rose-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors text-center"
                        >
                          Book Now
                        </a>
                      )}
                      
                      <button
                        onClick={() => toggleAccommodation(accommodation.id)}
                        className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
                      >
                        Details
                        {expandedAccommodation === accommodation.id ? (
                          <ChevronUpIcon className="h-4 w-4 ml-1" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4 ml-1" />
                        )}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedAccommodation === accommodation.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-gray-200 pt-4 mt-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h5 className="font-semibold text-gray-800 mb-2">Amenities</h5>
                            <div className="flex flex-wrap gap-2">
                              {accommodation.amenities.map((amenity, index) => (
                                <span
                                  key={index}
                                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                                >
                                  {amenity}
                                </span>
                              ))}
                            </div>
                          </div>

                          {accommodation.groupRate && (
                            <div>
                              <h5 className="font-semibold text-gray-800 mb-2">Group Rate</h5>
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <p className="text-sm text-green-800 font-medium">
                                  Code: {accommodation.groupRate.code}
                                </p>
                                <p className="text-sm text-green-700">
                                  {accommodation.groupRate.description}
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  Book by {accommodation.groupRate.deadline?.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <a
                            href={`tel:${accommodation.phone}`}
                            className="text-rose-600 hover:text-rose-700 text-sm font-medium flex items-center"
                          >
                            <PhoneIcon className="h-4 w-4 mr-1" />
                            {accommodation.phone}
                          </a>
                          
                          {accommodation.website && (
                            <a
                              href={accommodation.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-rose-600 hover:text-rose-700 text-sm font-medium flex items-center"
                            >
                              <GlobeAltIcon className="h-4 w-4 mr-1" />
                              Website
                            </a>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Local Attractions */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <motion.h3 
            variants={itemVariants}
            className="text-2xl font-serif text-gray-800 text-center mb-8"
          >
            Things to Do in San Francisco
          </motion.h3>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {weddingInfo.localAttractions.map((attraction) => (
              <motion.div 
                key={attraction.id}
                variants={itemVariants}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <h4 className="font-semibold text-gray-800 mb-2">{attraction.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{attraction.description}</p>
                
                <div className="space-y-1 text-xs text-gray-500">
                  <p>📍 {attraction.distanceFromVenue}</p>
                  {attraction.hours && <p>🕒 {attraction.hours}</p>}
                  {attraction.rating && (
                    <div className="flex items-center">
                      <span>⭐ {attraction.rating}</span>
                    </div>
                  )}
                </div>

                {attraction.website && (
                  <a
                    href={attraction.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-rose-600 hover:text-rose-700 text-sm font-medium"
                  >
                    Learn more →
                  </a>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default LocationSection;