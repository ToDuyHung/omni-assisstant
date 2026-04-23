import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  Zap, X, Cpu, Trash2, Layout, Plus, StopCircle, Search 
} from 'lucide-react';
import { guideEngine, type GuideStatus } from './guide'
import { StudioInspector } from './perception'
import { ContextVerifier } from './context'
import { studioConfig } from './persistence'
import type { ProjectSchema, TaskConfig, ActionNode, PageConfig } from './schema'

const BUSINESS_SITE_SCHEMA: ProjectSchema = {
  version: '9.3',
  projectId: 'business-site-001',
  projectName: 'Business Site Assistant',
  pages: [
    {
      id: 'dashboard',
      name: 'Request Dashboard',
      path: '/requests',
      tasks: [
        {
          id: 'search-request',
          title: 'Search Request',
          description: 'Search for projects by title or status.',
          category: 'form',
          steps: [
            { id: 's1', title: 'Smart Search', instruction: 'Type your search query.', targetQuery: 'text=Search', expectedAction: 'input', autoValue: 'Project A' }
          ]
        },
        {
          id: 'create-new-request',
          title: 'Create New Request',
          description: 'Start a new project request.',
          category: 'navigation',
          steps: [
            { id: 'nr1', title: 'Click Create', instruction: 'Click the New Request button.', targetQuery: 'text=New Request', expectedAction: 'click' }
          ]
        }
      ]
    },
    {
      id: 'wizard-step-0',
      name: 'Project Contact Info',
      path: '/requests/new',
      signature: {
        logic: 'AND',
        conditions: [{ type: 'text', value: 'Project Contact Info' }]
      },
      tasks: [
        {
          id: 'select-country',
          title: 'Select Country',
          description: 'Choose the project country.',
          category: 'form',
          steps: [
            {
              id: 'sc1',
              title: 'Select Country',
              instruction: 'Choose Singapore.',
              targetQuery: 'text=Country',
              expectedAction: 'select',
              autoValue: 'Singapore',
              options: ['Singapore', 'Vietnam', 'Malaysia', 'Thailand', 'Indonesia'],
              locators: { role: 'combobox', context: 'Project Contact Info', semantic: 'Country' }
            }
          ]
        },
        {
          id: 'type-name',
          title: 'Type Project Contact Name',
          description: 'Enter the contact person name.',
          category: 'form',
          steps: [
            {
              id: 'tn1',
              title: 'Fill Name',
              instruction: 'Enter contact name.',
              targetQuery: 'text=Project Contact Name',
              expectedAction: 'input',
              autoValue: 'John Doe',
              locators: { role: 'input', context: 'Project Contact Info', semantic: 'Project Contact Name' }
            }
          ]
        },
        {
          id: 'type-email',
          title: 'Type Project Contact Email',
          description: 'Enter the contact person email.',
          category: 'form',
          steps: [
            {
              id: 'te1',
              title: 'Fill Email',
              instruction: 'Enter contact email.',
              targetQuery: 'text=Project Contact Email',
              expectedAction: 'input',
              autoValue: 'john@example.com',
              locators: { role: 'input', context: 'Project Contact Info', semantic: 'Project Contact Email' }
            }
          ]
        },
        {
          id: 'select-business-area',
          title: 'Select Business Area',
          description: 'Choose the business area.',
          category: 'form',
          steps: [
            {
              id: 'sba1',
              title: 'Select Area',
              instruction: 'Select your business area.',
              targetQuery: 'text=Business Area',
              expectedAction: 'select',
              autoValue: 'Corporate',
              options: ['Group HQ', 'Corporate', 'Retail', 'Technology'],
              locators: { role: 'combobox', context: 'Project Contact Info', semantic: 'Business Area' }
            }
          ]
        },
        {
          id: 'select-lob',
          title: 'Select LOB',
          description: 'Choose the Line of Business.',
          category: 'form',
          steps: [
            {
              id: 'sl1',
              title: 'Select LOB',
              instruction: 'Select your Line of Business.',
              targetQuery: 'text=LOB',
              expectedAction: 'select',
              autoValue: 'Banking',
              options: ['Group HQ', 'Banking', 'Insurance', 'Investment'],
              locators: { role: 'combobox', context: 'Project Contact Info', semantic: 'LOB' }
            }
          ]
        },
        {
          id: 'select-talent-augmentation',
          title: 'Select Talent Augmentation',
          description: 'Select Talent Augmentation request type.',
          category: 'form',
          steps: [
            {
              id: 'sta1',
              title: 'Select Talent Augmentation',
              instruction: 'Click Talent Augmentation.',
              targetQuery: 'text=Talent Augmentation',
              expectedAction: 'click',
              locators: { role: 'any', context: 'request type', semantic: 'talent augmentation' }
            }
          ]
        },
        {
          id: 'ssd0',
          title: 'Select Solution Delivery',
          description: 'Select solution delivery type.',
          category: 'navigation',
          steps: [
            {
              id: 'ssd1',
              title: 'Select Solution Delivery',
              instruction: 'Click Solution Delivery.',
              targetQuery: 'text=Solution Delivery',
              expectedAction: 'click',
              locators: { role: 'any', context: 'request type', semantic: 'solution delivery' }
            }
          ]
        },
        {
          id: 'click-next',
          title: 'Click Next',
          description: 'Proceed to the next step.',
          category: 'navigation',
          steps: [
            { id: 'nx1', title: 'Click Next', instruction: 'Click the Next button.', targetQuery: 'id=btn-wizard-next', expectedAction: 'click', locators: { role: 'button', semantic: 'Next' } }
          ]
        },
        {
          id: 'click-cancel',
          title: 'Click Cancel',
          description: 'Discard changes and go back to dashboard.',
          category: 'navigation',
          steps: [
            { id: 'ccan0', title: 'Cancel', instruction: 'Click the Cancel button.', targetQuery: 'text=Cancel', expectedAction: 'click', locators: { role: 'button', semantic: 'Cancel' } }
          ]
        }
      ]
    },
    {
      id: 'wizard-step-1',
      name: 'Business Request Detail',
      path: '/requests/new',
      signature: {
        logic: 'AND',
        conditions: [{ type: 'text', value: 'Business Request Detail' }]
      },
      tasks: [
        {
          id: 'type-project-name',
          title: 'Type Project Name',
          description: 'Enter the project name.',
          category: 'form',
          steps: [
            { 
              id: 'tpn1', 
              title: 'Fill Project Name', 
              instruction: 'Enter project name.', 
              targetQuery: 'text=Name / Title', 
              expectedAction: 'input', 
              autoValue: 'AI Assistant Integration',
              locators: { role: 'input', context: 'Business Request Detail', semantic: 'Name / Title' }
            }
          ]
        },
        {
          id: 'type-project-desc',
          title: 'Type Project Description',
          description: 'Enter project details.',
          category: 'form',
          steps: [
            { 
              id: 'tpd1', 
              title: 'Fill Description', 
              instruction: 'Enter description.', 
              targetQuery: 'text=Description', 
              expectedAction: 'input', 
              autoValue: 'Integrating Omni Assistant for business automation.',
              locators: { role: 'textarea', context: 'Business Request Detail', semantic: 'Description' }
            }
          ]
        },
        {
          id: 'select-insourcing',
          title: 'Select Insourcing to VCC',
          description: 'Select engagement criteria.',
          category: 'form',
          steps: [
            {
              id: 'si1',
              title: 'Select Insourcing',
              instruction: 'Click Insourcing to VCC.',
              targetQuery: 'text=Insourcing to VCC',
              expectedAction: 'click',
              locators: { role: 'input', context: 'Business Request Detail', semantic: 'Insourcing to VCC' }
            }
          ]
        },
        {
          id: 'select-new-revenue',
          title: 'Select Supported by New Revenue',
          description: 'Select engagement criteria.',
          category: 'form',
          steps: [
            {
              id: 'snr1',
              title: 'Select New Revenue',
              instruction: 'Click Supported by New Revenue.',
              targetQuery: 'text=Supported by New Revenue',
              expectedAction: 'click',
              locators: { role: 'input', context: 'Business Request Detail', semantic: 'Supported by New Revenue' }
            }
          ]
        },
        {
          id: 'select-generate-savings',
          title: 'Select Generate Savings',
          description: 'Select engagement criteria.',
          category: 'form',
          steps: [
            {
              id: 'sgs1',
              title: 'Select Savings',
              instruction: 'Click Generate Savings.',
              targetQuery: 'text=Generate Savings',
              expectedAction: 'click',
              locators: { role: 'input', context: 'Business Request Detail', semantic: 'Generate Savings' }
            }
          ]
        },
        {
          id: 'select-offshoring',
          title: 'Select Offshoring of SG headcount',
          description: 'Select engagement criteria.',
          category: 'form',
          steps: [
            {
              id: 'sos1',
              title: 'Select Offshoring',
              instruction: 'Click Offshoring of SG headcount.',
              targetQuery: 'text=Offshoring of SG headcount',
              expectedAction: 'click',
              locators: { role: 'input', context: 'Business Request Detail', semantic: 'Offshoring of SG headcount' }
            }
          ]
        },
        {
          id: 'select-duration',
          title: 'Select Duration',
          description: 'Choose project duration.',
          category: 'form',
          steps: [
            { 
              id: 'sdur1', 
              title: 'Select Duration', 
              instruction: 'Choose duration.', 
              targetQuery: 'text=Duration', 
              expectedAction: 'select', 
              autoValue: '12 months', 
              options: ['12 months', '24 months', '36 months'],
              locators: { role: 'combobox', context: 'Business Request Detail', semantic: 'Duration' }
            }
          ]
        },
        {
          id: 'select-start-date',
          title: 'Select Expected Started Date',
          description: 'Pick the start date.',
          category: 'form',
          steps: [
            { 
              id: 'ssd1', 
              title: 'Pick Date', 
              instruction: 'Click and type date.', 
              targetQuery: 'text=Expected Started Date', 
              expectedAction: 'input', 
              autoValue: '01/06/2026',
              locators: { role: 'input', context: 'Business Request Detail', semantic: 'Expected Started Date' }
            }
          ]
        },
        {
          id: 'click-back',
          title: 'Click Back',
          description: 'Go back to step 0.',
          category: 'navigation',
          steps: [
            { id: 'cb1', title: 'Click Back', instruction: 'Click the Back button.', targetQuery: 'text=Back', expectedAction: 'click', locators: { role: 'button', semantic: 'Back' } }
          ]
        },
        {
          id: 'click-save-draft',
          title: 'Click Save as Draft',
          description: 'Save the current progress.',
          category: 'navigation',
          steps: [
            { id: 'csd1', title: 'Save Draft', instruction: 'Click Save as Draft.', targetQuery: 'text=Save as Draft', expectedAction: 'click', locators: { role: 'button', semantic: 'Save as Draft' } }
          ]
        },
        {
          id: 'click-add-resource',
          title: 'Click Add Resource(s)',
          description: 'Add resources to the project.',
          category: 'form',
          steps: [
            { 
              id: 'car1', 
              title: 'Add Resource(s)', 
              instruction: 'Click Add Resource(s).', 
              targetQuery: 'text=Add Resource(s)', 
              expectedAction: 'click', 
              locators: { role: 'button', context: 'business request detail', semantic: 'Add Resource(s)' } 
            }
          ]
        },
        {
          id: 'click-submit',
          title: 'Click Submit Request',
          description: 'Submit the final request.',
          category: 'navigation',
          steps: [
            { id: 'csub1', title: 'Submit Request', instruction: 'Click Submit Request.', targetQuery: 'id=btn-wizard-submit', expectedAction: 'click', locators: { role: 'button', semantic: 'Submit Request' } }
          ]
        }
      ]
    }
  ]
}

