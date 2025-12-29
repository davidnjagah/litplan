/**
 * Storage Service
 *
 * Sprint 6 Phase 4: Storage Migration
 * Provides methods for managing file uploads to Supabase Storage.
 * Handles city images, plan images, and user avatars.
 *
 * @module services/supabase/StorageService
 */

import { supabaseAdmin } from '../../config/supabase';

// Storage bucket names
export const STORAGE_BUCKETS = {
  CITY_IMAGES: 'city-images',
  PLAN_IMAGES: 'plan-images',
  USER_AVATARS: 'user-avatars',
} as const;

export type BucketName = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

// Supported image types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AllowedImageType = typeof ALLOWED_IMAGE_TYPES[number];

// Maximum file sizes (in bytes)
export const MAX_FILE_SIZES = {
  CITY_IMAGE: 5 * 1024 * 1024, // 5MB
  PLAN_IMAGE: 5 * 1024 * 1024, // 5MB
  USER_AVATAR: 2 * 1024 * 1024, // 2MB
} as const;

// Upload result type
export interface UploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
}

// Image reference type (for storing in database)
export interface ImageReference {
  url: string;
  isStorageUrl: boolean; // true if stored in Supabase Storage, false if external URL
  bucket?: BucketName;
  path?: string;
}

/**
 * Storage Service Class
 *
 * Provides methods for uploading, retrieving, and deleting files
 * from Supabase Storage buckets.
 */
export class StorageService {
  /**
   * Upload a city image to storage
   *
   * @param cityId - The city ID
   * @param file - The file buffer to upload
   * @param contentType - The MIME type of the file
   * @param imageType - Type of image (hero or card)
   * @returns Upload result with public URL
   */
  static async uploadCityImage(
    cityId: string,
    file: Buffer,
    contentType: AllowedImageType,
    imageType: 'hero' | 'card' = 'hero'
  ): Promise<UploadResult> {
    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return {
        success: false,
        error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      };
    }

