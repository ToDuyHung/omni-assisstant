/**
 * OmniAssist Intent Parser v1 (Refined for Flow Actions)
 */

export interface IntentResult {
  type: 'search' | 'navigate' | 'action' | 'unknown';
  parameters: Record<string, string>;
}

export class IntentIntelligence {
  public static parse(input: string): IntentResult {
    const text = input.toLowerCase().trim();

    // 1. Search Intent
    const searchMatch = text.match(/search\s+(?:request\s+)?(.+)/i) || 
                       text.match(/find\s+(.+)/i);
    if (searchMatch) {
      return {
        type: 'search',
        parameters: { query: searchMatch[1] }
      };
    }

    // 2. Action/Flow Intent (Map to discrete flows instead of direct navigation)
    if (text.includes('new request') || text.includes('create')) {
      return { type: 'action', parameters: { flowId: 'create-request-flow' } };
    }

    // 3. Navigation Intent
    if (text.includes('dashboard') || text.includes('home')) {
      return { type: 'navigate', parameters: { target: '/requests' } };
    }

    return { type: 'unknown', parameters: {} };
  }
}
