/**
 * Storage Factory
 *
 * Production-grade factory pattern implementation for storage provider selection.
 *
 * Design Pattern: Factory Pattern
 * - Encapsulates object creation logic
 * - Returns correct provider based on configuration
 * - Client code doesn't need to know which provider is used
 *
 * Benefits:
 * - Switch providers by changing STORAGE_PROVIDER env var
 * - No code changes needed when switching
 * - Easy to add new providers
 * - Centralized provider selection logic
 *
 * Usage:
 * ```ts
 * const storage = getStorageProvider(); // Returns configured provider
 * await storage.uploadRecording(buffer, path); // Works with any provider
 * ```
 */

import { StorageProvider } from './storage-provider.interface';
import { SupabaseStorageProvider } from './supabase-storage.provider';
// Future imports:
// import { S3StorageProvider } from './s3-storage.provider';
// import { GCSStorageProvider } from './gcs-storage.provider';
// import { AzureStorageProvider } from './azure-storage.provider';

/**
 * Supported storage providers
 */
type SupportedProvider = 'supabase' | 's3' | 'gcs' | 'azure';

/**
 * Get storage provider instance based on environment configuration
 *
 * Provider selection via STORAGE_PROVIDER environment variable:
 * - "supabase" → Supabase Storage (current implementation)
 * - "s3" → AWS S3 (future)
 * - "gcs" → Google Cloud Storage (future)
 * - "azure" → Azure Blob Storage (future)
 *
 * @throws Error if provider is unknown or not implemented
 * @returns Configured storage provider instance
 */
export function getStorageProvider(): StorageProvider {
  const provider = (process.env.STORAGE_PROVIDER || 'supabase').toLowerCase() as SupportedProvider;

  console.log(`📦 Initializing storage provider: ${provider.toUpperCase()}`);

  // ========================================================================
  // PROVIDER SELECTION
  // ========================================================================
  switch (provider) {
    case 'supabase':
      return new SupabaseStorageProvider();

    // ======================================================================
    // FUTURE IMPLEMENTATIONS
    // ======================================================================
    // When implementing S3:
    // 1. Create s3-storage.provider.ts (implement StorageProvider interface)
    // 2. Uncomment import above
    // 3. Uncomment case below
    // 4. Set STORAGE_PROVIDER=s3 in .env.local
    // 5. Add AWS credentials to .env.local
    // 6. Everything else works automatically!
    //
    // case 's3':
    //   return new S3StorageProvider();
    //
    // case 'gcs':
    //   return new GCSStorageProvider();
    //
    // case 'azure':
    //   return new AzureStorageProvider();

    default:
      throw new Error(
        `CRITICAL: Unknown storage provider: "${provider}"\n\n` +
        `Supported providers:\n` +
        `  - supabase (ACTIVE - Supabase Storage)\n` +
        `  - s3 (COMING SOON - AWS S3)\n` +
        `  - gcs (COMING SOON - Google Cloud Storage)\n` +
        `  - azure (COMING SOON - Azure Blob Storage)\n\n` +
        `Set STORAGE_PROVIDER in .env.local to one of the supported providers.`
      );
  }
}

/**
 * Check if a storage provider is supported (but not necessarily implemented)
 *
 * @param provider - Provider name to check
 * @returns true if provider is recognized
 */
export function isSupportedProvider(provider: string): boolean {
  const supportedProviders: SupportedProvider[] = ['supabase', 's3', 'gcs', 'azure'];
  return supportedProviders.includes(provider.toLowerCase() as SupportedProvider);
}

/**
 * Get list of implemented providers (actually available for use)
 *
 * @returns Array of provider names that are currently implemented
 */
export function getImplementedProviders(): SupportedProvider[] {
  return ['supabase']; // Add 's3', 'gcs', 'azure' as they're implemented
}

/**
 * Validate storage provider configuration
 *
 * Checks if selected provider is implemented and has required env vars.
 * Useful for startup health checks.
 *
 * @throws Error with detailed message if configuration is invalid
 */
export function validateStorageConfiguration(): void {
  const provider = (process.env.STORAGE_PROVIDER || 'supabase').toLowerCase();

  // Check if provider is supported
  if (!isSupportedProvider(provider)) {
    throw new Error(
      `Invalid STORAGE_PROVIDER: "${provider}"\n` +
      `Must be one of: ${['supabase', 's3', 'gcs', 'azure'].join(', ')}`
    );
  }

  // Check if provider is implemented
  const implemented = getImplementedProviders();
  if (!implemented.includes(provider as SupportedProvider)) {
    throw new Error(
      `Storage provider "${provider}" is not yet implemented.\n` +
      `Currently implemented: ${implemented.join(', ')}\n` +
      `Please use an implemented provider or implement ${provider} provider.`
    );
  }

  // Provider-specific validation
  switch (provider) {
    case 'supabase':
      if (!process.env.SUPABASE_URL) {
        throw new Error('SUPABASE_URL is required for Supabase storage provider');
      }
      if (!process.env.SUPABASE_SERVICE_KEY) {
        throw new Error('SUPABASE_SERVICE_KEY is required for Supabase storage provider');
      }
      if (!process.env.SUPABASE_STORAGE_BUCKET) {
        throw new Error('SUPABASE_STORAGE_BUCKET is required for Supabase storage provider');
      }
      break;

    // Future cases:
    // case 's3':
    //   if (!process.env.AWS_ACCESS_KEY_ID) { ... }
    //   break;
  }

  console.log(`✅ Storage configuration validated: ${provider.toUpperCase()}`);
}
