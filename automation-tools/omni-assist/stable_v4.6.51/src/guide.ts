import { findComplexElement, globalHighlighter, findNeighborInput, isVisible } from './perception';
import { type TaskConfig, type ActionNode, type PageConfig } from './schema';
import { defaultPersistence } from './persistence';
import { ContextVerifier } from './context';

export type GuideStatus = 'idle' | 'discovery' | 'proposing_task' | 'active' | 'executing_auto' | 'out_of_context';
export type InteractionMode = 'fill' | 'interact';

export interface GuideState {
  task: TaskConfig | null;
  step: ActionNode | null;
  index: number;
  status: GuideStatus;
  mode?: InteractionMode;
  event?: GuideTelemetry;
  matching?: {task: TaskConfig, match: any}[];
}

export interface GuideTelemetry {
  taskId: string;
  status: 'started' | 'completed' | 'failed' | 'stepped' | 'resumed' | 'interrupted';
  stepIndex: number;
  mode?: InteractionMode;
  timestamp: number;
}

export type GuideListener = (state: GuideState) => void;

export interface OmniLog {
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'engine' | 'perception' | 'navigation' | 'intelligence';
  message: string;
  data?: any;
}

export class GuideEngine {
  public currentTask: TaskConfig | null = null;
  public currentStepIndex: number = -1;
  public status: GuideStatus = 'idle';
  public interactionMode: InteractionMode | null = null;
  public matchingTasks: {task: TaskConfig, match: any}[] = [];
  public progress: number = 0;
  
  private listeners: GuideListener[] = [];

  constructor() {
    this.structuredLog('info', 'engine', 'OMNIASSIST SDK V4.6 - SECURE DIAGNOSTICS');
  }

  private structuredLog(level: OmniLog['level'], category: OmniLog['category'], message: string, data?: any) {
    if ((window as any).OMNI_DEBUG) {
       console.log(`%c[OMNIASSIST] [${category.toUpperCase()}] ${message}`, `color: ${level === 'error' ? 'red' : level === 'warn' ? 'orange' : 'inherit'}`);
    }
    console.log(`omni-sdk.js:24 [${category.toUpperCase()}] ${message} ${data ? JSON.stringify(data) : ''}`);
  }

