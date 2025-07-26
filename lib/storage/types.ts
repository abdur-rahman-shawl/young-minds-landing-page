export interface StorageProvider {
  /**
   * Upload a file to storage
   */
  upload(file: File, path: string, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Delete a file from storage
   */
  delete(path: string): Promise<void>;

  /**
   * Get public URL for a file
   */
  getPublicUrl(path: string): string;

  /**
   * Generate a signed URL for private files
   */
  getSignedUrl?(path: string, expiresIn?: number): Promise<string>;
}

export interface UploadOptions {
  /**
   * Content type override
   */
  contentType?: string;
  
  /**
   * Whether file should be publicly accessible
   */
  public?: boolean;
  
  /**
   * Maximum file size in bytes
   */
  maxSize?: number;
  
  /**
   * Allowed file types/extensions
   */
  allowedTypes?: string[];
}

export interface UploadResult {
  /**
   * Public URL to access the file
   */
  url: string;
  
  /**
   * Storage path/key
   */
  path: string;
  
  /**
   * File size in bytes
   */
  size: number;
  
  /**
   * Content type
   */
  contentType: string;
}

export type StorageError = {
  code: string;
  message: string;
  originalError?: any;
};