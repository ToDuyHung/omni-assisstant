import { 
  Plus, Play, Save, Trash2, Layout, ChevronRight, 
  ArrowLeft, Search, X, GripVertical, Settings, Zap, CheckCircle2, Clock, Cloud, Edit2
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { workflowConfig, studioConfig } from './persistence';
import { BUSINESS_SITE_SCHEMA } from './schema-data';
import { workflowEngine, type WorkflowState } from './workflow-engine';
import type { Workflow, WorkflowStep } from './workflow-schema';
import type { PageConfig } from './schema';

const wfManager = workflowConfig();

const FLOW_GUIDELINE = {
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
};

interface FlowBuilderProps {
  onClose: () => void;
}

export default function FlowBuilder({ onClose }: FlowBuilderProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>(wfManager.getWorkflows());
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showGuideline, setShowGuideline] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [engineState, setEngineState] = useState<WorkflowState>({ status: 'idle', currentStepIndex: 0, message: '' });
  
  // Library & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [pages, setPages] = useState<PageConfig[]>([]);

  // Refresh pages whenever library is opened to catch new Studio actions
  useEffect(() => {
    if (showLibrary || !activeWorkflow) {
      const configManager = studioConfig(BUSINESS_SITE_SCHEMA);
      setPages(configManager.getPages());
    }
  }, [showLibrary, activeWorkflow]);

  const allActions = useMemo(() => {
    const actions = pages.flatMap(p => p.tasks.filter(t => t.steps.length > 0).map(t => ({ ...t, pageId: p.id, pageName: p.name })));
    if (!searchQuery.trim()) return actions;
    
    const query = searchQuery.toLowerCase();
    return actions.filter(a => 
      a.title.toLowerCase().includes(query) || 
      (a.description && a.description.toLowerCase().includes(query)) ||
      a.pageName.toLowerCase().includes(query)
    );
  }, [pages, searchQuery]);

  useEffect(() => {
    const cleanup = workflowEngine.onStateChange(setEngineState);
    return () => { cleanup(); };
  }, []);

  const handleCreateWorkflow = () => {
    const newWf: Workflow = {
      id: `wf-${Date.now()}`,
      name: 'Untitled Workflow',
      description: 'Business process description...',
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublished: false
    };
    setActiveWorkflow(newWf);
  };

  const handleSave = () => {
    if (!activeWorkflow) return;
    wfManager.saveWorkflow(activeWorkflow);
    setWorkflows(wfManager.getWorkflows());
  };

  const getEnrichedWorkflow = () => {
    if (!activeWorkflow) return null;
    
    const studioPages = studioConfig(BUSINESS_SITE_SCHEMA).getPages();
    const allStudioTasks = studioPages.flatMap(p => p.tasks);

    const enrichedSteps = activeWorkflow.steps.map(step => {
      const foundTask = allStudioTasks.find(t => t.id === step.actionId);
      if (foundTask) {
        return {
          ...step,
          expectedAction: step.expectedAction || foundTask.steps?.[0]?.expectedAction || (foundTask as any).expectedAction || 'click',
          targetQuery: step.targetQuery || foundTask.steps?.[0]?.targetQuery || (foundTask as any).targetQuery,
          locators: step.locators || foundTask.steps?.[0]?.locators || (foundTask as any).locators,
          overrideValue: step.overrideValue || foundTask.steps?.[0]?.autoValue
        };
      }
      return step;
    });

    return { ...activeWorkflow, steps: enrichedSteps, isPublished: true };
  };

  const handleExport = () => {
    const enrichedWf = getEnrichedWorkflow();
    if (!enrichedWf) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify([enrichedWf], null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${enrichedWf.name.replace(/\s+/g, '_')}_artifact.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handlePublish = async () => {
    const enrichedWf = getEnrichedWorkflow();
    if (!enrichedWf) return;

    setIsPublishing(true);
    try {
      const response = await fetch("http://localhost:6789/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrichedWf)
      });

      if (response.ok) {
        alert("Workflow published successfully to Resa Backend!");
      } else {
        throw new Error("Failed to publish");
      }
    } catch (e) {
      alert("Error publishing workflow. Is the backend running on port 6789?");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAddStep = (action: any) => {
    if (!activeWorkflow) return;
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      pageId: action.pageId,
      actionId: action.id,
      title: action.title || action.description,
      executionMode: 'auto',
      expectedAction: action.steps?.[0]?.expectedAction || action.expectedAction,
      targetQuery: action.steps?.[0]?.targetQuery || action.targetQuery,
      locators: action.steps?.[0]?.locators || action.locators,
      overrideValue: action.steps?.[0]?.autoValue || action.autoValue
    };
    setActiveWorkflow({
      ...activeWorkflow,
      steps: [...activeWorkflow.steps, newStep]
    });
    setShowLibrary(false);
    setSearchQuery('');
  };

  const updateStep = (updated: WorkflowStep) => {
    if (!activeWorkflow) return;
    setActiveWorkflow({
      ...activeWorkflow,
      steps: activeWorkflow.steps.map(s => s.id === updated.id ? updated : s)
    });
    setEditingStep(null);
  };

  const handleDeleteStep = (stepId: string) => {
    if (!activeWorkflow) return;
    setActiveWorkflow({
      ...activeWorkflow,
      steps: activeWorkflow.steps.filter(s => s.id !== stepId)
    });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (!activeWorkflow) return;
    const next = [...activeWorkflow.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setActiveWorkflow({ ...activeWorkflow, steps: next });
  };

  const handleTest = () => {
    if (!activeWorkflow) return;
    workflowEngine.start(activeWorkflow);
  };

  return (
    <div className="omni-admin-root" style={{
      position: 'fixed', inset: 0, 
      background: engineState.status === 'idle' ? '#020617' : 'rgba(2, 6, 23, 0.4)', 
      backdropFilter: engineState.status === 'idle' ? 'none' : 'blur(4px)',
      color: 'white',
      fontFamily: "'Manrope', sans-serif",
      zIndex: 2147483647,
      display: 'flex', flexDirection: 'column',
      transition: 'all 0.5s ease',
      pointerEvents: engineState.status === 'idle' ? 'all' : 'none'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');
        .omni-admin-root, .omni-admin-root * { font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
        .admin-btn {
          display: flex; alignItems: center; gap: 8px;
          padding: 8px 16px; border-radius: 8px; border: none;
          font-weight: 600; font-size: 13px; cursor: pointer;
          transition: all 0.2s;
        }
        .admin-btn-primary { background: #3b82f6; color: white; }
        .admin-btn-primary:hover { background: #2563eb; transform: translateY(-1px); }
        .admin-btn-success { background: #10b981; color: white; }
        .admin-btn-success:hover { background: #059669; transform: translateY(-1px); }
        .admin-btn-ghost { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); }
        .admin-btn-ghost:hover { background: rgba(255,255,255,0.1); color: white; }
        .wf-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 16px; transition: all 0.2s; cursor: pointer;
        }
        .wf-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); }
        .step-card {
          background: #1e293b; border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px; padding: 20px; display: flex; gap: 16px; align-items: center;
          margin-bottom: 12px; position: relative;
        }
        .admin-input {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: white; padding: 10px 14px; font-size: 14px; outline: none;
        }
        .admin-input:focus { border-color: #3b82f6; }
        select.admin-input option {
          background: #1e293b;
          color: white;
        }
      `}</style>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        opacity: engineState.status === 'idle' ? 1 : 0,
        visibility: engineState.status === 'idle' ? 'visible' : 'hidden',
        transition: 'all 0.3s ease'
      }}>
        {/* Header */}
        <div style={{ 
          height: '72px', padding: '0 24px', 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#0f172a'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layout size={20} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em' }}>Omni Flow Builder</span>
                <button 
                  onClick={() => setShowGuideline(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    outline: 'none',
                    transition: 'all 0.2s',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  }}
                  title="How to use Flow"
                >
                  ?
                </button>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.4, textTransform: 'uppercase' }}>Admin Console</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {activeWorkflow ? (
              <>
                <button className="admin-btn admin-btn-ghost" onClick={() => setActiveWorkflow(null)}><ArrowLeft size={16} /> Back</button>
                <button className="admin-btn admin-btn-ghost" onClick={handleTest}><Play size={16} /> Test Flow</button>
                <button className="admin-btn admin-btn-ghost" onClick={handleExport}><Zap size={16} /> Export JSON</button>
                <button className="admin-btn admin-btn-success" onClick={handlePublish} disabled={isPublishing}>
                  {isPublishing ? <Clock size={16} className="animate-spin" /> : <Cloud size={16} />}
                  Published
                </button>
                <button className="admin-btn admin-btn-primary" onClick={handleSave}><Save size={16} /> Save</button>
              </>
            ) : (
              <>
                <button className="admin-btn admin-btn-ghost" onClick={onClose}><X size={16} /> Close</button>
                <button className="admin-btn admin-btn-primary" onClick={handleCreateWorkflow}><Plus size={16} /> Create Workflow</button>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {!activeWorkflow ? (
            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
              <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '32px' }}>Your Workflows</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {workflows.map(wf => (
                    <div key={wf.id} className="wf-card" onClick={() => setActiveWorkflow(wf)}>
                      <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>{wf.name}</div>
                      <div style={{ fontSize: '13px', opacity: 0.5, marginBottom: '20px', lineHeight: '1.4' }}>{wf.description}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 8px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', borderRadius: '6px' }}>{wf.steps.length} Steps</span>
                         <span style={{ fontSize: '11px', opacity: 0.3 }}>Updated {new Date(wf.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  <div className="wf-card" style={{ borderStyle: 'dashed', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', opacity: 0.6 }} onClick={handleCreateWorkflow}>
                     <Plus size={32} />
                     <span style={{ fontWeight: 600 }}>New Workflow</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, padding: '40px', overflowY: 'auto', background: '#020617' }}>
                <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                  <div style={{ marginBottom: '48px' }}>
                    <input 
                      className="admin-input" 
                      style={{ fontSize: '32px', fontWeight: 800, width: '100%', background: 'transparent', border: 'none', padding: 0, marginBottom: '8px' }}
                      value={activeWorkflow.name}
                      onChange={e => setActiveWorkflow({...activeWorkflow, name: e.target.value})}
                      placeholder="Workflow Name"
                    />
                    <input 
                      className="admin-input" 
                      style={{ width: '100%', background: 'transparent', border: 'none', padding: 0, opacity: 0.5 }}
                      value={activeWorkflow.description}
                      onChange={e => setActiveWorkflow({...activeWorkflow, description: e.target.value})}
                      placeholder="Describe the business process..."
                    />
                  </div>

                  <div style={{ position: 'relative' }}>
                    {activeWorkflow.steps.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '64px', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '24px', color: 'rgba(255,255,255,0.2)' }}>
                        <Zap size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <div style={{ fontWeight: 600 }}>Your workflow is empty.</div>
                        <div style={{ fontSize: '14px' }}>Add actions from the library to get started.</div>
                      </div>
                    )}

                    {activeWorkflow.steps.map((step, idx) => (
                      <div key={step.id} className="step-card">
                        <div style={{ color: 'rgba(255,255,255,0.2)', cursor: 'grab' }}><GripVertical size={20} /></div>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>{idx + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{step.title}</div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                             <span style={{ fontSize: '11px', opacity: 0.4 }}>Page: {pages.find(p => p.id === step.pageId)?.name || 'Unknown'}</span>
                             <span style={{ fontSize: '11px', opacity: 0.4 }}>•</span>
                             <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600 }}>{(step.expectedAction || 'CLICK').toUpperCase()}</span>
                          </div>
                          {step.overrideValue && (
                            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>Value: {step.overrideValue}</div>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="admin-btn-ghost" style={{ padding: '6px' }} onClick={() => moveStep(idx, 'up')}><ChevronRight size={14} style={{ transform: 'rotate(-90deg)' }} /></button>
                          <button className="admin-btn-ghost" style={{ padding: '6px' }} onClick={() => moveStep(idx, 'down')}><ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} /></button>
                          <button className="admin-btn-ghost" style={{ padding: '6px', color: '#ef4444' }} onClick={() => handleDeleteStep(step.id)}><Trash2 size={14} /></button>
                        </div>

                        <div style={{ position: 'absolute', bottom: '-10px', right: '20px', zIndex: 10 }}>
                           <button 
                             className="admin-btn" 
                             style={{ 
                               padding: '6px 14px', 
                               fontSize: '11px', 
                               borderRadius: '8px', 
                               background: '#3b82f6', 
                               color: 'white',
                               boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                               border: '1px solid rgba(255,255,255,0.1)'
                             }} 
                             onClick={() => setEditingStep(step)}
                           >
                              <Settings size={12} /> Configure
                           </button>
                        </div>
                      </div>
                    ))}

                    <button 
                      className="admin-btn admin-btn-ghost" 
                      style={{ width: '100%', justifyContent: 'center', padding: '16px', borderStyle: 'dashed', marginTop: '12px' }}
                      onClick={() => setShowLibrary(true)}
                    >
                      <Plus size={18} /> Add Action to Workflow
                    </button>
                  </div>
                </div>
              </div>

              {showLibrary && (
                <div style={{ width: '380px', background: '#0f172a', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '16px' }}>Action Library</div>
                    <button onClick={() => { setShowLibrary(false); setSearchQuery(''); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><X size={20} /></button>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                      <input 
                        className="admin-input" 
                        style={{ width: '100%', paddingLeft: '36px' }} 
                        placeholder="Search Studio actions..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                      {allActions.map(action => (
                        <div key={action.id} className="wf-card" style={{ padding: '12px' }} onClick={() => handleAddStep(action)}>
                          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{action.title}</div>
                          <div style={{ fontSize: '11px', opacity: 0.4 }}>Page: {action.pageName}</div>
                        </div>
                      ))}
                      {allActions.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', opacity: 0.3, fontSize: '13px' }}>
                          No actions found matching your search.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Step Configuration Modal */}
        {editingStep && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2147483647, backdropFilter: 'blur(8px)' }}>
            <div style={{ background: '#1e293b', width: '400px', borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Edit2 size={22} color="#3b82f6" /> Configure Step
              </h3>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#3b82f6', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected Action</label>
                <select 
                  className="admin-input" 
                  style={{ width: '100%', cursor: 'pointer' }}
                  value={editingStep.expectedAction || 'click'}
                  onChange={e => setEditingStep({...editingStep, expectedAction: e.target.value})}
                >
                  <option value="click">Click / Trigger</option>
                  <option value="input">Type / Input Value</option>
                  <option value="select">Select from Dropdown</option>
                </select>
              </div>

              {(editingStep.expectedAction === 'input' || editingStep.expectedAction === 'select') && (
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#3b82f6', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Value to provide</label>
                  <input 
                    className="admin-input" 
                    style={{ width: '100%' }}
                    placeholder="e.g. TRAN HOANG VIET"
                    value={editingStep.overrideValue || ''}
                    onChange={e => setEditingStep({...editingStep, overrideValue: e.target.value})}
                    autoFocus
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="admin-btn admin-btn-ghost" style={{ padding: '10px 20px' }} onClick={() => setEditingStep(null)}>Cancel</button>
                <button className="admin-btn admin-btn-primary" style={{ padding: '10px 24px', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }} onClick={() => updateStep(editingStep)}>Apply Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {engineState.status !== 'idle' && (
        <div style={{
          position: 'fixed', bottom: '40px', right: '40px',
          width: '320px', background: '#1e293b', border: '1px solid #3b82f6',
          borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          padding: '24px', zIndex: 2147483647,
          pointerEvents: 'all'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {engineState.status === 'completed' ? <CheckCircle2 size={18} color="#10b981" /> : <Clock size={18} color="#3b82f6" className="animate-spin" />}
              <span style={{ fontWeight: 800, fontSize: '14px' }}>Test Mode</span>
            </div>
            <button onClick={() => workflowEngine.stop()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><X size={18} /></button>
          </div>
          
          <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#94a3b8', marginBottom: '20px' }}>
            {engineState.message}
          </div>

          <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', background: '#3b82f6', 
              width: `${((engineState.currentStepIndex) / (activeWorkflow?.steps.length || 1)) * 100}%`,
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>
          
          <div style={{ marginTop: '8px', fontSize: '10px', fontWeight: 800, opacity: 0.3, textAlign: 'right', textTransform: 'uppercase' }}>
            Step {engineState.currentStepIndex + 1} of {activeWorkflow?.steps.length}
          </div>
        </div>
      )}

      {showGuideline && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2147483647,
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
              {FLOW_GUIDELINE.title}
            </h2>

            <p style={{
              fontSize: '13px',
              lineHeight: '1.5',
              color: 'rgba(255, 255, 255, 0.65)',
              margin: '0 0 24px 0',
              fontWeight: 400
            }}>
              {FLOW_GUIDELINE.description}
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
              {FLOW_GUIDELINE.howToUse.map((step, idx) => (
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
              {FLOW_GUIDELINE.impact.map((point, idx) => (
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
  );
}
