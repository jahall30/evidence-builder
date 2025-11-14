'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function UploadText() {
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    if (!title.trim() || !textContent.trim()) {
      setMessage('Please add a title and some text.');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('sources').insert({
      type: 'text',
      title,
      text_content: textContent,
    });

    setSaving(false);
    setMessage(error ? `Error: ${error.message}` : '✅ Saved!');
    if (!error) {
      setTitle('');
      setTextContent('');
    }
  }

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Upload Text Source</h1>

      <input
        className="w-full border rounded p-2"
        placeholder="Title (e.g., Gettysburg Address excerpt)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="w-full border rounded p-2 h-64"
        placeholder="Paste your text here…"
        value={textContent}
        onChange={(e) => setTextContent(e.target.value)}
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Source'}
      </button>

      {message && <p>{message}</p>}
    </main>
  );
}
