import { beforeEach, describe, expect, it } from 'vitest';

import { decodeShareToken, encodeShareToken, stripShareParam } from './shareToken';

describe('a user sharing a fork', () => {
  it('gets back a token that decodes to exactly what they shared', () => {
    const payload = { id: 'fork-1', name: 'My Fork', source: '<Button primary label="Hi" />' };

    const token = encodeShareToken(payload);

    expect(decodeShareToken(token)).toEqual(payload);
  });

  it('gets a token safe to drop straight into a URL query string, with no characters that need escaping', () => {
    const token = encodeShareToken({ id: 'fork-1', name: 'Name', source: '<Foo bar="a/b+c" />' });

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("doesn't corrupt source containing non-ASCII characters", () => {
    const payload = { id: 'fork-1', name: 'Emoji fork 🎉', source: '<Button label="curly “quotes” — em dash" />' };

    const token = encodeShareToken(payload);

    expect(decodeShareToken(token)).toEqual(payload);
  });

  it('round-trips multi-line source exactly, including indentation', () => {
    const payload = {
      id: 'fork-1',
      name: 'Multiline',
      source: '<Button\n  primary\n  label="Click me"\n/>',
    };

    const token = encodeShareToken(payload);

    expect(decodeShareToken(token)?.source).toBe(payload.source);
  });
});

describe('a user opening a link with a corrupted or foreign share token', () => {
  it('gets nothing back for a token that is not valid base64', () => {
    expect(decodeShareToken('not-valid-base64!!!')).toBeNull();
  });

  it('gets nothing back for a token that decodes to something other than JSON', () => {
    const notJson = btoa('hello world').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    expect(decodeShareToken(notJson)).toBeNull();
  });

  it('gets nothing back for well-formed JSON missing the fields a share payload needs', () => {
    const json = JSON.stringify({ name: 'Missing id and source' });
    const token = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    expect(decodeShareToken(token)).toBeNull();
  });

  it('gets nothing back for an empty string', () => {
    expect(decodeShareToken('')).toBeNull();
  });
});

describe('stripping the share param from the address bar', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('removes it from the URL once it has been read, keeping other params intact', () => {
    window.history.replaceState(null, '', '/?path=/story/foo--bar&loadPlayscape=abc123');

    stripShareParam('loadPlayscape');

    const params = new URLSearchParams(window.location.search);
    expect(params.has('loadPlayscape')).toBe(false);
    expect(params.get('path')).toBe('/story/foo--bar');
  });

  it('leaves the rest of the URL alone when the param was never present', () => {
    window.history.replaceState(null, '', '/?path=/story/foo--bar');

    stripShareParam('loadPlayscape');

    const params = new URLSearchParams(window.location.search);
    expect(params.get('path')).toBe('/story/foo--bar');
  });
});
