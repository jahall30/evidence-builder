'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Range = { start: number; end: number };
type Source = {
  id: string;
  title: string | null;
  text_content: string | null;
  highlights: Range[] | null;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function normalizeRange(a: number, b: number): Range | null {
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  return start === end ? null : { start, end };
}

/** Pure function (no hooks) that returns text with <mark> ranges */
function renderMarked(text: string, ranges: Range[]) {
  const safe = [...ranges].sort((x, y) => x.start - y.start);
  const parts: React.ReactNode[] = [];
  let i = 0;
  for (const r of safe) {
    const s = clamp(r.start, 0, text.length);
    const e = clamp(r.end, 0, text.length);
    if (i < s) parts.push(<span key={`t-${i}-${s}`}>{text.slice(i, s)}</span>);
    parts.push(
      <mark key={`m-${s}-${e}`} className="bg-yellow-200">
        {text.slice(s, e)}
      </mark>
    );
    i = e;
  }
  if (i < text.length) parts.push(<span key="t-end">{text.slice(i)}</span>);
  return parts;
}

export default function HighlighterPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [ranges, setRanges] = useState<Range[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // Load the source row
  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadErr(null);
      const { data, error } = await supabase
        .from('sources')
        .select('id,title,text_content,highlights')
        .eq('id', id)
        .maybeSingle();

      if (error) setLoadErr(error.message);
      else if (!data) setLoadErr('No source found for this id.');
      else {
        setSource(data as Source);
        setRanges(((data as any).highlights as Range[] | null) ?? []);
      }
      setLoading(false);
    })();
  }, [id]);

  // Convert the current DOM selection to {start,end} offsets in the full text
  function getOffsets(): Range | null {
    if (!source?.text_content) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const r = sel.getRangeAt(0);
    const container = document.getElementById('hl-text');
    if (!container) return null;

    const startRange = document.createRange();
    startRange.setStart(container, 0);
    startRange.setEnd(r.startContainer, r.startOffset);
    const start = startRange.toString().length;

    const endRange = document.createRange();
    endRange.setStart(container, 0);
    endRange.setEnd(r.endContainer, r.endOffset);
    const end = endRange.toString().length;

    return normalizeRange(start, end);
  }

  function addSelection() {
    const off = getOffsets();
    if (!off) { setMsg('Select some text first.'); return; }
    setRanges(prev => [...prev, off]);
    setMsg(null);
    window.getSelection()?.removeAllRanges();
  }

  function removeRange(idx: number) {
    setRanges(prev => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!source) return;
    const { error } = await supabase
      .from('sources')
      .update({ highlights: ranges })
      .eq('id', source.id);
    setMsg(error ? `Error: ${error.message}` : '✅ Highlights saved');
  }

  if (loading) return <main className="p-8">Loading…</main>;
  if (loadErr) {
    return (
      <main className="p-8 space-y-3">
        <p className="text-red-600">Load error: {loadErr}</p>
        <a className="underline" href="/teacher/highlight">← Back to list</a>
      </main>
    );
  }
  if (!source) {
    return (
      <main className="p-8 space-y-3">
        <p>Not found.</p>
        <a className="underline" href="/teacher/highlight">← Back to list</a>
      </main>
    );
  }

  const text = source.text_content ?? '';
  const marked = renderMarked(text, ranges);

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Highlight answer spans</h1>
        <p className="text-neutral-600">{source.title || '(untitled)'} · <code>{source.id}</code></p>
      </header>

      <section className="space-y-3">
        <div className="flex gap-2">
          <button onClick={addSelection} className="px-3 py-2 rounded bg-black text-white">Add selection</button>
          <button onClick={save} className="px-3 py-2 rounded border">Save highlights</button>
          <a className="underline ml-auto" href="/teacher/highlight">Back to list</a>
        </div>
        {msg && <p>{msg}</p>}
        <div id="hl-text" className="whitespace-pre-wrap border rounded p-4 leading-relaxed select-text">
          {marked}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Current ranges</h2>
        <ul className="space-y-1">
          {ranges.map((r, i) => (
            <li key={`${r.start}-${r.end}-${i}`} className="text-sm flex items-center gap-2">
              <code>{`{ start: ${r.start}, end: ${r.end} }`}</code>
              <button onClick={() => removeRange(i)} className="px-2 py-1 border rounded text-xs">remove</button>
            </li>
          ))}
          {ranges.length === 0 && <li className="text-neutral-500 text-sm">None yet.</li>}
        </ul>
      </section>
    </main>
  );
}
