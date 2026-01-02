// import { NextResponse } from 'next/server';
// import fs from 'fs/promises';
// import path from 'path';
// import { exec } from 'child_process';

// export const runtime = 'nodejs';

// // ------------------------
// // Transcribe audio using Whisper CLI
// // ------------------------
// async function transcribeAudio(filePath: string): Promise<string> {
//   await new Promise((resolve, reject) => {
//     exec(
//       `whisper "${filePath}" --model small --language en`,
//       (err) => (err ? reject(err) : resolve(true))
//     );
//   });

//   // Whisper automatically generates .txt in same folder
//   const transcriptPath = filePath.replace(/\.[^.]+$/, '.txt');
//   const transcript = await fs.readFile(transcriptPath, 'utf-8');
//   await fs.unlink(transcriptPath); // cleanup
//   return transcript;
// }

// // ------------------------
// // Dummy confidence score calculation
// // ------------------------
// function calculateConfidence(transcript: string): number {
//   // Simple heuristic: longer answers → higher score
//   const wordCount = transcript.split(/\s+/).length;
//   return Math.min(10, Math.max(0, wordCount / 50));
// }

// // ------------------------
// // Dummy speaker detection (just adds simple tags)
// // ------------------------
// function analyzeSpeakers(transcript: string): string {
//   // This is just a placeholder. In production, use speaker diarization (pyannote)
//   const lines = transcript.split(/\n/).map((line, idx) => {
//     const speaker = idx % 2 === 0 ? 'Interviewer' : 'Candidate';
//     return `${speaker}: ${line}`;
//   });
//   return lines.join('\n');
// }

// // ------------------------
// // API Route
// // ------------------------
// export async function POST(req: Request) {
//   try {
//     const formData = await req.formData();
//     const file = formData.get('audioFile') as File;

//     if (!file) {
//       return NextResponse.json(
//         { error: 'No file uploaded' },
//         { status: 400 }
//       );
//     }

//     // Ensure temp folder exists
//     const tempDir = 'C:/temp';
//     await fs.mkdir(tempDir, { recursive: true });

//     // Keep original extension
//     const ext = file.name.split('.').pop() || 'mp3';
//     const inputPath = path.join(tempDir, `input-${Date.now()}.${ext}`);

//     // Convert File → Buffer → Save
//     const bytes = await file.arrayBuffer();
//     await fs.writeFile(inputPath, Buffer.from(bytes));

//     // 1️⃣ Transcribe audio
//     const transcriptRaw = await transcribeAudio(inputPath);

//     // 2️⃣ Speaker analysis
//     const transcript = analyzeSpeakers(transcriptRaw);

//     // 3️⃣ Confidence score
//     const score = calculateConfidence(transcriptRaw);

//     // Cleanup uploaded audio
//     await fs.unlink(inputPath);

//     // 4️⃣ Return results
//     return NextResponse.json({ score, summary: transcript });
//   } catch (error) {
//     console.error('Audio analysis error:', error);
//     return NextResponse.json(
//       { error: 'Audio analysis failed' },
//       { status: 500 }
//     );
//   }
// }



import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';

export const runtime = 'nodejs';

// ------------------------
// Transcribe audio using Whisper TSV output
// ------------------------
async function transcribeAudio(filePath: string): Promise<
  { transcript: string; timestamps: { start: number; end: number; text: string }[] }
> {
  const tempDir = 'C:/temp';
  const fileName = path.basename(filePath, path.extname(filePath));
  const outputDir = path.join(tempDir, 'whisper-output');

  await fs.mkdir(outputDir, { recursive: true });

  // Run whisper CLI
  await new Promise((resolve, reject) => {
    exec(
      `whisper "${filePath}" --model small --language en --output_dir "${outputDir}"`,
      (err) => (err ? reject(err) : resolve(true))
    );
  });

  // Whisper TSV path
  const transcriptPath = path.join(outputDir, `${fileName}.tsv`);
  const rawTSV = await fs.readFile(transcriptPath, 'utf-8');
  await fs.unlink(transcriptPath); // cleanup

  // Parse TSV
  const lines = rawTSV.split('\n').slice(1); // skip header
  const timestamps: { start: number; end: number; text: string }[] = [];
  const transcriptLines: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split('\t');
    const start = parseFloat(cols[0]);
    const end = parseFloat(cols[1]);
    const text = cols[2];

    timestamps.push({ start, end, text });
    transcriptLines.push(text);
  }

  return { transcript: transcriptLines.join(' '), timestamps };
}

// ------------------------
// Simple confidence scoring
// ------------------------
function calculateConfidence(transcript: string): number {
  const wordCount = transcript.split(/\s+/).length;
  return Math.min(10, Math.max(0, wordCount / 50));
}

// ------------------------
// Simple speaker labeling (alternate lines)
// ------------------------
function labelSpeakers(timestamps: { start: number; end: number; text: string }[]) {
  const labeled: string[] = [];
  timestamps.forEach((t, idx) => {
    const speaker = idx % 2 === 0 ? 'Interviewer' : 'Candidate';
    labeled.push(`${speaker} [${t.start.toFixed(1)}-${t.end.toFixed(1)}s]: ${t.text}`);
  });
  return labeled.join('\n');
}

// ------------------------
// API Route
// ------------------------
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('audioFile') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Save uploaded file
    const tempDir = 'C:/temp';
    await fs.mkdir(tempDir, { recursive: true });

    const ext = file.name.split('.').pop() || 'mp3';
    const inputPath = path.join(tempDir, `input-${Date.now()}.${ext}`);
    const bytes = await file.arrayBuffer();
    await fs.writeFile(inputPath, Buffer.from(bytes));

    // 1️⃣ Transcribe audio
    const { transcript, timestamps } = await transcribeAudio(inputPath);

    // 2️⃣ Label speakers
    const summary = labelSpeakers(timestamps);

    // 3️⃣ Confidence score
    const score = calculateConfidence(transcript);

    // Cleanup uploaded audio
    await fs.unlink(inputPath);

    // 4️⃣ Return results
    return NextResponse.json({ score, summary });
  } catch (error) {
    console.error('Audio analysis error:', error);
    return NextResponse.json({ error: 'Audio analysis failed' }, { status: 500 });
  }
}
