/** Bounds a loading indicator without retrying an action or inventing a result. */
export async function withRequestTimeout<T>(request: Promise<T>, timeoutMs = 12_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), timeoutMs); })
    ]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
}
