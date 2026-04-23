import type { ActionNode, ElementLocator } from './schema';

/**
 * Normalizes text for comparison (lowercase, single spaces, no special chars)
 */
const normalizeText = (text: string): string => {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
};

/**
 * Standard Visibility Check
 */
export const isVisible = (el: HTMLElement | null | undefined): boolean => {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  
  // MUI Radios/Checkboxes often have 0 width/height or no offsetParent but are interactive
  if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox')) {
    return true;
  }
  
  return el.offsetParent !== null;
};

/**
 * Meaningful Ancestor Resolution
 * Finds the most logical interactive element or semantic container
 */
export function resolveMeaningfulTarget(el: HTMLElement): HTMLElement {
  // 1. If it's already an interactive shell, return it
  if (
    el.getAttribute('role') === 'combobox' || 
    el.classList.contains('MuiSelect-select') || 
    el.classList.contains('MuiInputBase-root')
  ) {
    return el;
  }

  // 2. If it's a leaf input, find its shell
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
    const shell = el.closest('[role="combobox"], .MuiSelect-select, .MuiInputBase-root, .MuiOutlinedInput-root') as HTMLElement;
    if (shell) return shell;
    return el;
  }

  // 3. Handle Label -> Input mapping
  if (el.tagName === 'LABEL') {
    const forId = el.getAttribute('for') || el.getAttribute('htmlFor');
    if (forId) {
      const input = document.getElementById(forId);
      if (input) return resolveMeaningfulTarget(input as HTMLElement);
    }
  }

  // 4. Scan up for the "Highest Interactive Container"
  let current: HTMLElement | null = el;
  let highestInteractive = el;
  
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const isClickable = current.hasAttribute('onClick') || 
                        current.tagName === 'BUTTON' ||
                        current.tagName === 'A' ||
                        style.cursor === 'pointer' ||
                        ['button', 'link', 'combobox', 'menuitem', 'tab'].includes(current.getAttribute('role') || '');

    // Stop if parent is too big (likely a layout container)
    if (current.offsetHeight > 800 || current.tagName === 'MAIN' || current.tagName === 'BODY' || current.id === 'root') break;

    if (isClickable) {
      highestInteractive = current;
    }
    
    // Stop if we found a clear interactive shell (button, link, input) 
    if (['BUTTON', 'A', 'LI', 'SELECT', 'INPUT'].includes(current.tagName) || current.getAttribute('role') === 'button') break;

    current = current.parentElement;
  }

  // 5. CRITICAL: Never return the layout roots as meaningful targets
  if (['BODY', 'HTML', 'MAIN', 'SECTION'].includes(highestInteractive.tagName) || highestInteractive.id === 'root') {
    return el; 
  }

  // POST-RESOLUTION POLISH: If the resolved target is purely numeric or too small, 
  // try to find its parent button/link if not already found.
  const text = highestInteractive.innerText.trim();
  const isNumeric = /^\d+$/.test(text);
  if ((isNumeric || text.length <= 2) && highestInteractive.tagName !== 'INPUT') {
    const parentInteractive = highestInteractive.closest('button, a, [role="button"], [role="link"], [role="menuitem"], [role="tab"]') as HTMLElement;
    if (parentInteractive) return parentInteractive;
  }

  return highestInteractive;
}

/**
 * Multi-Signal Genetic Matching Engine (v5.9)
 * Contextual + Structural + Semantic Matching
 */
