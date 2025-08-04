import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useScrollSpy } from '../../hooks/useScrollSpy';
import { Card, CardContent, Button } from '../ui';
import { weddingInfo } from '../../data/weddingInfo';

export const Registry: React.FC = () => {
  const { registerSection } = useScrollSpy();

  useEffect(() => {
    registerSection('registry', 'Registry');
    return () => {};
  }, [registerSection]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-100 text-rose-800';
      case 'medium':
        return 'bg-amber-100 text-amber-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '⭐';
      case 'medium':
        return '🔸';
      case 'low':
        return '🔹';
      default:
        return '🔹';
    }
  };

  const groupedItems = weddingInfo.registry.reduce((acc, item) => {
    if (!acc[item.priority]) {
      acc[item.priority] = [];
    }
    acc[item.priority].push(item);
    return acc;
  }, {} as Record<string, typeof weddingInfo.registry>);

  return (
    <section id="registry" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-serif text-gray-800 mb-4">
            Gift Registry
          </h2>
          <div className="w-24 h-1 bg-rose-400 mx-auto mb-6" />
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your presence is the only present we need, but if you'd like to help us start our new life together, here are some ideas
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <Card variant="filled" padding="lg">
            <CardContent>
              <div className="text-center">
                <h3 className="text-xl font-medium text-gray-900 mb-4">💝 Our Gift Philosophy</h3>
                <p className="text-gray-600 mb-6">
                  We're building a home filled with love, laughter, and beautiful memories. 
                  These gifts will help us create the perfect space to begin our married life together.
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-rose-100 text-rose-800">
                      ⭐ Most Wanted
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                      🔸 Would Love
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                      🔹 Nice to Have
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {['high', 'medium', 'low'].map((priority) => {
          if (!groupedItems[priority] || groupedItems[priority].length === 0) return null;
          
          return (
            <motion.div
              key={priority}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-12"
            >
              <h3 className="text-2xl font-medium text-gray-900 mb-6 capitalize flex items-center">
                <span className="mr-2">{getPriorityIcon(priority)}</span>
                {priority === 'high' ? 'Most Wanted' : priority === 'medium' ? 'Would Love' : 'Nice to Have'}
              </h3>
              
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {groupedItems[priority].map((item) => (
                  <motion.div key={item.id} variants={itemVariants}>
                    <Card variant="elevated" padding="lg" hover>
                      <CardContent>
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium text-gray-900 text-lg leading-tight">
                            {item.name}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(priority)}`}>
                            {getPriorityIcon(priority)}
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 font-medium">{item.store}</span>
                            {item.price && (
                              <span className="text-lg font-semibold text-gray-900">
                                ${item.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                          
                          <Button
                            onClick={() => window.open(item.url, '_blank')}
                            className="w-full"
                            rightIcon={
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            }
                          >
                            View at {item.store}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16"
        >
          <Card variant="outlined" padding="lg">
            <CardContent>
              <div className="text-center">
                <h3 className="text-xl font-medium text-gray-900 mb-4">Other Ways to Celebrate</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl mb-3">💳</div>
                    <h4 className="font-medium text-gray-900 mb-2">Cash Gifts</h4>
                    <p className="text-center">
                      Monetary gifts are always appreciated and can be given at the reception
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="text-3xl mb-3">✈️</div>
                    <h4 className="font-medium text-gray-900 mb-2">Honeymoon Fund</h4>
                    <p className="text-center">
                      Help us create magical memories on our honeymoon adventure
                    </p>
                  </div>
                </div>
                
                <div className="mt-8 p-4 bg-rose-50 rounded-lg">
                  <p className="text-sm text-rose-800">
                    <strong>Note:</strong> Gifts can be shipped directly to our home address or brought to the reception. 
                    Please include a card so we know who to thank!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};