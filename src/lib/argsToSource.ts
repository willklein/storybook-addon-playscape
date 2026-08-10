function formatProp(key: string, value: unknown): string | undefined {
  if (value === undefined || typeof value === 'function') return undefined;
  if (typeof value === 'boolean') return value ? key : `${key}={false}`;
  if (typeof value === 'string') return `${key}="${value.replace(/"/g, '&quot;')}"`;
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
