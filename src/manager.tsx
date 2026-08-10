import React from 'react';
import { addons, types } from 'storybook/manager-api';

import { PlayscapeTab } from './components/PlayscapeTab';
import { ADDON_ID, TAB_ID } from './constants';

addons.register(ADDON_ID, () => {
  addons.add(TAB_ID, {
    type: types.TAB,
    title: 'Playscape',
    render: ({ active }) => <PlayscapeTab active={active} />,
  });
});
