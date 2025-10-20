/**
 * Storage Provider Interface
 *
 * Production-grade contract that all storage implementations must follow.
 * Enables swapping storage providers (Supabase → S3 → GCS) without code changes.
 *
 * Design Pattern: Strategy Pattern
 * - Defines a family of algorithms (storage providers)
 * - Makes them interchangeable
 * - Client code uses interface, not concrete implementations
 *
 * Security: All operations server-side only
 */

export interface StorageProvider {
  /**
   * Upload a recording file to storage
   *
   * CRITICAL: Must be idempotent - calling twice with same path should fail
   * to prevent accidental overwrites.
   *
   * @param fileBuffer - Binary file data (video/mp4)
   * @param path - Storage path (e.g., "sessions/abc123/2025-10-15-140532.mp4")
   * @returns Public URL or storage identifier
   * @throws Error if upload fails (network, permissions, storage full)
   *
   * Example:
   * ```ts
   * const url = await provider.uploadRecording(
   *   videoBuffer,
   *   "sessions/abc-123/2025-10-15.mp4"
   * );
   * // Returns: "https://storage.example.com/recordings/sessions/abc-123/2025-10-15.mp4"
   * ```
   */
  uploadRecording(fileBuffer: Buffer, path: string): Promise<string>;

  /**
   * Generate a temporary signed URL for playback
   *
   * CRITICAL: URL must expire - never return permanent public URLs
   * for private recordings.
   *
   * @param path - Storage path of the recording
   * @param expiresIn - Seconds until URL expires (default: 3600 = 1 hour)
   * @returns Signed URL that works for limited time
   * @throws Error if file doesn't exist or path invalid
   *
   * Security Notes:
   * - URL must include authentication token/signature
   * - URL must have expiration timestamp
   * - URL must not be guessable (include random token)
   *
   * Example:
   * ```ts
   * const playbackUrl = await provider.getPlaybackUrl(
   *   "sessions/abc-123/recording.mp4",
   *   3600
   * );
   * // Returns: "https://storage.example.com/recordings/...?token=xyz&expires=123456"
   * ```
   */
  getPlaybackUrl(path: string, expiresIn?: number): Promise<string>;

  /**
   * Delete a recording from storage
   *
   * CRITICAL: Must be irreversible - no soft delete.
   * Use with extreme caution - implement authorization checks before calling.
   *
   * @param path - Storage path of the recording
   * @throws Error if deletion fails or file not found
   *
   * Example:
   * ```ts
   * await provider.deleteRecording("sessions/abc-123/recording.mp4");
   * // File permanently deleted
   * ```
   */
  deleteRecording(path: string): Promise<void>;

  /**
   * Check if a recording exists
   *
   * Used before attempting operations to provide better error messages.
   *
   * @param path - Storage path to check
   * @returns true if file exists, false otherwise
   *
   * Example:
   * ```ts
   * const exists = await provider.exists("sessions/abc-123/recording.mp4");
   * if (!exists) {
   *   throw new Error("Recording not found");
   * }
   * ```
   */
  exists(path: string): Promise<boolean>;
}

/**
 * Storage Provider Metadata (optional, for provider info)
 */
export interface StorageProviderMetadata {
  name: string; // "supabase", "s3", "gcs"
  maxFileSize?: number; // Max file size in bytes
  supportedFormats?: string[]; // ["mp4", "webm", "mov"]
}
