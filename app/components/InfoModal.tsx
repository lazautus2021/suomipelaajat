'use client';

import { useEffect, useRef, useState } from 'react';

export default function InfoModal() {
  const [open, setOpen]       = useState(false);
  const [content, setContent] = useState('');
  const wrapperRef            = useRef<HTMLDivElement>(null);

  // Fetch content once on first open
  useEffect(() => {
    if (open && !content) {
      fetch('/api/site-content')
        .then((r) => r.json())
        .then((d) => setContent(d.about ?? ''));
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div className="info-btn-wrapper" ref={wrapperRef}>
      <button
        className={`info-page-btn${open ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Tietoa palvelusta
      </button>

      {open && (
        <div className="info-dropdown">
          <div
            className="info-modal-content"
            dangerouslySetInnerHTML={{ __html: content || 'Ladataan...' }}
          />
        </div>
      )}
    </div>
  );
}
