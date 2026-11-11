import { getInitials } from '../utils/format';
import './Avatar.css';

const TONES = ['lime', 'navy', 'sand', 'sky'];

// Picks the same color for the same name every time.
function toneForName(name = '') {
  const total = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return TONES[total % TONES.length];
}

export default function Avatar({ name, size = 'md' }) {
  return (
    <span className={`avatar avatar--${size} avatar--${toneForName(name)}`} aria-hidden="true">
      {getInitials(name)}
    </span>
  );
}
