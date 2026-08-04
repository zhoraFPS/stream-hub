import React, { useState } from 'react';

/**
 * Bildrahmen nach dem b-media Muster: Seitenverhältnis über data-ratio,
 * Hintergrund in surface-alternate, Bild deckend. Fehlt oder bricht das Bild,
 * bleibt die Fläche stehen statt zu kollabieren.
 */
export default function Media({ src, alt = '', ratio = 'p-16x9', fallback, children, ...rest }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <figure className="b-media" data-ratio={ratio} {...rest}>
      {showImage ? (
        <img
          className="b-media__item"
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="b-media__fallback">{fallback || '1848TV'}</div>
      )}
      {children}
    </figure>
  );
}