    // Validate file size
    if (file.length > MAX_FILE_SIZES.CITY_IMAGE) {
      return {
        success: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZES.CITY_IMAGE / 1024 / 1024}MB`,
      };
    }

    const extension = this.getExtensionFromMimeType(contentType);
    const path = `${cityId}/${imageType}.${extension}`;

    return this.uploadFile(STORAGE_BUCKETS.CITY_IMAGES, path, file, contentType);
  }

  /**
   * Upload a plan image to storage
   *
   * @param planId - The plan ID
   * @param file - The file buffer to upload
   * @param contentType - The MIME type of the file
   * @param index - Optional image index for multiple images
   * @returns Upload result with public URL
   */
  static async uploadPlanImage(
    planId: string,
    file: Buffer,
    contentType: AllowedImageType,
    index: number = 0
  ): Promise<UploadResult> {
    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return {
        success: false,
        error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      };
    }

    // Validate file size
    if (file.length > MAX_FILE_SIZES.PLAN_IMAGE) {
      return {
        success: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZES.PLAN_IMAGE / 1024 / 1024}MB`,
      };
    }

    const extension = this.getExtensionFromMimeType(contentType);
    const path = `${planId}/image_${index}.${extension}`;

    return this.uploadFile(STORAGE_BUCKETS.PLAN_IMAGES, path, file, contentType);
  }

  /**
   * Upload a user avatar to storage
   *
   * @param userId - The user ID
   * @param file - The file buffer to upload
   * @param contentType - The MIME type of the file
   * @returns Upload result with public URL
   */
  static async uploadUserAvatar(
    userId: string,
    file: Buffer,
    contentType: AllowedImageType
  ): Promise<UploadResult> {
    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return {
        success: false,
        error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      };
    }

    // Validate file size
    if (file.length > MAX_FILE_SIZES.USER_AVATAR) {
      return {
        success: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZES.USER_AVATAR / 1024 / 1024}MB`,
      };
    }

    const extension = this.getExtensionFromMimeType(contentType);
    const timestamp = Date.now();
    const path = `${userId}/avatar_${timestamp}.${extension}`;

    return this.uploadFile(STORAGE_BUCKETS.USER_AVATARS, path, file, contentType);
  }

  /**
   * Get the public URL for a file in storage
   *
   * @param bucket - The bucket name
   * @param path - The file path within the bucket
   * @returns The public URL or null if not found
   */
  static getPublicUrl(bucket: BucketName, path: string): string | null {
    try {
      const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
      return data?.publicUrl || null;
    } catch (error) {
      console.error('Error getting public URL:', error);
      return null;
    }
  }

  /**
   * Delete a file from storage
   *
   * @param bucket - The bucket name
   * @param path - The file path within the bucket
   * @returns Success status
   */
  static async deleteFile(bucket: BucketName, path: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);

      if (error) {
        console.error('Error deleting file:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Delete all files for a specific city
   *
   * @param cityId - The city ID
   * @returns Success status
   */
  static async deleteCityImages(cityId: string): Promise<boolean> {
    try {
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.CITY_IMAGES)
        .list(cityId);

      if (listError) {
        console.error('Error listing city images:', listError);
        return false;
      }

      if (!files || files.length === 0) {
        return true; // No files to delete
      }

      const filePaths = files.map((file) => `${cityId}/${file.name}`);
      const { error: deleteError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.CITY_IMAGES)
        .remove(filePaths);

      if (deleteError) {
        console.error('Error deleting city images:', deleteError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting city images:', error);
      return false;
    }
  }

  /**
   * Delete all files for a specific plan
   *
   * @param planId - The plan ID
   * @returns Success status
   */
  static async deletePlanImages(planId: string): Promise<boolean> {
    try {
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.PLAN_IMAGES)
        .list(planId);

      if (listError) {
        console.error('Error listing plan images:', listError);
        return false;
      }

      if (!files || files.length === 0) {
        return true; // No files to delete
      }

      const filePaths = files.map((file) => `${planId}/${file.name}`);
      const { error: deleteError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.PLAN_IMAGES)
        .remove(filePaths);

      if (deleteError) {
        console.error('Error deleting plan images:', deleteError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting plan images:', error);
      return false;
    }
  }

  /**
   * Delete user avatar
   *
   * @param userId - The user ID
   * @returns Success status
   */
  static async deleteUserAvatar(userId: string): Promise<boolean> {
    try {
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.USER_AVATARS)
        .list(userId);

      if (listError) {
        console.error('Error listing user avatars:', listError);
        return false;
      }

      if (!files || files.length === 0) {
        return true; // No files to delete
      }

      const filePaths = files.map((file) => `${userId}/${file.name}`);
      const { error: deleteError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.USER_AVATARS)
        .remove(filePaths);

      if (deleteError) {
        console.error('Error deleting user avatars:', deleteError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting user avatars:', error);
      return false;
    }
  }

  /**
   * Create an image reference from a URL
   * Useful for handling both Supabase Storage URLs and external URLs (like Unsplash)
   *
   * @param url - The image URL
   * @param bucket - Optional bucket name if it's a storage URL
   * @param path - Optional path if it's a storage URL
   * @returns Image reference object
   */
  static createImageReference(
    url: string,
    bucket?: BucketName,
    path?: string
  ): ImageReference {
    const isStorageUrl = this.isSupabaseStorageUrl(url);

    return {
      url,
      isStorageUrl,
      bucket: isStorageUrl ? bucket : undefined,
      path: isStorageUrl ? path : undefined,
    };
  }

  /**
   * Check if a URL is a Supabase Storage URL
   *
   * @param url - The URL to check
   * @returns true if it's a Supabase Storage URL
   */
  static isSupabaseStorageUrl(url: string): boolean {
    return url.includes('supabase.co/storage/v1/object/public/');
  }

  /**
   * List all files in a bucket folder
   *
   * @param bucket - The bucket name
   * @param folder - The folder path
   * @returns List of file objects
   */
  static async listFiles(
    bucket: BucketName,
    folder: string
  ): Promise<{ name: string; url: string }[]> {
    try {
      const { data: files, error } = await supabaseAdmin.storage
        .from(bucket)
        .list(folder);

      if (error) {
        console.error('Error listing files:', error);
        return [];
      }

      if (!files || files.length === 0) {
        return [];
      }

      return files.map((file) => ({
        name: file.name,
        url: this.getPublicUrl(bucket, `${folder}/${file.name}`) || '',
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  // Private helper methods

  /**
   * Upload a file to a storage bucket
   *
   * @param bucket - The bucket name
   * @param path - The file path within the bucket
   * @param file - The file buffer
   * @param contentType - The MIME type
   * @returns Upload result
   */
  private static async uploadFile(
    bucket: BucketName,
    path: string,
    file: Buffer,
    contentType: string
  ): Promise<UploadResult> {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(path, file, {
          contentType,
          upsert: true, // Overwrite existing files
        });

      if (error) {
        console.error('Upload error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      const publicUrl = this.getPublicUrl(bucket, data.path);

      return {
        success: true,
        path: data.path,
        publicUrl: publicUrl || undefined,
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get file extension from MIME type
   *
   * @param mimeType - The MIME type
   * @returns File extension
   */
  private static getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };

    return extensions[mimeType] || 'jpg';
  }
}

export default StorageService;
