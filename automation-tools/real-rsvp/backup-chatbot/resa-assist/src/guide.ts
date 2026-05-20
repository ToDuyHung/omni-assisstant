import { findByStringQuery, visualHighlighter, testAndHighlight } from './perception';
import type { TaskConfig, ActionNode } from './schema';

export type GuideStatus = 'idle' | 'discovery' | 'proposing_task' | 'active' | 'executing_auto' | 'out_of_context';

export interface GuideState {
  status: GuideStatus;
  activeTask?: TaskConfig;
  currentStepIndex: number;
}

export class GuideEngine {
  private state: GuideState = { status: 'idle', currentStepIndex: 0 };
  private listeners: ((state: GuideState) => void)[] = [];

  constructor() {
    console.log('%c[OMNIASSIST] [ENGINE] OMNIASSIST SDK V5.6 - GOLDEN RESTORE', 'color: #1976d2; font-weight: bold; background: #e3f2fd; padding: 2px 5px; border-radius: 3px;');
    (window as any).OMNI_DEBUG = this;
    this.stop(); // Reset state on every init/re-init
  }

  public testAndHighlight(hint: string, role?: string) {
    return testAndHighlight(hint, role);
  }

  private structuredLog(_level: 'info' | 'error' | 'warn', category: string, message: string, data?: any) {
    console.log(`[OMNIASSIST] [${category.toUpperCase()}] ${message}`, data || '');
  }

  public onStateChange(listener: (state: GuideState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.state));
  }

  public async startTask(task: TaskConfig) {
    this.structuredLog('info', 'engine', `Starting task: ${task.title} (${task.steps.length} steps)`);
    this.state = {
      status: 'active',
      activeTask: task,
      currentStepIndex: 0
    };
    this.notify();
    this.highlightCurrentStep();
  }

  public stop() {
    this.structuredLog('info', 'engine', 'Stopping current task and returning to idle.');
    this.state = { 
      status: 'idle', 
      currentStepIndex: 0,
      activeTask: undefined 
    };
    visualHighlighter.clear();
    this.notify();
  }

  private highlightCurrentStep() {
    if (!this.state.activeTask) return;
    const step = this.state.activeTask.steps[this.state.currentStepIndex];
    const match = findByStringQuery(step.targetQuery, step);

    if (match) {
      visualHighlighter.highlight(match.element);
    } else {
      visualHighlighter.clear();
    }
  }

  public async performAction(step: ActionNode, value?: any) {
    this.state.status = 'executing_auto';
    this.notify();

    const match = findByStringQuery(step.targetQuery, step);
    if (!match) {
      this.state.status = 'active';
      this.notify();
      this.structuredLog('error', 'engine', `Target not found: ${step.title}`);
      throw new Error(`Target not found: ${step.title}`);
    }

    const target = match.element;

    // Resolve to the actual leaf element for input/select actions if target is a container
    let actionTarget: HTMLElement = target;
    if (['input', 'select'].includes(step.expectedAction) && target.tagName === 'DIV') {
      const leaf = target.querySelector('input, textarea, select') as HTMLElement;
      if (leaf) actionTarget = leaf;
    }

    try {
      switch (step.expectedAction) {
        case 'click':
          this.robustClick(target);
          break;
        case 'input':
          this.setValue(actionTarget as HTMLInputElement, value !== undefined ? value : step.autoValue);
          break;
        case 'select':
          await this.selectOption(target, value !== undefined ? value : step.autoValue); // select often needs to click the DIV
          break;
      }

      this.state.currentStepIndex++;
      const totalSteps = this.state.activeTask?.steps.length || 0;
      
      this.structuredLog('info', 'engine', `Step completed. Index: ${this.state.currentStepIndex}/${totalSteps}`);

      if (this.state.currentStepIndex >= totalSteps) {
        this.structuredLog('info', 'engine', 'All steps completed. Stopping engine.');
        this.stop();
      } else {
        this.state.status = 'active'; // Move back from executing_auto to active
        this.notify();
        this.highlightCurrentStep();
      }
    } catch (err) {
      this.state.status = 'active'; // Recovery
      this.notify();
      this.structuredLog('error', 'engine', `Action failed: ${step.title}`, err);
      throw err;
    }
  }

  private async setValue(el: HTMLElement, value: string) {
    this.structuredLog('info', 'engine', `Setting value: ${value}`);

    // Find the real input/textarea/select
    let input = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') 
      ? el as HTMLInputElement 
      : el.querySelector('input, textarea, select') as HTMLInputElement;

    // Special case for MUI DatePicker where el might be the container or a sibling label/icon
    if (!input) {
      const container = el.closest('.MuiFormControl-root, .MuiInputBase-root, .MuiBox-root');
      if (container) {
        input = container.querySelector('input, textarea, select') as HTMLInputElement;
      }
    }

    if (!input) {
      this.structuredLog('error', 'engine', 'No input element found to set value');
      return;
    }

    try {
      input.focus();
      
      // Use native setter to bypass React's internal value tracking
      const nativeSetter = Object.getOwnPropertyDescriptor(
        input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 
        'value'
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(input, value);
      } else {
        input.value = value;
      }

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.blur();
    } catch (err) {
      console.error("[OMNI] setValue failed:", err);
    }
  }

  private robustClick(target: HTMLElement) {
    this.structuredLog('info', 'engine', `Performing robust click on: ${target.tagName}`);

    const events = ['mousedown', 'mouseup', 'click'];
    events.forEach(name => {
      target.dispatchEvent(new MouseEvent(name, {
        bubbles: true,
        cancelable: true,
        view: window,
        buttons: 1
      }));
    });

    // Explicitly focus for accessibility and potential focus-based handlers
    target.focus();
  }

  private async selectOption(trigger: HTMLElement, optionText: string) {
    this.structuredLog('info', 'engine', `Attempting to select option: ${optionText}`);

    // Find the actual clickable part (MUI often has a button role inside the container)
    const actualTrigger = trigger.getAttribute('role') === 'button' || trigger.getAttribute('role') === 'combobox' 
      ? trigger 
      : (trigger.querySelector('[role="button"], [role="combobox"], .MuiSelect-select') as HTMLElement) || trigger;

    // 1. Open the dropdown with robust sequence
    const events = ['mousedown', 'mouseup', 'click'];
    events.forEach(name => {
      actualTrigger.dispatchEvent(new MouseEvent(name, { bubbles: true, cancelable: true, view: window }));
    });
    actualTrigger.focus();

    // Wait for portal to render
    await new Promise(r => setTimeout(r, 600));

    // 2. Find the option in portals/menus
    const options = Array.from(document.querySelectorAll('.MuiMenuItem-root, [role="option"], li')) as HTMLElement[];
    console.log(`[OMNI] [DEBUG] Found ${options.length} potential options in DOM`);

    const targetOption = options.find(opt => {
      const text = opt.textContent?.trim() || '';
      return text.toLowerCase() === optionText.toLowerCase();
    });

    if (targetOption) {
      this.structuredLog('info', 'engine', `Found target option, clicking: ${targetOption.textContent}`);
      targetOption.click();
    } else {
      // Log what we found to debug
      const foundTexts = options.map(o => o.textContent?.trim()).filter(Boolean);
      this.structuredLog('error', 'engine', `Option "${optionText}" not found. Available: ${foundTexts.join(', ')}`);

      // Close menu if still open
      document.body.click();
    }
  }
}

export const guideEngine = new GuideEngine();
