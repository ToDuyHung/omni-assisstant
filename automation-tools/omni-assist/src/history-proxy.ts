/**
 * OmniAssist Agnostic History Proxy
 * Intercepts SPA navigation and popstate events.
 */

type NavHandler = (pathname: string) => void;

class HistoryProxy {
  private handlers: NavHandler[] = [];

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    const wrap = (type: 'pushState' | 'replaceState') => {
      const original = history[type];
      return (...args: any[]) => {
        // @ts-ignore
        const result = original.apply(history, args);
        this.notify();
        return result;
      };
    };

    history.pushState = wrap('pushState');
    history.replaceState = wrap('replaceState');

    window.addEventListener('popstate', () => this.notify());
  }

  private notify() {
    const path = window.location.pathname;
    this.handlers.forEach(handler => handler(path));
  }

  public onNavChange(handler: NavHandler) {
    this.handlers.push(handler);
    // Trigger immediately for initial state
    handler(window.location.pathname);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }
}

export const navigationObserver = new HistoryProxy();
