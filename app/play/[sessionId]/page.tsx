'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function calculateOverlap(studentRange: any, correctRanges: any[]) {
  if (!studentRange || !correctRanges || correctRanges.length === 0) return 0;
  
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
  
  if (showCorrect && correctRanges) {
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
  
  const [quizData, setQuizData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  useEffect(() => {
  const currentQ = questions[currentQuestionIndex];
  if (currentQ?.tasks?.mode === 'multiple-choice') {
    setShuffledChoices(shuffleArray(currentQ.tasks.answer_choices || []));
  }
}, [currentQuestionIndex, questions]);

  const [studentName, setStudentName] = useState('');
  const [answers, setAnswers] = useState<any[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [lastScore, setLastScore] = useState<number>(0);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      try {
        const { data: session, error: e1 } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        if (e1) throw e1;

        const { data: quiz, error: e2 } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', session.quiz_id)
          .single();
        if (e2) throw e2;

        const { data: quizQuestions, error: e3 } = await supabase
          .from('quiz_questions')
          .select(`
            id,
            order_num,
            points,
            tasks (*)
          `)
          .eq('quiz_id', quiz.id)
          .order('order_num', { ascending: true });
        if (e3) throw e3;

        setQuizData({ session, quiz });
        setQuestions(quizQuestions);
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

  function getTextSelection() {
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
    const range = getTextSelection();
    if (range) {
      setCurrentAnswer(range);
      window.getSelection()?.removeAllRanges();
    }
  }

  async function handleSubmitAnswer() {
    const currentQuestion = questions[currentQuestionIndex];
    const task = currentQuestion.tasks;
    
    let score = 0;
    let answerData = null;
    let correct = false;

    if (task.mode === 'highlight') {
      score = calculateOverlap(currentAnswer, task.correct_answer);
      correct = score >= 80; // 80% overlap = correct
      answerData = currentAnswer;
    } else if (task.mode === 'multiple-choice') {
  const selectedValue = shuffledChoices[selectedChoice!];
  console.log('Selected:', selectedValue);
  console.log('Correct:', task.correct_answer?.value);
  console.log('Match:', selectedValue === task.correct_answer?.value);
  correct = selectedValue === task.correct_answer?.value;
  score = correct ? 100 : 0;
  answerData = { selectedValue };
}

    // Save to database
    await supabase.from('plays').insert({
      session_id: sessionId,
      student_name: studentName,
      quiz_question_id: currentQuestion.id,
      selections: answerData,
      score: score
    });

    // Update state
    setAnswers([...answers, answerData]);
    setScores([...scores, score]);
    setLastScore(score);
    setIsCorrect(correct);

    // Show feedback screen
    setScreen('feedback');
  }

  function handleNextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer(null);
      setSelectedChoice(null);
      setScreen('quiz');
    } else {
      setScreen('results');
    }
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

  if (!quizData || questions.length === 0) {
    return <div className="min-h-screen flex items-center justify-center"><p>No quiz found</p></div>;
  }

  // JOIN SCREEN
  if (screen === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📚</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{quizData.quiz.title}</h1>
            <p className="text-gray-600">{questions.length} questions</p>
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
  
  // QUIZ SCREEN
  if (screen === 'quiz') {
    const currentQuestion = questions[currentQuestionIndex];
    const task = currentQuestion.tasks;
    
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Welcome, {studentName}</p>
              <p className="text-sm font-semibold text-indigo-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="bg-indigo-50 border-l-4 border-indigo-600 rounded-lg p-4 mb-6">
            <p className="text-lg text-gray-900 font-medium">{task.prompt}</p>
          </div>

          {task.mode === 'highlight' && (
            <>
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  <strong>📝 Instructions:</strong> Select text with your mouse, then click "Highlight Selection"
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div
                  id="quiz-text"
                  className="text-lg leading-relaxed whitespace-pre-wrap select-text"
                >
                  {currentAnswer 
                    ? renderHighlightedText(task.content, currentAnswer, [], false)
                    : task.content
                  }
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-4 flex gap-3">
                <button
                  onClick={handleHighlight}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Highlight Selection
                </button>
                
                {currentAnswer && (
                  <>
                    <button
                      onClick={() => setCurrentAnswer(null)}
                      className="px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleSubmitAnswer}
                      className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700"
                    >
                      Submit Answer
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {task.mode === 'multiple-choice' && (
            <>
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6 space-y-3">
                {shuffledChoices.map((choice: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedChoice(index)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      selectedChoice === index
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedChoice === index
                          ? 'border-indigo-600 bg-indigo-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedChoice === index && (
                          <div className="w-3 h-3 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-lg">{choice}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedChoice === null}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Submit Answer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // FEEDBACK SCREEN (NEW!)
  if (screen === 'feedback') {
    const currentQuestion = questions[currentQuestionIndex];
    const task = currentQuestion.tasks;
    const lastAnswer = answers[answers.length - 1];
  
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Result Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 text-center">
            <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 ${
              isCorrect ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className="text-6xl">
                {isCorrect ? '✓' : '✗'}
              </span>
            </div>

            <h2 className={`text-4xl font-bold mb-4 ${
              isCorrect ? 'text-green-600' : 'text-red-600'
            }`}>
              {isCorrect ? 'Correct!' : 'Not Quite'}
            </h2>

            <div className="text-6xl font-bold text-gray-900 mb-2">
              +{lastScore} points
            </div>

            <p className="text-gray-600 mb-6">
              {isCorrect 
                ? 'Great job! Keep it up!' 
                : 'Don\'t worry, keep trying!'}
            </p>

            {/* Show correct answer if wrong */}
            {!isCorrect && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6 text-left">
                <p className="font-semibold text-green-800 mb-2">Correct Answer:</p>
                {task.mode === 'highlight' && (
                  <div className="text-base leading-relaxed whitespace-pre-wrap">
                    {renderHighlightedText(task.content, null, task.correct_answer, true)}
                  </div>
                )}
               {task.mode === 'multiple-choice' && (
  <p className="text-green-900 font-medium">
    {task.correct_answer?.value}
  </p>
)} 
</div>
            )}

            <button
              onClick={handleNextQuestion}
              className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 transition-colors"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question →' : 'See Final Results →'}
            </button>
          </div>

          {/* Progress */}
          <div className="text-center text-gray-600">
            <p>Question {currentQuestionIndex + 1} of {questions.length} complete</p>
          </div>
        </div>
      </div>
    );
  }
  
  // RESULTS SCREEN
  const totalScore = scores.reduce((a, b) => a + b, 0);
  const averageScore = Math.round(totalScore / scores.length);
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 text-center">
          <div className="mb-4">
            <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-5xl font-bold ${
              averageScore >= 80 ? 'bg-green-100 text-green-700' :
              averageScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {averageScore}%
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {averageScore >= 80 ? '🎉 Great job!' : averageScore >= 60 ? '👍 Nice work!' : '💪 Keep practicing!'}
          </h2>
          <p className="text-gray-600 mb-4">
            You scored an average of {averageScore}% across {questions.length} questions
          </p>
          <p className="text-3xl font-bold text-indigo-600">
            Total Points: {totalScore}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Breakdown</h3>
          <div className="space-y-3">
            {questions.map((q, index) => (
              <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Question {index + 1}</p>
                  <p className="text-sm text-gray-600">{q.tasks.prompt}</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    scores[index] >= 80 ? 'text-green-600' :
                    scores[index] >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {scores[index]} pts
                  </div>
                  <div className="text-xs text-gray-500">
                    {scores[index] >= 80 ? '✓ Correct' : '✗ Incorrect'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}