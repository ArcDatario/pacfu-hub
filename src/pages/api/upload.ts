import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedFileName}`;

    // Create directory structure: public/uploads/user-{userId}
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', `user-${userId}`);
    
    // Ensure directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Full file path
    const filePath = path.join(uploadDir, fileName);

    // Write file to disk
    await writeFile(filePath, buffer);

    // Create public URL path (relative to public folder)
    const publicPath = `/uploads/user-${userId}/${fileName}`;
    const downloadUrl = publicPath;

    return NextResponse.json({
      success: true,
      filePath: publicPath, // Store relative path
      downloadUrl: downloadUrl,
      fileName: file.name,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Configure Next.js to handle large files
export const config = {
  api: {
    bodyParser: false,
  },
};