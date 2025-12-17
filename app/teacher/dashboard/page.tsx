'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TeacherDashboard() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      setUserName(user.user_metadata?.name || user.email || 'Teacher');
      
      // Load teacher's quizzes
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          quiz_questions (count)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setQuizzes(data);
      }
    }
    
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function getQuestionCount(quiz: any) {
    return quiz.quiz_questions?.[0]?.count || 0;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-indigo-600">Evidence Builder</h1>
              <p className="text-sm text-gray-600">Welcome back, {userName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Link
            href="/teacher/quizzes/create"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 inline-flex items-center gap-2"
          >
            <span className="text-xl">+</span> Create New Quiz
          </Link>
          <Link
            href="/teacher/questions/create"
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 inline-flex items-center gap-2"
          >
            <span className="text-xl">+</span> Create Question
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-indigo-600 mb-2">{quizzes.length}</div>
            <div className="text-gray-600">Total Quizzes</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {quizzes.reduce((sum, q) => sum + getQuestionCount(q), 0)}
            </div>
            <div className="text-gray-600">Total Questions</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-purple-600 mb-2">-</div>
            <div className="text-gray-600">Active Sessions</div>
          </div>
        </div>

        {/* Quizzes List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">My Quizzes</h2>
          </div>

          {quizzes.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-400 text-5xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No quizzes yet</h3>
              <p className="text-gray-600 mb-4">Create your first quiz to get started!</p>
              <Link
                href="/teacher/quizzes/create"
                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
              >
                Create Quiz
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {quiz.title}
                      </h3>
                      {quiz.description && (
                        <p className="text-gray-600 text-sm mb-2">{quiz.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{getQuestionCount(quiz)} questions</span>
                        <span>•</span>
                        <span>Created {new Date(quiz.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Link
                        href={`/teacher/sessions/create?quizId=${quiz.id}`}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 whitespace-nowrap"
                      >
                        Launch
                      </Link>
                      <Link
                        href={`/teacher/results?quizId=${quiz.id}`}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                      >
                        Results
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <Link
            href="/teacher/sessions/create"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">🎮</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Start a Session</h3>
            <p className="text-gray-600">Launch a live quiz session for your students</p>
          </Link>

          <Link
            href="/teacher/results"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">View Results</h3>
            <p className="text-gray-600">See how your students performed</p>
          </Link>
        </div>
      </main>
    </div>
  );
}