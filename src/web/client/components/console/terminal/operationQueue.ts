/**
 * Operation Queue for Terminal
 *
 * Batches terminal operations with requestAnimationFrame and frame-time budgeting.
 * Yields control periodically to maintain UI responsiveness during heavy output.
 *
 * Based on VibeTunnel's proven architecture for optimal terminal performance.
 */

interface OperationQueueConfig {
  maxFrameTime: number; // Target frame budget in milliseconds
}

export class OperationQueue {
  private queue: Array<() => void | Promise<void>> = [];
  private renderPending = false;
  private config: OperationQueueConfig;

  constructor(config: OperationQueueConfig) {
    this.config = config;
  }

  /**
   * Enqueue an operation to be processed in the next animation frame
   */
  public enqueue(operation: () => void | Promise<void>): void {
    this.queue.push(operation);

    if (!this.renderPending) {
      this.renderPending = true;
      requestAnimationFrame(() => this.processQueue());
    }
  }

  /**
   * Process queued operations with frame-time budgeting
   * Yields control when frame budget is exceeded to maintain UI responsiveness
   */
  private async processQueue(): Promise<void> {
    const startTime = performance.now();

    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        await operation();
      }

      // Yield if we've exceeded frame budget and have more work
      if (performance.now() - startTime > this.config.maxFrameTime && this.queue.length > 0) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            this.processQueue().then(resolve);
          });
        });
        return;
      }
    }

    // Queue empty, mark render as complete
    this.renderPending = false;
  }

  /**
   * Clear all pending operations
   */
  public clear(): void {
    this.queue = [];
    this.renderPending = false;
  }

  /**
   * Check if there are pending operations
   */
  public hasPendingOperations(): boolean {
    return this.queue.length > 0 || this.renderPending;
  }

  /**
   * Get the number of pending operations
   */
  public getPendingCount(): number {
    return this.queue.length;
  }
}
