import { useSearchParams } from "react-router-dom";
import { useCallback } from "react";

/**
 * Sync a single key in the URL search params with component state.
 * Removes the param when set to the default value (keeps URLs clean).
 * Uses `replace: true` so filter changes don't pollute browser history.
 */
export function useUrlState(
  key: string,
  defaultValue = "",
): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (newValue: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newValue === defaultValue || newValue === "") {
            next.delete(key);
          } else {
            next.set(key, newValue);
          }
          return next;
        },
        { replace: true },
      );
    },
    [key, defaultValue, setSearchParams],
  );

  return [value, setValue];
}

/**
 * Convenience wrapper that reads a numeric URL param (e.g. page number).
 * Defaults to the provided number when the param is missing or invalid.
 */
export function useUrlNumber(
  key: string,
  defaultValue = 1,
): [number, (value: number) => void] {
  const [raw, setRaw] = useUrlState(key, String(defaultValue));

  const num = Number(raw);
  const value = Number.isFinite(num) && num >= 1 ? num : defaultValue;

  const setValue = useCallback(
    (n: number) => setRaw(String(n)),
    [setRaw],
  );

  return [value, setValue];
}
