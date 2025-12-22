'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function CreateQuizPage() {
  const router = useRouter();

  // Quiz details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Questions being built
  const [questions, setQuestions] = useState<any[]>([]);

  // Current question being added
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionType, setQuestionType] = useState('highlight');

  // Highlight question state
  const [highlightData, setHighlightData] = useState({
    content: '',
    prompt: ''
  });
  const [highlightRanges, setHighlightRanges] = useState<any[]>([]);

  // Multiple choice state
  const [mcData, setMcData] = useState({
    question: '',
    choices: ['', '', '', ''],
    correctIndex: 0
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Get text selection for highlighting
  function getTextSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    const container = document.getElementById('highlight-preview');
    if (!container) return null;

    const startRange = document.createRange();
    startRange.setStart(container, 0);
    startRange.setEnd(range.startContainer, range.startOffset);
    const start = startRange.toString().length;

    const endRange = document.createRange();
    endRange.setStart(container, 0);
    endRange.setEnd(range.endContainer, range.endOffset);
    const end = endRange.toString().length;

    return start === end ? null : { start, end };
  }

  function handleHighlight() {
    const range = getTextSelection();
    if (range) {
      setHighlightRanges([...highlightRanges, range]);
      window.getSelection()?.removeAllRanges();
    } else {
      alert('Please select some text first');
    }
  }

  function removeHighlightRange(index: number) {
    setHighlightRanges(highlightRanges.filter((_, i) => i !== index));
  }

  function updateChoice(index: number, value: string) {
    const newChoices = [...mcData.choices];
    newChoices[index] = value;
    setMcData({ ...mcData, choices: newChoices });
  }

  function addQuestion() {
    let questionData;

    if (questionType === 'highlight') {
      if (!highlightData.content.trim() || !highlightData.prompt.trim()) {
        alert('Please fill in text and prompt');
        return;
      }
      if (highlightRanges.length === 0) {
        alert('Please highlight at least one correct answer');
        return;
      }

      questionData = {
        mode: 'highlight',
        content: highlightData.content,
        prompt: highlightData.prompt,
        correct_answer: highlightRanges
      };
    } else {
      if (!mcData.question.trim()) {
        alert('Please enter a question');
        return;
      }
      if (mcData.choices.some(c => !c.trim())) {
        alert('Please fill in all 4 answer choices');
        return;
      }

      questionData = {
        mode: 'multiple-choice',
        content: mcData.question,
        prompt: mcData.question,
        answer_choices: mcData.choices,
        correct_answer: { value: mcData.choices[mcData.correctIndex] }
      };

      setQuestions([...questions, questionData]);

      // Reset form
      setHighlightData({ content: '', prompt: '' });
      setHighlightRanges([]);
      setMcData({ question: '', choices: ['', '', '', ''], correctIndex: 0 });
      setShowQuestionForm(false);
    }

    function removeQuestion(index: number) {
      setQuestions(questions.filter((_, i) => i !== index));
    }

    function moveQuestionUp(index: number) {
      if (index === 0) return;
      const newList = [...questions];
      [newList[index], newList[index - 1]] = [newList[index - 1], newList[index]];
      setQuestions(newList);
    }

    function moveQuestionDown(index: number) {
      if (index === questions.length - 1) return;
      const newList = [...questions];
      [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
      setQuestions(newList);
    }

    async function saveQuiz() {
      if (!title.trim()) {
        setMessage('Please enter a quiz title');
        return;
      }

      if (questions.length === 0) {
        setMessage('Please add at least one question');
        return;
      }

      setSaving(true);
      setMessage(null);

      try {
        // Create quiz
        const { data: quiz, error: quizError } = await supabase
          .from('quizzes')
          .insert({ title, description })
          .select()
          .single();

        if (quizError) throw quizError;

        // Create all tasks
        const tasksToInsert = questions.map(q => ({
          mode: q.mode,
          content: q.content,
          prompt: q.prompt,
          answer_choices: q.answer_choices,
          correct_answer: q.correct_answer,
          dok_level: 2
        }));

        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToInsert)
          .select();

        if (tasksError) throw tasksError;

        // Link tasks to quiz
        const quizQuestionsToInsert = tasks.map((task, index) => ({
          quiz_id: quiz.id,
          task_id: task.id,
          order_num: index + 1,
          points: 100
        }));

        const { error: linkError } = await supabase
          .from('quiz_questions')
          .insert(quizQuestionsToInsert);

        if (linkError) throw linkError;

        setMessage('✅ Quiz created successfully!');
        setTimeout(() => {
          router.push('/teacher/sessions/create');
        }, 1500);

      } catch (err: any) {
        setMessage(`Error: ${err.message}`);
      } finally {
        setSaving(false);
      }
    }

    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Create New Quiz</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Quiz Details & Question Builder */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quiz Details */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Quiz Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quiz Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Unit 3: American Revolution"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What will students learn?"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                    />
                  </div>
                </div>
              </div>

              {/* Add Question Button */}
              {!showQuestionForm && (
                <div className="bg-white rounded-lg shadow p-6">
                  <button
                    onClick={() => setShowQuestionForm(true)}
                    className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    + Add Question
                  </button>
                </div>
              )}

              {/* Question Form */}
              {showQuestionForm && (
                <div className="bg-white rounded-lg shadow p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">New Question</h2>
                    <button
                      onClick={() => setShowQuestionForm(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕ Cancel
                    </button>
                  </div>

                  {/* Question Type Toggle */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => setQuestionType('highlight')}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${questionType === 'highlight'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      📝 Highlight Text
                    </button>
                    <button
                      onClick={() => setQuestionType('multiple-choice')}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${questionType === 'multiple-choice'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      ✓ Multiple Choice
                    </button>
                  </div>

                  {/* Highlight Question Form */}
                  {questionType === 'highlight' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Text Content
                        </label>
                        <textarea
                          value={highlightData.content}
                          onChange={(e) => setHighlightData({ ...highlightData, content: e.target.value })}
                          placeholder="Paste the text students will analyze..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Prompt
                        </label>
                        <input
                          type="text"
                          value={highlightData.prompt}
                          onChange={(e) => setHighlightData({ ...highlightData, prompt: e.target.value })}
                          placeholder="e.g., Highlight evidence of natural rights"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>

                      {highlightData.content && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mark Correct Answer
                          </label>
                          <p className="text-xs text-gray-500 mb-2">
                            Select text below, then click "Highlight"
                          </p>
                          <div
                            id="highlight-preview"
                            className="bg-gray-50 p-3 rounded border text-sm mb-2 select-text"
                          >
                            {highlightData.content}
                          </div>
                          <button
                            onClick={handleHighlight}
                            className="px-4 py-2 bg-yellow-500 text-white rounded font-semibold hover:bg-yellow-600"
                          >
                            Highlight Selection
                          </button>

                          {highlightRanges.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold mb-2">Correct answers:</p>
                              {highlightRanges.map((range, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs bg-yellow-50 p-2 rounded mb-1">
                                  <span className="flex-1">
                                    "{highlightData.content.slice(range.start, range.end)}"
                                  </span>
                                  <button
                                    onClick={() => removeHighlightRange(i)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Multiple Choice Form */}
                  {questionType === 'multiple-choice' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question
                        </label>
                        <textarea
                          value={mcData.question}
                          onChange={(e) => setMcData({ ...mcData, question: e.target.value })}
                          placeholder="e.g., Who wrote the Declaration of Independence?"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Answer Choices
                        </label>
                        <div className="space-y-2">
                          {mcData.choices.map((choice, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="correct"
                                checked={mcData.correctIndex === index}
                                onChange={() => setMcData({ ...mcData, correctIndex: index })}
                                className="w-4 h-4"
                              />
                              <input
                                type="text"
                                value={choice}
                                onChange={(e) => updateChoice(index, e.target.value)}
                                placeholder={`Choice ${index + 1}`}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                              />
                              {mcData.correctIndex === index && (
                                <span className="text-green-600 font-semibold text-sm">✓ Correct</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add Question Button */}
                  <button
                    onClick={addQuestion}
                    className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700"
                  >
                    Add Question to Quiz
                  </button>
                </div>
              )}
            </div>

            {/* Right: Questions List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-8">
                <h2 className="text-xl font-semibold mb-4">
                  Questions ({questions.length})
                </h2>

                {questions.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">
                    No questions yet. Click "Add Question" to get started.
                  </p>
                ) : (
                  <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
                    {questions.map((q, index) => (
                      <div
                        key={index}
                        className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-indigo-700">Q{index + 1}</span>
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded">
                                {q.mode === 'highlight' ? '📝' : '✓'} {q.mode}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900">{q.prompt}</p>
                          </div>
                          <button
                            onClick={() => removeQuestion(index)}
                            className="text-red-600 hover:text-red-800 text-sm ml-2"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveQuestionUp(index)}
                            disabled={index === 0}
                            className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveQuestionDown(index)}
                            disabled={index === questions.length - 1}
                            className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={saveQuiz}
                  disabled={saving || questions.length === 0}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving Quiz...' : 'Save Quiz'}
                </button>

                {message && (
                  <div className={`mt-4 p-3 rounded text-sm ${message.includes('Error')
                      ? 'bg-red-50 text-red-700'
                      : 'bg-green-50 text-green-700'
                    }`}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}