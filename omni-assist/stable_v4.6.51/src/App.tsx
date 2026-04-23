import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { X, Zap, Send, Cpu, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { GuideEngine, type GuideStatus } from './guide'
import { IntentIntelligence } from './intent'
import { BUSINESS_SITE_SCHEMA, type TaskConfig, type ActionNode } from './schema'
import { globalHighlighter, findComplexElement } from './perception'

function App() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false);
  const [intentInput, setIntentInput] = useState('');
  
  // Assistant State
  const [activeTask, setActiveTask] = useState<TaskConfig | null>(null);
  const [activeStep, setActiveStep] = useState<ActionNode | null>(null);
  const [status, setStatus] = useState<GuideStatus>('idle');
  const [matchingTasks, setMatchingTasks] = useState<{task: TaskConfig, match: any}[]>([]);
  
  // Form Drafting State for Agent Proposals
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  
  // v4.6.29: Refs to solve closure traps in async callbacks
  const statusRef = useRef<GuideStatus>('idle');
  const activeTaskRef = useRef<TaskConfig | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);

  // Initialize Engine once
  const guideEngine = useMemo(() => {
    (window as any).OMNI_DEBUG = true; 
    return new GuideEngine();
  }, []);

  // Reactive Sync with Engine (v4.6 Observer Pattern)
  useEffect(() => {
    const unsubscribe = guideEngine.addListener((state) => {
      setActiveStep(state.step);
      
      // Logic (v4.6.30): Transition to idle triggers a forced scan with indicator
      if (statusRef.current !== 'idle' && state.status === 'idle') {
        setActiveTask(null);
        activeTaskRef.current = null;
        globalHighlighter.hide();
        // v4.6.30: Show scanning indicator during the sync delay for better UX
        setIsScanning(true);
        setTimeout(() => triggerDiscovery(true), 1200);
      }
      
      // Update refs and state
      statusRef.current = state.status;
      activeTaskRef.current = state.task;
      setStatus(state.status);
      if (state.matching) setMatchingTasks(state.matching);
      if (state.status === 'proposing_task' && state.task) {
        const taskRef = state.task; // Fix TS null check
        setDraftValues(prev => {
          // v4.6.31: Fix reuse bug. If it's a NEW task, clear the draft.
          const isNewTask = currentTaskIdRef.current !== taskRef.id;
          if (isNewTask) {
             currentTaskIdRef.current = taskRef.id;
             const initial: Record<string, string> = {};
             taskRef.steps.forEach((s: ActionNode) => {
               if (s.autoValue) initial[s.id] = s.autoValue;
             });
             return initial;
          }
          return prev;
        });
        
        // v4.6.41: Restored Minimalist Highlighting - Focus ONLY on the first step's direct input
        const scanTargets = () => {
          // v4.6.42: Restore Section Highlight if containerQuery exists
          if (state.task?.containerQuery) {
            try {
              const container = document.querySelector(state.task.containerQuery) as HTMLElement;
              if (container) {
                globalHighlighter.targetElement(container, undefined, true);
                return;
              }
            } catch (e) {}
          }

          const firstStep = state.task?.steps[0];
          if (firstStep) {
            const targetMatch = findComplexElement(firstStep.targetQuery);
            if (targetMatch) {
              const visualTarget = globalHighlighter.resolveVisualTarget(targetMatch.element);
              globalHighlighter.targetElement(visualTarget, undefined, false);
            }
          }
        };

        if ((window as any)._omniProposalInterval) clearInterval((window as any)._omniProposalInterval);
        scanTargets();
        const proposalInterval = window.setInterval(scanTargets, 1000);
        (window as any)._omniProposalInterval = proposalInterval;
      }

      if (state.status !== 'proposing_task') {
         if ((window as any)._omniProposalInterval) {
           clearInterval((window as any)._omniProposalInterval);
           (window as any)._omniProposalInterval = null;
         }
         globalHighlighter.hide();
      }
    });

    return () => unsubscribe();
  }, [guideEngine]);

  // Sync discovery and Auto-Switching with DOM Awareness (v4.6.24)
  const lastScanRef = useRef(0);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

  const triggerDiscovery = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastScanRef.current < 800) return; 
    lastScanRef.current = now;
    
    // v4.6.29: Using Refs instead of state to avoid closure traps
    if (statusRef.current !== 'idle' || activeTaskRef.current) {
      setIsScanning(false);
      return;
    }

    setIsScanning(true);
    setTimeout(() => {
      const matches = guideEngine.discoverGuides(BUSINESS_SITE_SCHEMA.pages);
      setIsScanning(false);
      
      if (matches && matches.length > 0 && status === 'idle' && !activeTask) {
         const bestMatch = matches.find(m => m.task.autoPropose);
         if (bestMatch && bestMatch.match.score > 0.8) {
            handleTaskClick(bestMatch.task);
         }
      }
    }, 300);
  }, [guideEngine]);

  useEffect(() => {
    // SPA NAVIGATION WATCHER (v4.6.9)
    const handleUrlChange = () => {
      triggerDiscovery();
      // Double-check after 500ms for slow React renders
      setTimeout(triggerDiscovery, 500);
    };

    // Patch history to detect pushState/replaceState
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;

    window.history.pushState = function(...args) {
      originalPush.apply(this, args);
      handleUrlChange();
    };
    window.history.replaceState = function(...args) {
      originalReplace.apply(this, args);
      handleUrlChange();
    };

    window.addEventListener('popstate', handleUrlChange);

    if (isOpen) {
      triggerDiscovery();
      mutationObserverRef.current = new MutationObserver((mutations) => {
        const hasMeaningfulChange = mutations.some(m => m.addedNodes.length > 0 || m.type === 'attributes');
        if (hasMeaningfulChange) triggerDiscovery();
      });
      mutationObserverRef.current.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'id', 'style'] });
    }

    return () => { 
      if (mutationObserverRef.current) mutationObserverRef.current.disconnect();
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [isOpen, triggerDiscovery]);

  const handleIntent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intentInput.trim()) return;
    const result = IntentIntelligence.parse(intentInput);
    
    if (result.type === 'search') {
      const dashboard = BUSINESS_SITE_SCHEMA.pages.find(p => p.id === 'dashboard');
      const searchTask = dashboard?.suggestedTasks.find(t => t.id === 'task-search');
      if (searchTask) {
        const cloned = JSON.parse(JSON.stringify(searchTask));
        cloned.steps[0].autoValue = result.parameters.query;
        handleTaskClick(cloned);
      }
    } else if (result.type === 'action') {
       for (const page of BUSINESS_SITE_SCHEMA.pages) {
         const task = page.suggestedTasks.find(t => t.id === result.parameters.flowId);
         if (task) { 
           handleTaskClick(task);
           break; 
         }
       }
    }
    setIntentInput('');
  };

  const handleTaskClick = (task: TaskConfig) => {
    setActiveTask(task);
    guideEngine.selectTask(task);
  }

  const handleDraftChange = (stepId: string, value: string) => {
    setDraftValues(prev => ({ ...prev, [stepId]: value }));
  }

  const isInProcess = status !== 'idle' && status !== 'discovery';

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2147483647, pointerEvents: 'auto', boxSizing: 'border-box' }}>
      <style>{`
        .omni-container *, .omni-container *:before, .omni-container *:after { box-sizing: border-box; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
        .omni-shimmer-text { font-size: 0.75rem; color: #64b5f6; font-weight: 800; animation: pulse 1.5s infinite; }
        .omni-dark-glass { background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); color: white; }
        .omni-input { width: 100%; max-width: 100%; padding: 12px 16px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; outline: none; transition: border 0.3s; box-sizing: border-box; }
        .omni-input:focus { border-color: #64b5f6; background: rgba(255,255,255,0.08); }
        .omni-input option { background: #1a202c; color: white; } /* Force readable options */
        .omni-btn-deny { flex: 1; padding: 14px; border-radius: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #ef5350; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .omni-btn-deny:hover { background: rgba(239, 83, 80, 0.1); }
        .omni-btn-allow { flex: 2; padding: 14px; border-radius: 16px; background: linear-gradient(135deg, #1565c0, #1976d2); border: none; color: white; font-weight: 800; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 12px rgba(21, 101, 192, 0.3); }
        .omni-btn-allow:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(21, 101, 192, 0.4); }
      `}</style>

      <div className="omni-container">
        {/* FAB Button */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="omni-glass"
            style={{
              width: '64px', height: '64px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              background: 'linear-gradient(135deg, #0d47a1, #1976d2)',
              border: 'none', color: 'white', boxShadow: '0 12px 24px rgba(13, 71, 161, 0.4)',
              position: 'relative', overflow: 'hidden'
            }}
          >
            <Zap size={32} fill="white" />
            {matchingTasks.length > 0 && !isInProcess && (
               <div style={{ position: 'absolute', top: 4, right: 4, background: '#ff5252', color: 'white', borderRadius: '50%', width: '22px', height: '22px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, border: '2px solid white' }}>
                 {matchingTasks.length}
               </div>
            )}
          </button>
        )}

        {/* Main Panel */}
        {isOpen && (
          <div className="omni-dark-glass" style={{ width: '400px', maxHeight: '780px', minHeight: '520px', borderRadius: '32px', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 64px rgba(0,0,0,0.5)' }}>
            
            {/* Header */}
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: 'linear-gradient(135deg, #1976d2, #64b5f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Cpu size={22} color="white" />
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>OmniAssist Agent</div>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.3 }}>
                <X size={22} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
              
              {status === 'idle' && (
                <div style={{ animation: 'fadeInUp 0.3s' }}>
                  <div style={{ position: 'relative', margin: '12px 0 32px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                    <form onSubmit={handleIntent}>
                      <input 
                        type="text" 
                        value={intentInput}
                        onChange={(e) => setIntentInput(e.target.value)}
                        placeholder="What should I automate?" 
                        className="omni-input"
                        style={{ height: '56px', width: '100%', boxSizing: 'border-box' }}
                      />
                      <button type="submit" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64b5f6', cursor: 'pointer' }}>
                        <Send size={22} />
                      </button>
                    </form>
                  </div>

                  <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.4, letterSpacing: '0.1em', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                    Suggested Actions
                    {isScanning && <span className="omni-shimmer-text">Scanning environments...</span>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {matchingTasks.map(({task}) => (
                      <button 
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        style={{ width: '100%', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'white', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>{task.name}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{task.description}</div>
                        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}><ChevronRight size={18} opacity={0.3} /></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {status === 'proposing_task' && activeTask && (
                <div style={{ animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)', paddingTop: '10px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(100, 181, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Zap size={32} color="#64b5f6" />
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '8px' }}>Autonomous Suggestion</h2>
                    <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>I can help you complete the <b>{activeTask.name}</b> section.</p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px', overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64b5f6', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.1em' }}>Inputs</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '100%' }}>
                       {activeTask.steps.map(step => (
                         <div key={step.id}>
                           {step.expectedAction !== 'click' ? (
                             <>
                               <div style={{ fontSize: '0.8rem', opacity: 0.4, marginBottom: '8px', fontWeight: 700 }}>
                                 {step.title || step.targetQuery.replace(/^text=/, '')}
                               </div>
                               {step.options ? (
                                 <select 
                                   value={draftValues[step.id] || ''}
                                   onChange={(e) => handleDraftChange(step.id, e.target.value)}
                                   className="omni-input"
                                 >
                                   <option value="">Select...</option>
                                   {step.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                 </select>
                               ) : (
                                 <input 
                                   type="text" 
                                   value={draftValues[step.id] || ''}
                                   onChange={(e) => handleDraftChange(step.id, e.target.value)}
                                   className="omni-input"
                                   placeholder={`Enter ${step.targetQuery}...`}
                                 />
                               )}
                             </>
                           ) : (
                             <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '16px', background: 'rgba(25, 118, 210, 0.05)', border: '1px solid rgba(25, 118, 210, 0.1)' }}>
                               <CheckCircle2 size={18} color="#1976d2" />
                               <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1976d2' }}>Click: {step.targetQuery}</span>
                             </div>
                           )}
                         </div>
                       ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => {
                        if ((window as any)._omniProposalInterval) clearInterval((window as any)._omniProposalInterval);
                        guideEngine.stop();
                        setActiveTask(null);
                    }} className="omni-btn-deny">Deny</button>
                    <button onClick={() => guideEngine.allowTask(draftValues)} className="omni-btn-allow">Allow</button>
                  </div>
                </div>
              )}

              {(status === 'executing_auto' || (status === 'active' && activeStep)) && (
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                   <Cpu size={64} color="#64b5f6" style={{ animation: 'pulse 1s infinite', marginBottom: '32px' }} />
                   <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '12px' }}>Assistant in Control</h2>
                   <p style={{ opacity: 0.5, marginBottom: '40px' }}>Automating workflow steps with precision...</p>
                   <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${guideEngine.progress || 0}%`, height: '100%', background: 'linear-gradient(90deg, #1976d2, #64b5f6)', transition: 'width 0.4s' }}></div>
                   </div>
                   {activeStep && <div style={{ marginTop: '24px', fontSize: '0.9rem', color: '#64b5f6', fontWeight: 800 }}>Applying {activeStep.title || activeStep.targetQuery}...</div>}
                </div>
              )}

              {status === 'out_of_context' && (
                 <div style={{ padding: '40px 0', textAlign: 'center' }}>
                   <AlertCircle size={54} color="#ff9800" style={{ marginBottom: '24px' }} />
                   <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '12px' }}>Context Lost</h2>
                   <p style={{ opacity: 0.5, marginBottom: '32px' }}>Layout changed during execution. Re-link or Stop?</p>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <button onClick={() => guideEngine.next()} className="omni-btn-allow">Re-Link & Continue</button>
                      <button onClick={() => guideEngine.stop()} style={{ background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', fontWeight: 700 }}>Terminate</button>
                   </div>
                 </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
