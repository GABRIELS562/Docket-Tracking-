import { motion } from 'framer-motion';
import { CalendarDaysIcon, HeartIcon } from '@heroicons/react/24/outline';
import { weddingInfo } from '../../data/weddingInfo';
import SmartRSVPForm from '../forms/SmartRSVPForm';

const RSVPSection = () => {
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <section id="rsvp" className="py-16 lg:py-24 bg-gradient-to-br from-white to-rose-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-12"
        >
          <motion.div
            variants={itemVariants}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <CalendarDaysIcon className="h-12 w-12 text-rose-500" />
              <HeartIcon className="h-6 w-6 text-rose-600 absolute -bottom-1 -right-1 fill-current" />
            </div>
          </motion.div>
          
          <motion.h2 
            variants={itemVariants}
            className="text-3xl lg:text-4xl font-serif text-gray-800 mb-4"
          >
            RSVP
          </motion.h2>
          
          <motion.div 
            variants={itemVariants}
            className="max-w-2xl mx-auto space-y-4"
          >
            <p className="text-lg text-gray-600 leading-relaxed">
              We hope you can join us for our special day! Please respond by{' '}
              <span className="font-semibold text-gray-800">
                {formatDate(weddingInfo.date.rsvpDeadline)}
              </span>
            </p>
          </motion.div>
        </motion.div>

        {/* RSVP Form */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          <SmartRSVPForm />
        </motion.div>

        {/* Additional Information */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mt-12"
        >
          <motion.div 
            variants={itemVariants}
            className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center"
          >
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              Need to Make Changes?
            </h3>
            <p className="text-blue-800 leading-relaxed">
              You can update your RSVP anytime before the deadline using your personalized invitation link. 
              If you have any questions or special circumstances, please don't hesitate to{' '}
              <a 
                href={`mailto:${weddingInfo.bride.email}`}
                className="underline hover:text-blue-900 font-medium"
              >
                contact us directly
              </a>.
            </p>
          </motion.div>
        </motion.div>

        {/* Wedding Hashtag */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="mt-8 text-center"
        >
          <motion.div variants={itemVariants}>
            <p className="text-gray-600 mb-2">Share your excitement with us!</p>
            <p className="text-2xl font-serif text-rose-600">
              {weddingInfo.hashtag}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default RSVPSection;