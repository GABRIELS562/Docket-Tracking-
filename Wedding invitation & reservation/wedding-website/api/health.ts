import type { VercelRequest, VercelResponse } from '@vercel/node';

// Health check endpoint for monitoring
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      services: {
        sheets: await checkSheetsAPI(),
        email: await checkEmailJS(),
        security: checkSecurityConfig()
      },
      performance: {
        responseTime: 0, // Will be set below
        memory: process.memoryUsage(),
        node_version: process.version
      }
    };

    // Calculate response time
    health.performance.responseTime = Date.now() - startTime;

    // Determine overall health status
    const allServicesHealthy = Object.values(health.services).every(
      service => service.status === 'healthy'
    );

    if (!allServicesHealthy) {
      health.status = 'degraded';
      return res.status(503).json(health);
    }

    res.status(200).json(health);
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };
    
    res.status(500).json(errorResponse);
  }
}

// Check Google Sheets API availability
async function checkSheetsAPI(): Promise<{ status: string; message?: string; responseTime?: number }> {
  const startTime = Date.now();
  
  try {
    const spreadsheetId = process.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID;
    const apiKey = process.env.VITE_GOOGLE_SHEETS_API_KEY;
    
    if (!spreadsheetId || !apiKey) {
      return {
        status: 'unhealthy',
        message: 'Missing Google Sheets configuration'
      };
    }

    // Test API connectivity with a minimal request
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&fields=properties.title`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'healthy',
        message: 'Google Sheets API accessible',
        responseTime
      };
    } else {
      return {
        status: 'unhealthy',
        message: `Google Sheets API error: ${response.status}`,
        responseTime
      };
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Google Sheets API unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime
    };
  }
}

// Check EmailJS service availability
async function checkEmailJS(): Promise<{ status: string; message?: string; responseTime?: number }> {
  const startTime = Date.now();
  
  try {
    const serviceId = process.env.VITE_EMAILJS_SERVICE_ID;
    const publicKey = process.env.VITE_EMAILJS_PUBLIC_KEY;
    
    if (!serviceId || !publicKey) {
      return {
        status: 'unhealthy',
        message: 'Missing EmailJS configuration'
      };
    }

    // Test EmailJS API connectivity
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'HEAD', // HEAD request to check availability without sending email
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (response.status < 500) { // Accept any non-server-error response
      return {
        status: 'healthy',
        message: 'EmailJS API accessible',
        responseTime
      };
    } else {
      return {
        status: 'unhealthy',
        message: `EmailJS API error: ${response.status}`,
        responseTime
      };
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `EmailJS API unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime: Date.now() - startTime
    };
  }
}

// Check security configuration
function checkSecurityConfig(): { status: string; message?: string } {
  try {
    const requiredSecurityVars = [
      'VITE_GUEST_TOKEN_SECRET',
      'VITE_APP_URL'
    ];

    const missingVars = requiredSecurityVars.filter(
      varName => !process.env[varName]
    );

    if (missingVars.length > 0) {
      return {
        status: 'unhealthy',
        message: `Missing security configuration: ${missingVars.join(', ')}`
      };
    }

    // Check if HTTPS is enforced in production
    const appUrl = process.env.VITE_APP_URL;
    if (process.env.NODE_ENV === 'production' && appUrl && !appUrl.startsWith('https://')) {
      return {
        status: 'unhealthy',
        message: 'HTTPS not enforced in production'
      };
    }

    return {
      status: 'healthy',
      message: 'Security configuration valid'
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Security check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}