export function findByStringQuery(query: string, action?: ActionNode): { element: HTMLElement; score: number } | null {
  // Support ID selector (High Priority)
  if (query.startsWith('id=')) {
    const id = query.replace('id=', '');
    const el = document.getElementById(id);
    if (el && isVisible(el)) return { element: el, score: 100 };
  }

  // Support CSS selector (High Priority)
  if (query.startsWith('css=')) {
    const selector = query.replace('css=', '');
    const el = document.querySelector(selector) as HTMLElement;
    if (el && isVisible(el)) return { element: el, score: 100 };
  }

  const loc = action?.locators;
  const rawTargetText = (loc?.semantic || query).replace('text=', '');
  const targetText = normalizeText(rawTargetText);
  const targetRole = loc?.role?.toUpperCase();
  const targetContext = loc?.context?.toLowerCase();

  console.log(`[OMNI] [PERCEPTION] Match Attempt: "${targetText}" [Role: ${targetRole || 'any'}] [Context: ${targetContext || 'any'}]`);

  // Scan all potential candidates
  const candidates = Array.from(document.querySelectorAll('button, a, input, select, textarea, label, span, div, p, [role="button"], [role="combobox"]')) as HTMLElement[];
  let bestMatch: { element: HTMLElement; score: number } | null = null;

  for (const el of candidates) {
    if (!isVisible(el)) continue;
    
    // EXCLUDE OMNI'S OWN UI
    if (el.id === 'omni-highlighter' || el.closest('.omni-root')) continue;

    let score = 0;
    const elText = normalizeText(el.textContent || '');
    const elPlaceholder = normalizeText(el.getAttribute('placeholder') || '');
    const elAria = normalizeText(el.getAttribute('aria-label') || '');
    
    // --- SIGNAL 1: TEXT MATCH (Direct) ---
    // Flexible match: if it contains a space, also try matching without spaces (for badge cases like "1Discover")
    const targetTextNoSpace = targetText.replace(/\s+/g, '');
    const directTextMatch = elText.includes(targetText) || 
                           elText.replace(/\s+/g, '').includes(targetTextNoSpace) ||
                           elPlaceholder.includes(targetText) || 
                           elAria.includes(targetText);
    if (directTextMatch) {
      const isHeading = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName) || 
                         el.classList.contains('MuiTypography-h6') || 
                         el.classList.contains('MuiTypography-subtitle1');
                         
      const matchBonus = (elText === targetText || elPlaceholder === targetText) ? 10.0 : 5.0;
      const headingBoost = isHeading ? 10.0 : 0;
      const densityBoost = (targetText.length / (elText.length || 1)) * 5.0;
      
      score += matchBonus + headingBoost + densityBoost;
    }

    // --- SIGNAL 2: LABEL PROXIMITY (Indirect Text Match) ---
    let labelMatched = false;
    
    // 1. Check direct siblings
    const elPrev = el.previousElementSibling;
    const elNext = el.nextElementSibling;
    if (
      (elPrev && elPrev.textContent?.toLowerCase().includes(targetText)) ||
      (elNext && elNext.textContent?.toLowerCase().includes(targetText))
    ) {
      labelMatched = true;
    }

    // 2. Check parents and their text (The "Section Match")
    if (!labelMatched) {
      let scanEl: HTMLElement | null = el.parentElement;
      for (let i = 0; i < 3; i++) {
        if (!scanEl || scanEl.tagName === 'BODY' || scanEl.tagName === 'MAIN') break;
        
        // Stop if container is too large - likely a layout container, not a field container
        if (scanEl.offsetHeight > 150) break;

        // If we are in a field-level container, check its text
        const isFieldContainer = scanEl.classList.contains('MuiFormControl-root') || 
                                 scanEl.classList.contains('MuiGrid-root') || 
                                 scanEl.classList.contains('MuiBox-root');
                                 
        if (isFieldContainer) {
          if (scanEl.textContent?.toLowerCase().includes(targetText)) {
            labelMatched = true;
            break;
          }
        }
        scanEl = scanEl.parentElement;
      }
    }
    
    if (labelMatched) {
      // ONLY boost for form elements, NOT buttons
      const isFormEl = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.getAttribute('role') === 'combobox';
      if (isFormEl) {
        score += 30.0; 
      }
    }

    // --- SIGNAL 5: ROUTE MATCH (+5.0 boost) ---
    if (loc?.route) {
      const elHref = el.getAttribute('href') || el.closest('a')?.getAttribute('href') || '';
      if (elHref && (elHref === loc.route || elHref.endsWith(loc.route))) {
        score += 5.0;
      }
    }

    // --- SIGNAL 6: INTERACTIVE BIAS ---
    const rect = el.getBoundingClientRect();
    const area = rect.width * rect.height;
    const isInteractive = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) || 
                          el.hasAttribute('onClick') || 
                          window.getComputedStyle(el).cursor === 'pointer';

    if (isInteractive) {
      score += 10.0; 
    }

    // --- SIGNAL 7: SIZE PENALTY (Smaller is better) ---
    // Penalize very large elements (likely layout containers)
    if (area > 50000) { // Approx 220x220
      const penalty = Math.min(20, (area / 100000) * 5);
      score -= penalty;
    }
    
    // Tiny boost for small elements (leaf nodes)
    if (area < 5000) {
      score += 2.0;
    }

    if (score <= 10.0) continue;

    // Prefilter: If action is input/click, ensure we resolve to the meaningful interactive part
    const resolved = resolveMeaningfulTarget(el);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { element: resolved, score: score };
    } else if (Math.abs(score - bestMatch.score) < 0.1) {
      // Tie-breaker: smaller area wins
      const currentBestArea = bestMatch.element.getBoundingClientRect().width * bestMatch.element.getBoundingClientRect().height;
      if (area < currentBestArea) {
        bestMatch = { element: resolved, score: score };
      }
    }
  }

  // CRITICAL: Strict Threshold
  if (bestMatch && bestMatch.score < 10.0) {
    console.warn(`[OMNI] [PERCEPTION] Best match ${bestMatch.element.tagName} score too low (${bestMatch.score.toFixed(1)} < 10.0). REJECTED.`);
    return null;
  }

  if (bestMatch) {
    console.log(`[OMNI] [PERCEPTION] Best Match: ${bestMatch.element.tagName}#${bestMatch.element.id} [Score: ${bestMatch.score.toFixed(1)}]`);
  }

  return bestMatch;
}

