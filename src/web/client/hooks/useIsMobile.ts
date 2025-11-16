import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current device is mobile based on screen width and user agent.
 * Uses a combination of screen width (768px breakpoint) and touch capability detection.
 *
 * @returns True if device is considered mobile
 */
export function useIsMobile(): boolean {
  // Initialize with actual mobile check to avoid flash of desktop content on mobile
  const [isMobile, setIsMobile] = useState(() => {
    const isSmallScreen = window.innerWidth < 768;
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return isSmallScreen || (window.innerWidth < 1024 && hasTouchScreen);
  });

  useEffect(() => {
    const checkIsMobile = (): void => {
      const isSmallScreen = window.innerWidth < 768;
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const mobile = isSmallScreen || (window.innerWidth < 1024 && hasTouchScreen);

      setIsMobile(mobile);
    };

    // Recheck on mount in case window size changed
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
}

/**
 * Hook to get current screen size category for responsive design decisions.
 *
 * @returns Current screen size category
 */
export function useScreenSize(): 'mobile' | 'tablet' | 'desktop' {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkScreenSize = (): void => {
      const width = window.innerWidth;

      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  return screenSize;
}
