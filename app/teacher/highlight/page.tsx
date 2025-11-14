'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Source = { id: string; title: string | null; created_at: string | null };

export default function HighlightList() {
  const [rows, setRows] = useState<Source[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      const { data, error } = await supabase
        .from('sources')
        .select('id,title,created_at')
        .eq('type', 'text')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) setErr(error.message);
      else setRows((data ?? []) as Source[]);
    })();
  }, []);

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Select a text to highlight</h1>

      {err && <p className="text-red-600">Load error: {err}</p>}

      <ul className="divide-y border rounded">
        {rows.map(r => (
          <li key={r.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{r.title || '(untitled)'}</div>
              <div className="text-sm text-neutral-500">
                {new Date(r.created_at ?? '').toLocaleString()}
              </div>
            </div>
            <Link className="underline" href={`/teacher/highlight/${r.id}`}>
              Open Highlighter
            </Link>
          </li>
        ))}
      </ul>

      {rows.length === 0 && <p className="text-neutral-500">No text sources yet.</p>}
    </main>
  );
}