/**
 * Genetic Locator Generation
 */
export function generateLocatorBundle(el: HTMLElement): ElementLocator {
  const target = resolveMeaningfulTarget(el);

  // Identify Route (href or closest path)
  const route = target.getAttribute('href') || target.closest('a')?.getAttribute('href') || undefined;

  // Identify Role
  const role = target.getAttribute('role') || target.tagName.toLowerCase();

  // Identify Context (Nearby Header)
  const contextEl = target.closest('section, [role="region"], div[id*="container"]')?.querySelector('h1, h2, h3, h4, h5, h6, b, strong');
  const context = contextEl?.textContent?.trim().substring(0, 50) || undefined;

  // Identify Semantic Text
  const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
  const isSelect = target.getAttribute('role') === 'combobox' || 
                   target.classList.contains('MuiSelect-select') || 
                   target.classList.contains('MuiInputBase-root') ||
                   target.classList.contains('MuiInputBase-input') ||
                   target.id.startsWith('menu-') || // MUI Menu Backdrop
                   (target.getAttribute('role') === 'button' && target.closest('.MuiFormControl-root') !== null);

  console.log(`[OMNI] [PERCEPTION] Identifying: ${target.tagName}#${target.id} [Role: ${role}] [isInput: ${isInput}] [isSelect: ${isSelect}]`);
  
  let hintText = '';

  if (isInput || isSelect) {
    // 1. Try explicit aria-labelledby (Split to handle multiple IDs)
    const labelledBy = target.getAttribute('aria-labelledby');
    if (labelledBy) {
      const ids = labelledBy.split(/\s+/);
      for (const id of ids) {
        const labelEl = document.getElementById(id);
        if (labelEl) {
          const text = labelEl.textContent?.trim() || '';
          // Avoid picking up the current value if it's part of the labels
          if (text && text !== target.innerText.trim()) {
            hintText = text;
            break;
          }
        }
      }
    }

    // 2. Try 'for' attribute
    if (!hintText && target.id) {
      const labelEl = document.querySelector(`label[for="${target.id}"]`);
      if (labelEl) hintText = labelEl.textContent?.trim() || '';
    }

    // 3. Try proximity/container label (Common in MUI)
    if (!hintText) {
      const formControl = target.closest('.MuiFormControl-root, .field-container, .form-group, .MuiBox-root');
      const labelEl = formControl?.querySelector('label, .MuiFormLabel-root, .MuiInputLabel-root, [id*="label"]');
      if (labelEl) hintText = labelEl.textContent?.trim() || '';
    }
    
    // 4. Try Preceding Sibling (Common for generic labels)
    if (!hintText) {
      const prev = target.previousElementSibling || target.parentElement?.previousElementSibling;
      if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'P')) {
        hintText = prev.textContent?.trim() || '';
      }
    }

    // 5. Try sibling label (MUI pattern)
    if (!hintText) {
      const container = target.closest('.MuiFormControl-root, .MuiBox-root, [class*="container"]') || target.parentElement;
      if (container) {
        // ONLY look for actual label elements
        const labelEl = container.querySelector('label, [class*="Label"], [id*="label"], .MuiFormLabel-root');
        if (labelEl && labelEl !== target) {
          hintText = labelEl.textContent?.trim() || '';
        }
      }
    }

    // 6. Try placeholder or aria-label
    if (!hintText) {
      hintText = target.getAttribute('placeholder') || target.getAttribute('aria-label') || target.getAttribute('title') || '';
    }

    // CRITICAL: If still no hint for an input/select, mark it as unresolved
    if (!hintText) {
      console.log(`[OMNI] [PERCEPTION] Semantic label NOT found for form control. Mark as unresolved.`);
      hintText = '(Unresolved Label)';
    } else {
      console.log(`[OMNI] [PERCEPTION] Semantic label found: "${hintText}"`);
    }
  }

  if (!hintText) {
    console.log(`[OMNI] [PERCEPTION] Falling back to generic text mining...`);
    // Only fallback to innerText for generic elements (Buttons, Links, Divs)
    const cloned = target.cloneNode(true) as HTMLElement;
    Array.from(cloned.children).forEach(child => child.remove());
    hintText = cloned.innerText.trim().split('\n')[0].substring(0, 40);
    
    if (!hintText) {
       hintText = target.innerText.split('\n')[0].substring(0, 40).trim();
    }
    
    // If the first line is numeric or too short, try to join with next line
    if (/^\d+$/.test(hintText) || hintText.length <= 2) {
      const fullText = target.innerText.replace(/\n/g, ' ').trim();
      if (fullText.length > hintText.length) {
        hintText = fullText.substring(0, 40);
      }
    }
  }

  // --- SIMPLIFIED SEMANTIC STRATEGY ---
  const semanticAnchor = hintText;

  return {
    semantic: semanticAnchor ? `text=${semanticAnchor}` : undefined,
    dataId: target.getAttribute('data-testid') || target.getAttribute('data-omni') || undefined,
    css: undefined,
    hint: hintText || target.tagName.toLowerCase(),
    route: route || undefined,
    role: isSelect ? 'combobox' : role,
    context: context
  };
}

