'use client';

import { useRef, useState } from 'react';

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [summary, setSummary] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileRef.current?.files?.[0]) return;

    setLoading(true);
    setScore(null);
    setSummary('');

    const formData = new FormData();
    formData.append('audioFile', fileRef.current.files[0]);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setScore(data.score);
        setSummary(data.summary);
      } else {
        setSummary(data.error || 'Analysis failed');
      }
    } catch (err) {
      setSummary('Server error');
    }

    setLoading(false);
  };

  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold mb-6">Interview Analyzer</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          ref={fileRef}
          accept="audio/*"
          required
          className="block"
        />
        <button
          className="bg-black text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Analyze Interview'}
        </button>
      </form>

      {score !== null && (
        <div className="mt-6 p-4 border rounded">
          <h2 className="font-bold">Candidate Confidence Score:</h2>
          <p className="text-xl">{score.toFixed(2)} / 10</p>

          <h3 className="font-bold mt-2">Transcript Summary:</h3>
          <pre className="whitespace-pre-wrap">{summary}</pre>
        </div>
      )}
    </main>
  );
}
