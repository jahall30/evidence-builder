'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ChallengePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const { sessionId } = use(params);
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChallenge();
  }, []);

  async function loadChallenge() {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id,
        challenge_name,
        quizzes (
          id,
          title
        )
      `)
      .eq('id', sessionId)
      .eq('is_challenge', true)
      .single();

    if (data) {
      setChallenge(data);
    }
    setLoading(false);
  }
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading challenge...</div>;
  }
async function loadChallenge() {
    // ... existing code ...
    setLoading(false);
  }

 async function handleAcceptChallenge() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert('You must be logged in to accept challenges');
    router.push('/login');
    return;
  }

  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const { data: newSession, error } = await supabase
    .from('sessions')
    .insert({
      quiz_id: challenge.quizzes.id,
      join_code: joinCode,
      started_at: new Date().toISOString(),
      challenge_session_id: sessionId
    })
    .select()
    .single();

  if (error) {
    alert('Error creating session: ' + error.message);
    return;
  }

  router.push(`/teacher/sessions/create?quizId=${challenge.quizzes.id}&challengeId=${sessionId}`);
}

  if (loading) {
  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Challenge Not Found</h1>
          <p className="text-gray-600">This challenge link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚔️</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Challenge Accepted?</h1>
          <p className="text-gray-600">{challenge.challenge_name}</p>
        </div>

        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-6 mb-8">
          <h2 className="font-bold text-indigo-900 mb-2">Quiz: {challenge.quizzes?.title}</h2>
          <p className="text-indigo-700">Think your class can beat the challenge score?</p>
        </div>

        <button
  onClick={handleAcceptChallenge}
  className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-xl hover:bg-green-700 transition-colors"
>
          Accept Challenge & Start Session
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          You'll launch a quiz session for your students to compete
        </p>
      </div>
    </div>
  );
}
}