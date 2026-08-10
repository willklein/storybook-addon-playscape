import type React from 'react';

import { getComponentName } from './componentName';

export async function evaluateSource(source: string, component: unknown): Promise<React.ReactElement> {
  const [ReactModule, Babel] = await Promise.all([import('react'), import('@babel/standalone')]);
  const React = (ReactModule as unknown as { default?: typeof ReactModule }).default ?? ReactModule;

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
