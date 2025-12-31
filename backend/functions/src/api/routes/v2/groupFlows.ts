/**
 * V2 Group Flows Routes
 *
 * API endpoints for group flow operations using Prisma and Supabase authentication.
 *
 * @module api/routes/v2/groupFlows
 * @since Sprint 5 Phase 4 - API Migration to Prisma + Clerk
 * @updated Sprint 6 Phase 2 - Supabase Auth Integration
 * @updated Sprint 9 - Removed UserActivity tracking, using ViewedCity only
 */

import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  requireProWithUser,
} from '../../../middleware';
import {
  GroupFlowService,
} from '../../../services/prisma';

const router = Router();

/**
 * GET /api/v2/group-flows/:flowId
 * Get group flow details with steps (auth required, pro only)
 */
router.get(
  '/:flowId',
  requireProWithUser,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { flowId } = req.params;

      // Try to find by legacy flowId first (e.g., 'nyc-flow-001')
      let groupFlow = await GroupFlowService.getGroupFlowByLegacyId(flowId);

      // If not found, try by primary ID (cuid)
      if (!groupFlow) {
        groupFlow = await GroupFlowService.getGroupFlowById(flowId);
      }

      if (!groupFlow) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Group flow not found',
          },
        });
        return;
      }

      // Get the group flow with all steps and plans
      const groupFlowWithSteps = await GroupFlowService.getGroupFlowWithSteps(groupFlow.id);

      if (!groupFlowWithSteps) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Group flow not found',
          },
        });
        return;
      }

      // Sprint 9: Flow view activity removed - using ViewedCity tracking only

      res.json({
        success: true,
        data: {
          groupFlow: groupFlowWithSteps,
          stepsCount: groupFlowWithSteps.steps.length,
        },
      });
    } catch (error) {
      console.error('Error fetching group flow:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch group flow',
        },
      });
    }
  }
);

export default router;
