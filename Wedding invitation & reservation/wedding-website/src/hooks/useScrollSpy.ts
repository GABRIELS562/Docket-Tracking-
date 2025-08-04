import { useState, useEffect, useCallback } from 'react';
import type { ScrollSection } from '../types';

interface UseScrollSpyReturn {
  activeSection: string;
  sections: ScrollSection[];
  scrollToSection: (sectionId: string) => void;
  registerSection: (sectionId: string, sectionName: string) => void;
  unregisterSection: (sectionId: string) => void;
}

export const useScrollSpy = (offset: number = 100): UseScrollSpyReturn => {
  const [activeSection, setActiveSection] = useState<string>('');
  const [sections, setSections] = useState<ScrollSection[]>([]);

  const registerSection = useCallback((sectionId: string, sectionName: string) => {
    setSections(prev => {
      const exists = prev.find(section => section.id === sectionId);
      if (exists) return prev;
      
      return [...prev, { 
        id: sectionId, 
        name: sectionName, 
        isActive: false 
      }].sort((a, b) => {
        const elementA = document.getElementById(a.id);
        const elementB = document.getElementById(b.id);
        if (!elementA || !elementB) return 0;
        return elementA.offsetTop - elementB.offsetTop;
      });
    });
  }, []);

  const unregisterSection = useCallback((sectionId: string) => {
    setSections(prev => prev.filter(section => section.id !== sectionId));
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const top = element.offsetTop - offset;
      window.scrollTo({
        top,
        behavior: 'smooth'
      });
    }
  }, [offset]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + offset;
      
      let currentSection = '';
      
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const elementTop = element.offsetTop;
          const elementBottom = elementTop + element.offsetHeight;
          
          if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
            currentSection = section.id;
            break;
          }
        }
      }
      
      if (!currentSection && sections.length > 0) {
        const firstElement = document.getElementById(sections[0].id);
        if (firstElement && scrollPosition < firstElement.offsetTop) {
          currentSection = sections[0].id;
        } else {
          currentSection = sections[sections.length - 1].id;
        }
      }

      if (currentSection !== activeSection) {
        setActiveSection(currentSection);
        setSections(prev => 
          prev.map(section => ({
            ...section,
            isActive: section.id === currentSection
          }))
        );
      }
    };

    const throttledHandleScroll = throttle(handleScroll, 100);
    
    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    
    handleScroll();

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, [sections, activeSection, offset]);

  useEffect(() => {
    const handleResize = () => {
      setSections(prev => 
        [...prev].sort((a, b) => {
          const elementA = document.getElementById(a.id);
          const elementB = document.getElementById(b.id);
          if (!elementA || !elementB) return 0;
          return elementA.offsetTop - elementB.offsetTop;
        })
      );
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    activeSection,
    sections,
    scrollToSection,
    registerSection,
    unregisterSection
  };
};

function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
}