import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { mentors } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get mentor info
    const mentor = await db.select()
      .from(mentors)
      .where(eq(mentors.userId, session.user.id))
      .limit(1);

    if (!mentor.length) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('type') as string; // 'content', 'thumbnail', 'document'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Determine upload path and constraints based on file type
    let path: string;
    let options: any;

    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${mentor[0].id}-${timestamp}.${fileExt}`;

    switch (fileType) {
      case 'thumbnail':
        path = `mentors/content/thumbnails/${fileName}`;
        options = {
          maxSize: 5 * 1024 * 1024, // 5MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'jpg', 'png', 'webp'],
          public: true,
        };
        break;

      case 'video':
        path = `mentors/content/videos/${fileName}`;
        options = {
          maxSize: 500 * 1024 * 1024, // 500MB for videos
          allowedTypes: [
            'video/mp4', 
            'video/mpeg', 
            'video/quicktime', 
            'video/x-msvideo',
            'mp4', 
            'mpeg', 
            'mov', 
            'avi'
          ],
          public: true,
        };
        break;

      case 'document':
        path = `mentors/content/documents/${fileName}`;
        options = {
          maxSize: 50 * 1024 * 1024, // 50MB for documents
          allowedTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint',
            'text/plain',
            'pdf',
            'doc',
            'docx',
            'ppt',
            'pptx',
            'txt'
          ],
          public: true,
        };
        break;

      case 'content':
      default:
        // General content file - could be video, document, etc.
        path = `mentors/content/files/${fileName}`;
        options = {
          maxSize: 500 * 1024 * 1024, // 500MB
          allowedTypes: [
            // Images
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'jpg', 'png', 'webp', 'gif',
            // Videos
            'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
            'mp4', 'mpeg', 'mov', 'avi',
            // Documents
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint',
            'text/plain',
            'pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt',
            // Audio
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            'mp3', 'wav', 'ogg'
          ],
          public: true,
        };
        break;
    }

    try {
      const result = await storage.upload(file, path, options);

      return NextResponse.json({
        url: result.url,
        path: result.path,
        size: file.size,
        name: file.name,
        type: file.type,
        mimeType: file.type,
      });
    } catch (uploadError: any) {
      console.error('Upload error:', uploadError);
      
      // Try fallback for document uploads
      if (fileType === 'document' || fileType === 'content') {
        try {
          const fallbackOptions = {
            ...options,
            contentType: 'application/octet-stream',
          };
          
          const result = await storage.upload(file, path, fallbackOptions);
          
          return NextResponse.json({
            url: result.url,
            path: result.path,
            size: file.size,
            name: file.name,
            type: file.type,
            mimeType: file.type,
          });
        } catch (fallbackError) {
          console.error('Fallback upload error:', fallbackError);
        }
      }

      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}