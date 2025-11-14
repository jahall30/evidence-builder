'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function CreateQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function loadTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, prompt, mode, content')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setTasks(data);
      }
      setLoading(false);
    }
    loadTasks();
  }, []);

  function toggleTask(taskId) {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  }

  function moveUp(index) {
    if (index === 0) return;
    const newList = [...selectedTasks];
    [newList[index], newList[index - 1]] = [newList[index - 1], newList[index]];
    setSelectedTasks(newList);
  }

  function moveDown(index) {
    if (index === selectedTasks.length - 1) return;
    const newList = [...selectedTasks];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    setSelectedTasks(newList);
  }

  async function handleCreate() {
    if (!title.trim()) {
      setMessage('Please enter a quiz title');
      return;
    }

    if (selectedTasks.length === 0) {
      setMessage('Please select at least one question');
      return;
    }

    setSaving(true);
    setMessage(null);

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        title,
        description
      })
      .select()
      .single();

    if (quizError) {
      setMessage(`Error: ${quizError.message}`);
      setSaving(false);
      return;
    }

    const quizQuestions = selectedTasks.map((taskId, index) => ({
      quiz_id: quiz.id,
      task_id: taskId,
      order_num: index + 1,
      points: 100
    }));

    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(quizQuestions);

    setSaving(false);

    if (questionsError) {
      setMessage(`Error adding questions: ${questionsError.message}`);
      return;
    }

    setMessage('✅ Quiz created successfully!');
    setTimeout(() => {
      router.push('/teacher/sessions/create');
    }, 1500);
  }

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  const selectedTaskObjects = selectedTasks.map(id => 
    tasks.find(t => t.id === id)
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Create New Quiz</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                  />
                </div>
              </div>
            </div>

            {/* Create New Question Link */}
            <div className="bg-white rounded-lg shadow p-6">
              
                <a href="/teacher/questions/create"
                target="_blank"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                <span className="text-xl">+</span>
                Create New Question
              </a>
              <p className="text-sm text-gray-500 text-center mt-2">
                Opens in new tab - refresh this page after creating questions
              </p>
            </div>

            {/* Available Questions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                Available Questions ({tasks.length})
              </h2>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No questions yet. Create one using the button above!
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTasks.includes(task.id)
                          ? 'bg-indigo-50 border-indigo-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                              {task.mode}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900">{task.prompt}</p>
                        </div>
                        {selectedTasks.includes(task.id) && (
                          <span className="ml-2 text-indigo-600 font-bold">✓</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Selected Questions */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4">
                Selected Questions ({selectedTasks.length})
              </h2>

              {selectedTasks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Click questions on the left to add them to your quiz
                </p>
              ) : (
                <div className="space-y-2 mb-6">
                  {selectedTaskObjects.map((task, index) => (
                    <div
                      key={task.id}
                      className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-indigo-700">Q{index + 1}</span>
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded">
                              {task.mode}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900">{task.prompt}</p>
                        </div>
                        <div className="flex flex-col gap-1 ml-2">
                          <button
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveDown(index)}
                            disabled={index === selectedTasks.length - 1}
                            className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={saving || selectedTasks.length === 0}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {saving ? 'Creating Quiz...' : 'Create Quiz'}
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
      </div>
    </div>
  );
}