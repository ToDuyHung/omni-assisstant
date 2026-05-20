import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * OmniAssist Initialization
 * This creates a Shadow DOM host to isolate styles from the vendor website.
 */
const initOmniAssist = () => {
  // Polyfill for process (some libraries expect it)
  if (typeof (window as any).process === 'undefined') {
    (window as any).process = { env: { NODE_ENV: 'production' } };
  }

  const hostId = 'omni-assist-host';
  if (document.getElementById(hostId)) return;

  console.log('🚀 OmniAssist: Initializing SDK...');

  const host = document.createElement('div');
  host.id = hostId;
  // Ensure the host doesn't block interactions
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '0';
  host.style.height = '0';
  host.style.zIndex = '2147483647';
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });
  
  // Create a container for the React app
  const rootContainer = document.createElement('div');
  rootContainer.id = 'omni-root';
  shadowRoot.appendChild(rootContainer);

  // CRITICAL: Move styles into the Shadow DOM
  // Because vite-plugin-css-injected-by-js injects into document.head,
  // we need to copy those styles into the shadowRoot.
  const observer = new MutationObserver(() => {
    const styles = document.querySelectorAll('style[data-vite-dev-id], style[data-css-injected-by-js]');
    styles.forEach(style => {
      if (!shadowRoot.querySelector(`[data-id="${style.id || 'omni-style'}"]`)) {
        const clone = style.cloneNode(true) as HTMLElement;
        clone.setAttribute('data-id', style.id || 'omni-style');
        shadowRoot.appendChild(clone);
      }
    });
  });

  observer.observe(document.head, { childList: true });
  
  // Initial check for existing styles
  document.querySelectorAll('style').forEach(style => {
    if (style.textContent?.includes('.omni-glass')) {
      shadowRoot.appendChild(style.cloneNode(true));
    }
  });

  createRoot(rootContainer).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  
  console.log('✅ OmniAssist: Widget mounted in Shadow DOM.');
}

// Auto-init for demo purposes
if (document.readyState === 'complete') {
  initOmniAssist();
} else {
  window.addEventListener('load', initOmniAssist);
}

// Export for manual control
(window as any).OmniAssist = {
  init: initOmniAssist
};
