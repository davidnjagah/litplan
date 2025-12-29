/**
 * Supabase Webhook Handler
 *
 * Handles Supabase Auth webhook events for user synchronization.
 *
 * @module api/webhooks/supabase
 * @since Sprint 6 Phase 2 - Supabase Auth Integration
 */

import { Router, Request, Response } from 'express';
import { UserService } from '../../services/prisma';
import { SupabaseWebhookPayload } from '../../types/supabase';

const router = Router();

/**
 * POST /webhooks/supabase
 * Handle Supabase Auth webhook events
 *
 * Supabase can send database webhooks when users are created/updated/deleted.
 * This allows us to keep our database in sync with Supabase Auth.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body as SupabaseWebhookPayload;

    console.log('Supabase webhook received:', {
      type: payload.type,
      table: payload.table,
      schema: payload.schema,
    });

    // Only process auth.users table events
    if (payload.table !== 'users' || payload.schema !== 'auth') {
      console.log('Ignoring webhook for non-auth table:', payload.table);
      res.status(200).json({ received: true, processed: false });
      return;
    }

    switch (payload.type) {
      case 'INSERT':
        // New user created in Supabase Auth
        console.log('New Supabase user created:', payload.record.id);
        // User will be created in our DB on first API call via loadUser middleware
        // We could optionally pre-create the user here:
        // await UserService.createUser({
        //   supabaseUserId: payload.record.id,
        //   email: payload.record.email,
        //   displayName: payload.record.raw_user_meta_data?.full_name,
        //   imageUrl: payload.record.raw_user_meta_data?.avatar_url,
        // });
        break;

      case 'UPDATE':
        // User updated in Supabase Auth
        const supabaseUserId = payload.record.id;
        const existingUser = await UserService.getUserBySupabaseId(supabaseUserId);

        if (existingUser) {
          // Update user in our database
          const updateData: { email?: string; displayName?: string; imageUrl?: string } = {};

          if (payload.record.email) {
            updateData.email = payload.record.email;
          }
          if (payload.record.raw_user_meta_data?.full_name) {
            updateData.displayName = payload.record.raw_user_meta_data.full_name;
          }
          if (payload.record.raw_user_meta_data?.avatar_url) {
            updateData.imageUrl = payload.record.raw_user_meta_data.avatar_url;
          }

          if (Object.keys(updateData).length > 0) {
            await UserService.updateUser(existingUser.id, updateData);
            console.log('Updated user from webhook:', supabaseUserId);
          }
        } else {
          console.log('User not found in our DB for update webhook:', supabaseUserId);
        }
        break;

      case 'DELETE':
        // User deleted in Supabase Auth
        const deletedSupabaseUserId = payload.old_record?.id;

        if (deletedSupabaseUserId) {
          const userToDelete = await UserService.getUserBySupabaseId(deletedSupabaseUserId);

          if (userToDelete) {
            await UserService.deleteUser(userToDelete.id);
            console.log('Deleted user from webhook:', deletedSupabaseUserId);
          } else {
            console.log('User not found in our DB for delete webhook:', deletedSupabaseUserId);
          }
        } else {
          console.log('No old_record.id in delete webhook payload');
        }
        break;

      default:
        console.log('Unhandled webhook type:', payload.type);
    }

    res.status(200).json({ received: true, processed: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 to prevent Supabase from retrying
    // Log the error for debugging
    res.status(200).json({
      received: true,
      processed: false,
      error: 'Webhook processing failed',
    });
  }
});

/**
 * GET /webhooks/supabase/health
 * Health check for webhook endpoint
 */
router.get('/health', (req: Request, res: Response): void => {
  res.json({
    success: true,
    message: 'Supabase webhook endpoint is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
