import type React from 'react';

import { getComponentName } from './componentName';

export async function evaluateSource(source: string, component: unknown): Promise<React.ReactElement> {
  const [ReactModule, BabelModule] = await Promise.all([import('react'), import('@babel/standalone')]);
  const React = (ReactModule as unknown as { default?: typeof ReactModule }).default ?? ReactModule;

  // @babel/standalone is CommonJS with no ESM entry, so a dynamic import() of it goes through
  // whatever CJS-interop the consuming bundler applies. That's not consistent everywhere — it can
  // land the real exports either directly on the namespace or nested under `.default` — so check
  // both instead of assuming one shape.
  type BabelStandalone = { transform: typeof import('@babel/standalone').transform };
  const Babel: BabelStandalone =
    typeof (BabelModule as Partial<BabelStandalone>).transform === 'function'
      ? (BabelModule as BabelStandalone)
      : (BabelModule as unknown as { default: BabelStandalone }).default;

  if (!Babel || typeof Babel.transform !== 'function') {
    throw new Error('Could not load @babel/standalone.');
  }

  const componentName = getComponentName(component);
  const wrapped = `return (\n${source}\n);`;

  let code: string;
  try {
    const result = Babel.transform(wrapped, {
      presets: ['typescript', ['react', { runtime: 'classic' }]],
      filename: 'playscape-fork.tsx',
      parserOpts: { allowReturnOutsideFunction: true },
    });
    code = result.code ?? '';
  } catch (err) {
    throw new Error(`Syntax error: ${err instanceof Error ? err.message : String(err)}`);
  }

  let element: unknown;
  try {
    const run = new Function('React', componentName, code);
    element = run(React, component);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  }

  if (!React.isValidElement(element)) {
    throw new Error('Source must evaluate to a single JSX element.');
  }

  return element;
}
