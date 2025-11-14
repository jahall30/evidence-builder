'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CreateTaskPage() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  const [formData, setFormData] = useState({
    sourceId: '',
    prompt: '',
    mode: 'highlight'
  });

  // Load all sources when page opens
  useEffect(() => {
    async function loadSources() {
      const { data, error } = await supabase
        .from('sources')
        .select('id, title, type')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setSources(data);
      }
      setLoading(false);
    }
    loadSources();
  }, []);

  async function handleSubmit() {
    if (!formData.sourceId || !formData.prompt.trim()) {
      setMessage('Please select a source and enter a prompt.');
      return;
    }

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from('tasks').insert({
      source_id: formData.sourceId,
      prompt: formData.prompt,
      mode: formData.mode,
      dok_level: 2
    });

    setSaving(false);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('✅ Task created successfully!');
      setFormData({ sourceId: '', prompt: '', mode: 'highlight' });
    }
  }

  if (loading) {
    return <div className="p-8">Loading sources...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Create New Task</h1>

          <div className="space-y-4">
            {/* Source Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Source
              </label>
              <select
                value={formData.sourceId}
                onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">-- Choose a source --</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.title || 'Untitled'} ({source.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Question Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Prompt
              </label>
              <textarea
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="e.g., Highlight an example of natural rights in this text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
              />
            </div>

            {/* Mode Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Type
              </label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="highlight">Highlight Text</option>
                <option value="drag-token">Drag Token (coming soon)</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Task'}
            </button>

            {/* Message */}
            {message && (
              <div className={`p-3 rounded ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {message}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <a href="/teacher/highlight" className="text-indigo-600 hover:underline">
            ← Back to sources
          </a>
        </div>
      </div>
    </div>
  );
}