'use client';

import { useRef } from 'react';

export default function Home() {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fileRef.current?.files?.[0]) return;

    const formData = new FormData();
    formData.append('audioFile', fileRef.current.files[0]);

    const res = await fetch('/api/convert', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      alert('Conversion failed');
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted.mp3';
    a.click();

    window.URL.revokeObjectURL(url);
  };

  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold mb-6">
        Audio Converter (FFmpeg + Next.js)
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          ref={fileRef}
          accept="audio/*"
          required
          className="block"
        />
        <button className="bg-black text-white px-4 py-2 rounded">
          Convert to MP3
        </button>
      </form>
    </main>
  );
}
