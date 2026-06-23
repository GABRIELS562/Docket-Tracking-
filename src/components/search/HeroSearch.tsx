import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Sparkles } from 'lucide-react';
import SearchResults from './SearchResults';
import { useItemSearch } from '@/hooks/useItems';
import { useSearchStore } from '@/store/useSearchStore';
import { useZoneStore } from '@/store/useZoneStore';
import type { ItemSummary } from '@/lib/types';

interface HeroSearchProps {
  /** Called when a docket is selected and should be located */
  onLocate?: (item: ItemSummary, zoneId: number) => void;
}

/**
 * Hero Search Component - Large, prominent search bar at the top of the screen
 * Core feature for "find any docket in 60 seconds" demo experience
 */
export default function HeroSearch({ onLocate }: HeroSearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, total, isSearching, search, clearSearch } = useItemSearch();
  const { setHighlightedZone, setTargetZone, setCameraFlying } = useSearchStore();
  const { zones } = useZoneStore();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        search(query);
      } else {
        clearSearch();
      }
    }, 150); // Fast debounce for instant feel

    return () => clearTimeout(timer);
  }, [query, search, clearSearch]);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [results]);

  // Handle item selection and zone location
  const handleSelectItem = useCallback(
    (item: ItemSummary) => {
      if (!item.currentZoneName) {
        // Item location unknown - show message but don't navigate
        return;
      }

      // Find the zone by name
      const zone = zones.find((z) => z.zoneName === item.currentZoneName);
      if (!zone) return;

      // Trigger the locate animation
      setTargetZone(zone.zoneId);
      setHighlightedZone(zone.zoneId);
      setCameraFlying(true);

      // Clear search state
      setQuery('');
      clearSearch();
      setIsFocused(false);

      // Callback for external handling
      onLocate?.(item, zone.zoneId);

      // Auto-clear highlight after animation completes
      setTimeout(() => {
        setCameraFlying(false);
      }, 2000);

      setTimeout(() => {
        setHighlightedZone(null);
      }, 5000); // Keep highlight visible for 5 seconds
    },
    [zones, setTargetZone, setHighlightedZone, setCameraFlying, clearSearch, onLocate]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => Math.min(prev + 1, Math.min(results.length - 1, 7)));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[highlightedIndex]) {
            handleSelectItem(results[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setQuery('');
          clearSearch();
          setIsFocused(false);
          inputRef.current?.blur();
          break;
      }
    },
    [results, highlightedIndex, handleSelectItem, clearSearch]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // "/" key to focus search (common pattern)
      if (e.key === '/' && !isFocused && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isFocused]);

  const showResults = isFocused && query.length >= 1;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto pointer-events-auto">
      {/* Search Input Container */}
      <motion.div
        initial={false}
        animate={{
          scale: isFocused ? 1.02 : 1,
          boxShadow: isFocused
            ? '0 0 0 2px rgba(59, 130, 246, 0.5), 0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            : '0 10px 40px -10px rgba(0, 0, 0, 0.3)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`relative bg-gray-900/95 backdrop-blur-xl rounded-2xl border transition-colors ${
          isFocused ? 'border-blue-500/50' : 'border-gray-700/50'
        }`}
      >
        {/* Animated glow effect when focused */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -inset-px rounded-2xl bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 blur-sm -z-10"
            />
          )}
        </AnimatePresence>

        {/* Input Row */}
        <div className="flex items-center px-5 py-4">
          {/* Search Icon */}
          <motion.div
            animate={{ rotate: isSearching ? 360 : 0 }}
            transition={{ duration: 1, repeat: isSearching ? Infinity : 0, ease: 'linear' }}
          >
            <Search
              className={`w-6 h-6 transition-colors ${
                isFocused ? 'text-blue-400' : 'text-gray-500'
              }`}
            />
          </motion.div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Find any docket instantly... (press /)"
            className="flex-1 bg-transparent text-white text-lg px-4 py-1 placeholder-gray-500 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => {
                  setQuery('');
                  clearSearch();
                  inputRef.current?.focus();
                }}
                className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </motion.button>
            )}

            {/* Shortcut hint */}
            {!isFocused && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-gray-800/50 rounded-lg text-xs text-gray-500">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded font-mono">/</kbd>
              </div>
            )}
          </div>
        </div>

        {/* Results Dropdown */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="border-t border-gray-800 overflow-hidden"
            >
              <SearchResults
                results={results}
                total={total}
                isSearching={isSearching}
                query={query}
                onSelect={handleSelectItem}
                highlightedIndex={highlightedIndex}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Floating hint when not focused */}
      <AnimatePresence>
        {!isFocused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-gray-500"
          >
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span>Find any docket in seconds</span>
            <MapPin className="w-4 h-4 text-blue-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
