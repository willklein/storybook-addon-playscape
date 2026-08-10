const VALID_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function getComponentName(component: unknown): string {
  const named = component as { displayName?: string; name?: string } | undefined;
  const name = named?.displayName || named?.name;
  return name && VALID_IDENTIFIER.test(name) ? name : 'Component';
}
