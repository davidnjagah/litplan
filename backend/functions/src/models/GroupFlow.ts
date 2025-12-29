/**
 * GroupFlow Data Model
 * Represents a multi-step nightlife experience (subcollection under cities)
 */

export interface GroupFlow {
  flowId: string; // e.g., 'nyc-flow-001'
  cityId: string;
  rank: number; // Ordering
  title: string; // e.g., 'Ultimate NYC Night Out'
  description: string; // e.g., 'Pre-game → Brooklyn Nets Game → Rooftop After-Party'
  duration: FlowDuration;
  steps: FlowStep[];
  pricing: FlowPricing;
  flags: FlowFlags;
  metadata: FlowMetadata;
}

export interface FlowDuration {
  totalHours: number; // e.g., 5
  startTime: string; // e.g., '18:00'
  endTime: string; // e.g., '23:00'
}

export interface FlowStep {
  stepNumber: number; // 1, 2, 3
  planId: string; // Reference to plan in plans collection
  title: string; // e.g., 'Pre-Game Drinks'
  venueName: string;
  duration: number; // Minutes
  thumbnail: string; // URL
}

export interface FlowPricing {
  totalEstimate: number; // In cents
  currency: string;
}

export interface FlowFlags {
  isWeekend: boolean;
  proOnly: boolean; // Always true for group flows
}

export interface FlowMetadata {
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  aiGenerated: boolean;
}

// Helper function to create a new group flow
export const createGroupFlow = (
  flowId: string,
  cityId: string,
  rank: number,
  title: string,
  description: string,
  totalHours: number,
  isWeekend: boolean
): GroupFlow => {
  const now = FirebaseFirestore.Timestamp.now();

  return {
    flowId,
    cityId,
    rank,
    title,
    description,
    duration: {
      totalHours,
      startTime: '18:00',
      endTime: '23:00',
    },
    steps: [],
    pricing: {
      totalEstimate: 0,
      currency: 'USD',
    },
    flags: {
      isWeekend,
      proOnly: true, // Group flows are always Pro only
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      aiGenerated: true,
    },
  };
};

// Helper function to add a step to a group flow
export const addStepToFlow = (
  flow: GroupFlow,
  planId: string,
  title: string,
  venueName: string,
  duration: number,
  thumbnail: string
): GroupFlow => {
  const step: FlowStep = {
    stepNumber: flow.steps.length + 1,
    planId,
    title,
    venueName,
    duration,
    thumbnail,
  };

  return {
    ...flow,
    steps: [...flow.steps, step],
    duration: {
      ...flow.duration,
      totalHours: flow.duration.totalHours + (duration / 60),
    },
  };
};

// Helper function to validate group flow data
export const validateGroupFlow = (flow: Partial<GroupFlow>): boolean => {
  if (!flow.flowId || !flow.cityId || !flow.title) {
    return false;
  }

  if (flow.rank && flow.rank < 1) {
    return false;
  }

  if (flow.steps && flow.steps.length > 0) {
    // Validate step numbers are sequential
    for (let i = 0; i < flow.steps.length; i++) {
      if (flow.steps[i].stepNumber !== i + 1) {
        return false;
      }
    }
  }

  return true;
};
