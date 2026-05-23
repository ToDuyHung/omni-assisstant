import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  Zap, X, Cpu, Trash2, Layout, CheckCircle2, Clock, 
  Plus, Search, Save, HelpCircle, Square
} from 'lucide-react';
import { guideEngine, type GuideStatus } from './guide'
import { workflowEngine, type WorkflowState } from './workflow-engine'
import { StudioInspector, visualHighlighter } from './perception'
import { ContextVerifier } from './context'
import { studioConfig } from './persistence'
import FlowBuilder from './FlowBuilder'
import type { TaskConfig, ActionNode, PageConfig } from './schema'

import { BUSINESS_SITE_SCHEMA } from './schema-data';

import widgetIcon from './assets/icon.png';
import welcomeBg from './assets/welcome_bg.png';
import botIcon from './assets/bot.svg';
import playCircleIcon from './assets/play-circle.png';
import widgetPng from './assets/widget.png';
import videoRecorderIcon from './assets/video-recorder.png';

const configManager = studioConfig(BUSINESS_SITE_SCHEMA);

type Mode = 'runtime' | 'studio' | 'workflow';

interface GuidelineConfig {
  title: string;
  description: string;
  howToUse: string[];
  impact: string[];
}

const GUIDELINES: Record<Mode, GuidelineConfig> = {
  runtime: {
    title: 'Run Guideline',
    description: 'Run allows admins to execute and test recorded actions in a live chatbot environment.',
    howToUse: [
      'Choose a recorded action from the list.',
      'Click the Run icon to start the action.',
      'Interact with the chatbot to verify the workflow behavior and response output.'
    ],
    impact: [
      'Running an action simulates the end-user experience.',
      'Changes made in Studio or Flow may affect how actions behave here.',
      'This section is mainly used for testing and validation before publishing flows.'
    ]
  },
  studio: {
    title: 'Studio Guideline',
    description: 'Studio is where admins record and manage reusable chatbot actions and interaction steps.',
    howToUse: [
      'Click "Record New Action" to create a new interaction recording.',
      'Perform the desired workflow on the target page.',
      'Save the recording to make it available for Flow creation.',
      'Manage or delete recorded actions from the list.'
    ],
    impact: [
      'Actions created here can be reused across multiple flows.',
      'Updating an action may affect all flows using that action.',
      'Deleted actions may cause related flows to become incomplete or unavailable.'
    ]
  },
  workflow: {
    title: 'Flow Guideline',
    description: 'Flow allows admins to organize recorded actions into end-to-end user journeys and control their visibility.',
    howToUse: [
      'Click "Create New Flow" to build a new chatbot workflow.',
      'Add and arrange recorded actions into steps.',
      'Configure flow visibility and publish status.',
      'Enable Visibility to make the flow available to end users.'
    ],
    impact: [
      'Published flows become accessible to end users through the chatbot.',
      'Hidden flows remain saved but are not visible to users.',
      'Changes to a published flow may immediately affect new chatbot sessions.',
      'Disabling visibility removes the flow from the chatbot experience.'
    ]
  }
};

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('runtime');
  const [showGuideline, setShowGuideline] = useState(false);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
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
  const searchQuery = '';

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

  const filteredTasks = useMemo(() => {
    if (!matchingTasks) return [];
    if (!searchQuery.trim()) return matchingTasks;
    const q = searchQuery.toLowerCase();
    return matchingTasks.filter(t => 
      t.title.toLowerCase().includes(q) || 
      (t.description && t.description.toLowerCase().includes(q))
    );
  }, [matchingTasks, searchQuery]);

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
      title: '',
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
    <div className="omni-root" style={{ fontFamily: "'Manrope', sans-serif", color: 'white' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');
        .omni-root, .omni-root * { font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
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
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.24);
        }
      `}</style>

      <img
        src={widgetPng}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '64px',
          height: '64px',
          objectFit: 'contain',
          cursor: 'pointer',
          zIndex: 9999,
          filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.35))',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        alt="Omni Assist Launcher"
      />

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '104px', right: '24px',
          width: '620px', height: '620px', borderRadius: '24px',
          background: `#0f172a url(${welcomeBg}) no-repeat center center / cover`,
          border: '1px solid rgba(59, 130, 246, 0.3)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 40px rgba(59, 130, 246, 0.25)',
          zIndex: 9999
        }}>
          <div style={{ 
            padding: '16px 24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(15, 23, 42, 0.2)',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={widgetIcon} style={{ width: '34px', height: '34px', objectFit: 'contain' }} alt="Omni Head" />
              <div style={{ fontWeight: 800, fontSize: '18px', color: 'white', letterSpacing: '-0.01em' }}>Omni Assist</div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.5, transition: 'opacity 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Left Column - Orbital Navigation */}
            <div style={{ 
              width: mode === 'workflow' ? '96px' : '220px', 
              borderRight: 'none',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: mode === 'workflow' ? '80px' : '0px',
              gap: mode === 'workflow' ? '24px' : '0px',
              background: 'rgba(15, 23, 42, 0.1)',
              overflow: mode === 'workflow' ? 'visible' : 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              {mode !== 'workflow' && (
                <>
                  {/* Floating shadow under robot */}
                  <div style={{
                    position: 'absolute',
                    left: '34px',
                    top: '268px',
                    width: '60px',
                    height: '14px',
                    background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0) 70%)',
                    borderRadius: '50%',
                    filter: 'blur(3px)',
                    zIndex: 1
                  }} />

                  {/* Character Robot */}
                  <img 
                    src={botIcon} 
                    style={{ 
                      position: 'absolute', 
                      left: '28px', 
                      top: '224px', 
                      transform: 'translateY(-50%)',
                      width: '72px', 
                      height: 'auto',
                      filter: 'drop-shadow(0 10px 20px rgba(59, 130, 246, 0.35))',
                      zIndex: 2,
                      animation: 'omni-float 3s ease-in-out infinite'
                    }} 
                    alt="Robot Character" 
                  />
                </>
              )}

              {/* Orbital Navigation Buttons */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <style>{`
                  @keyframes omni-float {
                    0% { transform: translateY(-50%) translateY(-5px); }
                    50% { transform: translateY(-50%) translateY(5px); }
                    100% { transform: translateY(-50%) translateY(-5px); }
                  }
                  .orbital-btn {
                    position: absolute;
                    width: 66px;
                    height: 66px;
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    pointer-events: auto;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    backdrop-filter: blur(8px);
                  }
                  .orbital-btn-active {
                    border: 2px solid #3b82f6;
                    box-shadow: 0 0 15px rgba(59, 130, 246, 0.6), inset 0 0 10px rgba(59, 130, 246, 0.4);
                    background: rgba(59, 130, 246, 0.15);
                    color: #ffffff;
                    transform: scale(1.05);
                  }
                  .orbital-btn-inactive {
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    background: rgba(15, 23, 42, 0.4);
                    color: rgba(255, 255, 255, 0.55);
                  }
                  .orbital-btn-inactive:hover {
                    border-color: rgba(59, 130, 246, 0.4);
                    background: rgba(59, 130, 246, 0.05);
                    color: white;
                  }
                  .action-card {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 16px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                  }
                  .action-card:hover {
                    background: rgba(59, 130, 246, 0.05);
                    border-color: rgba(59, 130, 246, 0.55);
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.1);
                    transform: translateY(-2px);
                  }
                  .action-card-active {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1.5px solid #3b82f6;
                    border-radius: 16px;
                    padding: 16px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.25);
                  }
                `}</style>
              </div>

              {/* Orbit items */}
              <div 
                onClick={() => setMode('runtime')} 
                className={`orbital-btn ${mode === 'runtime' ? 'orbital-btn-active' : 'orbital-btn-inactive'}`}
                style={mode === 'workflow' ? { position: 'relative', width: '66px', height: '66px' } : { left: '115px', top: '90px' }}
              >
                <Zap size={20} strokeWidth={1.5} fill={mode === 'runtime' ? '#3b82f6' : 'none'} style={{ filter: mode === 'runtime' ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))' : 'none' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>Run</span>
              </div>

              <div 
                onClick={() => setMode('studio')} 
                className={`orbital-btn ${mode === 'studio' ? 'orbital-btn-active' : 'orbital-btn-inactive'}`}
                style={mode === 'workflow' ? { position: 'relative', width: '66px', height: '66px' } : { left: '143px', top: '185px' }}
              >
                <Cpu size={20} strokeWidth={1.5} style={{ filter: mode === 'studio' ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))' : 'none' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>Studio</span>
              </div>

              <div 
                onClick={() => setMode('workflow')} 
                className={`orbital-btn ${mode === 'workflow' ? 'orbital-btn-active' : 'orbital-btn-inactive'}`}
                style={mode === 'workflow' ? { position: 'relative', width: '66px', height: '66px' } : { left: '115px', top: '280px' }}
              >
                <Layout size={20} strokeWidth={1.5} style={{ filter: mode === 'workflow' ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))' : 'none' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>Flow</span>
              </div>

              {/* Tooltip for How to use (Only in workflow/flow mode) */}
              {showHelpTooltip && mode === 'workflow' && (
                <div style={{
                  position: 'absolute',
                  left: '27px', 
                  bottom: '74px', 
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  pointerEvents: 'none',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  backdropFilter: 'blur(8px)'
                }}>
                  How to use this feature?
                  {/* Tooltip Arrow */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-4px',
                    left: '21px', 
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: '6px',
                    height: '6px',
                    background: 'rgba(59, 130, 246, 0.05)',
                    borderRight: '1px solid rgba(59, 130, 246, 0.25)',
                    borderBottom: '1px solid rgba(59, 130, 246, 0.25)'
                  }} />
                </div>
              )}

              {/* Bottom How to use */}
              <button 
                onClick={() => setShowGuideline(true)}
                style={{
                  position: 'absolute',
                  left: mode === 'workflow' ? '27px' : '17px',
                  bottom: '24px',
                  width: mode === 'workflow' ? '42px' : '186px',
                  height: mode === 'workflow' ? '42px' : 'auto',
                  padding: mode === 'workflow' ? '0px' : '10px 12px',
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.45)';
                  setShowHelpTooltip(true);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)';
                  setShowHelpTooltip(false);
                }}
              >
                <HelpCircle size={14} /> 
                {mode !== 'workflow' && " How to use this feature?"}
              </button>
            </div>

            {/* Right Column - Mode Content */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden',
              padding: (mode === 'workflow' || (mode === 'studio' && showReview)) ? '0px' : '24px',
              background: 'rgba(15, 23, 42, 0.15)',
              position: 'relative'
            }}>
              {mode === 'runtime' ? (
                status === 'idle' ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.15em' }}>Recorded Actions</div>
                    
                    {/* List container scrollable */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 12px 6px 4px', marginBottom: '16px' }}>
                      {filteredTasks.map((task: TaskConfig) => {
                        const isTaskRunning = activeTask?.id === task.id;
                        return (
                          <div 
                            key={task.id} 
                            className={isTaskRunning ? "action-card-active" : "action-card"} 
                            onClick={() => handleStartTask(task)}
                          >
                            <div style={{ paddingRight: '12px' }}>
                              <div style={{ fontWeight: 600, fontSize: '16px', color: 'rgba(255, 255, 255, 0.88)', marginBottom: '4px', lineHeight: '1.4', letterSpacing: '-0.01em' }}>{task.title}</div>
                              <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', fontWeight: 400 }}>{task.description}</div>
                            </div>
                            <div style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {isTaskRunning ? (
                                <div style={{ 
                                  width: '26px', 
                                  height: '26px', 
                                  borderRadius: '50%', 
                                  background: 'rgba(239, 68, 68, 0.1)', 
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#ef4444', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  transition: 'all 0.2s'
                                }}>
                                  <Square size={10} fill="currentColor" />
                                </div>
                              ) : (
                                <img 
                                  src={playCircleIcon} 
                                  style={{ 
                                    width: '26px', 
                                    height: '26px', 
                                    objectFit: 'contain', 
                                    cursor: 'pointer', 
                                    transition: 'all 0.2s', 
                                    opacity: 0.85 
                                  }} 
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                    e.currentTarget.style.opacity = '1';
                                  }} 
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.opacity = '0.85';
                                  }} 
                                  alt="Play" 
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {filteredTasks.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.3, fontSize: '13px' }}>
                          No actions found for this page.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* RUNNING ACTIVE STEP Lifecyle */
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.1em' }}>Executing</div>
                    <div style={{ padding: '24px', background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '20px', marginBottom: '20px', backdropFilter: 'blur(4px)' }}>
                      <div style={{ fontWeight: 800, fontSize: '16px', color: '#60a5fa', marginBottom: '14px' }}>{activeTask?.title}</div>
                      <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#e2e8f0', marginBottom: '24px' }}>{activeTask?.steps[currentStepIndex].instruction}</div>
                      
                      {activeTask?.steps[currentStepIndex].expectedAction === 'input' && (
                        <input 
                          className="omni-input" 
                          autoFocus 
                          value={draftValues[activeTask.steps[currentStepIndex].id] ?? ''} 
                          onChange={(e) => setDraftValues({ ...draftValues, [activeTask!.steps[currentStepIndex].id]: e.target.value })} 
                          style={{
                            width: '100%',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '10px',
                            color: 'white',
                            padding: '12px',
                            boxSizing: 'border-box',
                            outline: 'none',
                            fontSize: '13px'
                          }}
                        />
                      )}
                      
                      {activeTask?.steps[currentStepIndex].expectedAction === 'select' && (
                        <select 
                          className="omni-input" 
                          autoFocus 
                          value={draftValues[activeTask.steps[currentStepIndex].id] ?? ''} 
                          onChange={(e) => setDraftValues({ ...draftValues, [activeTask!.steps[currentStepIndex].id]: e.target.value })} 
                          style={{ 
                            width: '100%', 
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '10px',
                            color: 'white',
                            padding: '12px',
                            boxSizing: 'border-box',
                            outline: 'none',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="" disabled style={{ background: '#0f172a' }}>Select an option...</option>
                          {activeTask.steps[currentStepIndex].options?.map(opt => <option key={opt} value={opt} style={{ background: '#0f172a' }}>{opt}</option>)}
                        </select>
                      )}
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={() => guideEngine.stop()} 
                        style={{ 
                          flex: 1, 
                          padding: '14px', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(239, 68, 68, 0.2)', 
                          background: 'rgba(239, 68, 68, 0.05)', 
                          color: '#fca5a5', 
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; }}
                      >
                        Deny
                      </button>
                      <button 
                        onClick={handleExecute} 
                        style={{ 
                          flex: 2, 
                          padding: '14px', 
                          borderRadius: '12px', 
                          border: 'none', 
                          background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)', 
                          color: 'white', 
                          fontWeight: 800, 
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.4)'; }}
                      >
                        Allow Action
                      </button>
                    </div>
                  </div>
                )
              ) : mode === 'studio' ? (
                /* STUDIO recording mode container */
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {showReview ? (
                    /* Review Automation Page - Styled Box Container */
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      overflow: 'hidden', 
                      position: 'relative',
                      background: 'rgba(15, 23, 42, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '20px',
                      margin: '16px',
                      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
                    }}>
                      {/* Header Row (Sticky) */}
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px', 
                        padding: '24px 24px 16px 24px',
                        flexShrink: 0,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          color: 'white',
                          fontFamily: 'inherit'
                        }}>
                          Workflow Name
                        </div>
                        <input 
                          className="omni-input"
                          style={{
                            width: '100%',
                            background: 'rgba(0, 0, 0, 0.2)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            color: 'white',
                            padding: '12px',
                            margin: 0,
                            boxSizing: 'border-box',
                            outline: 'none',
                            fontSize: '13px'
                          }}
                          value={reviewTask.title || ''} 
                          onChange={(e) => setReviewTask({ ...reviewTask, title: e.target.value })} 
                          placeholder="Enter workflow name"
                        />
                      </div>

                      {/* Steps Captured Heading (Sticky) */}
                      <div style={{ 
                        padding: '12px 24px 0 24px', 
                        flexShrink: 0 
                      }}>
                        <div style={{ 
                          fontSize: '11px', 
                          fontWeight: 800, 
                          color: 'rgba(255,255,255,0.4)', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em' 
                        }}>
                          Steps Captured: {reviewTask.steps?.length}
                        </div>
                      </div>

                      {/* List of Steps (Scrollable) */}
                      <div style={{ 
                        flex: 1, 
                        padding: '12px 24px', 
                        overflowY: 'auto' 
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                          {reviewTask.steps?.map((step, idx) => {
                            const isUnresolved = step.title.includes('(Unresolved Label)') || step.locators?.hint === '(Unresolved Label)';
                            return (
                              <div key={step.id} style={{ 
                                background: isUnresolved ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.02)', 
                                padding: '18px', 
                                borderRadius: '16px', 
                                border: isUnresolved ? '1.5px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.06)'
                              }}>
                                 <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
                                   <div style={{ 
                                     color: isUnresolved ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.5)', 
                                     fontSize: '14px', 
                                     fontWeight: 500, 
                                     fontStyle: 'normal',
                                     flexShrink: 0,
                                     lineHeight: '1'
                                   }}>
                                     {idx + 1}
                                   </div>
                                  <input 
                                    style={{ background: 'none', border: 'none', color: 'white', fontWeight: 500, fontSize: '14px', width: '100%', outline: 'none', padding: 0, lineHeight: '1' }} 
                                    value={step.title} 
                                    onChange={(e) => {
                                      const next = [...(reviewTask.steps || [])];
                                      next[idx] = { ...step, title: e.target.value };
                                      setReviewTask({ ...reviewTask, steps: next });
                                    }} 
                                  />
                                  <button onClick={() => setReviewTask({ ...reviewTask, steps: reviewTask.steps?.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                </div>

                                <input 
                                  className="omni-input"
                                  style={{ 
                                    margin: '0 0 14px 0', 
                                    fontSize: '12px', 
                                    height: '36px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    padding: '8px 12px',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                  }}
                                  value={step.instruction}
                                  placeholder="Action instruction..."
                                  onChange={(e) => {
                                    const next = [...(reviewTask.steps || [])];
                                    next[idx] = { ...step, instruction: e.target.value };
                                    setReviewTask({ ...reviewTask, steps: next });
                                  }}
                                />

                                <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <Search size={14} color="#60a5fa" />
                                    <span style={{ 
                                      fontSize: '12px', 
                                      fontWeight: 600, 
                                      color: '#60a5fa', 
                                      fontStyle: 'normal'
                                    }}>
                                      Stable Field Identity
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                      className="omni-input" 
                                      style={{ 
                                        marginTop: 0, 
                                        height: '34px', 
                                        fontSize: '12px',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        padding: '8px 12px',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                      }} 
                                      value={step.locators?.hint === '(Unresolved Label)' ? '' : step.locators?.hint} 
                                      placeholder="Enter Stable Label..." 
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const next = [...(reviewTask.steps || [])];
                                        next[idx] = { ...step, locators: { ...step.locators, hint: val, semantic: `text=${val}` } };
                                        setReviewTask({ ...reviewTask, steps: next });
                                      }} 
                                    />
                                    <button onClick={() => (window as any).OMNI_DEBUG.testAndHighlight(step.locators?.hint, step.locators?.role)} style={{ padding: '0 14px', borderRadius: '8px', background: '#3b82f6', color: 'white', fontWeight: 800, fontSize: '11px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)' }}>Check</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer Row (Sticky) */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        padding: '12px 24px 24px 24px', 
                        flexShrink: 0,
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <button 
                          onClick={() => { setShowReview(false); visualHighlighter.clear(); }} 
                          style={{ 
                            flex: 1, 
                            padding: '12px', 
                            borderRadius: '12px', 
                            border: '1px solid rgba(255, 255, 255, 0.08)', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            color: 'white', 
                            fontWeight: 600, 
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          }}
                        >
                          Discard
                        </button>
                        <button 
                          onClick={saveReviewTask} 
                          style={{ 
                            flex: 2, 
                            padding: '12px', 
                            borderRadius: '12px', 
                            border: 'none', 
                            background: '#1068EB', 
                            color: 'white', 
                            fontWeight: 600, 
                            fontSize: '12px',
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '6px', 
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 14px rgba(16, 104, 235, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#1d7bfd';
                            e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 104, 235, 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#1068EB';
                            e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 104, 235, 0.3)';
                          }}
                        >
                          <Save size={14} /> Save Automation
                        </button>
                      </div>
                    </div>
                  ) : !isRecording ? (
                    <>
                      <div style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.06)', borderRadius: '20px', marginBottom: '20px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: 'white', marginBottom: '4px' }}>Workflow Studio</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4' }}>Record and manage custom actions</div>
                        <button 
                          onClick={startRecording} 
                          style={{ 
                            marginTop: '16px', 
                            width: '100%', 
                            padding: '12px', 
                            borderRadius: '12px', 
                            border: 'none', 
                            background: '#3b82f6', 
                            color: 'white', 
                            fontWeight: 800, 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                          }}
                        >
                          <Plus size={16} /> Record New Action
                        </button>
                      </div>

                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.1em' }}>RECORDED ON THIS PAGE</div>
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                        {matchingTasks.map((task: TaskConfig) => (
                          <div key={task.id} className="action-card" style={{ cursor: 'default' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '14px', color: 'white' }}>{task.title}</div>
                              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{task.steps.length} step(s)</div>
                            </div>
                             <button 
                              onClick={() => deleteTask(task.id)} 
                              style={{ 
                                border: 'none', 
                                background: 'none', 
                                cursor: 'pointer', 
                                color: 'rgba(255,255,255,0.4)',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                padding: '6px',
                                transition: 'all 0.2s',
                                flexShrink: 0
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ffffff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        {matchingTasks.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.3, fontSize: '13px' }}>
                            No recorded tasks for this page yet.
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Recording in progress steps overlay */
                    <div style={{ textAlign: 'center', paddingTop: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'pulse-record 2s infinite' }}>
                        <div style={{ 
                          width: '30px', 
                          height: '30px', 
                          background: '#ef4444',
                          WebkitMaskImage: `url(${videoRecorderIcon})`,
                          maskImage: `url(${videoRecorderIcon})`,
                          WebkitMaskRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat',
                          WebkitMaskPosition: 'center',
                          maskPosition: 'center',
                          WebkitMaskSize: 'contain',
                          maskSize: 'contain'
                        }} />
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '18px', color: 'white', marginBottom: '6px' }}>Recording...</div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>Perform actions on the site to capture steps.</div>

                      <div style={{ 
                        flex: 1, 
                        background: 'rgba(0, 0, 0, 0.2)', 
                        borderRadius: '20px', 
                        padding: '16px 20px', 
                        textAlign: 'left', 
                        overflowY: 'auto', 
                        marginBottom: '20px', 
                        border: '1px solid rgba(255,255,255,0.05)' 
                      }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: '12px', letterSpacing: '0.05em' }}>STEPS CAPTURED: {recordedSteps.length}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {recordedSteps.map((step, idx) => (
                            <div key={step.id} style={{ fontSize: '13px', display: 'flex', gap: '12px', alignItems: 'center', color: '#e2e8f0', position: 'relative' }}>
                              <div style={{ 
                                color: 'rgba(255,255,255,0.4)',
                                fontSize: '13px',
                                fontWeight: 700,
                                flexShrink: 0,
                                width: '14px'
                              }}>
                                {idx + 1}
                              </div>
                              <span style={{ fontWeight: 600 }}>{step.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={finishRecording} 
                        style={{ 
                          width: '100%', 
                          padding: '14px', 
                          borderRadius: '12px', 
                          border: 'none', 
                          background: '#ef4444', 
                          color: 'white', 
                          fontWeight: 800, 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                        }}
                      >
                        <Square size={12} fill="currentColor" /> Stop Recording
                      </button>
                    </div>
                  )}
                </div>
              ) : mode === 'workflow' ? (
                <FlowBuilder onClose={() => setMode('runtime')} />
              ) : null}
            </div>
          </div>

          {showGuideline && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 150,
            }}>
              <div style={{
                width: '420px',
                maxHeight: '90%',
                overflowY: 'auto',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                padding: '24px 28px',
                color: '#ffffff',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                position: 'relative'
              }}>
                <button
                  onClick={() => setShowGuideline(false)}
                  style={{
                    position: 'absolute',
                    top: '24px',
                    right: '24px',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.55)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.55)';
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  <X size={18} />
                </button>

                 <h2 style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#ffffff',
                  margin: '0 0 16px 0',
                  lineHeight: '1.2'
                }}>
                  {GUIDELINES[mode].title}
                </h2>

                <p style={{
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: 'rgba(255, 255, 255, 0.65)',
                  margin: '0 0 24px 0',
                  fontWeight: 400
                }}>
                  {GUIDELINES[mode].description}
                </p>

                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', marginBottom: '24px' }} />

                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '16px'
                }}>
                  How to Use
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                  {GUIDELINES[mode].howToUse.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '6px', fontSize: '13px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.65)' }}>
                      <div style={{
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {idx + 1}.
                      </div>
                      <div style={{ flex: 1 }}>{step}</div>
                    </div>
                  ))}
                </div>

                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', marginBottom: '24px' }} />

                <div style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '16px'
                }}>
                  Impact
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {GUIDELINES[mode].impact.map((point, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.65)' }}>
                      <div style={{
                        color: 'rgba(255, 255, 255, 0.65)',
                        fontSize: '16px',
                        fontWeight: 800,
                        lineHeight: '1',
                        flexShrink: 0,
                        marginTop: '-1px'
                      }}>
                        •
                      </div>
                      <div style={{ flex: 1 }}>{point}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}


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
