import React, { useEffect, useRef, useState } from 'react';

/**
 * Scroll-Reveal wie auf vfl-bochum.de: Blöcke blenden beim Eintreten in den
 * Viewport ein. Reduced Motion wird per CSS respektiert, der Beobachter läuft
 * trotzdem nur einmal pro Element.
 */
export default function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <Tag ref={ref} className={`b-reveal ${className}`.trim()} data-reveal={shown ? 'true' : ''} {...rest}>
      {children}
    </Tag>
  );
}
