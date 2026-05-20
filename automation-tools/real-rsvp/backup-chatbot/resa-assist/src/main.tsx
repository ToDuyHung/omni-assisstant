import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ResaApp from './ResaApp'

const containerId = 'resa-assist-container';
let container = document.getElementById(containerId);

if (!container) {
  container = document.createElement('div');
  container.id = containerId;
  const shadowRoot = container.attachShadow({ mode: 'open' });
  const mountPoint = document.createElement('div');
  shadowRoot.appendChild(mountPoint);
  document.body.appendChild(container);
  
  createRoot(mountPoint).render(
    <StrictMode>
      <ResaApp />
    </StrictMode>
  );
  
  console.log('🤖 Resa Assist: Chatbot Agent mounted.');
}
