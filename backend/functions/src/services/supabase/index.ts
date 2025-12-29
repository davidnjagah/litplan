/**
 * Supabase Service Layer
 *
 * Central export point for all Supabase-specific service classes.
 * These services handle Supabase Storage and other Supabase-specific operations.
 *
 * @module services/supabase
 * @since Sprint 6 Phase 4 - Storage Migration
 */

// Storage Service exports
export {
  StorageService,
  STORAGE_BUCKETS,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZES,
  type BucketName,
  type AllowedImageType,
  type UploadResult,
  type ImageReference,
} from './StorageService';
