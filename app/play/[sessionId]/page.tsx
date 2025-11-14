'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function calculateOverlap(studentRange: any, correctRanges: any[]) {
  if (!studentRange) return 0;
  
  let maxScore = 0;
  
  for (const correct of correctRanges) {
    const overlapStart = Math.max(studentRange.start, correct.start);
    const overlapEnd = Math.min(studentRange.end, correct.end);
    const overlapLength = Math.max(0, overlapEnd - overlapStart);
    
    const studentLength = studentRange.end - studentRange.start;
    const correctLength = correct.end - correct.start;
    const unionLength = studentLength + correctLength - overlapLength;
    
    const score = unionLength > 0 ? (overlapLength / unionLength) * 100 : 0;
    maxScore = Math.max(maxScore, score);
  }
  
  return Math.round(maxScore);
}

function renderHighlightedText(text: string, studentRange: any, correctRanges: any[], showCorrect: boolean) {
  const parts = [];
  const ranges = [];
  
  if (studentRange) {
    ranges.push({ ...studentRange, type: 'student' });
  }
  
  if (showCorrect) {
    correctRanges.forEach(r => ranges.push({ ...r, type: 'correct' }));
  }
  
  ranges.sort((a, b) => a.start - b.start);
  
  let i = 0;
  for (const r of ranges) {
    const s = clamp(r.start, 0, text.length);
    const e = clamp(r.end, 0, text.length);
    
    if (i < s) {
      parts.push(<span key={`t-${i}`}>{text.slice(i, s)}</span>);
    }
    
    const className = r.type === 'student' 
      ? 'bg-blue-200' 
      : 'bg-green-200 border-b-2 border-green-600';
    
    parts.push(
      <mark key={`m-${s}-${e}`} className={className}>
        {text.slice(s, e)}
      </mark>
    );
    i = e;
  }
  
  if (i < text.length) {
    parts.push(<span key="t-end">{text.slice(i)}</span>);
  }
  
  return parts;
}

export default function PlayPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [screen, setScreen] = useState('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  
  const [studentName, setStudentName] = useState('');
  const [studentRange, setStudentRange] = useState<any>(null);
  const [score, setScore] = useState<number | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data: session, error: e1 } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        if (e1) throw e1;

        const { data: task, error: e2 } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', session.task_id)
          .single();
        if (e2) throw e2;

        const { data: source, error: e3 } = await supabase
          .from('sources')
          .select('*')
          .eq('id', task.source_id)
          .single();
        if (e3) throw e3;

        setData({ session, task, source });
        setScreen('join');
      } catch (err: any) {
        setError(err.message);
        setScreen('error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  function getOffsets() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    
    const r = sel.getRangeAt(0);
    const container = document.getElementById('quiz-text');
    if (!container) return null;
    
    const startRange = document.createRange();
    startRange.setStart(container, 0);
    startRange.setEnd(r.startContainer, r.startOffset);
    const start = startRange.toString().length;
    
    const endRange = document.createRange();
    endRange.setStart(container, 0);
    endRange.setEnd(r.endContainer, r.endOffset);
    const end = endRange.toString().length;
    
    return start === end ? null : { start, end };
  }
  
  function handleHighlight() {
    const range = getOffsets();
    if (range) {
      setStudentRange(range);
      window.getSelection()?.removeAllRanges();
    }
  }
  
  async function handleSubmit() {
    if (!data) return;
    
    const calculatedScore = calculateOverlap(studentRange, data.source.highlights || []);
    setScore(calculatedScore);
    setShowCorrect(true);
    
    await supabase.from('plays').insert({
      session_id: sessionId,
      student_name: studentName,
      selections: studentRange,
      score: calculatedScore
    });
    
    setScreen('results');
  }
  
  function handleJoin() {
    if (studentName.trim()) {
      setScreen('quiz');
    }
  }

  if (loading || screen === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  if (screen === 'error' || error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center"><p>Not found</p></div>;
  }

  if (screen === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📚</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Evidence Builder</h1>
            <p className="text-gray-600">Ready to analyze some sources?</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your name
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="First and Last Name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={handleJoin}
              disabled={!studentName.trim()}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (screen === 'quiz') {
    const text = data.source.text_content || '';
    
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Welcome, {studentName}</p>
              <h2 className="text-lg font-semibold text-gray-900">
                {data.source.title}
              </h2>
            </div>
          </div>
          
          <div className="bg-indigo-50 border-l-4 border-indigo-600 rounded-lg p-4 mb-6">
            <p className="text-lg text-gray-900 font-medium">
              {data.task.prompt}
            </p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>📝 Instructions:</strong> Select text with your mouse, 
              then click "Highlight Selection" to mark your answer.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div
              id="quiz-text"
              className="text-lg leading-relaxed whitespace-pre-wrap select-text"
            >
              {studentRange 
                ? renderHighlightedText(text, studentRange, [], false)
                : text
              }
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 flex gap-3 sticky bottom-4">
            <button
              onClick={handleHighlight}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Highlight Selection
            </button>
            
            {studentRange && (
              <>
                <button
                  onClick={() => setStudentRange(null)}
                  className="px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Submit Answer
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  const text = data.source.text_content || '';
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 text-center">
          <div className="mb-4">
            <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-5xl font-bold ${
              (score || 0) >= 80 ? 'bg-green-100 text-green-700' :
              (score || 0) >= 60 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {score}%
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {(score || 0) >= 80 ? '🎉 Great job!' : (score || 0) >= 60 ? '👍 Nice work!' : '💪 Keep practicing!'}
          </h2>
          <p className="text-gray-600">
            Your answer had {score}% overlap with the correct answer.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Answer Review</h3>
          
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-200 rounded"></div>
              <span className="text-sm text-gray-700">Your answer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-200 border-b-2 border-green-600 rounded"></div>
              <span className="text-sm text-gray-700">Correct answer</span>
            </div>
          </div>
          
          <div className="text-base leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
            {renderHighlightedText(text, studentRange, data.source.highlights || [], true)}
          </div>
        </div>
        
        <div className="bg-indigo-50 border-l-4 border-indigo-600 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-1">Question:</p>
          <p className="text-gray-900">{data.task.prompt}</p>
        </div>
      </div>
    </div>
  );
}