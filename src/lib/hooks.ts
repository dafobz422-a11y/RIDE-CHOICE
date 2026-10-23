"use client";

import { useEffect, useState } from "react";

/**
 * Load async data once per dependency change. Returns `undefined` while
 * loading; loaders should resolve to `null` for "not found".
 */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): [T | undefined, (v: T) => void] {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    load().then(
      (v) => alive && setValue(v),
      () => alive && setValue(undefined),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [value, setValue];
}