/**
 * Utility for Human-in-the-loop: Tests if a specific hint/text finds the target
 */
export function testAndHighlight(hint: string, role?: string) {
  if (!hint) return null;
  const match = findByStringQuery(`text=${hint}`, role as any);
  if (match) {
    visualHighlighter.highlight(match.element);
    return match.element;
  }
  return null;
}

/**
 * Visual Element Highlighter (v2.0)
 * Provides dynamic tracking and auto-scroll
 */
class VisualHighlighter {
  private overlay: HTMLElement;
  private targetEl: HTMLElement | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'omni-highlighter';

    // Inject pulse animation
    if (!document.getElementById('omni-highlighter-style')) {
      const style = document.createElement('style');
      style.id = 'omni-highlighter-style';
      style.textContent = `
        @keyframes omni-highlight-pulse {
          0% { border-color: rgba(25, 118, 210, 1); box-shadow: 0 0 10px rgba(25, 118, 210, 0.4); }
          50% { border-color: rgba(25, 118, 210, 0.6); box-shadow: 0 0 20px rgba(25, 118, 210, 0.2); }
          100% { border-color: rgba(25, 118, 210, 1); box-shadow: 0 0 10px rgba(25, 118, 210, 0.4); }
        }
      `;
      document.head.appendChild(style);
    }

    Object.assign(this.overlay.style, {
      position: 'fixed',
      border: '2px solid #1976d2',
      backgroundColor: 'rgba(25, 118, 210, 0.05)',
      borderRadius: '4px',
      pointerEvents: 'none',
      zIndex: '2147483647',
      display: 'none',
      animation: 'omni-highlight-pulse 2s infinite ease-in-out',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 0 10px rgba(25, 118, 210, 0.3)',
      boxSizing: 'border-box'
    });
    document.body.appendChild(this.overlay);