  public addListener(listener: GuideListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(telemetry?: GuideTelemetry) {
    const state: GuideState = {
      task: this.currentTask,
      step: this.getCurrentStep(),
      index: this.currentStepIndex,
      status: this.status,
      mode: this.interactionMode || undefined,
      event: telemetry,
      matching: this.matchingTasks
    };
    this.listeners.forEach(l => l(state));
  }

  public discoverGuides(pages: PageConfig[]) {
    const currentPath = window.location.pathname;
    this.structuredLog('info', 'navigation', `Discovering guides for path: ${currentPath}`);
    
    // v4.6.27: Precision Page Discovery
    const sortedPages = [...pages].sort((a, b) => b.path.length - a.path.length);
    
    const activePage = sortedPages.find(p => {
      if (p.match) {
         const result = ContextVerifier.verify(p.match);
         this.structuredLog('debug', 'navigation', `Checking page: ${p.id} - isValid: ${result.isValid} (${result.reason})`);
         return result.isValid;
      }
      const match = currentPath === p.path || (p.path !== '/' && currentPath.startsWith(p.path));
      if (match) this.structuredLog('debug', 'navigation', `Matched page via path fallback: ${p.id}`);
      return match;
    });
    
    if (activePage) {
      this.structuredLog('info', 'navigation', `Active Page identified: ${activePage.name} (${activePage.id})`);
      this.matchingTasks = activePage.suggestedTasks.map(task => {
        return { task, match: { score: 1.0 } };
      });
      this.emit();
      return this.matchingTasks;
    }

    this.structuredLog('warn', 'navigation', 'No matching page config found for current context.');
    this.matchingTasks = [];
    this.emit();
    return [];
  }

  public selectTask(task: TaskConfig) {
    this.currentTask = task;
    this.status = 'proposing_task';
    this.emit();
  }

  public allowTask(overrides?: Record<string, string>) {
    if (!this.currentTask) return;
    this.startTask(this.currentTask, 'fill', overrides);
  }

  public startTask(task: TaskConfig, mode: InteractionMode = 'interact', overrides?: Record<string, string>) {
    this.currentTask = task;
    this.currentStepIndex = 0;
    this.status = mode === 'fill' ? 'executing_auto' : 'active';
    this.interactionMode = mode;
    this.progress = 0;
    
    this.structuredLog('info', 'engine', `Starting task: ${task.name} in ${mode} mode`);
    this.emit({ taskId: task.id, status: 'started', stepIndex: 0, mode, timestamp: Date.now() });

    if (mode === 'fill') {
      this.executeAutomatedFill(overrides);
    } else {
      this.runStep();
    }
    this.saveState();
  }

  private async executeAutomatedFill(overrides?: Record<string, string>) {
    if (!this.currentTask) return;

    try {
      for (let i = 0; i < this.currentTask.steps.length; i++) {
        const step = this.currentTask.steps[i];
        this.currentStepIndex = i;
        
        // Visual feedback before action
        globalHighlighter.hide();
        const elMatch = findComplexElement(step.targetQuery);
        if (elMatch) {
          // v4.6.32: Use resolveVisualTarget to highlight the container (Box) instead of just the text
          const visualTarget = globalHighlighter.resolveVisualTarget(elMatch.element);
          globalHighlighter.targetElement(visualTarget, this.currentTask.containerQuery, false);
        }
        
        this.emit(); 
        
        if (overrides && overrides[step.id]) {
          step.actionValue = overrides[step.id];
        }
        
        const success = await this.performAction(step);
        this.progress = Math.round(((i + 1) / this.currentTask.steps.length) * 100);
        this.emit();

        if (success) {
          await new Promise(r => setTimeout(r, 600));
          if (step.isNavigation) {
            await new Promise(r => setTimeout(r, 800));
          }
        } else {
          this.structuredLog('warn', 'engine', `Step ${i} failed: ${step.title}`);
        }
      }
    } catch (err) {
      this.structuredLog('error', 'engine', `Automation error: ${err}`);
    } finally {
      globalHighlighter.hide();
      this.status = 'idle';
      this.currentTask = null;
      this.currentStepIndex = -1;
      this.progress = 100;
      this.saveState();
      this.emit();
    }
  }

  private setValue(target: HTMLInputElement | HTMLTextAreaElement, val: string) {
    try {
      // v4.6.48: Correct prototype identification to avoid Illegal invocation
      const proto = target instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype :
                    target instanceof HTMLSelectElement ? window.HTMLSelectElement.prototype :
                    window.HTMLInputElement.prototype;

      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      
      target.focus();
      if (setter) {
        setter.call(target, val);
      } else {
        target.value = val;
      }
      
      // v4.6.38: Comprehensive Event Dispatch for React/Mui
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      target.dispatchEvent(new Event('blur', { bubbles: true }));
    } catch (e) {
      this.structuredLog('error', 'engine', `Value injection failed: ${e}`);
    }
  }

  public async performAction(step: ActionNode): Promise<boolean> {
    // v4.6.48: Resolve Root scope based on Task context
    let root: Element | Document = document;
    if (this.currentTask?.containerQuery) {
       const container = document.querySelector(this.currentTask.containerQuery);
       if (container) root = container;
    }

    const match = findComplexElement(step.targetQuery, root);
    if (!match) {
      this.structuredLog('warn', 'perception', `Target not found for step: ${step.targetQuery}`);
      return false;
    }

    const el = match.element;
    const val = step.actionValue || step.autoValue || '';

    if (step.expectedAction === 'click') {
      this.structuredLog('info', 'engine', `Performing click on ${step.targetQuery}`);
      const startUrl = window.location.href;
      const clickable = el.closest('button, a, [role="button"]') as HTMLElement || el;
      clickable.focus();
      const opts = { bubbles: true, cancelable: true, view: window };
      clickable.dispatchEvent(new MouseEvent('mousedown', opts));
      clickable.dispatchEvent(new MouseEvent('mouseup', opts));
      clickable.click();
      
      // v4.6.41: Clear highlight immediately on click to prevent persistence across pages
      globalHighlighter.hide();

      if (step.isNavigation) {
        const timeout = step.navigationTimeout || 2200;
        this.structuredLog('info', 'navigation', `Waiting ${timeout}ms for route change...`);
        setTimeout(() => {
          if (window.location.href === startUrl && this.status !== 'idle') {
             this.structuredLog('warn', 'navigation', 'Forcing navigation fallback');
             if (step.anchorPath) {
                this.status = 'idle';
                this.emit();
                window.location.assign(step.anchorPath);
             }
          }
        }, timeout);
      }
      return true;
    }

    if (step.expectedAction === 'input') {
      // v4.6.38: Use neighborhood search to find input near label
      let root: Element | Document = document;
      if (this.currentTask?.containerQuery) {
         const container = document.querySelector(this.currentTask.containerQuery);
         if (container) root = container;
      }

      const target = findNeighborInput(el, root as HTMLElement);
      if (target) {
        this.structuredLog('info', 'engine', `Performing input on ${step.targetQuery}`);
        this.setValue(target, val);
        return true;
      } else {
        this.structuredLog('warn', 'perception', `Input neighbor not found for ${step.targetQuery}`);
        return false;
      }
    }

    if (step.expectedAction === 'select') {
      this.structuredLog('info', 'engine', `Performing select on ${step.targetQuery}`);
      
      // v4.6.51: Precision Trigger Discovery (Support Sibling Labels in Grid layouts)
      const triggerSelector = step.triggerQuery || '.MuiSelect-select, [role="button"]';
      let trigger = el.closest('.MuiTextField-root, .MuiFormControl-root, .MuiInputBase-root')?.querySelector(triggerSelector) as HTMLElement;
      
      if (!trigger) {
         // Heuristic: Check immediate sibling or parent's siblings (Common in MUI Grid)
         trigger = el.nextElementSibling?.querySelector(triggerSelector) as HTMLElement || 
                   el.parentElement?.querySelector(triggerSelector) as HTMLElement;
      }

      if (!trigger) trigger = el.querySelector(triggerSelector) as HTMLElement || el;

      if (trigger) {
        this.structuredLog('info', 'engine', `Identified trigger: ${trigger.tagName}.${trigger.className.split(' ')[0]}`);
        trigger.focus();
        
        // v4.6.45: Full event simulation (Restored from stable v4.6.32)
        const opts = { bubbles: true, cancelable: true, view: window };
        const events = ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'click'];
        events.forEach(evt => {
           const Type = evt.startsWith('pointer') ? window.PointerEvent : window.MouseEvent;
           trigger.dispatchEvent(new Type(evt, opts));
        });

        // v4.6.45: For Autocomplete, also trigger an ArrowDown to force-open list
        if (trigger.tagName === 'INPUT' || trigger.querySelector('input')) {
           const input = (trigger.tagName === 'INPUT' ? trigger : trigger.querySelector('input')) as HTMLInputElement;
           input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }));
        }
        
