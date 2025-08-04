import { motion } from 'framer-motion';
import { 
  ClockIcon, 
  MapPinIcon, 
  InformationCircleIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { weddingInfo } from '../../data/weddingInfo';

const DetailsSection = () => {
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


  return (
    <section id="details" className="py-16 lg:py-24 bg-gray-50">
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
            Wedding Details
          </motion.h2>
          <motion.p 
            variants={itemVariants}
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Everything you need to know about our special day
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"
        >
          {/* Timeline */}
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
              <div className="flex items-center mb-6">
                <ClockIcon className="h-6 w-6 text-rose-500 mr-3" />
                <h3 className="text-xl font-semibold text-gray-800">Timeline</h3>
              </div>
              
              <div className="space-y-4">
                {weddingInfo.timeline.map((event, index) => (
                  <div key={index} className="flex">
                    <div className="flex-shrink-0 w-20 text-sm font-medium text-rose-600">
                      {event.time}
                    </div>
                    <div className="flex-1 ml-4">
                      <h4 className="font-medium text-gray-800 mb-1">
                        {event.event}
                      </h4>
                      <p className="text-sm text-gray-600 mb-1">
                        {event.description}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <MapPinIcon className="h-3 w-3 mr-1" />
                        {event.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Important Information */}
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Dress Code */}
            <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
              <div className="flex items-center mb-4">
                <InformationCircleIcon className="h-6 w-6 text-rose-500 mr-3" />
                <h3 className="text-xl font-semibold text-gray-800">Dress Code</h3>
              </div>
              <p className="text-gray-600 mb-4">
                {weddingInfo.importantInfo.dressCode}
              </p>
            </div>

            {/* Ceremony Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Ceremony</h3>
              <div className="space-y-3">
                {(weddingInfo.importantInfo.ceremony.notes || []).map((note, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-rose-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reception Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Reception</h3>
              <div className="space-y-3">
                {(weddingInfo.importantInfo.reception.notes || []).map((note, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-rose-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                    <p className="text-sm text-gray-600">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mt-16"
        >
          <motion.h3 
            variants={itemVariants}
            className="text-2xl font-serif text-gray-800 text-center mb-8"
          >
            Frequently Asked Questions
          </motion.h3>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-3">Can I bring children?</h4>
              <p className="text-gray-600 text-sm">
                Yes! Children are welcome. Please include them in your guest count when you RSVP.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-3">What about dietary restrictions?</h4>
              <p className="text-gray-600 text-sm">
                We'll accommodate all dietary needs. Please specify any restrictions in your RSVP.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-3">Is parking available?</h4>
              <p className="text-gray-600 text-sm">
                Yes, both venues offer parking. Valet service is available at the reception venue.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg p-6">
              <h4 className="font-semibold text-gray-800 mb-3">What's the weather like?</h4>
              <p className="text-gray-600 text-sm">
                August in San Francisco is mild. Bring a light jacket for the evening as it can get cool.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Contact Information */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mt-16"
        >
          <motion.h3 
            variants={itemVariants}
            className="text-2xl font-serif text-gray-800 text-center mb-8"
          >
            Questions? Contact Us
          </motion.h3>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {weddingInfo.contacts.slice(0, 3).map((contact, index) => (
              <motion.div 
                key={index}
                variants={itemVariants}
                className="bg-white rounded-xl shadow-lg p-6 text-center"
              >
                <h4 className="font-semibold text-gray-800 mb-2 capitalize">
                  {contact.role.replace('_', ' ')}
                </h4>
                <p className="text-gray-700 mb-3">{contact.name}</p>
                <div className="space-y-2">
                  {contact.preferredContact === 'phone' && (
                    <a 
                      href={`tel:${contact.phone}`}
                      className="flex items-center justify-center text-sm text-rose-600 hover:text-rose-700"
                    >
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      {contact.phone}
                    </a>
                  )}
                  <a 
                    href={`mailto:${contact.email}`}
                    className="flex items-center justify-center text-sm text-rose-600 hover:text-rose-700"
                  >
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    {contact.email}
                  </a>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  {contact.availability}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Special Considerations */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mt-16"
        >
          <motion.div 
            variants={itemVariants}
            className="bg-rose-50 rounded-2xl p-8 border border-rose-100"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
              Important Notes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(weddingInfo.importantInfo.specialConsiderations || []).map((note, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-2 h-2 bg-rose-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                  <p className="text-sm text-gray-700">{note}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default DetailsSection;