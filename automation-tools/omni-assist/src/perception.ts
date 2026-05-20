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
 * Multi-Signal Genetic Matching Engine (v5.6)
 */
export function findByStringQuery(query: string, action?: ActionNode): { element: HTMLElement; score: number } | null {
  // Support ID selector
  if (query.startsWith('id=')) {
    const id = query.replace('id=', '');
    const el = document.getElementById(id);
    if (el && isVisible(el)) return { element: el, score: 100 };
  }

  // Support CSS selector
  if (query.startsWith('css=')) {
    const selector = query.replace('css=', '');
    const el = document.querySelector(selector) as HTMLElement;
    if (el && isVisible(el)) return { element: el, score: 100 };
  }

  const loc = action?.locators;
  const rawTargetText = (loc?.semantic || query).replace('text=', '');
  const targetText = normalizeText(rawTargetText);
  const targetRole = loc?.role?.toUpperCase();

  const candidates = Array.from(document.querySelectorAll('button, a, input, select, textarea, label, span, div, p, b, strong, h1, h2, h3, h4, h5, h6, [role="button"], [role="combobox"]')) as HTMLElement[];
  let bestMatch: { element: HTMLElement; score: number } | null = null;

  for (const el of candidates) {
    if (!isVisible(el)) continue;
    if (el.id === 'omni-highlighter' || el.closest('.omni-root')) continue;

    let score = 0;
    const elText = normalizeText(el.textContent || '');
    const elPlaceholder = normalizeText(el.getAttribute('placeholder') || '');
    const elAria = normalizeText(el.getAttribute('aria-label') || '');
    
    const targetTextNoSpace = targetText.replace(/\s+/g, '');
    const directTextMatch = elText.includes(targetText) || 
                           elText.replace(/\s+/g, '').includes(targetTextNoSpace) ||
                           elPlaceholder.includes(targetText) || 
                           elAria.includes(targetText);
                           
    if (directTextMatch) {
      const isHeaderMatch = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName);
      const isPerfectMatch = (elText === targetText || elPlaceholder === targetText);
      score += isPerfectMatch ? 20.0 : 10.0;
      if (isHeaderMatch) score += 5.0;
      const densityBoost = (targetText.length / (elText.length || 1)) * 5.0;
      score += densityBoost;
    }

    let labelMatched = false;
    const elPrev = el.previousElementSibling;
    const elNext = el.nextElementSibling;
    if (
      (elPrev && normalizeText(elPrev.textContent || '').includes(targetText)) ||
      (elNext && normalizeText(elNext.textContent || '').includes(targetText))
    ) {
      labelMatched = true;
    }

    if (!labelMatched) {
      let scanEl: HTMLElement | null = el.parentElement;
      for (let i = 0; i < 3; i++) {
        if (!scanEl || scanEl.tagName === 'BODY' || scanEl.tagName === 'MAIN') break;
        if (scanEl.offsetHeight > 250) break;
        const isFieldContainer = scanEl.classList.contains('MuiFormControl-root') || 
                                 scanEl.classList.contains('MuiGrid-root') || 
                                 scanEl.classList.contains('MuiBox-root');
        if (isFieldContainer && normalizeText(scanEl.textContent || '').includes(targetText)) {
          labelMatched = true;
          break;
        }
        scanEl = scanEl.parentElement;
      }
    }
    
    if (labelMatched) score += 25.0; 

    if (targetRole) {
      const elRole = (el.getAttribute('role') || el.tagName).toUpperCase();
      if (elRole === targetRole) score += 15.0;
    }

    const rect = el.getBoundingClientRect();
    const area = rect.width * rect.height;
    const isInteractive = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) || 
                          el.hasAttribute('onClick') || 
                          window.getComputedStyle(el).cursor === 'pointer';

    if (isInteractive) score += 10.0; 

    if (area > 50000) score -= Math.min(20, (area / 100000) * 10);
    if (area < 5000) score += 2.0;

    if (score <= 10.0) continue;

    const resolved = resolveMeaningfulTarget(el);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { element: resolved, score: score };
    } else if (Math.abs(score - bestMatch.score) < 0.1) {
      const currentBestArea = bestMatch.element.getBoundingClientRect().width * bestMatch.element.getBoundingClientRect().height;
      if (area < currentBestArea) bestMatch = { element: resolved, score: score };
    }
  }

  return bestMatch;
}

