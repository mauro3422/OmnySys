/**
 * Button Stories
 * Tests: colocation-extractor
 * Expected: colocated connection to Button.js (storybook)
 */

import { Button } from './Button.js';

export default {
  title: 'Components/Button',
  component: Button
};

export const Primary = {
  args: {
    label: 'Primary Button',
    onClick: () => console.log('clicked')
  }
};
