/**
 * OmniAssist Perception Engine v2 (Advanced Observer)
 */

export interface SemanticMatch {
  element: HTMLElement;
  score: number; // 0 to 1
  reason: string;
}

export interface HighlightOptions {
  color?: string;
  duration?: number;
}

/**
 * Heuristic matching for agnostic DOM discovery.
 */
export const findComplexElement = (query: string, root: Element | Document = document): SemanticMatch | null => {
  if (!query) return null;
  
  // Helper to normalize text for comparison
  const clean = (t: string) => t.toLowerCase().replace(/[\*\:\s\u00a0]+/g, ' ').trim();

  // Helper to calculate DOM depth (v4.6.28)
  const getDepth = (el: Element): number => {
    let depth = 0;
    let parent = el.parentElement;
    while (parent) {
      depth++;
      parent = parent.parentElement;
    }
    return depth;
  };

  let q = query.toLowerCase();
  let isExact = false;

  // Prefix handling (v4.6.22)
  if (q.startsWith('text=')) {
    q = clean(q.substring(5));
    isExact = true;
  } else if (q.startsWith('placeholder=')) {
    q = clean(q.substring(12));
    isExact = true;
  } else {
    q = q.trim();
  }

  const results: SemanticMatch[] = [];

  // Scorer helper
  const add = (el: Element, score: number, reason: string) => {
    results.push({ element: el as HTMLElement, score, reason });
  };

  // v4.6.48: Root-scoped element search
  const allElements = root.querySelectorAll('button, a, input, textarea, [role="button"], [role="link"], [role="textbox"], div, span, label, p, h1, h2, h3, h4, h5, h6');
  
  allElements.forEach(el => {
    const text = el.textContent?.trim().toLowerCase() || '';
    const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
    const rawPlaceholder = (el as HTMLInputElement).placeholder || '';
    const placeholder = clean(rawPlaceholder);
    const id = el.id?.toLowerCase() || '';
    const name = el.getAttribute('name')?.toLowerCase() || '';
    const style = window.getComputedStyle(el);
    const isClickable = style.cursor === 'pointer' || el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button';

    // v4.6.39: Noise Filtering (Ignore Header/TopBar noise)
    if (el.closest('.MuiAppBar-root, .MuiBreadcrumbs-root, header, nav, #top-bar')) {
       return;
    }

    // Scoring Rules
    let score = 0;
    let reason = '';

    if (isExact) {
      const cText = clean(text);
      const cAria = clean(ariaLabel);
      const cPlaceholder = clean(placeholder);
      if (cText === q || cAria === q || cPlaceholder === q) {
        score = 1.0;
        reason = `Explicit exact match via ${cText === q ? 'text' : 'aria/placeholder'}`;
      }
    } else if (text === q || ariaLabel === q || placeholder === q || id === q || id === q.replace(/^#/, '')) {
      // v4.6.35: Explicit support for # prefixed IDs in fuzzy matches
      score = 1.0;
      reason = `Exact match via ${text === q ? 'text' : placeholder === q ? 'placeholder' : 'id/label'}`;
    } else if (id && (id === q || id === q.replace(/^#/, ''))) {
      score = 1.0;
      reason = 'Matched via primary ID selector';
    } else if (text.includes(q)) {
      score = 0.8;
      reason = 'Partial text match';
    } else if (ariaLabel.includes(q)) {
      score = 0.7;
      reason = 'Partial ARIA-label match';
    } else if (placeholder.includes(q)) {
      score = 0.6;
      reason = 'Partial placeholder match';
    } else if (id.includes(q.replace(/^#/, '')) || name.includes(q)) {
      score = 0.4;
      reason = 'Matched via ID or Name attribute';
    }

    if (score > 0) {
      // Bonus: Prefer clickable/input elements if scores are close
      // v4.6.28: Increased interaction bonus to separate buttons from container divs
      if (isClickable || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
         score += (el.tagName === 'BUTTON' || el.tagName === 'A') ? 0.15 : 0.05;
      }
      
      // v4.6.39: Semantic Tag bonus
      if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LABEL'].includes(el.tagName)) {
        score -= 0.05; // Slightly penalize static text tags to prefer actual inputs if scores are identical
      }

      add(el, Math.min(score, 1.0), reason);
    }
  });

  if (results.length === 0) return null;

  // v4.6.28: Sort by score DESC, then by Depth DESC (Deeper is better), then by document order
  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return getDepth(b.element) - getDepth(a.element);
  })[0];
};

/**
 * v4.6.38: Neighborhood Input Discovery
 * Find an input/textarea near a label if it's not a direct child/ancestor
 */
// v4.6.49: Standard Visibility Check (Used globally)
export const isVisible = (target: Element | null | undefined): boolean => {
  if (!target) return false;
  const el = target as HTMLElement;
  const style = window.getComputedStyle(el);
  const rects = el.getClientRects();
  
  const hasSize = rects.length > 0;
  const isDisplayVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  
  // offsetParent is null if element or its ancestors are display:none
  const isFixed = style.position === 'fixed';
  const hasOffset = el.offsetParent !== null || isFixed;
  
  return hasSize && isDisplayVisible && hasOffset;
};

export function findNeighborInput(el: HTMLElement, root: HTMLElement = document.body): HTMLInputElement | HTMLTextAreaElement | null {
  // 1. Check if el itself is an input (e.g. matched placeholder)
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return el as any;

  // 2. Check inner children (visible only)
  const inner = el.querySelector('input:not([type="hidden"]), textarea');
  if (isVisible(inner)) return inner as any;

  // 4. Search in neighborhood (common in Mui Grid/TextField)
  let curr: HTMLElement | null = el;
  for (let i = 0; i < 5; i++) { // v4.6.42: Extended to 5 levels for deep MUI structures
    if (!curr) break;
    
    // Check if curr is already a container for an input
    const neighbor = curr.querySelector('input:not([type="hidden"]), textarea');
    if (isVisible(neighbor)) return neighbor as any;
    
    // Check immediate siblings and their children
    const nextInput = curr.nextElementSibling?.querySelector('input, textarea');
    if (isVisible(nextInput)) return nextInput as any;

    const prevInput = curr.previousElementSibling?.querySelector('input, textarea');
    if (isVisible(prevInput)) return prevInput as any;
    
    curr = curr.parentElement;
    if (curr === root) break; // Stop if we go outside our container
  }

  return null;
}

/**
 * Visual Highlighter
 */
class Highlighter {
  private overlay: HTMLElement;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'omni-sticky-overlay';
    Object.assign(this.overlay.style, {
      position: 'fixed',
      zIndex: '2147483647',
      pointerEvents: 'none',
      border: '2px solid #1976d2',
      borderRadius: '4px',
      boxShadow: '0 0 15px rgba(25, 118, 210, 0.5)',
      opacity: '0',
      transition: 'opacity 0.3s ease, transform 0.1s ease',
      display: 'none'
    });
    
    // Pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes omni-pulse-ring {
        0% { transform: scale(0.95); opacity: 0.8; }
        50% { transform: scale(1.05); opacity: 0.4; }
        100% { transform: scale(0.95); opacity: 0.8; }
      }
      #omni-sticky-overlay::after {
        content: "";
        position: absolute;
        top: -10px; left: -10px; right: -10px; bottom: -10px;
        border: 2px solid #1976d2;
        border-radius: 8px;
        animation: omni-pulse-ring 2s infinite;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.overlay);
  }

  // v4.6.32: Helper to resolve text labels to their parent containers for better visual highlighting
  public resolveVisualTarget(el: HTMLElement): HTMLElement {
    // v4.6.41: Minimalist - If it's already interactive (button/input), don't go to parents
    const isInteractive = el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'A' || el.closest('.MuiButton-root, [role="button"]');
    if (isInteractive) return el;

    const container = el.closest('.MuiTextField-root, .MuiInputBase-root, .MuiFormControl-root') as HTMLElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      // v4.6.41: Restrict height and width to avoid layout wrappers
      if (rect.width > window.innerWidth * 0.5 || rect.height > 150) {
        return el;
      }
      return container;
    }
    return el;
  }

  public targetElement(el: HTMLElement | null, containerQuery?: string, isSection = false) {
    if (!el) {
      this.hide();
      return;
    }

    let targetEl = el;
    if (containerQuery) {
        try {
          const container = document.querySelector(containerQuery);
          if (container instanceof HTMLElement) targetEl = container;
        } catch (e) {}
    }

    const rect = targetEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // v4.6.40: Restore Section Tinting Logic
    if (isSection) {
      this.overlay.style.borderWidth = '4px';
      this.overlay.style.borderColor = 'rgba(25, 118, 210, 0.3)';
      this.overlay.style.boxShadow = 'inset 0 0 80px rgba(25, 118, 210, 0.15)';
      this.overlay.style.backgroundColor = 'rgba(25, 118, 210, 0.03)';
    } else {
      this.overlay.style.borderWidth = '2px';
      this.overlay.style.borderColor = '#1976d2';
      this.overlay.style.boxShadow = '0 0 15px rgba(25, 118, 210, 0.5)';
      this.overlay.style.backgroundColor = 'transparent';
    }

    Object.assign(this.overlay.style, {
      display: 'block',
      opacity: '1',
      top: `${rect.top - 4}px`,
      left: `${rect.left - 4}px`,
      width: `${rect.width + 8}px`,
      height: `${rect.height + 8}px`,
    });
  }

  public hide() {
    this.overlay.style.opacity = '0';
    setTimeout(() => {
      if (this.overlay.style.opacity === '0') {
        this.overlay.style.display = 'none';
      }
    }, 300);
  }
}

export const globalHighlighter = new Highlighter();
