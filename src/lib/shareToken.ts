export interface SharePayload {
  id: string;
  name: string;
  source: string;
}

export function encodeShareToken(payload: SharePayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function stripShareParam(paramName: string): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(paramName)) return;
  url.searchParams.delete(paramName);
  window.history.replaceState(null, '', url.toString());
}

export function decodeShareToken(token: string): SharePayload | null {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));

    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as SharePayload).id === 'string' &&
      typeof (parsed as SharePayload).name === 'string' &&
      typeof (parsed as SharePayload).source === 'string'
    ) {
      return parsed as SharePayload;
    }
    return null;
  } catch {
    return null;
  }
}
