'use client';

import { useEffect, useState } from 'react';

export default function InfoModal() {
  const [open, setOpen]       = useState(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (open && !content) {
      fetch('/api/site-content')
        .then((r) => r.json())
        .then((d) => setContent(d.about ?? ''));
    }
  }, [open]);

  return (
    <>
      <button className="info-page-btn" onClick={() => setOpen(true)}>
        Tietoa palvelusta
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-box info-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
            <div
              className="info-modal-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>
      )}
    </>
  );
}
