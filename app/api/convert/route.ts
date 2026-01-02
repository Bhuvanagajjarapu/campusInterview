import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('audioFile') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const tempDir = 'C:/temp';
    const inputPath = path.join(tempDir, `input-${Date.now()}`);
    const outputPath = path.join(tempDir, `output-${Date.now()}.mp3`);

    // Save uploaded file
    await fs.writeFile(inputPath, buffer);

    // Run FFmpeg
    await new Promise((resolve, reject) => {
      exec(`ffmpeg -i "${inputPath}" "${outputPath}"`, (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });

    const outputBuffer = await fs.readFile(outputPath);

    // Cleanup
    await fs.unlink(inputPath);
    await fs.unlink(outputPath);

    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="converted.mp3"',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Audio conversion failed' },
      { status: 500 }
    );
  }
}
