import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useScrollSpy } from '../../hooks/useScrollSpy';
import { useGuestAuth } from '../../hooks/useGuestAuth';
import { useRSVP } from '../../hooks/useRSVP';
import { Card, CardHeader, CardTitle, CardContent, LoadingSpinner } from '../ui';
import { RSVPForm } from '../forms';
import type { RSVPFormData } from '../../types';

export const RSVP: React.FC = () => {
  const { registerSection } = useScrollSpy();
  const { guestToken, isAuthenticated, isLoading: authLoading } = useGuestAuth();
  const { loadExistingRSVP, isLoading: rsvpLoading } = useRSVP();
  const [existingRSVP, setExistingRSVP] = useState<RSVPFormData | null>(null);
  const [hasLoadedRSVP, setHasLoadedRSVP] = useState(false);

  useEffect(() => {
    registerSection('rsvp', 'RSVP');
    return () => {};
  }, [registerSection]);

  useEffect(() => {
    const loadRSVPData = async () => {
      if (isAuthenticated && guestToken && !hasLoadedRSVP) {
        const result = await loadExistingRSVP(guestToken.token);
        if (result.success && result.data) {
          setExistingRSVP(result.data);
        }
        setHasLoadedRSVP(true);
      }
    };

    loadRSVPData();
  }, [isAuthenticated, guestToken, loadExistingRSVP, hasLoadedRSVP]);

  const isLoading = authLoading || rsvpLoading;

  return (
    <section id="rsvp" className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-serif text-gray-800 mb-4">
            RSVP
          </h2>
          <div className="w-24 h-1 bg-rose-400 mx-auto mb-6" />
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {isAuthenticated 
              ? `Hi ${guestToken?.fullName}! Please let us know if you'll be joining us for our special day.`
              : 'Please use your personal invitation link to RSVP for our wedding.'
            }
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {isLoading ? (
            <Card variant="elevated" padding="xl">
              <CardContent>
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" text="Loading your invitation..." />
                </div>
              </CardContent>
            </Card>
          ) : !isAuthenticated ? (
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle className="text-center">Personal Invitation Required</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-6xl mb-6">💌</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-4">
                    You'll need your personal invitation link
                  </h3>
                  <div className="space-y-4 text-gray-600">
                    <p>
                      Each guest has received a unique invitation link to RSVP. 
                      Please check your email or the invitation you received.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg text-sm">
                      <p className="font-medium text-gray-700 mb-2">Your link looks like:</p>
                      <code className="text-rose-600">
                        https://yourwedding.com/sarah-johnson-a8b9c1d2
                      </code>
                    </div>
                    <p className="text-sm">
                      Having trouble finding your link? Please contact us and we'll help you out!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {existingRSVP && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <Card variant="filled" padding="md">
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">
                            {existingRSVP.isAttending ? '✅' : '❌'}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900">
                              You've already submitted your RSVP
                            </p>
                            <p className="text-sm text-gray-600">
                              {existingRSVP.isAttending 
                                ? `You're attending with ${existingRSVP.guestCount} guest${existingRSVP.guestCount !== 1 ? 's' : ''}`
                                : "You've indicated you can't attend"
                              }
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          You can update your response below
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <RSVPForm 
                existingRSVP={existingRSVP}
                onSubmitSuccess={() => {
                  // Optionally reload the RSVP data or show a success message
                  setHasLoadedRSVP(false);
                }}
              />
            </>
          )}
        </motion.div>

        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12"
          >
            <Card variant="outlined" padding="lg">
              <CardContent>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Important RSVP Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
                    <div className="flex flex-col items-center">
                      <div className="text-2xl mb-2">📅</div>
                      <h4 className="font-medium text-gray-900 mb-1">RSVP Deadline</h4>
                      <p className="text-center">
                        Please respond by July 15th, 2024
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="text-2xl mb-2">✏️</div>
                      <h4 className="font-medium text-gray-900 mb-1">Changes</h4>
                      <p className="text-center">
                        You can update your RSVP anytime before the deadline
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="text-2xl mb-2">🍽️</div>
                      <h4 className="font-medium text-gray-900 mb-1">Meal Choices</h4>
                      <p className="text-center">
                        Please select meal preferences for all attending guests
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="text-2xl mb-2">❓</div>
                      <h4 className="font-medium text-gray-900 mb-1">Questions</h4>
                      <p className="text-center">
                        Contact us if you need any assistance with your RSVP
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-rose-50 rounded-lg">
                    <p className="text-sm text-rose-800">
                      <strong>Need Help?</strong> If you're having trouble with your RSVP or need to make changes after the deadline, 
                      please don't hesitate to contact us directly.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </section>
  );
};