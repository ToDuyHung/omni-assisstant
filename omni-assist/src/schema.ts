/**
 * OmniAssist Project Schema v1.9
 * Stable Task-based Architecture.
 */

import { type PageSignature } from './context';

export type InteractionType = 'view' | 'click' | 'input' | 'select';

export interface ElementLocator {
  semantic?: string;      // primary: text=, id=, placeholder=, aria=
  dataId?: string;        // stable: data-testid, data-omni, data-action
  css?: string;           // secondary fallback
  hint?: string;          // human readable hint
  route?: string;         // navigation signal (href, path)
  role?: string;          // element role (button, link, etc)
  context?: string;       // contextual signal (parent header, section title)
  anchors?: string[];     // proximity signals (nearby text)
}

export interface ActionNode {
  id: string;
  title: string;
  instruction: string;
  targetQuery: string;    // backward compatibility
  locators?: ElementLocator; // high-fidelity bundle
  expectedAction: InteractionType;
  signature?: PageSignature;
  fallbackMessage?: string;
  anchorPath?: string;
  actionValue?: string;
  autoValue?: any;        // for automated fill
  options?: string[];     // for select dropdowns
  containerQuery?: string; // for highlighting a section
}

export interface TaskConfig {
  id: string;
  title: string;
  description: string;
  steps: ActionNode[];
  category?: 'navigation' | 'form' | 'info';
  containerQuery?: string; 
}

export interface PageConfig {
  id: string;
  name: string;
  path: string;
  signature?: PageSignature;
  tasks: TaskConfig[];
}

export interface ProjectSchema {
  version: string;
  projectId: string;
  projectName: string;
  pages: PageConfig[];
}
