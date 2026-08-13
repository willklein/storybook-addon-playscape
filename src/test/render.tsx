import { render, type RenderOptions } from '@testing-library/react';
import React from 'react';
import { convert, themes, ThemeProvider } from 'storybook/theming';

// Every component here is styled via `storybook/theming`'s styled(), which reads its theme from
// context rather than falling back to a default — render helpers need a ThemeProvider ancestor or
// every themed style access throws.
export function renderWithTheme(ui: React.ReactElement, options?: RenderOptions) {
  return render(<ThemeProvider theme={convert(themes.light)}>{ui}</ThemeProvider>, options);
}
