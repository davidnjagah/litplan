/**
 * Storage Routes (v2)
 *
 * Sprint 6 Phase 4: Storage Migration
 * Provides endpoints for image upload operations.
 * These endpoints are primarily for admin use.
 *
 * @module api/routes/v2/storage
 */

import { Router, Request, Response } from 'express';
import {
  StorageService,
  STORAGE_BUCKETS,
  ALLOWED_IMAGE_TYPES,
  type AllowedImageType,
} from '../../../services/supabase/StorageService';
import {
  requireAuthWithUser,
  requireProWithUser,
  type AuthenticatedRequest,
} from '../../../middleware/supabaseAuth';

const router = Router();

/**
 * Helper to collect raw body from request
 */
async function collectBody(req: AuthenticatedRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * POST /api/v2/storage/city/:cityId
 * Upload a city image
 *
 * Headers:
 *   Content-Type: image/jpeg, image/png, image/webp, or image/gif
 *   X-Image-Type: 'hero' or 'card' (optional, defaults to 'hero')
 *
 * Body: Raw image binary
 *
 * @route POST /api/v2/storage/city/:cityId
 * @access Admin only (TODO: implement admin check)
 */
router.post('/city/:cityId', requireAuthWithUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { cityId } = req.params;
    const contentType = req.headers['content-type'] as AllowedImageType;
    const imageType = (req.headers['x-image-type'] as 'hero' | 'card') || 'hero';

    // Validate content type
    if (!contentType || !ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type',
        message: `Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      });
    }

    // Get raw body
    const fileBuffer = await collectBody(req);

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
        message: 'Request body must contain image data',
      });
    }

    // Upload the image
    const result = await StorageService.uploadCityImage(
      cityId,
      fileBuffer,
      contentType,
      imageType
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        path: result.path,
        publicUrl: result.publicUrl,
        bucket: STORAGE_BUCKETS.CITY_IMAGES,
        imageType,
      },
    });
  } catch (error) {
    console.error('Error uploading city image:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to upload city image',
    });
  }
});

/**
 * POST /api/v2/storage/plan/:planId
 * Upload a plan image
 *
 * Headers:
 *   Content-Type: image/jpeg, image/png, image/webp, or image/gif
 *   X-Image-Index: number (optional, defaults to 0)
 *
 * Body: Raw image binary
 *
 * @route POST /api/v2/storage/plan/:planId
 * @access Admin only (TODO: implement admin check)
 */
router.post('/plan/:planId', requireAuthWithUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId } = req.params;
    const contentType = req.headers['content-type'] as AllowedImageType;
    const imageIndex = parseInt(req.headers['x-image-index'] as string) || 0;

    // Validate content type
    if (!contentType || !ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type',
        message: `Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      });
    }

    // Get raw body
    const fileBuffer = await collectBody(req);

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
        message: 'Request body must contain image data',
      });
    }

    // Upload the image
    const result = await StorageService.uploadPlanImage(
      planId,
      fileBuffer,
      contentType,
      imageIndex
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        path: result.path,
        publicUrl: result.publicUrl,
        bucket: STORAGE_BUCKETS.PLAN_IMAGES,
        imageIndex,
      },
    });
  } catch (error) {
    console.error('Error uploading plan image:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to upload plan image',
    });
  }
});

/**
 * POST /api/v2/storage/avatar
 * Upload user avatar
 *
 * Headers:
 *   Content-Type: image/jpeg, image/png, or image/webp
 *
 * Body: Raw image binary
 *
 * @route POST /api/v2/storage/avatar
 * @access Pro users only
 */
router.post('/avatar', requireProWithUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.supabaseUserId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID not found',
      });
    }

    const contentType = req.headers['content-type'] as AllowedImageType;

    // Validate content type (avatars don't support GIF)
    const avatarAllowedTypes: AllowedImageType[] = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!contentType || !avatarAllowedTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type',
        message: `Allowed types for avatars: ${avatarAllowedTypes.join(', ')}`,
      });
    }

    // Get raw body
    const fileBuffer = await collectBody(req);

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
        message: 'Request body must contain image data',
      });
    }

    // Delete existing avatar first
    await StorageService.deleteUserAvatar(userId);

    // Upload the new avatar
    const result = await StorageService.uploadUserAvatar(userId, fileBuffer, contentType);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        path: result.path,
        publicUrl: result.publicUrl,
        bucket: STORAGE_BUCKETS.USER_AVATARS,
      },
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to upload avatar',
    });
  }
});

/**
 * DELETE /api/v2/storage/avatar
 * Delete user avatar
 *
 * @route DELETE /api/v2/storage/avatar
 * @access Pro users only
 */
router.delete('/avatar', requireProWithUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.supabaseUserId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID not found',
      });
    }

    const success = await StorageService.deleteUserAvatar(userId);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete avatar',
      });
    }

    return res.json({
      success: true,
      message: 'Avatar deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete avatar',
    });
  }
});

/**
 * GET /api/v2/storage/city/:cityId
 * List city images
 *
 * @route GET /api/v2/storage/city/:cityId
 * @access Public
 */
router.get('/city/:cityId', async (req: Request, res: Response) => {
  try {
    const { cityId } = req.params;
    const files = await StorageService.listFiles(STORAGE_BUCKETS.CITY_IMAGES, cityId);

    return res.json({
      success: true,
      data: {
        cityId,
        images: files,
      },
    });
  } catch (error) {
    console.error('Error listing city images:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to list city images',
    });
  }
});

/**
 * GET /api/v2/storage/plan/:planId
 * List plan images
 *
 * @route GET /api/v2/storage/plan/:planId
 * @access Public
 */
router.get('/plan/:planId', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const files = await StorageService.listFiles(STORAGE_BUCKETS.PLAN_IMAGES, planId);

    return res.json({
      success: true,
      data: {
        planId,
        images: files,
      },
    });
  } catch (error) {
    console.error('Error listing plan images:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to list plan images',
    });
  }
});

/**
 * GET /api/v2/storage/info
 * Get storage configuration info
 *
 * @route GET /api/v2/storage/info
 * @access Public
 */
router.get('/info', (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      buckets: {
        cityImages: STORAGE_BUCKETS.CITY_IMAGES,
        planImages: STORAGE_BUCKETS.PLAN_IMAGES,
        userAvatars: STORAGE_BUCKETS.USER_AVATARS,
      },
      allowedMimeTypes: ALLOWED_IMAGE_TYPES,
      maxFileSizes: {
        cityImage: '5MB',
        planImage: '5MB',
        userAvatar: '2MB',
      },
    },
  });
});

export default router;
