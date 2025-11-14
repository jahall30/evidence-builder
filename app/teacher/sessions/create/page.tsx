'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function CreateSessionPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);

  // Load all tasks with their source info
  useEffect(() => {
    async function loadTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          prompt,
          mode,
          sources (
            title,
            type
          )
        `)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setTasks(data);
      }
      setLoading(false);
    }
    loadTasks();
  }, []);

  async function startSession(taskId) {
    setCreating(taskId);

    // Generate a random join code
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        task_id: taskId,
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

    // Copy link to clipboard
    const link = `${window.location.origin}/play/${data.id}`;
    await navigator.clipboard.writeText(link);

    alert(`✅ Session started!\n\nLink copied to clipboard:\n${link}\n\nJoin Code: ${joinCode}`);
  }

  if (loading) {
    return <div className="p-8">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 mb-4">You haven't created any tasks yet.</p>
            <a 
              href="/teacher/tasks/create"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Create Your First Task
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
          <p className="text-gray-600 mt-2">Choose a task to create a shareable link for students</p>
        </div>

        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded">
                      {task.mode}
                    </span>
                    <span className="text-sm text-gray-500">
                      {task.sources?.title || 'Unknown source'}
                    </span>
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    {task.prompt}
                  </p>
                </div>
                
                <button
                  onClick={() => startSession(task.id)}
                  disabled={creating === task.id}
                  className="ml-4 bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {creating === task.id ? 'Starting...' : 'Start Session'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <a href="/teacher/tasks/create" className="text-indigo-600 hover:underline">
            + Create New Task
          </a>
        </div>
      </div>
    </div>
  );
}