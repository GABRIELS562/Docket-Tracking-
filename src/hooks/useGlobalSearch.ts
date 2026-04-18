import { useEffect } from 'react';
import { useUIStore } from '../store/useUIStore';

export function useGlobalSearch() {
  const isSearchOpen = useUIStore((state) => state.isSearchOpen);
  const setSearchOpen = useUIStore((state) => state.setSearchOpen);

  // Keyboard shortcut for global search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(!isSearchOpen);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  return {
    isSearchOpen,
    setSearchOpen,
    closeSearch: () => setSearchOpen(false),
    openSearch: () => setSearchOpen(true),
  };
}
