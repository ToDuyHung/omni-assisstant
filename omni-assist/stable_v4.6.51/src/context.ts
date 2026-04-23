/**
 * OmniAssist Context Verifier
 * Validates if the current UI state matches a guide step's requirements.
 */

import { findComplexElement } from './perception';

export interface ContextCondition {
  type: 'element' | 'path' | 'text' | 'heading';
  value: string;
  exact?: boolean;
}

export interface PageSignature {
  logic: 'AND' | 'OR';
  conditions: ContextCondition[];
}

export interface PageMatch {
  isValid: boolean;
  score: number;
  reason: string;
}

export class ContextVerifier {
  public static verify(signature: PageSignature): PageMatch {
    if (!signature.conditions || signature.conditions.length === 0) {
      return { isValid: true, score: 1, reason: 'No requirements' };
    }

    const details = signature.conditions.map(condition => {
      let matched = false;
      let score = 0;
      let reason = '';

      switch (condition.type) {
        case 'path':
          if (condition.exact) {
            matched = window.location.pathname === condition.value;
          } else {
            matched = window.location.pathname === condition.value || 
                      window.location.pathname.startsWith(condition.value);
          }
          score = matched ? 1 : 0;
          reason = matched ? `Matched path ${condition.value}` : 'Path mismatch';
          break;
        
        case 'element':
          // v4.6.34: Precision Selector Support
          let targetEl: HTMLElement | null = null;
          if (condition.value.startsWith('#') || condition.value.startsWith('.')) {
            try {
              targetEl = document.querySelector(condition.value) as HTMLElement;
            } catch (e) {}
          }
          
          if (!targetEl) {
            const match = findComplexElement(condition.value);
            targetEl = match?.element || null;
            score = match ? match.score : 0;
          } else {
            score = 1.0;
          }
          
          matched = !!targetEl;
          reason = targetEl ? `Found element: ${condition.value}` : `Missing element: ${condition.value}`;
          break;
        
        case 'text':
          matched = document.body.innerText.toLowerCase().includes(condition.value.toLowerCase());
          score = matched ? 0.8 : 0;
          reason = matched ? `Found text: "${condition.value}"` : 'Text not found';
          break;
          
        case 'heading':
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          // Fuzzier matching for headings
          const target = condition.value.toLowerCase();
          const match = headings.find(h => (h as HTMLElement).innerText.toLowerCase().includes(target));
          matched = !!match;
          score = matched ? 1 : 0;
          reason = matched ? `Found heading: "${condition.value}"` : 'Heading not found';
          break;
          
        default:
          matched = true;
          score = 1;
          reason = 'Unknown condition bypassed';
      }
      return { matched, score, reason };
    });

    if (signature.logic === 'OR') {
      const best = details.sort((a, b) => b.score - a.score)[0];
      return { 
        isValid: details.some(d => d.matched), 
        score: best.score, 
        reason: best.reason 
      };
    }

    const allMatched = details.every(d => d.matched);
    const avgScore = details.reduce((acc, d) => acc + d.score, 0) / details.length;
    const bestReason = details.sort((a, b) => b.score - a.score)[0]?.reason || 'Conditions met';
    
    return {
      isValid: allMatched,
      score: avgScore,
      reason: allMatched ? bestReason : details.find(d => !d.matched)?.reason || 'Validation failed'
    };
  }
}
