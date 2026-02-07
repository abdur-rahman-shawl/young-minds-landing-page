import { createClient } from '@supabase/supabase-js';
import { StorageProvider, UploadOptions, UploadResult, StorageError } from '../types';

export class SupabaseStorageProvider implements StorageProvider {
  private client;
  private bucket: string;

  constructor(
    url?: string,
    key?: string,
    bucket: string = 'uploads'
  ) {
    // Use provided values or fallback to environment variables
    // For client-side operations, use NEXT_PUBLIC_ prefixed variables
    const supabaseUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
    const supabaseKey = key || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key are required');
    }
    this.client = createClient(supabaseUrl, supabaseKey);
    this.bucket = bucket;
  }

  async upload(file: File, path: string, options?: UploadOptions): Promise<UploadResult> {
    try {
      // Validate file size
      if (options?.maxSize && file.size > options.maxSize) {
        throw new Error(`File size exceeds limit of ${options.maxSize} bytes`);
      }

      // Validate file type
      if (options?.allowedTypes) {
        const fileType = file.type;
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        
        const isAllowed = options.allowedTypes.some(type => 
          fileType === type || 
          fileType.includes(type) || 
          (fileExt && type === fileExt) ||
          (fileExt && type.includes(fileExt))
        );
        
        if (!isAllowed) {
          throw new Error(`File type not allowed. File type: ${fileType}, Extension: ${fileExt}. Allowed types: ${options.allowedTypes.join(', ')}`);
        }
      }

      // Convert File to ArrayBuffer for Supabase
      const buffer = await file.arrayBuffer();
      
      // Upload to Supabase Storage
      // Determine content type - preserve original file type when possible
      let contentType = options?.contentType || file.type;
      
      // For resumes, we need to maintain the correct content type for proper download
      if (path.includes('mentors/resumes')) {
        const fileExt = path.split('.').pop()?.toLowerCase();
        if (fileExt === 'pdf') {
          contentType = 'application/pdf';
        } else if (fileExt === 'doc') {
          contentType = 'application/msword';
        } else if (fileExt === 'docx') {
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
        // If still failing with proper content type, fall back to octet-stream but keep extension
      }
      
      // Prepare upload options
      const uploadOptions: any = {
        contentType: contentType,
        upsert: true, // Allow overwriting existing files
      };

      // For resume files, add custom metadata to ensure proper download
      if (path.includes('mentors/resumes')) {
        const originalFileName = file.name;
        uploadOptions.metadata = {
          originalFileName: originalFileName,
          uploadedAt: new Date().toISOString()
        };
      }

      const { data, error } = await this.client.storage
        .from(this.bucket)
        .upload(path, buffer, uploadOptions);

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      const isPublic = options?.public !== false;
      const url = isPublic
        ? this.getPublicUrl(path)
        : await this.getSignedUrl(path);

      return {
        url,
        path: data.path,
        size: file.size,
        contentType: file.type,
      };
    } catch (error) {
      throw {
        code: 'UPLOAD_ERROR',
        message: error instanceof Error ? error.message : 'Upload failed',
        originalError: error,
      } as StorageError;
    }
  }

  async delete(path: string): Promise<void> {
    try {
      const { error } = await this.client.storage
        .from(this.bucket)
        .remove([path]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      throw {
        code: 'DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Delete failed',
        originalError: error,
      } as StorageError;
    }
  }

  getPublicUrl(path: string): string {
    const { data } = this.client.storage
      .from(this.bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw new Error(`Signed URL generation failed: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      throw {
        code: 'SIGNED_URL_ERROR',
        message: error instanceof Error ? error.message : 'Signed URL generation failed',
        originalError: error,
      } as StorageError;
    }
  }
}
