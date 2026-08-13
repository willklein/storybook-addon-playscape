import React from 'react';
import { addons, types } from 'storybook/manager-api';

import { PlayscapePanel } from './components/PlayscapePanel';
import { ADDON_ID, PANEL_ID } from './constants';

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Playscape',
    render: ({ active }) => <PlayscapePanel active={active} />,
  });
});
