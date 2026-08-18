function formatProp(key: string, value: unknown): string | undefined {
  if (value === undefined || typeof value === 'function') return undefined;
  if (typeof value === 'boolean') return value ? key : `${key}={false}`;
  // JSX attribute string literals (the "..." form) don't support backslash escapes — they're
  // parsed almost like HTML attribute values — so a raw newline or stray quote in the value can
  // slip through as literal JSX rather than erroring. Emitting a real JS string literal via
  // JSON.stringify (the {...} form) sidesteps that entirely: proper escaping for quotes,
  // backslashes, and newlines alike.
  if (typeof value === 'string') return `${key}={${JSON.stringify(value)}}`;
  if (typeof value === 'number') return `${key}={${value}}`;
  try {
    return `${key}={${JSON.stringify(value)}}`;
  } catch {
    return undefined;
  }
}

export function argsToSource(componentName: string, args: Record<string, unknown>): string {
  const props = Object.entries(args ?? {})
    .map(([key, value]) => formatProp(key, value))
    .filter((prop): prop is string => prop !== undefined);

  if (props.length === 0) return `<${componentName} />`;

  return `<${componentName}\n  ${props.join('\n  ')}\n/>`;
}
