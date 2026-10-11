export function readLocalValue(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeLocalValue(key: string, value: string | null): boolean {
  try {
    if (value === null) {
      globalThis.localStorage?.removeItem(key);
    } else {
      globalThis.localStorage?.setItem(key, value);
    }
    return Boolean(globalThis.localStorage);
  } catch {
    return false;
  }
}
