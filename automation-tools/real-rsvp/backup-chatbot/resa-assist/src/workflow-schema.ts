/**
 * OmniAssist Workflow Schema v1.0
 * Purely additive orchestration layer.
 */

export type ExecutionMode = 'auto' | 'assisted' | 'manual_confirm' | 'observe';

export interface WorkflowStep {
  id: string;           // Step instance ID
  actionId: string;     // References TaskConfig.id from Studio
  pageId: string;       // Page where this action lives
  title: string;        // Display name in workflow
  overrideValue?: any;  // Value to use instead of Studio's autoValue
  executionMode: ExecutionMode;
  expectedAction?: string;
  targetQuery?: string;
  locators?: any;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
  isPublished?: boolean;
}
