'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function SessionLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSession();
  }, []);

  async function loadSession() {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        quizzes (
          id,
          title
        )
      `)
      .eq('id', id)
      .single();

    if (data) {
      setSession(data);
    }
    setLoading(false);
  }

  async function copyLink() {
    const link = `${window.location.origin}/play/${session.id}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShareChallenge() {
    const challengeName = session.quizzes?.title + ' Challenge';

    const { error } = await supabase
      .from('sessions')
      .update({ 
        is_challenge: true,
        challenge_name: challengeName 
      })
      .eq('id', session.id);

    if (error) {
      alert('Error creating challenge: ' + error.message);
      return;
    }

    const link = `${window.location.origin}/challenge/${session.id}`;
    await navigator.clipboard.writeText(link);
    alert('Challenge link copied!\n\n' + link);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>Session not found</p>
      </div>
    );
  }

  const playLink = `${window.location.origin}/play/${session.id}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="text-5xl mb-4">🎮</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Live!</h1>
          <p className="text-gray-600 mb-6">{session.quizzes?.title}</p>

          {/* Join Code */}
          <div className="bg-indigo-100 rounded-xl p-6 mb-6">
            <p className="text-sm text-indigo-600 font-semibold mb-2">JOIN CODE</p>
            <p className="text-5xl font-bold text-indigo-700 tracking-wider">
              {session.join_code}
            </p>
          </div>

          {/* Link */}
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Or share this link:</p>
            <p className="text-indigo-600 font-mono text-sm break-all">{playLink}</p>
          </div>

          {/* Copy Button */}
          <button
            onClick={copyLink}
            className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 transition-colors mb-4"
          >
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>

          {/* Challenge Button */}
          <button
            onClick={handleShareChallenge}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            ⚔️ Share as Challenge
          </button>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/teacher/dashboard"
            className="text-indigo-600 hover:underline"
          >
            ← Back to Dashboard
          </Link>
          <Link
            href="/teacher/results"
            className="text-indigo-600 hover:underline"
          >
            View Results →
          </Link>
        </div>
      </div>
    </div>
  );
}