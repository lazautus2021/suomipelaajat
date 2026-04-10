'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function SiteContentAdmin() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving]   = useState(false);
  const [flash, setFlash]     = useState('');
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    fetch('/api/admin/site-content')
      .then((r) => r.json())
      .then((d) => {
        if (editorRef.current) {
          editorRef.current.innerHTML = d.about ?? '';
          setLoaded(true);
        }
      });
  }, []);

  function exec(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }

  async function save() {
    if (!editorRef.current) return;
    setSaving(true);
    await fetch('/api/admin/site-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'about', value: editorRef.current.innerHTML }),
    });
    setSaving(false);
    setFlash('Tallennettu!');
    setTimeout(() => setFlash(''), 2500);
  }

  return (
    <div>
      <div className="admin-back"><Link href="/admin">← Takaisin</Link></div>
      <h1>Tietoa palvelusta</h1>
      {flash && <div className="admin-flash">{flash}</div>}

      {/* Toolbar */}
      <div className="wysiwyg-toolbar">
        <button onClick={() => exec('bold')}><b>B</b></button>
        <button onClick={() => exec('italic')}><i>I</i></button>
        <button onClick={() => exec('underline')}><u>U</u></button>
        <span className="wysiwyg-sep" />
        <button onClick={() => exec('formatBlock', 'h2')}>H2</button>
        <button onClick={() => exec('formatBlock', 'h3')}>H3</button>
        <button onClick={() => exec('formatBlock', 'p')}>¶</button>
        <span className="wysiwyg-sep" />
        <button onClick={() => exec('insertUnorderedList')}>• Lista</button>
        <button onClick={() => exec('insertOrderedList')}>1. Lista</button>
        <span className="wysiwyg-sep" />
        <button onClick={() => {
          const url = prompt('URL:');
          if (url) exec('createLink', url);
        }}>🔗 Linkki</button>
        <button onClick={() => exec('unlink')}>Poista linkki</button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="wysiwyg-editor"
        style={{ opacity: loaded ? 1 : 0.4 }}
      />

      <button className="fetch-fixtures-btn" onClick={save} disabled={saving} style={{ marginTop: 16 }}>
        {saving ? 'Tallennetaan...' : 'Tallenna'}
      </button>
    </div>
  );
}
