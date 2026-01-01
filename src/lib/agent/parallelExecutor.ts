// Parallel Executor - Manages concurrent task execution for 5-10x performance

import { ParallelTask, ExecutionMetrics } from './types';

type TaskExecutor<T, R> = (input: T) => Promise<R>;

interface QueuedTask<T, R> extends ParallelTask {
  executor: TaskExecutor<T, R>;
  resolve: (value: R) => void;
  reject: (error: Error) => void;
}

export class ParallelExecutor {
  private maxConcurrency: number;
  private activeCount: number = 0;
  private queue: QueuedTask<any, any>[] = [];
  private completedTasks: ParallelTask[] = [];
  private metrics: ExecutionMetrics;
  private listeners: Set<(metrics: ExecutionMetrics) => void> = new Set();

  constructor(maxConcurrency: number = 5) {
    this.maxConcurrency = maxConcurrency;
    this.metrics = this.createInitialMetrics();
  }

  private createInitialMetrics(): ExecutionMetrics {
    return {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageTaskTime: 0,
      parallelEfficiency: 0,
      retryCount: 0,
    };
  }

  // Execute multiple tasks in parallel with controlled concurrency
  async executeAll<T, R>(
    inputs: T[],
    executor: TaskExecutor<T, R>,
    options: {
      priority?: number;
      retries?: number;
      timeout?: number;
      onProgress?: (completed: number, total: number) => void;
    } = {}
  ): Promise<{ results: R[]; errors: Error[] }> {
    const { priority = 0, retries = 2, timeout = 30000, onProgress } = options;
    
    const results: R[] = [];
    const errors: Error[] = [];
    let completed = 0;

    const promises = inputs.map(async (input, index) => {
      const taskId = `task-${Date.now()}-${index}`;
      
      try {
        const result = await this.enqueue<T, R>({
          id: taskId,
          type: 'scrape',
          status: 'queued',
          priority,
          input,
          executor,
          retries,
          timeout,
        });
        
        results[index] = result;
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      } finally {
        completed++;
        onProgress?.(completed, inputs.length);
      }
    });

    await Promise.all(promises);

    this.updateMetrics();
    return { results, errors };
  }

  // Add a task to the queue
  private enqueue<T, R>(config: {
    id: string;
    type: ParallelTask['type'];
    status: ParallelTask['status'];
    priority: number;
    input: T;
    executor: TaskExecutor<T, R>;
    retries: number;
    timeout: number;
  }): Promise<R> {
    return new Promise((resolve, reject) => {
      const task: QueuedTask<T, R> = {
        ...config,
        resolve,
        reject,
      };

      // Insert by priority (higher priority first)
      const insertIndex = this.queue.findIndex(t => t.priority < task.priority);
      if (insertIndex === -1) {
        this.queue.push(task);
      } else {
        this.queue.splice(insertIndex, 0, task);
      }

      this.metrics.totalTasks++;
      this.processQueue();
    });
  }

  // Process the queue
  private async processQueue(): Promise<void> {
    while (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.activeCount++;
      task.status = 'running';
      task.startTime = new Date();

      this.executeTask(task);
    }
  }

  // Execute a single task with timeout and retry support
  private async executeTask<T, R>(task: QueuedTask<T, R> & { retries?: number; timeout?: number }): Promise<void> {
    const { executor, input, resolve, reject } = task;
    const timeout = task.timeout || 30000;
    let retries = task.retries || 0;

    const attemptExecution = async (): Promise<R> => {
      return new Promise<R>((res, rej) => {
        const timeoutId = setTimeout(() => {
          rej(new Error('Task timeout'));
        }, timeout);

        executor(input)
          .then((result) => {
            clearTimeout(timeoutId);
            res(result);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            rej(error);
          });
      });
    };

    try {
      while (true) {
        try {
          const result = await attemptExecution();
          task.status = 'completed';
          task.endTime = new Date();
          task.result = result;
          this.completedTasks.push(task);
          this.metrics.completedTasks++;
          resolve(result);
          break;
        } catch (error) {
          if (retries > 0) {
            retries--;
            this.metrics.retryCount++;
            // Exponential backoff
            await this.delay(Math.pow(2, (task as any).retries - retries) * 500);
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      task.status = 'failed';
      task.endTime = new Date();
      task.error = error instanceof Error ? error.message : String(error);
      this.completedTasks.push(task);
      this.metrics.failedTasks++;
      reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.activeCount--;
      this.processQueue();
      this.updateMetrics();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateMetrics(): void {
    const completedWithTime = this.completedTasks.filter(t => t.startTime && t.endTime);
    
    if (completedWithTime.length > 0) {
      const totalTime = completedWithTime.reduce((sum, t) => {
        const duration = new Date(t.endTime!).getTime() - new Date(t.startTime!).getTime();
        return sum + duration;
      }, 0);
      this.metrics.averageTaskTime = totalTime / completedWithTime.length;
    }

    // Calculate parallel efficiency
    if (this.completedTasks.length > 0) {
      const totalSequentialTime = this.completedTasks.length * this.metrics.averageTaskTime;
      const actualTime = this.getActualExecutionTime();
      this.metrics.parallelEfficiency = actualTime > 0 
        ? Math.min(1, totalSequentialTime / (actualTime * this.maxConcurrency))
        : 0;
    }

    this.notifyListeners();
  }

  private getActualExecutionTime(): number {
    if (this.completedTasks.length === 0) return 0;
    
    const startTimes = this.completedTasks
      .filter(t => t.startTime)
      .map(t => new Date(t.startTime!).getTime());
    const endTimes = this.completedTasks
      .filter(t => t.endTime)
      .map(t => new Date(t.endTime!).getTime());

    if (startTimes.length === 0 || endTimes.length === 0) return 0;

    return Math.max(...endTimes) - Math.min(...startTimes);
  }

  // Batch execute with automatic chunking
  async executeBatched<T, R>(
    inputs: T[],
    executor: TaskExecutor<T, R>,
    batchSize: number = 10,
    onBatchComplete?: (batchIndex: number, results: R[]) => void
  ): Promise<R[]> {
    const allResults: R[] = [];
    
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize);
      const { results } = await this.executeAll(batch, executor);
      allResults.push(...results);
      onBatchComplete?.(Math.floor(i / batchSize), results);
    }

    return allResults;
  }

  // Get current metrics
  getMetrics(): ExecutionMetrics {
    return { ...this.metrics };
  }

  // Subscribe to metric updates
  subscribe(listener: (metrics: ExecutionMetrics) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.metrics));
  }

  // Set concurrency level
  setConcurrency(level: number): void {
    this.maxConcurrency = Math.max(1, Math.min(20, level));
  }

  // Get queue status
  getQueueStatus(): {
    queued: number;
    active: number;
    completed: number;
    failed: number;
  } {
    return {
      queued: this.queue.length,
      active: this.activeCount,
      completed: this.metrics.completedTasks,
      failed: this.metrics.failedTasks,
    };
  }

  // Reset state
  reset(): void {
    this.queue = [];
    this.completedTasks = [];
    this.metrics = this.createInitialMetrics();
    this.notifyListeners();
  }
}

export const parallelExecutor = new ParallelExecutor(5);
