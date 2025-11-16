/**
 * Logging utilities with timestamps
 */

/**
 * Format timestamp for logging
 */
function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Log with timestamp
 */
export function log(message: string): void {
  // eslint-disable-next-line no-console
  console.log(`${getTimestamp()} ${message}`);
}

/**
 * Log error with timestamp
 */
export function logError(message: string): void {
  // eslint-disable-next-line no-console
  console.error(`${getTimestamp()} ERROR: ${message}`);
}

/**
 * Log processing start for a file
 */
export function logProcessingFile(file: string, command: string): void {
  log(`Processing file ${file} with ${command}...`);
}

/**
 * Log processing success for a file
 */
export function logProcessingSuccess(file: string): void {
  log(`Processing file ${file}...OK`);
}

/**
 * Log processing failure for a file
 */
export function logProcessingFailure(file: string, error: string): void {
  logError(`Processing file ${file}...FAILED: ${error}`);
}

/**
 * Log waiting message
 */
export function logWaiting(duration: string): void {
  log(`Waiting ${duration} to continue processing...`);
}
