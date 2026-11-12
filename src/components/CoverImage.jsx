import { useState } from 'react';
import './CoverImage.css';

// Shows a cover photo, or a branded placeholder when there is no image or the
// URL fails to load (broken link, offline, etc.).
export default function CoverImage({ src, alt = '', label = 'Artikly', className = '' }) {
  // Remember which URL failed. If `src` changes, the new URL gets a fresh try
  // without needing an effect to reset the state.
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <div
        className={`cover cover--fallback ${className}`}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      >
        <span>{label}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`cover ${className}`}
      onError={() => setFailedSrc(src)}
    />
  );
}
