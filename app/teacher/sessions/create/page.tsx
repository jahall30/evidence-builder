'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CreateSessionPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);

  useEffect(() => {
    async function loadQuizzes() {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          description,
          created_at
        `)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setQuizzes(data);
      }
      setLoading(false);
    }
    loadQuizzes();
  }, []);

  async function startSession(quizId: string) {
    setCreating(quizId);

    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        quiz_id: quizId,
        join_code: joinCode,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    setCreating(null);

    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }

    const link = `${window.location.origin}/play/${data.id}`;
    await navigator.clipboard.writeText(link);

    alert(`✅ Session started!\n\nLink copied to clipboard:\n${link}\n\nJoin Code: ${joinCode}`);
  }

  if (loading) {
    return <div className="p-8">Loading quizzes...</div>;
  }

  if (quizzes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 mb-4">You haven't created any quizzes yet.</p>
            <a 
              href="/teacher/quizzes/create"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Create Your First Quiz
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Start a Quiz Session</h1>
          <p className="text-gray-600 mt-2">Choose a quiz to create a shareable link for students</p>
        </div>

        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {quiz.title}
                  </h2>
                  {quiz.description && (
                    <p className="text-gray-600 text-sm mb-2">{quiz.description}</p>
                  )}
                </div>
                
                <button
                  onClick={() => startSession(quiz.id)}
                  disabled={creating === quiz.id}
                  className="ml-4 bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {creating === quiz.id ? 'Starting...' : 'Start Session'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <a href="/teacher/quizzes/create" className="text-indigo-600 hover:underline">
            + Create New Quiz
          </a>
        </div>
      </div>
    </div>
  );
}