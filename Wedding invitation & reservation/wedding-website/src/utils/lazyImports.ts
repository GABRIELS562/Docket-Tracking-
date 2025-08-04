import React, { lazy } from 'react';

// Lazy load heavy components for better performance
export const LazyRSVPForm = lazy(() => 
  import('../components/forms/SmartRSVPForm').then(module => ({ 
    default: module.default 
  }))
);

export const LazyRSVPFormExample = lazy(() => 
  import('../components/examples/RSVPFormExample').then(module => ({ 
    default: module.default 
  }))
);

export const LazyDesignSystemShowcase = lazy(() => 
  import('../components/examples/DesignSystemShowcase').then(module => ({ 
    default: module.default 
  }))
);

export const LazyEmailTester = lazy(() => 
  import('../components/admin/EmailTester').then(module => ({ 
    default: module.default 
  }))
);

// Section components with lazy loading
export const LazyHeroSection = lazy(() => 
  import('../components/sections/HeroSection').then(module => ({ 
    default: module.default 
  }))
);

export const LazyDetailsSection = lazy(() => 
  import('../components/sections/DetailsSection').then(module => ({ 
    default: module.default 
  }))
);

export const LazyLocationSection = lazy(() => 
  import('../components/sections/LocationSection').then(module => ({ 
    default: module.default 
  }))
);

export const LazyRegistrySection = lazy(() => 
  import('../components/sections/RegistrySection').then(module => ({ 
    default: module.default 
  }))
);

export const LazyRSVPSection = lazy(() => 
  import('../components/sections/RSVPSection').then(module => ({ 
    default: module.default 
  }))
);

// Preload critical components on user interaction
export const preloadComponent = (importFunction: () => Promise<any>) => {
  return importFunction().catch(error => {
    console.warn('Failed to preload component:', error);
  });
};

// Preload RSVP components when user hovers over RSVP button
export const preloadRSVPComponents = () => {
  preloadComponent(() => import('../components/forms/SmartRSVPForm'));
  preloadComponent(() => import('../hooks/useRSVPForm'));
  preloadComponent(() => import('../services/GoogleSheetsService'));
  preloadComponent(() => import('../utils/emailService'));
};

// Preload admin components for authenticated users
export const preloadAdminComponents = () => {
  preloadComponent(() => import('../components/admin/EmailTester'));
  preloadComponent(() => import('../components/examples/DesignSystemShowcase'));
};

// Custom hook for preloading on interaction
export const usePreloadOnInteraction = (
  preloadFn: () => void,
  events: string[] = ['mouseenter', 'focus']
) => {
  const ref = React.useRef<HTMLElement>(null);
  
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    let hasPreloaded = false;
    
    const handleInteraction = () => {
      if (!hasPreloaded) {
        hasPreloaded = true;
        preloadFn();
      }
    };
    
    events.forEach(event => {
      element.addEventListener(event, handleInteraction, { once: true });
    });
    
    return () => {
      events.forEach(event => {
        element.removeEventListener(event, handleInteraction);
      });
    };
  }, [preloadFn, events]);
  
  return ref;
};