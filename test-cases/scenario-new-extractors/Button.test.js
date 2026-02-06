/**
 * Button Tests
 * Tests: colocation-extractor
 * Expected: colocated connection to Button.js (test-companion)
 */

import { Button } from './Button.js';

describe('Button', () => {
  it('should render with label', () => {
    const button = Button({ label: 'Click me', onClick: () => {} });
    expect(button.props.label).toBe('Click me');
  });
});
