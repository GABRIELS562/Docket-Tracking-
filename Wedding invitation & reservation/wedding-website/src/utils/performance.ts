// Performance monitoring and Web Vitals tracking

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface AnalyticsData {
  metric: PerformanceMetric;
  url: string;
  userAgent: string;
  connectionType?: string;
}

// Web Vitals thresholds
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 }
};

// Rate metric based on thresholds
const rateMetric = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
};

// Send analytics data to monitoring service
const sendToAnalytics = (data: AnalyticsData) => {
  if (!import.meta.env.VITE_WEB_VITALS_ENABLED) return;
  
  // Send to Google Analytics 4
  if (typeof gtag !== 'undefined') {
    gtag('event', data.metric.name, {
      custom_map: { metric_value: 'custom_metric_value' },
      custom_metric_value: data.metric.value,
      metric_rating: data.metric.rating,
      page_location: data.url
    });
  }
  
  // Send to custom analytics endpoint
  if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
    fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true
    }).catch(error => {
      console.warn('Failed to send analytics:', error);
    });
  }
  
  // Console log in development
  if (import.meta.env.DEV) {
    console.log('Performance Metric:', data);
  }
};

// Get connection information
const getConnectionInfo = (): string | undefined => {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  return connection?.effectiveType;
};

// Track Core Web Vitals
export const trackWebVitals = () => {
  if (typeof window === 'undefined') return;
  
  // Largest Contentful Paint (LCP)
  const observeLCP = () => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime: number; loadTime: number };
      
      const value = lastEntry.renderTime || lastEntry.loadTime;
      const metric: PerformanceMetric = {
        name: 'LCP',
        value,
        rating: rateMetric('LCP', value),
        timestamp: Date.now()
      };
      
      sendToAnalytics({
        metric,
        url: window.location.href,
        userAgent: navigator.userAgent,
        connectionType: getConnectionInfo()
      });
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  };
  
  // First Input Delay (FID)
  const observeFID = () => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEntry & { processingStart: number };
        const value = fidEntry.processingStart - entry.startTime;
        
        const metric: PerformanceMetric = {
          name: 'FID',
          value,
          rating: rateMetric('FID', value),
          timestamp: Date.now()
        };
        
        sendToAnalytics({
          metric,
          url: window.location.href,
          userAgent: navigator.userAgent,
          connectionType: getConnectionInfo()
        });
      });
    });
    
    observer.observe({ entryTypes: ['first-input'] });
  };
  
  // Cumulative Layout Shift (CLS)
  const observeCLS = () => {
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const layoutShiftEntry = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
          clsEntries.push(entry);
        }
      });
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
    
    // Report CLS when page visibility changes
    const reportCLS = () => {
      const metric: PerformanceMetric = {
        name: 'CLS',
        value: clsValue,
        rating: rateMetric('CLS', clsValue),
        timestamp: Date.now()
      };
      
      sendToAnalytics({
        metric,
        url: window.location.href,
        userAgent: navigator.userAgent,
        connectionType: getConnectionInfo()
      });
    };
    
    document.addEventListener('visibilitychange', reportCLS, { once: true });
    window.addEventListener('beforeunload', reportCLS, { once: true });
  };
  
  // First Contentful Paint (FCP)
  const observeFCP = () => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          const metric: PerformanceMetric = {
            name: 'FCP',
            value: entry.startTime,
            rating: rateMetric('FCP', entry.startTime),
            timestamp: Date.now()
          };
          
          sendToAnalytics({
            metric,
            url: window.location.href,
            userAgent: navigator.userAgent,
            connectionType: getConnectionInfo()
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['paint'] });
  };
  
  // Time to First Byte (TTFB)
  const observeTTFB = () => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const navEntry = entry as PerformanceNavigationTiming;
        const value = navEntry.responseStart - navEntry.requestStart;
        
        const metric: PerformanceMetric = {
          name: 'TTFB',
          value,
          rating: rateMetric('TTFB', value),
          timestamp: Date.now()
        };
        
        sendToAnalytics({
          metric,
          url: window.location.href,
          userAgent: navigator.userAgent,
          connectionType: getConnectionInfo()
        });
      });
    });
    
    observer.observe({ entryTypes: ['navigation'] });
  };
  
  // Initialize observers
  try {
    observeLCP();
    observeFID();
    observeCLS();
    observeFCP();
    observeTTFB();
  } catch (error) {
    console.warn('Failed to initialize performance observers:', error);
  }
};

// Track custom performance metrics
export const trackCustomMetric = (name: string, value: number, additionalData?: Record<string, any>) => {
  const metric: PerformanceMetric = {
    name,
    value,
    rating: 'good', // Custom metrics don't have standard thresholds
    timestamp: Date.now()
  };
  
  sendToAnalytics({
    metric,
    url: window.location.href,
    userAgent: navigator.userAgent,
    connectionType: getConnectionInfo(),
    ...additionalData
  });
};

// Track RSVP form performance
export const trackRSVPMetrics = {
  formStart: () => trackCustomMetric('rsvp_form_start', Date.now()),
  formComplete: (startTime: number) => {
    const duration = Date.now() - startTime;
    trackCustomMetric('rsvp_form_duration', duration);
  },
  formError: (error: string) => trackCustomMetric('rsvp_form_error', 1, { error }),
  emailSent: (duration: number) => trackCustomMetric('rsvp_email_duration', duration),
  sheetsWrite: (duration: number) => trackCustomMetric('rsvp_sheets_duration', duration)
};

// Resource loading performance
export const trackResourceLoading = () => {
  if (typeof window === 'undefined') return;
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      const resourceEntry = entry as PerformanceResourceTiming;
      
      // Track slow loading resources
      if (resourceEntry.duration > 2000) {
        trackCustomMetric('slow_resource', resourceEntry.duration, {
          resourceName: entry.name,
          resourceType: resourceEntry.initiatorType
        });
      }
      
      // Track failed resources
      if (resourceEntry.transferSize === 0 && resourceEntry.duration > 0) {
        trackCustomMetric('failed_resource', 1, {
          resourceName: entry.name,
          resourceType: resourceEntry.initiatorType
        });
      }
    });
  });
  
  observer.observe({ entryTypes: ['resource'] });
};

// Initialize all performance tracking
export const initializePerformanceTracking = () => {
  if (import.meta.env.VITE_WEB_VITALS_ENABLED !== 'true') return;
  
  // Wait for page load to avoid impacting initial performance
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        trackWebVitals();
        trackResourceLoading();
      }, 0);
    });
  } else {
    setTimeout(() => {
      trackWebVitals();
      trackResourceLoading();
    }, 0);
  }
};