        // v4.6.50: Small delay to let Portal mount before polling begins
        await new Promise(r => setTimeout(r, 200));
      }

      // v4.6.44: Robust Polling Loop (Restored from stable v4.6.32 logic)
      const startTime = Date.now();
      let targetOption: HTMLElement | null = null;
      const timeout = 2000;

      while (Date.now() - startTime < timeout) {
        // 1. Find all potential menu containers, sorted by relevance (Top-most first)
        const menuContainers = Array.from(document.querySelectorAll('.MuiPopover-root, .MuiMenu-root, .MuiAutocomplete-popper, [role="presentation"]'))
          .filter(c => isVisible(c))
          .sort((a, b) => {
             const zA = parseInt(window.getComputedStyle(a).zIndex) || 0;
             const zB = parseInt(window.getComputedStyle(b).zIndex) || 0;
             if (zB !== zA) return zB - zA;
             return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? 1 : -1;
          });

        // 2. Scan for items in ALL discovered containers
        const items: HTMLElement[] = [];
        menuContainers.forEach(container => {
           items.push(...Array.from(container.querySelectorAll('.MuiMenuItem-root, .MuiAutocomplete-option, [role="option"], li')) as HTMLElement[]);
        });

        // 3. Try to find the matching option
        targetOption = items.find(opt => {
           const text = opt.textContent?.trim().toLowerCase() || '';
           const targetVal = val.trim().toLowerCase();
           return text === targetVal || text.includes(targetVal);
        }) || null;

        // 4. If found and has size, we are good to go
        if (targetOption && targetOption.getBoundingClientRect().width > 0) break;
        
        await new Promise(r => setTimeout(r, 150));
      }

      if (targetOption) {
        targetOption.scrollIntoView({ block: 'nearest' });
        targetOption.click();
        this.structuredLog('info', 'engine', `Successfully selected option: ${val}`);
        return true;
      } else {
        // v4.6.44: Global Fallback with broad scan (v4.6.46: Included buttons for simple selectors)
        this.structuredLog('info', 'engine', `Menu option not found in polling, searching globally for: ${val}`);
        const allItems = Array.from(document.querySelectorAll('.MuiMenuItem-root, .MuiAutocomplete-option, [role="option"], li, button, [role="button"]'));
        const fallbackOption = allItems.find(opt => {
           const text = opt.textContent?.trim().toLowerCase() || '';
           const targetVal = val.trim().toLowerCase();
           return (text === targetVal || text.includes(targetVal)) && (opt as HTMLElement).offsetParent !== null;
        }) as HTMLElement;

        if (fallbackOption) {
           this.structuredLog('info', 'engine', `Successfully selected option via global fallback: ${val}`);
           fallbackOption.style.backgroundColor = 'rgba(25, 118, 210, 0.1)';
           fallbackOption.click();
           return true;
        }

        const globalMatch = findComplexElement(`text=${val}`);
        if (globalMatch && globalMatch.score > 0.8) {
           const clickable = globalMatch.element.closest('button, a, label, [role="button"]') as HTMLElement || globalMatch.element;
           clickable.click();
           return true;
        }

        const seen = Array.from(document.querySelectorAll('.MuiMenuItem-root, [role="option"], li')).slice(0, 3).map(e => e.textContent?.trim());
        this.structuredLog('warn', 'perception', `Could not find menu option: ${val}. Bot saw: ${seen.join(', ')}`);
        return false;
      }
    }

    return false;
  }

  public next() {
    if (!this.currentTask) return;
    this.currentStepIndex++;
    if (this.currentStepIndex >= this.currentTask.steps.length) {
      this.status = 'idle';
      this.currentTask = null;
      this.emit({ taskId: 'none', status: 'completed', stepIndex: -1, timestamp: Date.now() });
    } else {
      this.runStep();
    }
    this.saveState();
  }

  public stop() {
    this.status = 'idle';
    this.currentTask = null;
    this.currentStepIndex = -1;
    globalHighlighter.hide();
    this.saveState();
    this.emit();
  }

  public runStep() {
    const step = this.getCurrentStep();
    if (!step) return;
    this.emit();
    
    globalHighlighter.hide();
    const match = findComplexElement(step.targetQuery);
    if (match) {
      // v4.6.32: Use resolveVisualTarget to highlight the container (Box) instead of just the text
      const visualTarget = globalHighlighter.resolveVisualTarget(match.element);
      globalHighlighter.targetElement(visualTarget, this.currentTask?.containerQuery, true);
    }
  }

  private getCurrentStep() {
    if (!this.currentTask || this.currentStepIndex < 0) return null;
    return this.currentTask.steps[this.currentStepIndex];
  }

  private saveState() {
    defaultPersistence.save('state', {
      taskId: this.currentTask?.id || null,
      stepIndex: this.currentStepIndex,
      status: this.status,
      mode: this.interactionMode
    });
  }
}
