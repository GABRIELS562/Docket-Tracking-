// Analytics and monitoring utilities for wedding website

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    hj: (...args: any[]) => void;
    _hjSettings: any;
  }
}

// Google Analytics 4 Events
interface GAEvent {
  event_name: string;
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: any;
}

// Custom event tracking for wedding-specific actions
export const trackEvent = (event: GAEvent) => {
  if (!import.meta.env.VITE_ENABLE_ANALYTICS) return;
  
  // Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event.event_name, {
      event_category: event.event_category,
      event_label: event.event_label,
      value: event.value,
      ...event
    });
  }
  
  // Custom analytics endpoint
  if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
    fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        timestamp: Date.now(),
        url: window.location.href,
        referrer: document.referrer,
        user_agent: navigator.userAgent
      }),
      keepalive: true
    }).catch(error => {
      console.warn('Failed to send custom analytics:', error);
    });
  }
  
  // Console log in development
  if (import.meta.env.DEV) {
    console.log('Analytics Event:', event);
  }
};

// Wedding-specific tracking events
export const weddingAnalytics = {
  // Page views
  pageView: (page: string) => {
    trackEvent({
      event_name: 'page_view',
      event_category: 'engagement',
      page_title: document.title,
      page_location: window.location.href,
      page_name: page
    });
  },
  
  // RSVP tracking
  rsvpStarted: (guestToken?: string) => {
    trackEvent({
      event_name: 'rsvp_started',
      event_category: 'rsvp',
      event_label: 'form_interaction',
      has_guest_token: !!guestToken
    });
  },
  
  rsvpCompleted: (attending: boolean, hasPlus1: boolean, duration: number) => {
    trackEvent({
      event_name: 'rsvp_completed',
      event_category: 'rsvp',
      event_label: attending ? 'attending' : 'not_attending',
      value: duration,
      attending: attending,
      has_plus_one: hasPlus1,
      completion_time_ms: duration
    });
  },
  
  rsvpError: (error: string, step: string) => {
    trackEvent({
      event_name: 'rsvp_error',
      event_category: 'rsvp',
      event_label: error,
      error_step: step,
      error_message: error
    });
  },
  
  // Email confirmation tracking
  emailConfirmationSent: (success: boolean, duration: number) => {
    trackEvent({
      event_name: 'email_confirmation',
      event_category: 'rsvp',
      event_label: success ? 'sent' : 'failed',
      value: duration,
      success: success,
      send_duration_ms: duration
    });
  },
  
  // Navigation tracking
  sectionView: (section: string, timeOnSection?: number) => {
    trackEvent({
      event_name: 'section_view',
      event_category: 'navigation',
      event_label: section,
      value: timeOnSection,
      section_name: section,
      time_spent_ms: timeOnSection
    });
  },
  
  // External link clicks
  externalLinkClick: (url: string, context: string) => {
    trackEvent({
      event_name: 'external_link_click',
      event_category: 'engagement',
      event_label: context,
      external_url: url,
      link_context: context
    });
  },
  
  // Registry clicks
  registryClick: (store: string) => {
    trackEvent({
      event_name: 'registry_click',
      event_category: 'engagement',
      event_label: store,
      registry_store: store
    });
  },
  
  // Map/directions clicks
  directionsClick: (venue: string) => {
    trackEvent({
      event_name: 'directions_click',
      event_category: 'engagement',
      event_label: venue,
      venue_name: venue
    });
  },
  
  // Guest authentication
  guestAuthenticated: (method: 'link' | 'manual', success: boolean) => {
    trackEvent({
      event_name: 'guest_authenticated',
      event_category: 'authentication',
      event_label: method,
      auth_method: method,
      success: success
    });
  },
  
  // Performance issues
  performanceIssue: (issue: string, value: number) => {
    trackEvent({
      event_name: 'performance_issue',
      event_category: 'performance',
      event_label: issue,
      value: value,
      issue_type: issue,
      metric_value: value
    });
  },
  
  // Error tracking
  jsError: (error: string, file: string, line: number) => {
    trackEvent({
      event_name: 'javascript_error',
      event_category: 'error',
      event_label: error,
      error_message: error,
      error_file: file,
      error_line: line
    });
  },
  
  // Social sharing
  socialShare: (platform: string, content: string) => {
    trackEvent({
      event_name: 'social_share',
      event_category: 'engagement',
      event_label: platform,
      share_platform: platform,
      share_content: content
    });
  }
};

