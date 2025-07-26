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

// Helper functions for common file operations
export const uploadImage = async (file: File, folder: string, userId: string) => {
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${timestamp}.${fileExt}`;
  const path = `${folder}/${fileName}`;

  return storage.upload(file, path, {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'jpg', 'png', 'webp'],
    public: true,
  });
};

export const uploadProfilePicture = (file: File, userId: string) => {
  return uploadImage(file, 'profiles', userId);
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
      public: true,
    });
    
    return result;
  } catch (error) {
    console.log('First upload attempt failed, trying with octet-stream...');
    
    // Fallback: try with octet-stream content type but keep the extension
    try {
      const result = await storage.upload(file, path, {
        maxSize: 10 * 1024 * 1024,
        allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'pdf', 'doc', 'docx', 'application/octet-stream'],
        public: true,
        contentType: 'application/octet-stream', // Force binary type but keep extension
      });
      
      return result;
    } catch (secondError) {
      console.log('Second upload attempt failed, trying with text/plain...');
      
      // Last fallback: use text/plain but still keep extension
      try {
        const result = await storage.upload(file, path, {
          maxSize: 10 * 1024 * 1024,
          public: true,
          contentType: 'text/plain',
        });
        
        return result;
      } catch (finalError) {
        throw error; // Throw original error
      }
    }
  }
};

// Re-export types and providers for advanced usage
export * from './types';
export { SupabaseStorageProvider } from './providers/supabase';
export { S3StorageProvider } from './providers/s3';