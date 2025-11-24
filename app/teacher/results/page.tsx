'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TeacherResultsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [plays, setPlays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlays, setLoadingPlays] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id,
        join_code,
        started_at,
        quizzes (
          id,
          title
        )
      `)
      .order('started_at', { ascending: false });

    if (!error && data) {
      setSessions(data);
    }
    setLoading(false);
  }

  async function loadSessionResults(sessionId: string) {
    setLoadingPlays(true);
    
    const session = sessions.find(s => s.id === sessionId);
    setSelectedSession(session);

    const { data, error } = await supabase
      .from('plays')
      .select(`
        id,
        student_name,
        score,
        selections,
        created_at,
        quiz_questions (
          id,
          order_num,
          tasks (
            id,
            prompt,
            mode,
            content,
            answer_choices,
            correct_answer
          )
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setPlays(data);
    }
    setLoadingPlays(false);
  }

  function getStudentSummary() {
    const studentMap = new Map();

    plays.forEach(play => {
      const name = play.student_name;
      if (!studentMap.has(name)) {
        studentMap.set(name, {
          name,
          totalScore: 0,
          questionsAnswered: 0,
          plays: []
        });
      }
      const student = studentMap.get(name);
      student.totalScore += play.score || 0;
      student.questionsAnswered += 1;
      student.plays.push(play);
    });

    return Array.from(studentMap.values()).map(student => ({
      ...student,
      averageScore: Math.round(student.totalScore / student.questionsAnswered)
    }));
  }

  if (loading) {
    return <div className="p-8">Loading sessions...</div>;
  }

  if (!selectedSession) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Quiz Results</h1>

          {sessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-600 mb-4">No quiz sessions yet.</p>
              
                <a href="/teacher/quizzes/create"
                className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Create Your First Quiz
              </a>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Past Sessions</h2>
                <p className="text-sm text-gray-600">Click a session to view results</p>
              </div>
              <div className="divide-y">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSessionResults(session.id)}
                    className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          {session.quizzes?.title || 'Untitled Quiz'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Started: {new Date(session.started_at).toLocaleDateString()} at{' '}
                          {new Date(session.started_at).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Join Code: {session.join_code}
                        </p>
                      </div>
                      <span className="text-indigo-600 font-semibold">View Results →</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const studentSummaries = getStudentSummary();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => {
            setSelectedSession(null);
            setPlays([]);
          }}
          className="mb-4 text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          ← Back to All Sessions
        </button>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">
            {selectedSession.quizzes?.title || 'Untitled Quiz'}
          </h1>
          <p className="text-gray-600">
            Started: {new Date(selectedSession.started_at).toLocaleDateString()} at{' '}
            {new Date(selectedSession.started_at).toLocaleTimeString()}
          </p>
          <p className="text-sm text-gray-500">Join Code: {selectedSession.join_code}</p>
        </div>

        {loadingPlays ? (
          <div className="bg-white rounded-lg shadow p-6">
            <p>Loading results...</p>
          </div>
        ) : plays.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No students have taken this quiz yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Summary</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">
                    {studentSummaries.length}
                  </div>
                  <div className="text-sm text-gray-600">Students</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {Math.round(
                      studentSummaries.reduce((sum, s) => sum + s.averageScore, 0) /
                        studentSummaries.length
                    )}%
                  </div>
                  <div className="text-sm text-gray-600">Class Average</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {plays.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Responses</div>
                </div>
              </div>
            </div>

            {/* Student Results */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">Student Results</h2>
              </div>
              <div className="divide-y">
                {studentSummaries.map((student, index) => (
                  <div key={index} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{student.name}</h3>
                        <p className="text-sm text-gray-600">
                          {student.questionsAnswered} questions answered
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${
                          student.averageScore >= 80 ? 'text-green-600' :
                          student.averageScore >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {student.averageScore}%
                        </div>
                        <div className="text-sm text-gray-600">Average Score</div>
                      </div>
                    </div>

                    {/* Individual Question Breakdown */}
                    <div className="space-y-2">
                      {student.plays.map((play: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              Q{play.quiz_questions?.order_num}: {play.quiz_questions?.tasks?.prompt}
                            </p>
                            <p className="text-xs text-gray-500">
                              {play.quiz_questions?.tasks?.mode}
                            </p>
                          </div>
                          <div className={`text-lg font-bold ${
                            play.score >= 80 ? 'text-green-600' :
                            play.score >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {play.score}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}