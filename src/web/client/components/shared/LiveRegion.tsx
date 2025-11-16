import { useAppStore } from '../../stores/appStore';

/**
 * ARIA live region for announcing dynamic updates to screen readers.
 * Visually hidden but accessible to assistive technologies.
 *
 * Used for announcing:
 * - SSE updates (kanban, memory, plan changes)
 * - Route changes
 * - Form submission results
 * - Other dynamic content changes
 */
export function LiveRegion(): JSX.Element {
  const liveMessage = useAppStore((state) => state.liveMessage);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {liveMessage}
    </div>
  );
}