// Initialize Google Analytics
export const initializeGoogleAnalytics = () => {
  const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
  if (!gaId || !import.meta.env.VITE_ENABLE_ANALYTICS) return;
  
  // Load Google Analytics script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  script.async = true;
  document.head.appendChild(script);
  
  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', gaId, {
    // Enhanced measurement features
    enhanced_measurement: true,
    
    // Privacy settings
    anonymize_ip: true,
    respect_dnt: true,
    
    // Custom parameters for wedding site
    custom_map: {
      'custom_metric_1': 'rsvp_completion_rate',
      'custom_metric_2': 'email_success_rate',
      'custom_metric_3': 'guest_engagement_score'
    },
    
    // Page view tracking
    send_page_view: true,
    
    // Content grouping for wedding sections
    content_group1: 'Wedding Site',
    content_group2: window.location.pathname
  });
  
  // Track initial page view
  weddingAnalytics.pageView('home');
};

// Initialize Hotjar for user behavior analysis
export const initializeHotjar = () => {
  const hjId = import.meta.env.VITE_HOTJAR_ID;
  if (!hjId || !import.meta.env.VITE_ENABLE_ANALYTICS) return;
  
  (function(h: any, o: any, t: any, j: any, a?: any, r?: any) {
    h.hj = h.hj || function() { (h.hj.q = h.hj.q || []).push(arguments); };
    h._hjSettings = { hjid: hjId, hjsv: 6 };
    a = o.getElementsByTagName('head')[0];
    r = o.createElement('script'); r.async = 1;
    r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
    a.appendChild(r);
  })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
};

// Error boundary tracking
export const trackErrorBoundary = (error: Error, errorInfo: any) => {
  weddingAnalytics.jsError(
    error.message || 'Unknown error',
    errorInfo.componentStack?.split('\n')[1] || 'Unknown component',
    0
  );
  
  // Send to error monitoring service
  if (import.meta.env.VITE_SENTRY_DSN) {
    // This would integrate with Sentry
    console.error('Error Boundary:', error, errorInfo);
  }
};

// Performance monitoring
export const trackPerformanceMetrics = () => {
  if (typeof window === 'undefined' || !window.performance) return;
  
  // Page load timing
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        // DNS lookup time
        const dnsTime = navigation.domainLookupEnd - navigation.domainLookupStart;
        if (dnsTime > 100) {
          weddingAnalytics.performanceIssue('slow_dns', dnsTime);
        }
        
        // Server response time
        const serverTime = navigation.responseEnd - navigation.requestStart;
        if (serverTime > 1000) {
          weddingAnalytics.performanceIssue('slow_server', serverTime);
        }
        
        // DOM content loaded
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart;
        if (domContentLoaded > 3000) {
          weddingAnalytics.performanceIssue('slow_dom_load', domContentLoaded);
        }
        
        // Total page load time
        const totalLoadTime = navigation.loadEventEnd - navigation.navigationStart;
        trackEvent({
          event_name: 'page_load_time',
          event_category: 'performance',
          value: totalLoadTime,
          load_time_ms: totalLoadTime
        });
      }
    }, 0);
  });
};

// Track user engagement time
export const trackEngagementTime = () => {
  let startTime = Date.now();
  let isActive = true;
  
  // Track when user becomes inactive
  const trackInactivity = () => {
    isActive = false;
    const engagementTime = Date.now() - startTime;
    
    trackEvent({
      event_name: 'user_engagement',
      event_category: 'engagement',
      value: engagementTime,
      engagement_time_ms: engagementTime
    });
  };
  
  // Reset timer when user becomes active again
  const trackActivity = () => {
    if (!isActive) {
      startTime = Date.now();
      isActive = true;
    }
  };
  
  // Listen for user activity
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      trackInactivity();
    } else {
      trackActivity();
    }
  });
  
  window.addEventListener('beforeunload', trackInactivity);
};

// Initialize all analytics
export const initializeAnalytics = () => {
  if (!import.meta.env.VITE_ENABLE_ANALYTICS) return;
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeGoogleAnalytics();
      initializeHotjar();
      trackPerformanceMetrics();
      trackEngagementTime();
    });
  } else {
    initializeGoogleAnalytics();
    initializeHotjar();
    trackPerformanceMetrics();
    trackEngagementTime();
  }
  
  // Global error handling
  window.addEventListener('error', (event) => {
    weddingAnalytics.jsError(
      event.error?.message || event.message || 'Unknown error',
      event.filename || 'Unknown file',
      event.lineno || 0
    );
  });
  
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    weddingAnalytics.jsError(
      event.reason?.message || 'Unhandled promise rejection',
      'Promise',
      0
    );
  });
};