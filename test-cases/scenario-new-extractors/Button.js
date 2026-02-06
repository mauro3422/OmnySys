/**
 * Button Component
 * Tests: colocation-extractor
 * Expected: colocated connections to Button.test.js and Button.stories.js
 */

export function Button({ label, onClick }) {
  return {
    type: 'button',
    props: { label, onClick }
  };
}

export default Button;