const configManager = studioConfig(BUSINESS_SITE_SCHEMA);

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'runtime' | 'studio'>('runtime');
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
  // Default to first page, or a dummy page if empty
  const [currentPage, setCurrentPage] = useState<PageConfig>(initialPages[0] || { id: 'fallback', name: 'Loading...', path: '/', tasks: [] });

  // Track URL and Page Content changes in SPA
  useEffect(() => {
    const detectPage = () => {
      if (!pages || pages.length === 0) return;

      const path = window.location.pathname;
      if (path !== currentPath) setCurrentPath(path);

      // 1. Find all pages that match the current path
      const candidatePages = pages.filter(p => path === p.path || path.startsWith(p.path + '/'));

      let detected: PageConfig | null = null;

      if (candidatePages.length === 1) {
        detected = candidatePages[0];
      } else if (candidatePages.length > 1) {
        // Disambiguate using signatures
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
        // Fallback to first candidate if no signature matches
        if (!detected) detected = candidatePages[0];
      } else {
        // No path match, fallback to dashboard if it exists
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
    const cleanup = guideEngine.onStateChange((state) => {
      console.log('[OMNI] [UI] State Sync:', state.status, state.currentStepIndex);
      setStatus(state.status);
      setActiveTask(state.activeTask || null);
      setCurrentStepIndex(state.currentStepIndex);
    });
    
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

    return cleanup;
  }, []);

  const handleStartTask = (task: TaskConfig) => {
    const initialValues: Record<string, any> = {};
    task.steps.forEach(s => {
      if (s.expectedAction === 'input') {
        initialValues[s.id] = s.autoValue || ''; 
      } else if (s.autoValue !== undefined) {
        initialValues[s.id] = s.autoValue;
      }
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
      // GuideEngine sets status back to 'active' on match failure, 
      // but we log the error here
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
      title: `New Workflow ${new Date().toLocaleTimeString()}`,
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
    
    // Refresh currentPage to show new task immediately
    const newCurrent = updatedPages.find(p => p.id === currentPage.id);
    if (newCurrent) setCurrentPage(newCurrent);

    setShowReview(false);
    setRecordedSteps([]);
    setRecordingStartPageId(null);
  };

  const deleteTask = (taskId: string) => {
    configManager.deleteTask(currentPage.id, taskId);
    const updatedPages = configManager.getPages();
    setPages(updatedPages);
    
    // Refresh currentPage to reflect deletion immediately
    const newCurrent = updatedPages.find(p => p.id === currentPage.id);
    if (newCurrent) setCurrentPage(newCurrent);
  };

  return (
    <div className="omni-root" style={{ fontFamily: "'Inter', sans-serif", color: 'white' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        .omni-badge {
          background: #ff4d4d;
          color: white;
          font-size: 10px;
          font-weight: 800;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #1a1a1a;
        }
        .omni-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          transition: all 0.2s;
        }
        .omni-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }
        .omni-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: white;
          padding: 8px 12px;
          margin-top: 8px;
          outline: none;
          box-sizing: border-box;
        }
        .omni-input:focus {
          border-color: #1976d2;
          background: rgba(255,255,255,0.08);
        }
      `}</style>

      {/* Floating Zap Button */}
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

      {/* Main Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '380px', height: '580px', borderRadius: '24px',
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)', zIndex: 9999
        }}>
          {/* Header */}
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

          {/* Mode Switcher */}
          <div style={{ padding: '24px 20px 16px', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              display: 'flex',
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              padding: '4px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <button
                onClick={() => { setMode('runtime'); setIsRecording(false); inspector.current?.stop(); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  background: mode === 'runtime' ? '#1976d2' : 'transparent',
                  color: mode === 'runtime' ? 'white' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: mode === 'runtime' ? '0 4px 12px rgba(25, 118, 210, 0.2)' : 'none'
                }}
              >Runtime</button>
              <button
                onClick={() => setMode('studio')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  background: mode === 'studio' ? '#1976d2' : 'transparent',
                  color: mode === 'studio' ? 'white' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: mode === 'studio' ? '0 4px 12px rgba(25, 118, 210, 0.2)' : 'none'
                }}
              >Studio</button>
            </div>
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
            {mode === 'runtime' ? (
              status === 'idle' ? (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, opacity: 0.3, textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.1em' }}>Suggested Actions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {matchingTasks.map((task: TaskConfig) => (
                      <div key={task.id} className="omni-card" onClick={() => handleStartTask(task)} style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px' }}>{task.title}</span>
                        </div>
                        <div style={{ fontSize: '12px', opacity: 0.6, lineHeight: '1.5' }}>{task.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{
                    padding: '24px',
                    background: 'rgba(25, 118, 210, 0.08)',
                    borderRadius: '20px',
                    border: '1px solid rgba(25, 118, 210, 0.2)',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(25, 118, 210, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Cpu size={16} color="#42a5f5" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{activeTask?.title}</div>
                      </div>
                      <button 
                        onClick={() => guideEngine.stop()}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#cbd5e1', marginBottom: activeTask?.steps[currentStepIndex].expectedAction === 'input' ? '24px' : '0' }}>
                      {activeTask?.steps[currentStepIndex].instruction}
                    </div>

                    {activeTask?.steps[currentStepIndex].expectedAction === 'input' && (
                      <div style={{
                        background: 'rgba(0,0,0,0.2)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <label style={{ fontSize: '11px', fontWeight: 800, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inputs</label>
                        <input
                          className="omni-input"
                          autoFocus
                          value={draftValues[activeTask.steps[currentStepIndex].id] ?? activeTask.steps[currentStepIndex].autoValue ?? ''}
                          onChange={(e) => setDraftValues({ ...draftValues, [activeTask!.steps[currentStepIndex].id]: e.target.value })}
                          style={{ margin: '8px 0 0', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      </div>
                    )}

                    {activeTask?.steps[currentStepIndex].expectedAction === 'select' && (
                      <div style={{
                        background: 'rgba(0,0,0,0.2)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <label style={{ fontSize: '11px', fontWeight: 800, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inputs</label>
                        <select
                          className="omni-input"
                          autoFocus
                          value={draftValues[activeTask.steps[currentStepIndex].id] ?? activeTask.steps[currentStepIndex].autoValue ?? ''}
                          onChange={(e) => setDraftValues({ ...draftValues, [activeTask!.steps[currentStepIndex].id]: e.target.value })}
                          style={{ margin: '8px 0 0', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', appearance: 'none' }}
                        >
                          <option value="" disabled style={{ background: '#0f172a' }}>Select an option...</option>
                          {activeTask.steps[currentStepIndex].options?.map(opt => (
                            <option key={opt} value={opt} style={{ background: '#0f172a' }}>{opt}</option>
                          ))}
                          {!activeTask.steps[currentStepIndex].options?.includes(activeTask.steps[currentStepIndex].autoValue as string) && activeTask.steps[currentStepIndex].autoValue && (
                             <option value={activeTask.steps[currentStepIndex].autoValue} style={{ background: '#0f172a' }}>{activeTask.steps[currentStepIndex].autoValue}</option>
                          )}
                        </select>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                    <button onClick={() => guideEngine.stop()} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Deny</button>
                    <button 
                      onClick={handleExecute} 
                      disabled={status === 'executing_auto'}
                      style={{ 
                        flex: 2, padding: '14px', borderRadius: '12px', border: 'none', 
                        background: status === 'executing_auto' ? 'rgba(25, 118, 210, 0.5)' : '#1976d2', 
                        color: 'white', fontWeight: 800, cursor: status === 'executing_auto' ? 'not-allowed' : 'pointer', 
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)' 
                      }}
                    >
                      {status === 'executing_auto' ? 'Executing...' : 'Allow Action'}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div>
                {!isRecording ? (
                  <>
                    <div style={{ textAlign: 'center', padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px' }}>
                      <Layout size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                      <div style={{ fontWeight: 700 }}>Studio Mode</div>
                      <div style={{ fontSize: '12px', opacity: 0.5 }}>Record and manage custom workflows</div>
                      <button
                        onClick={startRecording}
                        style={{ marginTop: '16px', width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: '#1976d2', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <Plus size={18} /> Record New Workflow
                      </button>
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: 800, opacity: 0.4, textTransform: 'uppercase', marginBottom: '16px' }}>Captured Tasks (Current Page)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {matchingTasks.map((task: TaskConfig) => (
                        <div key={task.id} className="omni-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{task.title}</div>
                            <div style={{ fontSize: '11px', opacity: 0.5 }}>{task.steps.length} Step(s)</div>
                          </div>
                          <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', opacity: 0.6 }}><Trash2 size={16} /></button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', paddingTop: '40px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(25, 118, 210, 0.1)', border: '2px solid #1976d2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'pulse 2s infinite' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#1976d2' }} />
                    </div>
                    <style>{`
                      @keyframes pulse {
                        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.7); }
                        70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(25, 118, 210, 0); }
                        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(25, 118, 210, 0); }
                      }
                    `}</style>
                    <div style={{ fontWeight: 800, fontSize: '18px', marginBottom: '8px' }}>Recording...</div>
                    <div style={{ fontSize: '14px', opacity: 0.6, marginBottom: '32px' }}>Go ahead and interact with the website. Omni will capture your steps.</div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px', textAlign: 'left', maxHeight: '200px', overflowY: 'auto', marginBottom: '32px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, opacity: 0.4, marginBottom: '12px' }}>STEPS CAPTURED: {recordedSteps.length}</div>
                      {recordedSteps.map((step, idx) => (
                        <div key={step.id} style={{ fontSize: '12px', display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ opacity: 0.3 }}>{idx + 1}</span>
                          <span>{step.title}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={finishRecording}
                      style={{ width: '100%', padding: '14px', borderRadius: '16px', border: 'none', background: '#1976d2', color: 'white', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                      <StopCircle size={20} /> Finish Recording
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Review Workflow Overlay */}
          {showReview && (
            <div style={{ position: 'absolute', inset: 0, background: '#0f172a', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '24px' }}>
              <div style={{ fontWeight: 800, fontSize: '20px', marginBottom: '24px' }}>Review Workflow</div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.5 }}>Workflow Name</label>
                  <input
                    className="omni-input"
                    value={reviewTask.title || ''}
                    onChange={(e) => setReviewTask({ ...reviewTask, title: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.5 }}>Description</label>
                  <input
                    className="omni-input"
                    value={reviewTask.description || ''}
                    onChange={(e) => setReviewTask({ ...reviewTask, description: e.target.value })}
                  />
                </div>

                <div style={{ fontSize: '12px', fontWeight: 800, opacity: 0.4, marginBottom: '12px' }}>STEPS CAPTURED ({(reviewTask.steps || []).length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(reviewTask.steps || []).map((step, idx) => {
                    const isUnresolved = step.title.includes('(Unresolved Label)') || step.locators?.hint === '(Unresolved Label)';
                    return (
                      <div key={step.id} style={{ 
                        display: 'flex', gap: '12px', 
                        background: isUnresolved ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.03)', 
                        padding: '16px', borderRadius: '16px', 
                        border: isUnresolved ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                        transition: 'all 0.3s'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ 
                              width: '24px', height: '24px', borderRadius: '50%', 
                              background: isUnresolved ? 'rgba(239, 68, 68, 0.2)' : 'rgba(25, 118, 210, 0.2)', 
                              color: isUnresolved ? '#ef4444' : '#42a5f5', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 
                            }}>{idx + 1}</div>
                            {isUnresolved && (
                              <span style={{ fontSize: '10px', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>REQUIRES LABEL</span>
                            )}
                          <input 
                            style={{ background: 'none', border: 'none', color: 'white', fontWeight: 700, fontSize: '13px', width: '100%', outline: 'none' }}
                            value={step.title}
                            onChange={(e) => {
                              const newSteps = [...(reviewTask.steps || [])];
                              newSteps[idx] = { ...step, title: e.target.value };
                              setReviewTask({ ...reviewTask, steps: newSteps });
                            }}
                          />
                          <button 
                            onClick={() => {
                              const newSteps = (reviewTask.steps || []).filter((_, i) => i !== idx);
                              setReviewTask({ ...reviewTask, steps: newSteps });
                            }}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input 
                          className="omni-input"
                          style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}
                          value={step.instruction}
                          placeholder="Action instruction..."
                          onChange={(e) => {
                            const newSteps = [...(reviewTask.steps || [])];
                            newSteps[idx] = { ...step, instruction: e.target.value };
                            setReviewTask({ ...reviewTask, steps: newSteps });
                          }}
                        />

                        {/* MANUAL IDENTITY OVERRIDE & VERIFY (PREMIUM UI) */}
                        <div style={{ 
                          marginTop: '16px', 
                          padding: '16px', 
                          background: 'rgba(30, 41, 59, 0.5)', 
                          borderRadius: '16px', 
                          border: isUnresolved ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.2)',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: isUnresolved ? '#ef4444' : '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Search size={10} color="white" />
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: isUnresolved ? '#fca5a5' : '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Stable Field Identity
                            </div>
                          </div>
                          
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px', lineHeight: '1.4' }}>
                            Type the stable label (e.g. <b>Country</b>) to improve automation precision.
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                              <input 
                                className="omni-input"
                                style={{ 
                                  margin: 0, width: '100%', fontSize: '13px', 
                                  paddingLeft: '12px', height: '40px',
                                  borderColor: isUnresolved ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.1)'
                                }}
                                value={step.locators?.hint === '(Unresolved Label)' ? '' : step.locators?.hint}
                                placeholder="Enter Field Name..."
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const newSteps = [...(reviewTask.steps || [])];
                                  const isSelect = step.expectedAction === 'select';
                                  newSteps[idx] = { 
                                    ...step, 
                                    title: isSelect ? `Select in ${val}` : `Click on ${val}`,
                                    locators: { ...step.locators, hint: val, semantic: `text=${val}` } 
                                  };
                                  setReviewTask({ ...reviewTask, steps: newSteps });
                                }}
                              />
                            </div>
                            <button 
                              onClick={() => {
                                (window as any).OMNI_DEBUG.testAndHighlight(step.locators?.hint, step.locators?.role);
                              }}
                              style={{ 
                                padding: '0 16px', borderRadius: '10px', border: 'none', 
                                background: '#1976d2', color: 'white', fontSize: '12px', 
                                fontWeight: 800, cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                              Check
                            </button>
                          </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowReview(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Discard</button>
                <button onClick={saveReviewTask} style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: '#1976d2', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Save Workflow</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
