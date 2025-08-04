import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  EnvelopeIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';
import { 
  testEmailConnection, 
  validateEmailConfig, 
  sendConfirmationEmail 
} from '../../utils/emailService';
import type { RSVPSubmission } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface TestResult {
  type: 'success' | 'error' | 'info';
  message: string;
}

const EmailTester: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testConfiguration = async () => {
    setIsLoading(true);
    addResult({ type: 'info', message: 'Testing EmailJS configuration...' });

    try {
      const configCheck = await validateEmailConfig();
      
      if (configCheck.isValid) {
        addResult({ type: 'success', message: '✅ EmailJS configuration is valid' });
      } else {
        addResult({ 
          type: 'error', 
          message: `❌ Configuration errors: ${configCheck.errors.join(', ')}` 
        });
        setIsLoading(false);
        return;
      }

      addResult({ type: 'info', message: 'Testing EmailJS connection...' });
      
      const connectionTest = await testEmailConnection();
      
      if (connectionTest.success) {
        addResult({ type: 'success', message: '✅ EmailJS connection successful' });
      } else {
        addResult({ 
          type: 'error', 
          message: `❌ Connection failed: ${connectionTest.error}` 
        });
      }
      
    } catch (error) {
      addResult({ 
        type: 'error', 
        message: `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
    
    setIsLoading(false);
  };

  const sendTestEmail = async () => {
    setIsLoading(true);
    addResult({ type: 'info', message: 'Sending test confirmation email...' });

    const testRSVP: RSVPSubmission = {
      token: 'TEST_' + Date.now(),
      guestName: 'John & Jane Doe',
      email: 'test@example.com', // Change this to your email for testing
      isAttending: true,
      mealChoice: 'Grilled Salmon with Herb Butter',
      dietaryRestrictions: 'No shellfish allergies',
      plusOneName: 'Jane Doe',
      plusOneMealChoice: 'Beef Tenderloin with Red Wine Reduction',
      plusOneDietaryRestrictions: 'Gluten-free options preferred',
      wantsEmailConfirmation: true,
      specialRequests: 'Table near the dance floor, anniversary celebration',
      submittedAt: new Date().toISOString()
    };

    try {
      await sendConfirmationEmail(testRSVP);
      addResult({ 
        type: 'success', 
        message: '✅ Test email sent successfully! Check your inbox at test@example.com' 
      });
    } catch (error) {
      addResult({ 
        type: 'error', 
        message: `❌ Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
    
    setIsLoading(false);
  };

  const sendDeclinedTestEmail = async () => {
    setIsLoading(true);
    addResult({ type: 'info', message: 'Sending test "not attending" email...' });

    const testRSVP: RSVPSubmission = {
      token: 'TEST_DECLINE_' + Date.now(),
      guestName: 'Alice Smith',
      email: 'test@example.com', // Change this to your email for testing
      isAttending: false,
      mealChoice: undefined,
      dietaryRestrictions: undefined,
      plusOneName: undefined,
      plusOneMealChoice: undefined,
      plusOneDietaryRestrictions: undefined,
      wantsEmailConfirmation: true,
      specialRequests: 'Sorry we cannot make it, will be out of town',
      submittedAt: new Date().toISOString()
    };

    try {
      await sendConfirmationEmail(testRSVP);
      addResult({ 
        type: 'success', 
        message: '✅ "Not attending" test email sent successfully!' 
      });
    } catch (error) {
      addResult({ 
        type: 'error', 
        message: `❌ Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
    
    setIsLoading(false);
  };

  return (
    <Card className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <EnvelopeIcon className="w-12 h-12 mx-auto text-rose-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Email Service Tester
        </h2>
        <p className="text-gray-600">
          Test your EmailJS configuration and email templates
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex flex-wrap gap-3 justify-center">
          <Button
            onClick={testConfiguration}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            Test Configuration
          </Button>

          <Button
            onClick={sendTestEmail}
            disabled={isLoading}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <CheckCircleIcon className="w-5 h-5" />
            Send "Attending" Test
          </Button>

          <Button
            onClick={sendDeclinedTestEmail}
            disabled={isLoading}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <ExclamationCircleIcon className="w-5 h-5" />
            Send "Not Attending" Test
          </Button>

          <Button
            onClick={clearResults}
            variant="outline"
            disabled={isLoading || results.length === 0}
          >
            Clear Results
          </Button>
        </div>
      </div>

      {/* Results Display */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto"
        >
          <h3 className="font-semibold text-gray-900 mb-3">Test Results:</h3>
          <div className="space-y-2">
            {results.map((result, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-md text-sm ${
                  result.type === 'success' 
                    ? 'bg-green-100 text-green-800' 
                    : result.type === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {result.message}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <h4 className="font-semibold text-amber-800 mb-2">Testing Instructions:</h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>1. First, test your configuration to ensure EmailJS is properly set up</li>
          <li>2. Update the test email address in the code to your actual email</li>
          <li>3. Send test emails to verify both "attending" and "not attending" scenarios</li>
          <li>4. Check your email inbox and spam folder for the test messages</li>
          <li>5. Verify that all template variables are displaying correctly</li>
        </ul>
      </div>

      {/* Environment Variables Help */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">Required Environment Variables:</h4>
        <div className="text-sm text-blue-700 space-y-1 font-mono">
          <div>REACT_APP_EMAILJS_SERVICE_ID=service_abc123</div>
          <div>REACT_APP_EMAILJS_TEMPLATE_ID=template_xyz789</div>
          <div>REACT_APP_EMAILJS_PUBLIC_KEY=user_abcdef123456</div>
        </div>
        <p className="text-sm text-blue-600 mt-2">
          See EMAILJS_SETUP.md for complete setup instructions.
        </p>
      </div>
    </Card>
  );
};

export default EmailTester;