    // Listen to scroll and resize events globally
    window.addEventListener('scroll', () => this.refresh(), true);
    window.addEventListener('resize', () => this.refresh(), true);
  }

  private refresh() {
    if (this.targetEl && this.overlay.style.display !== 'none') {
      const rect = this.targetEl.getBoundingClientRect();
      // Add 4px padding around the element
      const padding = 4;
      Object.assign(this.overlay.style, {
        top: `${rect.top - padding}px`,
        left: `${rect.left - padding}px`,
        width: `${rect.width + (padding * 2)}px`,
        height: `${rect.height + (padding * 2)}px`
      });
    }
  }

  public highlight(el: HTMLElement | null) {
    if (!el) {
      this.clear();
      return;
    }

    console.log(`[OMNI] [UI] Highlighting: ${el.tagName}#${el.id}`);
    this.targetEl = el;
    this.overlay.style.display = 'block';

    // Auto-scroll first
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Initial positioning
    this.refresh();

    // Fallback for smooth scroll duration
    const start = Date.now();
    const step = () => {
      this.refresh();
      if (Date.now() - start < 1000) { // Track for 1s during scroll
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  public clear() {
    this.targetEl = null;
    this.overlay.style.display = 'none';
  }
}

export const visualHighlighter = new VisualHighlighter();

/**
 * Studio Inspector - Captures interactions for Workflow Recording
 */
export class StudioInspector {
  private active = false;
  private onStepCaptured: (step: ActionNode) => void;

  constructor(onStepCaptured: (step: ActionNode) => void) {
    this.onStepCaptured = onStepCaptured;
  }

  public start() {
    this.active = true;
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('input', this.handleInput, true);
    console.log('[OMNIASSIST] [STUDIO] Inspector started.');
  }

  public stop() {
    this.active = false;
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('input', this.handleInput, true);
    console.log('[OMNIASSIST] [STUDIO] Inspector stopped.');
  }

  private handleClick = (e: MouseEvent) => {
    if (!this.active) return;
    
    // 1. FIRST DEFENSE: If clicking Omni's own UI, ignore immediately
    const originalTarget = e.target as HTMLElement;
    if (originalTarget.id === 'omni-assist-host' || originalTarget.closest('.omni-root')) return;

    const target = originalTarget;
    const now = Date.now();
    
    const meaningfulTarget = resolveMeaningfulTarget(target);
    const locators = generateLocatorBundle(meaningfulTarget);
    
    // Highlight the captured target immediately so the user sees what Omni caught
    visualHighlighter.highlight(meaningfulTarget);
    
    console.log(`[OMNI] [STUDIO] Captured: ${meaningfulTarget.tagName} (Hint: ${locators.hint})`);
    
    // ACTION CONSOLIDATION: Check if this is a click on an option
    const isOption = target.classList.contains('MuiMenuItem-root') || target.getAttribute('role') === 'option';
    const last = this.lastStep;
    if (isOption && last && (last.expectedAction === 'click' || last.expectedAction === 'select')) {
      const optionText = target.textContent?.trim() || '';
      
      // SCRAPE OPTIONS: Find siblings in the same menu
      const menuContainer = target.closest('[role="listbox"], .MuiMenu-list, .MuiPaper-root');
      const allOptions = menuContainer ? Array.from(menuContainer.querySelectorAll('[role="option"], .MuiMenuItem-root'))
        .map(el => (el as HTMLElement).textContent?.trim() || '')
        .filter(t => t.length > 0) : [];

      // Update the previous step to be a 'select' action
      this.onStepCaptured({
        ...last,
        title: `Select in ${last.locators?.hint || '(Unresolved Label)'}`,
        instruction: `Select ${optionText}`,
        expectedAction: 'select',
        autoValue: optionText,
        options: allOptions.length > 0 ? allOptions : undefined
      });
      return;
    }

    const newStep: ActionNode = {
      id: `step-${now}`,
      title: `Click ${locators.hint}`,
      instruction: `Click on ${locators.hint}`,
      targetQuery: locators.semantic || 'css:body',
      locators,
      expectedAction: 'click'
    };

    // Provide visual feedback during recording
    visualHighlighter.highlight(meaningfulTarget);
    setTimeout(() => visualHighlighter.clear(), 800);

    this.onStepCaptured(newStep);
    this.lastStep = newStep;
  };

  private lastStep: ActionNode | null = null;

  private inputBuffer: Map<HTMLElement, { id: string; timer: any }> = new Map();

  private handleInput = (e: Event) => {
    if (!this.active) return;
    const target = e.target as HTMLInputElement;

    // CRITICAL: Ignore inputs from Omni's own UI
    if (target.id === 'omni-assist-host' || target.closest('.omni-root')) return;

    const buffer = this.inputBuffer.get(target);
    if (buffer) {
      clearTimeout(buffer.timer);
    }

    const timer = setTimeout(() => {
      const meaningfulTarget = resolveMeaningfulTarget(target);
      const locators = generateLocatorBundle(meaningfulTarget);
      
      const stepId = buffer?.id || `step-${Date.now()}`;
      
      this.onStepCaptured({
        id: stepId,
        title: `Type into ${locators.hint}`,
        instruction: `Fill out ${locators.hint}`,
        targetQuery: locators.semantic || 'css:body',
        locators,
        expectedAction: 'input',
        autoValue: target.value
      });
      
      this.inputBuffer.delete(target);
    }, 800);

    this.inputBuffer.set(target, { id: buffer?.id || `step-${Date.now()}`, timer });
  };
}
