import type { VercelRequest, VercelResponse } from '@vercel/node';

// CSP violation reporting endpoint
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const violation = req.body;
    
    // Log CSP violation (in production, send to monitoring service)
    console.error('CSP Violation Report:', {
      ...violation,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress,
    });
    
    // In production, you might want to:
    // 1. Send to error monitoring service (Sentry, LogRocket, etc.)
    // 2. Store in database for analysis
    // 3. Alert security team for severe violations
    
    // Example: Send to Sentry
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureMessage('CSP Violation', {
    //     level: 'warning',
    //     extra: violation
    //   });
    // }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error processing CSP report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}