import type { ProjectAnnotations, Renderer } from 'storybook/internal/types';

import { withPlayscape } from './withPlayscape';

const preview: ProjectAnnotations<Renderer> = {
  decorators: [withPlayscape],
};

export default preview;
