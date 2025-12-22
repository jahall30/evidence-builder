'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Range {
  start: number;
  end: number;
}

export default function CreateQuestionPage() {
  const router = useRouter();
  const [questionType, setQuestionType] = useState('highlight');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null) ;

  // Highlight question state
  const [highlightData, setHighlightData] = useState<{
    content: string;
    prompt: string;
    correctRanges: Range[];
  }>({
    content: '',
    prompt: '',
    correctRanges: []
  });
  const [tempRange, setTempRange] = useState(null);

  // Multiple choice state
  const [mcData, setMcData] = useState({
    question: '',
    choices: ['', '', '', ''],
    correctIndex: 0
  });

  // Get text selection for highlighting
  function getTextSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    const container = document.getElementById('highlight-text');
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
      setHighlightData({
        ...highlightData,
        correctRanges: [...highlightData.correctRanges, range]
      });
      window.getSelection()?.removeAllRanges();
    } else {
      alert('Please select some text first');
    }
  }

  function removeRange(index: number) {
    setHighlightData({
      ...highlightData,
      correctRanges: highlightData.correctRanges.filter((_, i) => i !== index)
    });
  }

  function updateChoice(index: number, value: string) {
    const newChoices = [...mcData.choices];
    newChoices[index] = value;
    setMcData({ ...mcData, choices: newChoices });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    let taskData;

    if (questionType === 'highlight') {
      if (!highlightData.content.trim() || !highlightData.prompt.trim()) {
        setMessage('Please fill in both text and prompt');
        setSaving(false);
        return;
      }
      if (highlightData.correctRanges.length === 0) {
        setMessage('Please highlight at least one correct answer');
        setSaving(false);
        return;
      }

      taskData = {
        mode: 'highlight',
        content: highlightData.content,
        prompt: highlightData.prompt,
        correct_answer: highlightData.correctRanges,
        dok_level: 2
      };
    } else {
      if (!mcData.question.trim()) {
        setMessage('Please enter a question');
        setSaving(false);
        return;
      }
      if (mcData.choices.some(c => !c.trim())) {
        setMessage('Please fill in all 4 answer choices');
        setSaving(false);
        return;
      }

      taskData = {
  mode: 'multiple-choice',
  content: mcData.question,
  prompt: mcData.question,
  answer_choices: mcData.choices,
  correct_answer: { value: mcData.choices[mcData.correctIndex] },
  dok_level: 2
};
    }

    const { error } = await supabase.from('tasks').insert(taskData);

    setSaving(false);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('✅ Question created successfully!');
      setTimeout(() => {
        router.push('/teacher/quizzes/create');
      }, 1500);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Create New Question</h1>

        {/* Question Type Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Question Type
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setQuestionType('highlight')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                questionType === 'highlight'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📝 Highlight Text
            </button>
            <button
              onClick={() => setQuestionType('multiple-choice')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                questionType === 'multiple-choice'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✓ Multiple Choice
            </button>
          </div>
        </div>

        {/* Highlight Question Form */}
        {questionType === 'highlight' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Text Content</h2>
              <textarea
                value={highlightData.content}
                onChange={(e) => setHighlightData({ ...highlightData, content: e.target.value })}
                placeholder="Paste or type the text students will analyze..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 h-48"
              />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Question Prompt</h2>
              <input
                type="text"
                value={highlightData.prompt}
                onChange={(e) => setHighlightData({ ...highlightData, prompt: e.target.value })}
                placeholder="e.g., Highlight an example of natural rights"
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>

            {highlightData.content && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Mark Correct Answer</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Select text below, then click "Highlight Selection" to mark it as a correct answer
                </p>
                
                <div
                  id="highlight-text"
                  className="bg-gray-50 p-4 rounded-lg mb-4 text-lg leading-relaxed whitespace-pre-wrap select-text border-2 border-gray-200"
                >
                  {highlightData.content}
                </div>

                <button
                  onClick={handleHighlight}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700"
                >
                  Highlight Selection
                </button>

                {highlightData.correctRanges.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Correct Answers ({highlightData.correctRanges.length}):</h3>
                    <div className="space-y-2">
                      {highlightData.correctRanges.map((range, i) => (
                        <div key={i} className="flex items-center justify-between bg-green-50 p-2 rounded">
                          <span className="text-sm">
                            "{highlightData.content.slice(range.start, range.end)}"
                          </span>
                          <button
                            onClick={() => removeRange(i)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Multiple Choice Form */}
        {questionType === 'multiple-choice' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Question</h2>
              <textarea
                value={mcData.question}
                onChange={(e) => setMcData({ ...mcData, question: e.target.value })}
                placeholder="e.g., Which document declared American independence?"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 h-24"
              />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Answer Choices</h2>
              <div className="space-y-3">
                {mcData.choices.map((choice, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correct"
                      checked={mcData.correctIndex === index}
                      onChange={() => setMcData({ ...mcData, correctIndex: index })}
                      className="w-5 h-5"
                    />
                    <input
                      type="text"
                      value={choice}
                      onChange={(e) => updateChoice(index, e.target.value)}
                      placeholder={`Choice ${index + 1}`}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3"
                    />
                    {mcData.correctIndex === index && (
                      <span className="text-green-600 font-semibold">✓ Correct</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Select the radio button next to the correct answer
              </p>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Question'}
          </button>

          {message && (
            <div className={`mt-4 p-3 rounded ${
              message.includes('Error')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}