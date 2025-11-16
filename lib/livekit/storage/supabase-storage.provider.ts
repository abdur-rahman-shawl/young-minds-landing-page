/**
 * Supabase Storage Provider Implementation
 *
 * Production-grade implementation using Supabase Storage API.
 * Supabase Storage uses S3-compatible API under the hood with additional features.
 *
 * Security Features:
 * - Server-side only (uses service role key)
 * - Signed URLs for temporary access
 * - Private bucket (no public access)
 * - Validation on all operations
 *
 * Performance:
 * - Direct uploads (no intermediate servers)
 * - CDN-backed downloads
 * - Efficient signed URL generation
 *
 * Fail-loud: All errors throw with detailed messages
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageProvider } from './storage-provider.interface';

export class SupabaseStorageProvider implements StorageProvider {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor() {
    // ========================================================================
    // ENVIRONMENT VALIDATION - Fail immediately if misconfigured
    // ========================================================================
    const missingVars: string[] = [];

    if (!process.env.SUPABASE_URL) {
      missingVars.push('SUPABASE_URL');
    }
    if (!process.env.SUPABASE_SERVICE_KEY) {
      missingVars.push('SUPABASE_SERVICE_KEY');
    }
    if (!process.env.SUPABASE_STORAGE_BUCKET) {
      missingVars.push('SUPABASE_STORAGE_BUCKET');
    }

    if (missingVars.length > 0) {
      throw new Error(
        `CRITICAL: Missing required Supabase environment variables: ${missingVars.join(', ')}\n` +
        `Add these to your .env.local file:\n` +
        `SUPABASE_URL=https://your-project.supabase.co\n` +
        `SUPABASE_SERVICE_KEY=your-service-role-key\n` +
        `SUPABASE_STORAGE_BUCKET=recordings`
      );
    }

    // ========================================================================
    // INITIALIZE SUPABASE CLIENT
    // ========================================================================
    // Use service role key for full access (server-side only)
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          persistSession: false, // Server-side, no session persistence needed
          autoRefreshToken: false, // Service key doesn't expire
        },
      }
    );

    this.bucket = process.env.SUPABASE_STORAGE_BUCKET;

    console.log(
      `✅ Supabase Storage Provider initialized (bucket: ${this.bucket})`
    );
  }

  /**
   * Upload recording to Supabase Storage
   */
  async uploadRecording(fileBuffer: Buffer, path: string): Promise<string> {
    try {
      // Validation
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('File buffer is empty - cannot upload empty file');
      }

      if (!path || path.trim() === '') {
        throw new Error('Storage path is required');
      }

      // Sanitize path (prevent directory traversal)
      const sanitizedPath = path.replace(/\.\./g, '').replace(/^\/+/, '');

      console.log(
        `📤 Uploading recording to Supabase: ${sanitizedPath} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)`
      );

      // ======================================================================
      // UPLOAD TO SUPABASE STORAGE
      // ======================================================================
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(sanitizedPath, fileBuffer, {
          contentType: 'video/mp4',
          upsert: false, // CRITICAL: Fail if file exists (prevent overwrites)
          duplex: 'half', // For Node.js compatibility
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);

        // Provide specific error messages
        if (error.message.includes('duplicate')) {
          throw new Error(
            `Recording already exists at path: ${sanitizedPath}. ` +
            `Cannot overwrite existing recordings.`
          );
        }

        if (error.message.includes('exceeded')) {
          throw new Error(
            `Storage quota exceeded. Cannot upload recording.`
          );
        }

        throw new Error(`Failed to upload to Supabase: ${error.message}`);
      }

      if (!data) {
        throw new Error('Upload succeeded but no data returned from Supabase');
      }

      // ======================================================================
      // GET PUBLIC URL (for reference only - not for direct access)
      // ======================================================================
      const { data: urlData } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(sanitizedPath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to generate public URL after upload');
      }

      console.log(
        `✅ Recording uploaded successfully to Supabase: ${sanitizedPath}`
      );

      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ CRITICAL: Upload recording failed:', {
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Generate signed URL for playback (expires in specified seconds)
   */
  async getPlaybackUrl(path: string, expiresIn: number = 3600): Promise<string> {
    try {
      // Validation
      if (!path || path.trim() === '') {
        throw new Error('Storage path is required');
      }

      if (expiresIn < 60 || expiresIn > 86400) {
        throw new Error('ExpiresIn must be between 60 seconds and 24 hours');
      }

      console.log(
        `🔐 Generating signed URL for: ${path} (expires in ${expiresIn}s = ${Math.floor(expiresIn / 60)} minutes)`
      );

      // ======================================================================
      // CREATE SIGNED URL
      // ======================================================================
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error('❌ Signed URL generation error:', error);

        // Specific error handling
        if (error.message.includes('not found')) {
          throw new Error(
            `Recording not found at path: ${path}. ` +
            `File may have been deleted or path is incorrect.`
          );
        }

        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }

      if (!data || !data.signedUrl) {
        throw new Error('Signed URL generation returned empty result');
      }

      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      console.log(
        `✅ Signed URL generated successfully (expires at: ${expiresAt.toISOString()})`
      );

      return data.signedUrl;
    } catch (error) {
      console.error('❌ CRITICAL: Get playback URL failed:', {
        path,
        expiresIn,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete recording from Supabase Storage
   * CRITICAL: Irreversible operation
   */
  async deleteRecording(path: string): Promise<void> {
    try {
      // Validation
      if (!path || path.trim() === '') {
        throw new Error('Storage path is required');
      }

      console.log(`🗑️  Deleting recording from Supabase: ${path}`);

      // ======================================================================
      // DELETE FROM STORAGE
      // ======================================================================
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([path]);

      if (error) {
        console.error('❌ Supabase delete error:', error);

        // Specific error handling
        if (error.message.includes('not found')) {
          // File already deleted - consider this success
          console.log(`⚠️  File not found (may already be deleted): ${path}`);
          return;
        }

        throw new Error(`Failed to delete from Supabase: ${error.message}`);
      }

      console.log(`✅ Recording deleted successfully from Supabase: ${path}`);
    } catch (error) {
      console.error('❌ CRITICAL: Delete recording failed:', {
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if recording exists in storage
   */
  async exists(path: string): Promise<boolean> {
    try {
      // Validation
      if (!path || path.trim() === '') {
        throw new Error('Storage path is required');
      }

      // Parse path into directory and filename
      const parts = path.split('/');
      const filename = parts.pop();
      const directory = parts.join('/');

      if (!filename) {
        throw new Error('Invalid path format - no filename found');
      }

      // ======================================================================
      // LIST FILES IN DIRECTORY AND SEARCH FOR FILENAME
      // ======================================================================
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(directory || undefined, {
          search: filename,
          limit: 1,
        });

      if (error) {
        console.error('❌ Exists check error:', error);
        return false;
      }

      const exists = data && data.length > 0;

      console.log(
        `🔍 File existence check: ${path} → ${exists ? 'EXISTS' : 'NOT FOUND'}`
      );

      return exists;
    } catch (error) {
      console.error('❌ Exists check failed:', {
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Return false on error instead of throwing (non-critical operation)
      return false;
    }
  }
}