export function generateLocatorBundle(el: HTMLElement): ElementLocator {
  const target = resolveMeaningfulTarget(el);
  const role = target.getAttribute('role') || target.tagName.toLowerCase();
  const contextEl = target.closest('section, [role="region"], div[id*="container"]')?.querySelector('h1, h2, h3, h4, h5, h6, b, strong');
  const context = contextEl?.textContent?.trim().substring(0, 50) || undefined;

  const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
  const isSelect = target.getAttribute('role') === 'combobox' || 
                   target.classList.contains('MuiSelect-select') || 
                   target.classList.contains('MuiInputBase-root');

  let hintText = '';
  if (isInput || isSelect) {
    // 1. Placeholder (Important for Search)
    const placeholder = target.getAttribute('placeholder') || 
                        target.querySelector('input')?.getAttribute('placeholder');
    if (placeholder) hintText = placeholder;

    // 2. Aria Label
    if (!hintText) {
      hintText = target.getAttribute('aria-label') || 
                 target.querySelector('input')?.getAttribute('aria-label') || '';
    }

    // 3. Search for Label via aria-labelledby
    if (!hintText) {
      const labelledBy = target.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelEl = document.getElementById(labelledBy.split(' ')[0]);
        if (labelEl) hintText = labelEl.textContent?.trim() || '';
      }
    }

    // 4. Search for Label via for attribute
    if (!hintText && target.id) {
      const labelEl = document.querySelector(`label[for="${target.id}"]`);
      if (labelEl) hintText = labelEl.textContent?.trim() || '';
    }
    
    // 5. Final fallback for Search specifically
    if (!hintText && (target.id?.toLowerCase().includes('search') || role.includes('search'))) {
      hintText = 'Search';
    }
  }

  if (!hintText) {
    const cloned = target.cloneNode(true) as HTMLElement;
    Array.from(cloned.children).forEach(child => child.remove());
    hintText = cloned.innerText.trim().split('\n')[0].substring(0, 40);
    if (!hintText) hintText = target.innerText.split('\n')[0].substring(0, 40).trim();
  }

  return {
    semantic: hintText ? `text=${hintText}` : undefined,
    hint: hintText || target.tagName.toLowerCase(),
    role: isSelect ? 'combobox' : role,
    context: context
  };
}

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
 * Visual Element Highlighter (v3.0) with Premium Animation
 */
class VisualHighlighter {
  private overlay: HTMLElement;
  private targetEl: HTMLElement | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'omni-highlighter';

    if (!document.getElementById('omni-highlighter-style')) {
      const style = document.createElement('style');
      style.id = 'omni-highlighter-style';
      style.textContent = `
        @keyframes omni-pulse-premium {
          0% { transform: scale(1); box-shadow: 0 0 0 0px rgba(25, 118, 210, 0.4); border-color: rgba(25, 118, 210, 1); }
          50% { transform: scale(1.03); box-shadow: 0 0 20px 5px rgba(25, 118, 210, 0.3); border-color: rgba(25, 118, 210, 0.6); }
          100% { transform: scale(1); box-shadow: 0 0 0 0px rgba(25, 118, 210, 0.4); border-color: rgba(25, 118, 210, 1); }
        }
      `;
      document.head.appendChild(style);
    }

    Object.assign(this.overlay.style, {
      position: 'fixed',
      border: '2px solid #1976d2',
      backgroundColor: 'rgba(25, 118, 210, 0.08)',
      borderRadius: '8px',
      pointerEvents: 'none',
      zIndex: '2147483647',
      display: 'none',
      animation: 'omni-pulse-premium 1.5s infinite ease-in-out',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      boxSizing: 'border-box'
    });
    document.body.appendChild(this.overlay);

    window.addEventListener('scroll', () => this.refresh(), true);
    window.addEventListener('resize', () => this.refresh(), true);
  }

  private refresh() {
    if (this.targetEl && this.overlay.style.display !== 'none') {
      const rect = this.targetEl.getBoundingClientRect();
      const padding = 6;
      Object.assign(this.overlay.style, {
        top: `${rect.top - padding}px`,
        left: `${rect.left - padding}px`,
        width: `${rect.width + (padding * 2)}px`,
        height: `${rect.height + (padding * 2)}px`
      });
    }
  }

  public highlight(el: HTMLElement | null) {
    if (!el) { this.clear(); return; }
    this.targetEl = el;
    this.overlay.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.refresh();
  }

  public clear() {
    this.targetEl = null;
    this.overlay.style.display = 'none';
  }
}

export const visualHighlighter = new VisualHighlighter();

export class StudioInspector {
  private active = false;
  private onStepCaptured: (step: ActionNode) => void;
  constructor(onStepCaptured: (step: ActionNode) => void) { this.onStepCaptured = onStepCaptured; }
  public start() { this.active = true; document.addEventListener('click', this.handleClick, true); document.addEventListener('input', this.handleInput, true); }
  public stop() { this.active = false; document.removeEventListener('click', this.handleClick, true); document.removeEventListener('input', this.handleInput, true); }

  private handleClick = (e: MouseEvent) => {
    if (!this.active) return;
    const originalTarget = e.target as HTMLElement;
    if (originalTarget.id === 'omni-assist-host' || originalTarget.closest('.omni-root')) return;

    const meaningfulTarget = resolveMeaningfulTarget(originalTarget);
    const locators = generateLocatorBundle(meaningfulTarget);
    visualHighlighter.highlight(meaningfulTarget);
    
    this.onStepCaptured({
      id: `step-${Date.now()}`,
      title: `Click ${locators.hint}`,
      instruction: `Click on ${locators.hint}`,
      targetQuery: locators.semantic || 'css:body',
      locators,
      expectedAction: 'click'
    });
  };

  private inputBuffer: Map<HTMLElement, { id: string; timer: any }> = new Map();

  private handleInput = (e: Event) => {
    if (!this.active) return;
    const target = e.target as HTMLInputElement;
    if (target.closest('.omni-root')) return;

    const buffer = this.inputBuffer.get(target);
    if (buffer) clearTimeout(buffer.timer);

    const timer = setTimeout(() => {
      const meaningfulTarget = resolveMeaningfulTarget(target);
      const locators = generateLocatorBundle(meaningfulTarget);
      visualHighlighter.highlight(meaningfulTarget);
      
      this.onStepCaptured({
        id: buffer?.id || `step-${Date.now()}`,
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
