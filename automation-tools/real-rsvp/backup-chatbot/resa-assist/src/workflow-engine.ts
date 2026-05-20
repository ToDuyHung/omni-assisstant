/**
 * OmniAssist Workflow Engine (Adapter)
 * Orchestrates multiple Studio actions into a seamless business flow.
 */

import { guideEngine } from './guide';
import { ContextVerifier } from './context';
import { BUSINESS_SITE_SCHEMA } from './schema-data';
import { studioConfig } from './persistence';
import type { Workflow, WorkflowStep } from './workflow-schema';
import type { TaskConfig } from './schema';

export type WorkflowStatus = 'idle' | 'waiting_for_page' | 'executing_step' | 'completed' | 'failed';

export interface WorkflowState {
  status: WorkflowStatus;
  currentStepIndex: number;
  message: string;
}

const configManager = studioConfig(BUSINESS_SITE_SCHEMA);

export class WorkflowEngine {
  private workflow: Workflow | null = null;
  private currentStepIndex = 0;
  private status: WorkflowStatus = 'idle';
  private message = '';
  private listeners: Set<(state: WorkflowState) => void> = new Set();
  private checkInterval: any = null;

  constructor() {
    console.log('%c[OMNI] [WORKFLOW] Engine Initialized', 'background: #4f46e5; color: white; padding: 2px 5px;');
  }

  onStateChange(cb: (state: WorkflowState) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getActiveWorkflow() {
    return this.workflow;
  }

  private notify() {
    const state: WorkflowState = {
      status: this.status,
      currentStepIndex: this.currentStepIndex,
      message: this.message
    };
    this.listeners.forEach(l => l(state));
  }

  async start(workflow: Workflow) {
    this.workflow = workflow;
    this.currentStepIndex = 0;
    this.status = 'waiting_for_page';
    this.message = 'Starting workflow...';
    this.notify();
    this.process();
  }

  stop() {
    this.status = 'idle';
    this.message = 'Stopped';
    if (this.checkInterval) clearInterval(this.checkInterval);
    guideEngine.stop();
    this.notify();
  }

  private async process() {
    if (!this.workflow || this.currentStepIndex >= this.workflow.steps.length) {
      this.status = 'completed';
      this.message = 'Workflow finished successfully!';
      this.notify();
      return;
    }

    const step = this.workflow.steps[this.currentStepIndex];
    this.status = 'waiting_for_page';
    this.message = `Waiting for page: ${step.pageId}`;
    this.notify();

    // 1. Search in STATIC SCHEMA
    const staticPage = BUSINESS_SITE_SCHEMA.pages.find(p => p.id === step.pageId);
    let task = staticPage?.tasks.find(t => t.id === step.actionId);

    // 2. Search in STUDIO STORAGE if not found
    if (!task) {
      const studioPages = configManager.getPages();
      const studioPage = studioPages.find(p => p.id === step.pageId);
      task = studioPage?.tasks.find(t => t.id === step.actionId);
    }

    // 3. Fallback to step metadata if still not found
    if (!task && step.targetQuery) {
      task = {
        id: step.actionId,
        title: step.title,
        description: '',
        category: 'form',
        steps: [{
          id: 's1',
          title: step.title,
          instruction: step.title,
          targetQuery: (step as any).targetQuery,
          expectedAction: (step as any).expectedAction || 'click', 
          locators: (step as any).locators,
          autoValue: (step as any).overrideValue
        }]
      };
    }

    if (!task) {
      this.status = 'failed';
      this.message = `Configuration error: Action ${step.actionId} not found in Schema or Studio.`;
      this.notify();
      return;
    }

    // Polling for page signature match (Use either static or studio page if found)
    const targetPage = staticPage || configManager.getPages().find(p => p.id === step.pageId);
    
    if (this.checkInterval) clearInterval(this.checkInterval);
    
    this.checkInterval = setInterval(async () => {
      const match = targetPage?.signature ? ContextVerifier.verify(targetPage.signature) : { isValid: true };
      
      if (match.isValid) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
        await this.executeStep(step, task!);
      }
    }, 1000);
  }
 
  private async executeStep(workflowStep: WorkflowStep, taskTemplate: TaskConfig) {
    this.status = 'executing_step';
    this.message = `Executing: ${workflowStep.title}`;
    this.notify();

    // Prepare task with overrides
    const taskToRun: TaskConfig = JSON.parse(JSON.stringify(taskTemplate));
    if (workflowStep.overrideValue !== undefined && taskToRun.steps.length > 0) {
      const targetStep = taskToRun.steps.find(s => ['input', 'select'].includes(s.expectedAction)) || taskToRun.steps[0];
      targetStep.autoValue = workflowStep.overrideValue;
    }

    try {
      guideEngine.startTask(taskToRun);

      const cleanup = guideEngine.onStateChange((guideState) => {
        if (guideState.status === 'idle' && !guideState.activeTask) {
          cleanup();
          this.currentStepIndex++;
          this.process();
        }
      });

      if (workflowStep.executionMode === 'auto') {
        setTimeout(() => {
          this.autoTriggerAll(taskToRun, workflowStep.overrideValue);
        }, 500);
      }

    } catch (err) {
      this.status = 'failed';
      this.message = `Execution failed: ${err}`;
      this.notify();
    }
  }

  private async autoTriggerAll(task: TaskConfig, overrideValue?: any) {
    for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];
        try {
            const val = overrideValue !== undefined ? overrideValue : step.autoValue;
            await guideEngine.performAction(step, val);
            await new Promise(r => setTimeout(r, 800));
        } catch (e) {
            console.error("Auto trigger failed at step", i, e);
            break;
        }
    }
  }
}

export const workflowEngine = new WorkflowEngine();
