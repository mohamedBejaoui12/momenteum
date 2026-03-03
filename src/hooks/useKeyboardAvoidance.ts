import { useEffect } from 'react';

/**
 * useKeyboardAvoidance hook ensures that focused input fields 
 * are scrolled into view when the virtual keyboard opens.
 */
export function useKeyboardAvoidance() {
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Wait for keyboard to start opening
        setTimeout(() => {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 300);
      }
    };

    window.addEventListener('focusin', handleFocus);
    return () => window.removeEventListener('focusin', handleFocus);
  }, []);

  useEffect(() => {
    // Handle visual viewport resizing (keyboard opening/closing)
    const handleResize = () => {
      if (window.visualViewport) {
        // You could use visualViewport.height to adjust padding if needed
        // For now, scrollIntoView on focus handles the primary issue
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);
}
