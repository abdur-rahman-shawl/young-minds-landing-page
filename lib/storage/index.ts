import { StorageProvider } from './types';
import { SupabaseStorageProvider } from './providers/supabase';
import { S3StorageProvider } from './providers/s3';

// Storage configuration
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'supabase';

// Create storage instance based on environment
function createStorageProvider(): StorageProvider {
  switch (STORAGE_PROVIDER) {
    case 'supabase':
      return new SupabaseStorageProvider();

    case 's3':
      return new S3StorageProvider(
        process.env.AWS_S3_BUCKET!,
        process.env.AWS_REGION
      );

    default:
      throw new Error(`Unsupported storage provider: ${STORAGE_PROVIDER}`);
  }
}

// Singleton storage instance
export const storage = createStorageProvider();

export const extractStoragePath = (value: string): string | null => {
  if (!value) return null;

  if (!value.startsWith('http')) {
    return value;
  }

  try {
    const url = new URL(value);
    const marker = '/storage/v1/object/';
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;

    let tail = url.pathname.slice(index + marker.length);
    if (tail.startsWith('public/')) {
      tail = tail.slice('public/'.length);
    }
    if (tail.startsWith('sign/')) {
      tail = tail.slice('sign/'.length);
    }

    const parts = tail.split('/').filter(Boolean);
    if (parts.length < 2) return null;

    return parts.slice(1).join('/');
  } catch (error) {
    return null;
  }
};

export const normalizeStorageValue = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return extractStoragePath(value) ?? value;
};

export const resolveStorageUrl = async (
  value: string | null | undefined,
  expiresIn: number = 3600
): Promise<string | null> => {
  if (!value) return null;
  const path = extractStoragePath(value);
  if (!path) return value;

  if (storage.getSignedUrl) {
    return storage.getSignedUrl(path, expiresIn);
  }

  return storage.getPublicUrl(path);
};

// Helper functions for common file operations
export const uploadImage = async (file: File, folder: string, userId: string) => {
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${timestamp}.${fileExt}`;
  const path = `${folder}/${fileName}`;

  return storage.upload(file, path, {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'jpg', 'png', 'webp'],
    public: false,
  });
};

export const uploadProfilePicture = (file: File, userId: string) => {
  return uploadImage(file, 'profiles', userId);
};

export const uploadBannerImage = (file: File, userId: string) => {
  // Banner images: 4:1 ratio recommended (1584x396), max 5MB
  return uploadImage(file, 'banners', userId);
};

export const uploadMentorDocument = (file: File, userId: string) => {
  return uploadImage(file, 'mentors/documents', userId);
};

export const uploadResume = async (file: File, userId: string) => {
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const fileName = `resume-${userId}-${timestamp}.${fileExt}`;
  const path = `mentors/resumes/${fileName}`;

  try {
    // First try with proper content type
    const result = await storage.upload(file, path, {
      maxSize: 10 * 1024 * 1024, // 10MB for resume files
      allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'pdf', 'doc', 'docx'],
      public: false,
    });

    return result;
  } catch (error) {
    console.log('First upload attempt failed, trying with octet-stream...');

    // Fallback: try with octet-stream content type but keep the extension
    try {
      const result = await storage.upload(file, path, {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'pdf', 'doc', 'docx', 'application/octet-stream'],
        public: false,
        contentType: 'application/octet-stream', // Force binary type but keep extension
      });

      return result;
    } catch (secondError) {
      console.log('Second upload attempt failed, trying with text/plain...');

      // Last fallback: use text/plain but still keep extension
      try {
        const result = await storage.upload(file, path, {
          maxSize: 10 * 1024 * 1024,
          public: false,
          contentType: 'text/plain',
        });

        return result;
      } catch (finalError) {
        throw error; // Throw original error
      }
    }
  }
};

// Upload content files (videos, documents, etc.) for mentor courses
export const uploadContentFile = async (file: File, userId: string, type: string = 'content') => {
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${userId}-${timestamp}-${cleanName}`;
  const path = `mentors/content/${type}/${fileName}`;

  const allowedTypes = [
    // Video types
    'video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/x-msvideo',
    // Document types
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Image types
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    // Text types
    'text/plain',
    // Extensions for fallback
    'mp4', 'webm', 'mov', 'avi', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt'
  ];

  try {
    // First try with proper content type
    const result = await storage.upload(file, path, {
      maxSize: 100 * 1024 * 1024, // 100MB for content files
      allowedTypes,
      public: false,
    });

    return result;
  } catch (error) {
    console.log(`Content upload failed for ${file.name}, trying with octet-stream...`);

    // Fallback: try with octet-stream content type
    try {
      const result = await storage.upload(file, path, {
        maxSize: 100 * 1024 * 1024,
        public: false,
        contentType: 'application/octet-stream',
      });

      return result;
    } catch (fallbackError) {
      console.error('Content upload fallback also failed:', fallbackError);
      throw error; // Throw original error
    }
  }
};

// Re-export types and providers for advanced usage
export * from './types';
export { SupabaseStorageProvider } from './providers/supabase';
export { S3StorageProvider } from './providers/s3';
