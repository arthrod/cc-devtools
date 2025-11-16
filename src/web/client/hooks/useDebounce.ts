import { useEffect, useState } from 'react';

/**
 * Debounces a value by delaying updates until after a specified delay period.
 * Useful for search inputs to avoid excessive API calls while user is typing.
 *
 * @param value The value to debounce
 * @param delay Delay in milliseconds before updating (defaults to 300ms)
 * @returns The debounced value
 *
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounce(searchQuery, 500);
 *
 * useEffect(() => {
 *   // API call only happens after user stops typing for 500ms
 *   fetchResults(debouncedQuery);
 * }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return (): void => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
