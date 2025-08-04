#!/usr/bin/env node

// Environment validation script for production deployment

import fs from 'fs';
import path from 'path';

const requiredEnvVars = {
  // App configuration
  VITE_APP_URL: 'Production website URL',
  VITE_APP_NAME: 'Application name',
  
  // Google Sheets API
  VITE_GOOGLE_SHEETS_API_KEY: 'Google Sheets API key for browser requests',
  VITE_GOOGLE_SHEETS_SPREADSHEET_ID: 'Google Sheets spreadsheet ID',
  GOOGLE_SHEETS_PRIVATE_KEY: 'Service account private key',
  GOOGLE_SHEETS_CLIENT_EMAIL: 'Service account email',
  
  // EmailJS
  VITE_EMAILJS_SERVICE_ID: 'EmailJS service ID',
  VITE_EMAILJS_TEMPLATE_ID: 'EmailJS template ID',
  VITE_EMAILJS_PUBLIC_KEY: 'EmailJS public key',
  EMAILJS_PRIVATE_KEY: 'EmailJS private key',
  
  // Security
  VITE_GUEST_TOKEN_SECRET: 'Secret for guest token generation',
  
  // Wedding configuration
  VITE_WEDDING_DATE: 'Wedding date (YYYY-MM-DD)',
  VITE_RSVP_DEADLINE: 'RSVP deadline (YYYY-MM-DD)',
  VITE_VENUE_TIMEZONE: 'Venue timezone'
};

const optionalEnvVars = {
  // Analytics & Monitoring
  VITE_GOOGLE_ANALYTICS_ID: 'Google Analytics tracking ID',
  VITE_SENTRY_DSN: 'Sentry error tracking DSN',
  VITE_HOTJAR_ID: 'Hotjar tracking ID',
  
  // Feature flags
  VITE_ENABLE_GUEST_AUTH: 'Enable guest authentication',
  VITE_ENABLE_EMAIL_CONFIRMATIONS: 'Enable email confirmations',
  VITE_ENABLE_ANALYTICS: 'Enable analytics tracking',
  VITE_ENABLE_ERROR_REPORTING: 'Enable error reporting',
  
  // Performance
  VITE_WEB_VITALS_ENABLED: 'Enable Web Vitals tracking',
  
  // Security
  VITE_CSP_REPORT_URI: 'Content Security Policy report URI'
};

function validateEnvironment() {
  console.log('🔍 Validating environment configuration...\n');
  
  const envFile = '.env.production';
  const envPath = path.resolve(envFile);
  
  // Check if .env.production exists
  if (!fs.existsSync(envPath)) {
    console.error(`❌ Missing ${envFile} file`);
    console.log(`Please create ${envFile} with all required environment variables.`);
    process.exit(1);
  }
  
  // Load environment variables
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  let hasErrors = false;
  let hasWarnings = false;
  
  // Check required environment variables
  console.log('📋 Required Environment Variables:');
  Object.entries(requiredEnvVars).forEach(([key, description]) => {
    const value = envVars[key];
    
    if (!value || value === 'your_production_value_here' || value === '') {
      console.error(`❌ ${key}: ${description} - MISSING or placeholder value`);
      hasErrors = true;
    } else {
      console.log(`✅ ${key}: ${description}`);
      
      // Additional validation for specific vars
      if (key === 'VITE_APP_URL' && !value.startsWith('https://')) {
        console.warn(`⚠️  ${key}: Should use HTTPS in production`);
        hasWarnings = true;
      }
      
      if (key === 'VITE_GUEST_TOKEN_SECRET' && value.length < 32) {
        console.warn(`⚠️  ${key}: Should be at least 32 characters long`);
        hasWarnings = true;
      }
      
      if (key.includes('DATE') && !isValidDate(value)) {
        console.error(`❌ ${key}: Invalid date format (should be YYYY-MM-DD)`);
        hasErrors = true;
      }
    }
  });
  
  console.log('\n📋 Optional Environment Variables:');
  Object.entries(optionalEnvVars).forEach(([key, description]) => {
    const value = envVars[key];
    
    if (!value || value === 'your_production_value_here' || value === '') {
      console.log(`⚪ ${key}: ${description} - Not configured (optional)`);
    } else {
      console.log(`✅ ${key}: ${description}`);
    }
  });
  
  // Check for sensitive data
  console.log('\n🔒 Security Check:');
  const sensitivePatterns = [
    { pattern: /localhost/i, message: 'Contains localhost references' },
    { pattern: /127\.0\.0\.1/i, message: 'Contains localhost IP references' },
    { pattern: /test|staging|dev/i, message: 'Contains development references' },
    { pattern: /password|secret.*=.*test/i, message: 'Contains test passwords/secrets' }
  ];
  
  let hasSecurityIssues = false;
  Object.entries(envVars).forEach(([key, value]) => {
    sensitivePatterns.forEach(({ pattern, message }) => {
      if (pattern.test(value)) {
        console.warn(`⚠️  ${key}: ${message}`);
        hasWarnings = true;
        if (key.includes('SECRET') || key.includes('KEY')) {
          hasSecurityIssues = true;
        }
      }
    });
  });
  
  if (!hasSecurityIssues) {
    console.log('✅ No obvious security issues detected');
  }
  
  // Summary
  console.log('\n📊 Validation Summary:');
  
  if (hasErrors) {
    console.error('❌ Environment validation FAILED');
    console.error('Please fix the errors above before deploying to production.');
    process.exit(1);
  } else if (hasWarnings) {
    console.warn('⚠️  Environment validation passed with WARNINGS');
    console.warn('Please review the warnings above.');
    
    // Ask for confirmation in interactive mode
    if (process.stdin.isTTY) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('Do you want to continue with deployment? (y/N): ', (answer) => {
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('Deployment cancelled.');
          process.exit(1);
        }
        console.log('✅ Proceeding with deployment...');
        rl.close();
      });
    } else {
      console.log('✅ Environment validation passed (non-interactive mode)');
    }
  } else {
    console.log('✅ Environment validation PASSED');
    console.log('All required environment variables are properly configured.');
  }
}

function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && dateString === date.toISOString().split('T')[0];
}

// Run validation
try {
  validateEnvironment();
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}