/**
 * Bounds how many upstream calls run at once (each call opens its own socket, and a
 * burst makes some of them fail) and shares one in-flight call between identical
 * concurrent requests.
 */
export function createLimiter(maxConcurrent: number) {
  let active = 0;
  const waiting: Array<() => void> = [];
  const inflight = new Map<string, Promise<unknown>>();

  const acquire = async (): Promise<void> => {
    if (active < maxConcurrent) {
      active++;
      return;
    }
    await new Promise<void>((resolve) => waiting.push(resolve));
  };

  const release = (): void => {
    const next = waiting.shift();
    if (next) next(); // hand the slot over without dropping `active`
    else active--;
  };

  async function run<T>(task: () => Promise<T>): Promise<T> {
    await acquire();
    try {
      return await task();
    } finally {
      release();
    }
  }

  /** Like `run`, but concurrent calls with the same key share one result. */
  function runShared<T>(key: string, task: () => Promise<T>): Promise<T> {
    const existing = inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const promise = run(task).finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
  }

  return { run, runShared };
}
