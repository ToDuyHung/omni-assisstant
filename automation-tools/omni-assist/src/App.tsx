import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  Zap, X, Cpu, Trash2, Layout, CheckCircle2, Clock, 
  Plus, StopCircle, Search, Save, Edit3
} from 'lucide-react';
import { guideEngine, type GuideStatus } from './guide'
import { workflowEngine, type WorkflowState } from './workflow-engine'
import { StudioInspector, visualHighlighter } from './perception'
import { ContextVerifier } from './context'
import { studioConfig } from './persistence'
import FlowBuilder from './FlowBuilder'
import type { TaskConfig, ActionNode, PageConfig } from './schema'

import { BUSINESS_SITE_SCHEMA } from './schema-data';

const configManager = studioConfig(BUSINESS_SITE_SCHEMA);

type Mode = 'runtime' | 'studio' | 'workflow';

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('runtime');
  const [engineState, setEngineState] = useState<WorkflowState>({ status: 'idle', currentStepIndex: 0, message: '' });
  
  const [status, setStatus] = useState<GuideStatus>('idle');
  const [activeTask, setActiveTask] = useState<TaskConfig | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [draftValues, setDraftValues] = useState<Record<string, any>>({});

  // Studio States
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSteps, setRecordedSteps] = useState<ActionNode[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [reviewTask, setReviewTask] = useState<Partial<TaskConfig>>({});
  const [recordingStartPageId, setRecordingStartPageId] = useState<string | null>(null);
  const initialPages = useMemo(() => configManager.getPages(), []);
  const [pages, setPages] = useState<PageConfig[]>(initialPages);

  const inspector = useRef<StudioInspector | null>(null);

  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentPage, setCurrentPage] = useState<PageConfig>(initialPages[0] || { id: 'fallback', name: 'Loading...', path: '/', tasks: [] });

  // Track URL and Page Content changes in SPA
  useEffect(() => {
    const detectPage = () => {
      if (!pages || pages.length === 0) return;
      const path = window.location.pathname;
      if (path !== currentPath) setCurrentPath(path);
      const candidatePages = pages.filter(p => path === p.path || path.startsWith(p.path + '/'));
      let detected: PageConfig | null = null;
      if (candidatePages.length === 1) {
        detected = candidatePages[0];
      } else if (candidatePages.length > 1) {
        const reversedCandidates = [...candidatePages].reverse();
        for (const page of reversedCandidates) {
          if (page.signature) {
            const match = ContextVerifier.verify(page.signature);
            if (match.isValid) {
              detected = page;
              break;
            }
          }
        }
        if (!detected) detected = candidatePages[0];
      } else {
        detected = pages.find(p => p.id === 'dashboard') || pages[0];
      }
      if (detected && (detected.id !== currentPage?.id || JSON.stringify(detected.tasks) !== JSON.stringify(currentPage.tasks))) {
        setCurrentPage(detected);
      }
    };
    const interval = setInterval(detectPage, 500);
    window.addEventListener('popstate', detectPage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('popstate', detectPage);
    };
  }, [currentPath, currentPage.id, pages]);

  const matchingTasks = useMemo(() => {
    return currentPage?.tasks || [];
  }, [currentPage]);

  useEffect(() => {
    const cleanupGuide = guideEngine.onStateChange((state) => {
      setStatus(state.status);
      setActiveTask(state.activeTask || null);
      setCurrentStepIndex(state.currentStepIndex);
    });
    const cleanupWorkflow = workflowEngine.onStateChange(setEngineState);
    
    inspector.current = new StudioInspector((step) => {
      setRecordedSteps(prev => {
        const existingIndex = prev.findIndex(s => s.id === step.id);
        if (existingIndex !== -1) {
          const next = [...prev];
          next[existingIndex] = step;
          return next;
        }
        return [...prev, step];
      });
    });

    return () => {
      cleanupGuide();
      cleanupWorkflow();
    };
  }, []);

  const handleStartTask = (task: TaskConfig) => {
    const initialValues: Record<string, any> = {};
    task.steps.forEach(s => {
      if (s.expectedAction === 'input') initialValues[s.id] = s.autoValue || ''; 
      else if (s.autoValue !== undefined) initialValues[s.id] = s.autoValue;
    });
    setDraftValues(initialValues);
    guideEngine.startTask(task);
  };

  const handleExecute = async () => {
    if (!activeTask) return;
    const step = activeTask.steps[currentStepIndex];
    const value = (step.id in draftValues) ? draftValues[step.id] : step.autoValue;
    try {
      await guideEngine.performAction(step, value);
    } catch (err) {
      console.error("Action failed:", err);
    }
  };

  const startRecording = () => {
    setRecordingStartPageId(currentPage.id);
    setIsRecording(true);
    setRecordedSteps([]);
    inspector.current?.start();
  };

  const finishRecording = () => {
    setIsRecording(false);
    inspector.current?.stop();
    setReviewTask({
      id: `task-${Date.now()}`,
      title: `Recorded Workflow ${new Date().toLocaleTimeString()}`,
      description: 'Recorded interaction sequence',
      steps: recordedSteps
    });
    setShowReview(true);
  };

  const saveReviewTask = () => {
    if (!reviewTask.id) return;
    const targetPageId = recordingStartPageId || currentPage.id;
    configManager.updateTask(targetPageId, reviewTask as TaskConfig);
    const updatedPages = configManager.getPages();
    setPages(updatedPages);
    const newCurrent = updatedPages.find(p => p.id === currentPage.id);
    if (newCurrent) setCurrentPage(newCurrent);
    setShowReview(false);
    setRecordedSteps([]);
    setRecordingStartPageId(null);
    visualHighlighter.clear();
  };

  const deleteTask = (taskId: string) => {
    configManager.deleteTask(currentPage.id, taskId);
    const updatedPages = configManager.getPages();
    setPages(updatedPages);
    const newCurrent = updatedPages.find(p => p.id === currentPage.id);
    if (newCurrent) setCurrentPage(newCurrent);
  };

  return (
    <div className="omni-root" style={{ fontFamily: "'Inter', sans-serif", color: 'white' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        .omni-badge { background: #ff4d4d; color: white; font-size: 10px; font-weight: 800; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; border: 2px solid #1a1a1a; }
        .omni-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 16px; transition: all 0.2s; }
        .omni-card:hover { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.15); transform: translateY(-2px); }
        .omni-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; padding: 8px 12px; margin-top: 8px; outline: none; box-sizing: border-box; }
        .omni-input:focus { border-color: #1976d2; background: rgba(255,255,255,0.08); }
        .omni-btn { border: none; cursor: pointer; color: white; border-radius: 8px; transition: all 0.2s; }
        .omni-btn.active { box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
        @keyframes pulse-record {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', bottom: '24px', right: '24px',
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(25, 118, 210, 0.4)', zIndex: 9999
          }}
        >
          <Zap size={28} fill="white" />
          {matchingTasks?.length > 0 && (
            <div className="omni-badge" style={{ position: 'absolute', top: '-4px', right: '-4px' }}>
              {matchingTasks.length}
            </div>
          )}
        </button>
      )}

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '400px', height: '650px', borderRadius: '24px',
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)', zIndex: 9999
        }}>
          <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #1976d2, #42a5f5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cpu size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>Omni Assist</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.5 }}><X size={20} /></button>
          </div>

          <div style={{ padding: '20px 20px 0' }}>
            <div style={{ display: 'flex', gap: '8px', padding: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
              <button onClick={() => setMode('runtime')} className={`omni-btn ${mode === 'runtime' ? 'active' : ''}`} style={{ flex: 1, padding: '10px', background: mode === 'runtime' ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Zap size={16} /> <span style={{ fontSize: '12px', fontWeight: 700 }}>Run</span>
              </button>
              <button onClick={() => setMode('studio')} className={`omni-btn ${mode === 'studio' ? 'active' : ''}`} style={{ flex: 1, padding: '10px', background: mode === 'studio' ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Cpu size={16} /> <span style={{ fontSize: '12px', fontWeight: 700 }}>Studio</span>
              </button>
              <button onClick={() => setMode('workflow')} className={`omni-btn ${mode === 'workflow' ? 'active' : ''}`} style={{ flex: 1, padding: '10px', background: mode === 'workflow' ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Layout size={16} /> <span style={{ fontSize: '12px', fontWeight: 700 }}>Flow</span>
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
            {mode === 'runtime' ? (
              status === 'idle' ? (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, opacity: 0.3, textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.1em' }}>Suggested Actions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {matchingTasks.map((task: TaskConfig) => (
                      <div key={task.id} className="omni-card" onClick={() => handleStartTask(task)} style={{ cursor: 'pointer' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{task.title}</div>
                        <div style={{ fontSize: '12px', opacity: 0.6 }}>{task.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '24px', background: 'rgba(25, 118, 210, 0.08)', borderRadius: '20px', marginBottom: '20px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>{activeTask?.title}</div>
                    <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '24px' }}>{activeTask?.steps[currentStepIndex].instruction}</div>
                    {activeTask?.steps[currentStepIndex].expectedAction === 'input' && (
                      <input className="omni-input" autoFocus value={draftValues[activeTask.steps[currentStepIndex].id] ?? ''} onChange={(e) => setDraftValues({ ...draftValues, [activeTask!.steps[currentStepIndex].id]: e.target.value })} />
                    )}
                    {activeTask?.steps[currentStepIndex].expectedAction === 'select' && (
                      <select className="omni-input" autoFocus value={draftValues[activeTask.steps[currentStepIndex].id] ?? ''} onChange={(e) => setDraftValues({ ...draftValues, [activeTask!.steps[currentStepIndex].id]: e.target.value })} style={{ cursor: 'pointer', appearance: 'none' }}>
                        <option value="" disabled style={{ background: '#0f172a' }}>Select an option...</option>
                        {activeTask.steps[currentStepIndex].options?.map(opt => <option key={opt} value={opt} style={{ background: '#0f172a' }}>{opt}</option>)}
                      </select>
                    )}
                  </div>
                  <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                    <button onClick={() => guideEngine.stop()} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer' }}>Deny</button>
                    <button onClick={handleExecute} style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: '#1976d2', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Allow Action</button>
                  </div>
                </div>
              )
            ) : mode === 'studio' ? (
              <div>
                {!isRecording ? (
                  <>
                    <div style={{ padding: '20px', background: 'rgba(25, 118, 210, 0.05)', borderRadius: '20px', marginBottom: '24px', border: '1px solid rgba(25, 118, 210, 0.1)' }}>
                      <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>Workflow Studio</div>
                      <div style={{ fontSize: '12px', opacity: 0.5 }}>Record and manage custom automations.</div>
                      <button onClick={startRecording} style={{ marginTop: '16px', width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: '#1976d2', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Plus size={18} /> Record New Automation
                      </button>
                    </div>

                    <div style={{ fontSize: '11px', fontWeight: 800, opacity: 0.3, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.1em' }}>Captured on this page</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {matchingTasks.map((task: TaskConfig) => (
                        <div key={task.id} className="omni-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{task.title}</div>
                            <div style={{ fontSize: '11px', opacity: 0.5 }}>{task.steps.length} Step(s)</div>
                          </div>
                          <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', opacity: 0.6 }}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                      {matchingTasks.length === 0 && <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.3, fontSize: '13px' }}>No recorded tasks for this page yet.</div>}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', paddingTop: '40px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'pulse-record 2s infinite' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#ef4444' }} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '20px', marginBottom: '8px' }}>Recording...</div>
                    <div style={{ fontSize: '14px', opacity: 0.6, marginBottom: '32px' }}>Perform actions on the site to capture steps.</div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '20px', textAlign: 'left', maxHeight: '200px', overflowY: 'auto', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, opacity: 0.4, marginBottom: '16px' }}>STEPS CAPTURED: {recordedSteps.length}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recordedSteps.map((step, idx) => (
                          <div key={step.id} style={{ fontSize: '13px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span style={{ opacity: 0.3, fontWeight: 800 }}>{idx + 1}</span>
                            <span style={{ fontWeight: 600 }}>{step.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button onClick={finishRecording} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <StopCircle size={20} /> Stop Recording
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {showReview && (
            <div style={{ position: 'absolute', inset: 0, background: '#0f172a', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <Edit3 size={24} color="#1976d2" />
                <div style={{ fontWeight: 800, fontSize: '20px' }}>Review Automation</div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, opacity: 0.4, textTransform: 'uppercase' }}>Workflow Name</label>
                <input className="omni-input" value={reviewTask.title || ''} onChange={(e) => setReviewTask({ ...reviewTask, title: e.target.value })} />
              </div>

              <div style={{ fontSize: '11px', fontWeight: 800, opacity: 0.4, marginBottom: '16px', textTransform: 'uppercase' }}>Steps Captured ({reviewTask.steps?.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
                {reviewTask.steps?.map((step, idx) => {
                  const isUnresolved = step.title.includes('(Unresolved Label)') || step.locators?.hint === '(Unresolved Label)';
                  return (
                    <div key={step.id} style={{ 
                      background: isUnresolved ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.03)', 
                      padding: '20px', borderRadius: '20px', 
                      border: isUnresolved ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isUnresolved ? '#ef4444' : '#1976d2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>{idx + 1}</div>
                        <input style={{ background: 'none', border: 'none', color: 'white', fontWeight: 700, fontSize: '14px', width: '100%', outline: 'none' }} value={step.title} onChange={(e) => {
                          const next = [...(reviewTask.steps || [])];
                          next[idx] = { ...step, title: e.target.value };
                          setReviewTask({ ...reviewTask, steps: next });
                        }} />
                        <button onClick={() => setReviewTask({ ...reviewTask, steps: reviewTask.steps?.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>

                      <input 
                        className="omni-input"
                        style={{ margin: '0 0 16px 0', fontSize: '12px', opacity: 0.8, height: '36px' }}
                        value={step.instruction}
                        placeholder="Action instruction..."
                        onChange={(e) => {
                          const next = [...(reviewTask.steps || [])];
                          next[idx] = { ...step, instruction: e.target.value };
                          setReviewTask({ ...reviewTask, steps: next });
                        }}
                      />

                      <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <Search size={14} color="#60a5fa" />
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase' }}>Stable Field Identity</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input className="omni-input" style={{ marginTop: 0, height: '38px', fontSize: '13px' }} value={step.locators?.hint === '(Unresolved Label)' ? '' : step.locators?.hint} placeholder="Enter Stable Label..." onChange={(e) => {
                            const val = e.target.value;
                            const next = [...(reviewTask.steps || [])];
                            next[idx] = { ...step, locators: { ...step.locators, hint: val, semantic: `text=${val}` } };
                            setReviewTask({ ...reviewTask, steps: next });
                          }} />
                          <button onClick={() => (window as any).OMNI_DEBUG.testAndHighlight(step.locators?.hint, step.locators?.role)} style={{ padding: '0 12px', borderRadius: '8px', background: '#1976d2', color: 'white', fontWeight: 800, fontSize: '12px', border: 'none', cursor: 'pointer' }}>Check</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button onClick={() => { setShowReview(false); visualHighlighter.clear(); }} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Discard</button>
                <button onClick={saveReviewTask} style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: '#1976d2', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Save size={18} /> Save Automation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'workflow' && <FlowBuilder onClose={() => setMode('runtime')} />}

      {engineState.status !== 'idle' && (
        <div style={{ position: 'fixed', bottom: '120px', right: '40px', width: '320px', background: '#1e293b', border: '1px solid #3b82f6', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', padding: '24px', zIndex: 2147483647 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {engineState.status === 'completed' ? <CheckCircle2 size={18} color="#10b981" /> : <Clock size={18} color="#3b82f6" />}
              <span style={{ fontWeight: 800, fontSize: '14px', color: 'white' }}>Automating Flow...</span>
            </div>
            <button onClick={() => workflowEngine.stop()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#94a3b8', marginBottom: '20px' }}>{engineState.message}</div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#3b82f6', width: `${(engineState.currentStepIndex / 1) * 100}%`, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
