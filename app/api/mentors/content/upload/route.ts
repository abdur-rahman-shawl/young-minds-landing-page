import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { enforceFeature, isSubscriptionPolicyError } from '@/lib/subscriptions/policy-runtime';
import { requireMentor } from '@/lib/api/guards';
import { getMentorForContent } from '@/lib/api/mentor-content';

export async function POST(request: NextRequest) {
  try {
    const guard = await requireMentor(request, true);
    if ('error' in guard) {
      return guard.error;
    }
    const isAdmin = guard.user.roles.some((role) => role.name === 'admin');
    const mentor = await getMentorForContent(guard.session.user.id);
    if (!isAdmin && !mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('type') as string; // 'content', 'thumbnail', 'document'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!isAdmin && fileType === 'document') {
      try {
        await enforceFeature({
          action: 'mentor.roadmap_upload',
          userId: guard.session.user.id,
        });
      } catch (error) {
        if (isSubscriptionPolicyError(error)) {
          return NextResponse.json(error.payload, { status: error.status });
        }
        throw error;
      }
    }

    if (!isAdmin && (fileType === 'video' || fileType === 'content')) {
      try {
        await enforceFeature({
          action: 'mentor.content_post',
          userId: guard.session.user.id,
        });
      } catch (error) {
        if (isSubscriptionPolicyError(error)) {
          return NextResponse.json(error.payload, { status: error.status });
        }
        throw error;
      }
    }

    // Determine upload path and constraints based on file type
    let path: string;
    let options: any;

    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const ownerToken = mentor?.id ?? `platform-${guard.session.user.id}`;
    const fileName = `${ownerToken}-${timestamp}.${fileExt}`;

    switch (fileType) {
      case 'thumbnail':
        path = `mentors/content/thumbnails/${fileName}`;
        options = {
          maxSize: 5 * 1024 * 1024, // 5MB
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'jpg', 'png', 'webp'],
          public: false,
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
          public: false,
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
          public: false,
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
          public: false,
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
