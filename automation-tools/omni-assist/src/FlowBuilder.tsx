import { 
  Plus, Trash2, 
  Search, X, Settings, Zap, ArrowLeft, Check, Edit2
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { workflowConfig, studioConfig } from './persistence';
import { BUSINESS_SITE_SCHEMA } from './schema-data';
// import { workflowEngine } from './workflow-engine';
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

// Custom locale-independent date formatter producing "Updated 24 Apr 26" style strings
const formatWorkflowDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const monthName = months[date.getMonth()];
  const yearShort = date.getFullYear().toString().slice(-2);
  return `Updated ${day} ${monthName} ${yearShort}`;
};

// Premium iOS-style React toggle switch
interface IosToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}
const IosToggle = ({ checked, onChange }: IosToggleProps) => {
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      style={{
        width: '38px',
        height: '20px',
        borderRadius: '10px',
        background: checked ? '#29823B' : 'rgba(255,255,255,0.15)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        padding: '2px',
        boxSizing: 'border-box'
      }}
    >
      <div style={{
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: 'white',
        position: 'absolute',
        left: checked ? '20px' : '2px',
        transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
      }} />
    </div>
  );
};

interface FlowBuilderProps {
  onClose: () => void;
}

export default function FlowBuilder({ onClose }: FlowBuilderProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [originalWorkflow, setOriginalWorkflow] = useState<string | null>(null);

  const hasChanges = useMemo(() => {
    if (!activeWorkflow || !originalWorkflow) return false;
    return JSON.stringify(activeWorkflow) !== originalWorkflow;
  }, [activeWorkflow, originalWorkflow]);
  
  // Reference onClose to satisfy TypeScript
  if (false) onClose();
  const [showLibrary, setShowLibrary] = useState(false);
  const [showGuideline, setShowGuideline] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const isDragHandlePressed = useRef(false);
  
  // Library & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [pages, setPages] = useState<PageConfig[]>([]);

  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);

  // Initialize and pre-populate default workflows if empty
  useEffect(() => {
    const saved = wfManager.getWorkflows();
    if (saved.length === 0) {
      const defaultFlows: Workflow[] = [
        {
          id: 'wf-create-viet-request',
          name: "Create Viet's Request",
          description: "Automate creation of Viet's Request form from landing dashboard with premium details.",
          steps: [
            {
              id: 'ds-1',
              actionId: 'select-country',
              pageId: 'wizard-step-0',
              title: 'Select Country',
              executionMode: 'auto',
              overrideValue: 'Singapore',
              expectedAction: 'select',
              targetQuery: 'text=Country',
              locators: { role: 'combobox', context: 'Project Contact Info', semantic: 'Country' }
            },
            {
              id: 'ds-2',
              actionId: 'select-business-area',
              pageId: 'wizard-step-0',
              title: 'Select Business Area',
              executionMode: 'auto',
              overrideValue: 'Corporate',
              expectedAction: 'select',
              targetQuery: 'text=Business Area',
              locators: { role: 'combobox', context: 'Project Contact Info', semantic: 'Business Area' }
            },
            {
              id: 'ds-3',
              actionId: 'select-lob',
              pageId: 'wizard-step-0',
              title: 'Select LOB',
              executionMode: 'auto',
              overrideValue: 'Banking',
              expectedAction: 'select',
              targetQuery: 'text=LOB',
              locators: { role: 'combobox', context: 'Project Contact Info', semantic: 'LOB' }
            },
            {
              id: 'ds-4',
              actionId: 'select-talent-augmentation',
              pageId: 'wizard-step-0',
              title: 'Select Talent Augmentation',
              executionMode: 'auto',
              expectedAction: 'click',
              targetQuery: 'text=Talent Augmentation',
              locators: { role: 'any', context: 'request type', semantic: 'talent augmentation' }
            },
            {
              id: 'ds-5',
              actionId: 'click-next',
              pageId: 'wizard-step-0',
              title: 'Click Next',
              executionMode: 'auto',
              expectedAction: 'click',
              targetQuery: 'id=btn-wizard-next',
              locators: { role: 'button', semantic: 'Next' }
            },
            {
              id: 'ds-6',
              actionId: 'type-project-name',
              pageId: 'wizard-step-1',
              title: 'Type Project Name',
              executionMode: 'auto',
              overrideValue: 'AI Assistant Integration',
              expectedAction: 'input',
              targetQuery: 'text=Name / Title',
              locators: { role: 'input', context: 'Business Request Detail', semantic: 'Name / Title' }
            },
            {
              id: 'ds-7',
              actionId: 'type-project-desc',
              pageId: 'wizard-step-1',
              title: 'Type Project Description',
              executionMode: 'auto',
              overrideValue: 'Integrating Omni Assistant for business automation.',
              expectedAction: 'input',
              targetQuery: 'text=Description',
              locators: { role: 'textarea', context: 'Business Request Detail', semantic: 'Description' }
            }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isPublished: true
        },
        {
          id: 'wf-filter-projects',
          name: "Filter Discovering Projects",
          description: "Search for specific active projects matching keywords in the Request Dashboard.",
          steps: [
            {
              id: 'ds-8',
              actionId: 'search-request',
              pageId: 'dashboard',
              title: 'Search Request',
              executionMode: 'auto',
              overrideValue: 'Project A',
              expectedAction: 'input',
              targetQuery: 'text=Search',
              locators: { role: 'input', semantic: 'Search' }
            }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isPublished: false
        },
        {
          id: 'wf-create-sol-delivery',
          name: "Create Solution Delivery Request",
          description: "Initialize a standard solution delivery flow from client registration to form submittal.",
          steps: [
            {
              id: 'ds-9',
              actionId: 'select-country',
              pageId: 'wizard-step-0',
              title: 'Select Country',
              executionMode: 'auto',
              overrideValue: 'Singapore',
              expectedAction: 'select',
              targetQuery: 'text=Country',
              locators: { role: 'combobox', context: 'Project Contact Info', semantic: 'Country' }
            },
            {
              id: 'ds-10',
              actionId: 'ssd0',
              pageId: 'wizard-step-0',
              title: 'Select Solution Delivery',
              executionMode: 'auto',
              expectedAction: 'click',
              targetQuery: 'text=Solution Delivery',
              locators: { role: 'any', context: 'request type', semantic: 'solution delivery' }
            },
            {
              id: 'ds-11',
              actionId: 'click-next',
              pageId: 'wizard-step-0',
              title: 'Click Next',
              executionMode: 'auto',
              expectedAction: 'click',
              targetQuery: 'id=btn-wizard-next',
              locators: { role: 'button', semantic: 'Next' }
            }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isPublished: true
        }
      ];
      defaultFlows.forEach(w => wfManager.saveWorkflow(w));
      setWorkflows(defaultFlows);
    } else {
      setWorkflows(saved);
    }
  }, []);

  // Refresh pages whenever library is opened to catch new Studio actions
  useEffect(() => {
    if (showLibrary || !activeWorkflow) {
      const configManager = studioConfig(BUSINESS_SITE_SCHEMA);
      setPages(configManager.getPages());
    }
  }, [showLibrary, activeWorkflow]);

  const unfilteredActions = useMemo(() => {
    return pages.flatMap(p => p.tasks.filter(t => t.steps.length > 0).map(t => ({ ...t, pageId: p.id, pageName: p.name })));
  }, [pages]);

  const allActions = useMemo(() => {
    if (!searchQuery.trim()) return unfilteredActions;
    
    const query = searchQuery.toLowerCase();
    return unfilteredActions.filter(a => 
      a.title.toLowerCase().includes(query) || 
      (a.description && a.description.toLowerCase().includes(query)) ||
      a.pageName.toLowerCase().includes(query)
    );
  }, [unfilteredActions, searchQuery]);

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
    setOriginalWorkflow(JSON.stringify(newWf));
  };

  const handleSave = async () => {
    if (!activeWorkflow) return;
    const updated = { ...activeWorkflow, updatedAt: Date.now() };
    wfManager.saveWorkflow(updated);
    setWorkflows(wfManager.getWorkflows());

    if (updated.isPublished) {
      const enriched = getEnrichedWorkflow(updated);
      try {
        await fetch("http://localhost:6789/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(enriched)
        });
      } catch (e) {
        console.warn("Failed to automatically publish workflow to backend service:", e);
      }
    } else {
      try {
        await fetch(`http://localhost:6789/api/unpublish/${updated.id}`, {
          method: "POST"
        });
      } catch (e) {
        console.warn("Failed to automatically unpublish workflow from backend service:", e);
      }
    }
  };

  const getEnrichedWorkflow = (wf: Workflow) => {
    const studioPages = studioConfig(BUSINESS_SITE_SCHEMA).getPages();
    const allStudioTasks = studioPages.flatMap(p => p.tasks);

    const enrichedSteps = wf.steps.map(step => {
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

    return { ...wf, steps: enrichedSteps, isPublished: true };
  };

  /*
  const handleExport = () => {
    if (!activeWorkflow) return;
    const enrichedWf = getEnrichedWorkflow(activeWorkflow);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify([enrichedWf], null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${enrichedWf.name.replace(/\s+/g, '_')}_artifact.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
  */

  const handleTogglePublish = async (checked: boolean, wf: Workflow) => {
    const updated = { ...wf, isPublished: checked, updatedAt: Date.now() };
    wfManager.saveWorkflow(updated);
    setWorkflows(wfManager.getWorkflows());

    if (checked) {
      const enriched = getEnrichedWorkflow(updated);
      try {
        await fetch("http://localhost:6789/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(enriched)
        });
      } catch (e) {
        console.warn("Failed to automatically publish workflow to backend service:", e);
      }
    } else {
      try {
        await fetch(`http://localhost:6789/api/unpublish/${updated.id}`, {
          method: "POST"
        });
      } catch (e) {
        console.warn("Failed to automatically unpublish workflow from backend service:", e);
      }
    }
  };


  const handleAddMultipleSteps = (selectedActionsList: any[]) => {
    if (!activeWorkflow) return;
    const baseTime = Date.now();
    const newSteps: WorkflowStep[] = selectedActionsList.map((action, idx) => {
      return {
        id: `step-${baseTime}-${idx}`,
        pageId: action.pageId,
        actionId: action.id,
        title: action.title || action.description,
        executionMode: 'auto',
        expectedAction: action.steps?.[0]?.expectedAction || action.expectedAction,
        targetQuery: action.steps?.[0]?.targetQuery || action.targetQuery,
        locators: action.steps?.[0]?.locators || action.locators,
        overrideValue: action.steps?.[0]?.autoValue || action.autoValue
      };
    });
    setActiveWorkflow({
      ...activeWorkflow,
      steps: [...activeWorkflow.steps, ...newSteps]
    });
    setShowLibrary(false);
    setSearchQuery('');
    setSelectedActionIds([]);
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

  const swapSteps = (fromIndex: number, toIndex: number) => {
    if (!activeWorkflow) return;
    if (fromIndex < 0 || fromIndex >= activeWorkflow.steps.length) return;
    if (toIndex < 0 || toIndex >= activeWorkflow.steps.length) return;
    if (fromIndex === toIndex) return;

    const next = [...activeWorkflow.steps];
    const [draggedItem] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggedItem);
    setActiveWorkflow({ ...activeWorkflow, steps: next });
  };

  /*
  const handleTest = () => {
    if (!activeWorkflow) return;
    workflowEngine.start(activeWorkflow);
  };
  */

  return (
    <div className="omni-admin-root" style={{
      width: '100%',
      height: '100%',
      color: 'white',
      fontFamily: "'Manrope', sans-serif",
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <style>{`
        .admin-btn {
          display: flex; alignItems: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px; border: none;
          font-weight: 600; font-size: 12px; cursor: pointer;
          transition: all 0.2s;
        }
        .admin-btn-primary { background: #3b82f6; color: white; }
        .admin-btn-primary:hover { background: #2563eb; transform: translateY(-1px); }
        .admin-btn-ghost { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.08); }
        .admin-btn-ghost:hover { background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.15); }
        .wf-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 16px; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;
        }
        .wf-card:hover { 
          background: rgba(59, 130, 246, 0.05); 
          border-color: rgba(59, 130, 246, 0.35); 
          transform: translateY(-2px);
        }
        .step-card {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px; padding: 16px; display: flex; gap: 12px; align-items: center;
          margin-bottom: 12px; position: relative;
        }
        .admin-input {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: white; padding: 8px 12px; font-size: 13px; outline: none;
        }
        .admin-input:focus { border-color: #3b82f6; }
        select.admin-input option {
          background: #1e293b;
          color: white;
        }
        @keyframes slideInDrop {
          from { height: 0; opacity: 0; margin-bottom: 0; }
          to { height: 4px; opacity: 1; margin-bottom: 12px; }
        }
        @keyframes slideInDropBottom {
          from { height: 0; opacity: 0; margin-top: 0; }
          to { height: 4px; opacity: 1; margin-top: 12px; }
        }
      `}</style>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {!activeWorkflow ? (
          /* WORKFLOWS LIST VIEW */
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>My Flows</span>
              </div>

              <button 
                className="admin-btn admin-btn-primary animate-fade-in"
                onClick={handleCreateWorkflow}
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  padding: '6px 14px'
                }}
              >
                <Plus size={14} /> Create New Flow
              </button>
            </div>

            {/* Vertical scrollable card container */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {workflows.map(wf => (
                <div 
                  key={wf.id} 
                  className="wf-card" 
                  onClick={() => {
                    setActiveWorkflow(wf);
                    setOriginalWorkflow(JSON.stringify(wf));
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* Top Row: Name & Show to Users iOS Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {wf.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 600 }}>Show to Users</span>
                      <IosToggle checked={!!wf.isPublished} onChange={(checked) => handleTogglePublish(checked, wf)} />
                    </div>
                  </div>

                  {/* Ellipsis Truncated description */}
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'rgba(255,255,255,0.5)', 
                    lineHeight: '1.4',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {wf.description || 'No description provided.'}
                  </div>

                  {/* Bottom Row: Steps Count & Date Stamp */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: 700, 
                      padding: '3px 8px', 
                      background: 'rgba(184, 210, 249, 0.1)', 
                      color: '#B8D2F9', 
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}>
                      {wf.steps.length} {wf.steps.length === 1 ? 'step' : 'steps'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                      {formatWorkflowDate(wf.updatedAt)}
                    </span>
                  </div>
                </div>
              ))}
              {workflows.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.3, fontSize: '13px' }}>
                  No workflows found. Click "+ Create New Flow" to start.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* WORKFLOW EDITOR VIEW */
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
            {/* Header / Toolbar Row */}
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              alignItems: 'flex-start', 
              padding: '24px 24px 12px 24px'
            }}>
              {/* Back Button */}
              <button 
                className="admin-btn-ghost" 
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '8px', 
                  border: '1px solid rgba(255,255,255,0.12)', 
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  padding: 0
                }} 
                onClick={() => {
                  setActiveWorkflow(null);
                  setOriginalWorkflow(null);
                }}
              >
                <ArrowLeft size={16} />
              </button>

              {/* Header Title, Toggle & Actions Column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Title and Controls Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <input 
                    style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: 'white',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      padding: 0,
                      margin: 0,
                      width: '60%',
                      fontFamily: 'inherit'
                    }}
                    value={activeWorkflow.name}
                    onChange={e => setActiveWorkflow({...activeWorkflow, name: e.target.value})}
                    placeholder="Workflow Name"
                  />

                  {/* Right side controls: Show to Users toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>Show to Users</span>
                    <IosToggle 
                      checked={!!activeWorkflow.isPublished} 
                      onChange={(checked) => {
                        const updated = { ...activeWorkflow, isPublished: checked, updatedAt: Date.now() };
                        setActiveWorkflow(updated);
                      }} 
                    />
                  </div>
                </div>

                {/* Description Row */}
                <input 
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: 0,
                    margin: 0,
                    width: '100%',
                    fontFamily: 'inherit'
                  }}
                  value={activeWorkflow.description}
                  onChange={e => setActiveWorkflow({...activeWorkflow, description: e.target.value})}
                  placeholder="Describe the business process..."
                />
              </div>
            </div>

            {/* List of Steps */}
            <div 
              style={{ flex: 1, padding: '12px 24px', overflowY: 'auto' }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedIdx !== null) {
                  const containerRect = e.currentTarget.getBoundingClientRect();
                  const relativeY = e.clientY - containerRect.top + e.currentTarget.scrollTop;
                  const hoverIdx = Math.floor((relativeY - 12) / 86);
                  const targetIdx = Math.max(0, Math.min(activeWorkflow.steps.length - 1, hoverIdx));
                  if (dragOverIdx !== targetIdx) {
                    setDragOverIdx(targetIdx);
                  }
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIdx !== null && dragOverIdx !== null && draggedIdx !== dragOverIdx) {
                  swapSteps(draggedIdx, dragOverIdx);
                }
                setDraggedIdx(null);
                setDragOverIdx(null);
              }}
            >
              <div style={{ position: 'relative' }}>
                {activeWorkflow.steps.length === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '48px 20px', 
                    border: '2px dashed rgba(255,255,255,0.05)', 
                    borderRadius: '20px', 
                    color: 'rgba(255,255,255,0.25)',
                    marginBottom: '16px'
                  }}>
                    <Zap size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Your workflow is empty.</div>
                    <div style={{ fontSize: '12px', marginTop: '2px' }}>Add actions from the library to get started.</div>
                  </div>
                )}

                {activeWorkflow.steps.map((step, idx) => {
                  const isDraggingThis = draggedIdx === idx;
                  const isDragOverThis = dragOverIdx === idx;
                  const isEditingThis = editingStep && editingStep.id === step.id;
                  
                  let translateY = 0;
                  if (draggedIdx !== null && dragOverIdx !== null) {
                    if (idx === draggedIdx) {
                      translateY = (dragOverIdx - draggedIdx) * 86;
                    } else {
                      if (draggedIdx < dragOverIdx) {
                        if (idx > draggedIdx && idx <= dragOverIdx) {
                          translateY = -86;
                        }
                      } else {
                        if (idx < draggedIdx && idx >= dragOverIdx) {
                          translateY = 86;
                        }
                      }
                    }
                  }

                  return (
                    <div 
                      key={step.id} 
                      style={{ 
                        position: 'relative',
                        transform: `translateY(${translateY}px)`,
                        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        zIndex: isDraggingThis ? 10 : 1
                      }}
                    >
                      <div 
                        className="step-card"
                        draggable={true}
                        onMouseDown={(e) => {
                          const target = e.target as HTMLElement;
                          isDragHandlePressed.current = !!target.closest('[data-drag-handle="true"]');
                        }}
                        onTouchStart={(e) => {
                          const target = e.target as HTMLElement;
                          isDragHandlePressed.current = !!target.closest('[data-drag-handle="true"]');
                        }}
                        onDragStart={(e) => {
                          if (!isDragHandlePressed.current) {
                            e.preventDefault();
                            return;
                          }
                          setEditingStep(null);
                          setDraggedIdx(idx);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedIdx(null);
                          setDragOverIdx(null);
                          isDragHandlePressed.current = false;
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          marginBottom: '12px',
                          position: 'relative',
                          background: isDraggingThis 
                            ? (dragOverIdx !== null ? 'rgba(59, 130, 246, 0.04)' : 'rgba(255, 255, 255, 0.01)') 
                            : isDragOverThis 
                              ? 'rgba(59, 130, 246, 0.02)' 
                              : 'rgba(255, 255, 255, 0.03)',
                          border: isDraggingThis 
                            ? (dragOverIdx !== null ? '2px dashed rgba(59, 130, 246, 0.6)' : '1px dashed rgba(255, 255, 255, 0.1)') 
                            : isDragOverThis 
                              ? '1px solid rgba(59, 130, 246, 0.25)' 
                              : isEditingThis
                                ? '1px solid rgba(59, 130, 246, 0.3)'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '16px',
                          padding: '16px',
                          opacity: isDraggingThis ? 0.6 : 1,
                          transform: isDragOverThis ? 'scale(1.005)' : 'scale(1)',
                          boxShadow: isDraggingThis && dragOverIdx !== null 
                            ? '0 0 16px rgba(59, 130, 246, 0.15)' 
                            : isDragOverThis 
                              ? '0 4px 12px rgba(59, 130, 246, 0.08)' 
                              : isEditingThis
                                ? '0 4px 20px rgba(0, 0, 0, 0.2)'
                                : 'none',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'default',
                          userSelect: 'none',
                          WebkitUserSelect: 'none'
                        }}
                      >
                        {/* Top Row: Main Details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                          {/* Drag Handle Icon (=) */}
                          <div 
                            data-drag-handle="true"
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '3px', 
                              width: '12px', 
                              opacity: 0.35, 
                              cursor: 'grab',
                              flexShrink: 0
                            }}
                          >
                            <div style={{ height: '2px', background: 'white', borderRadius: '1px' }} />
                            <div style={{ height: '2px', background: 'white', borderRadius: '1px' }} />
                          </div>

                          {/* Step Number Circle */}
                          <div 
                            draggable={false}
                            style={{ 
                              width: '32px', 
                              height: '32px', 
                              borderRadius: '50%', 
                              background: 'rgba(59, 130, 246, 0.12)', 
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              color: '#B8D2F9', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontSize: '13px', 
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                          >
                            {idx + 1}
                          </div>
                          
                          {/* Step Name & Sub-label */}
                          <div style={{ flex: 1, overflow: 'hidden', paddingRight: '12px' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {step.title}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Page: {pages.find(p => p.id === step.pageId)?.name || 'Unknown'}
                              </span>
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>·</span>
                              <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 600 }}>
                                {(step.expectedAction || 'CLICK').toUpperCase()}
                              </span>
                            </div>
                          </div>
                          
                          {/* Action Buttons: Configure & Delete */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <button 
                              className="admin-btn-ghost" 
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '8px', 
                                border: isEditingThis 
                                  ? '1px solid rgba(59, 130, 246, 0.5)' 
                                  : '1px solid rgba(255,255,255,0.12)', 
                                background: isEditingThis 
                                  ? 'rgba(59, 130, 246, 0.1)' 
                                  : 'rgba(255,255,255,0.02)',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: isEditingThis ? '#60a5fa' : 'white',
                                transition: 'all 0.2s',
                                padding: 0
                              }} 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isEditingThis) {
                                  setEditingStep(null);
                                } else {
                                  setEditingStep(step);
                                }
                              }}
                            >
                              <Settings size={14} />
                            </button>
                            <button 
                              className="admin-btn-ghost" 
                              style={{ 
                                border: 'none', 
                                background: 'none', 
                                cursor: 'pointer', 
                                color: 'rgba(255,255,255,0.4)',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                padding: '6px',
                                transition: 'all 0.2s'
                              }} 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStep(step.id);
                                if (isEditingThis) {
                                  setEditingStep(null);
                                }
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Inline Configuration Panel (Expandable) */}
                        {isEditingThis && (
                          <div style={{
                            width: '100%',
                            marginTop: '14px',
                            paddingTop: '14px',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}>
                            {/* Configure Step Header */}
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              color: '#60a5fa', 
                              fontSize: '11px', 
                              fontWeight: 700, 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.05em',
                              marginBottom: '2px'
                            }}>
                              <Edit2 size={12} color="#60a5fa" /> Configure Step
                            </div>
                            {/* Expected Action Select */}
                            <div>
                              <label style={{ 
                                fontSize: '11px', 
                                fontWeight: 700, 
                                color: 'white', 
                                display: 'block', 
                                marginBottom: '6px', 
                                letterSpacing: '0.02em' 
                              }}>
                                Expected Action
                              </label>
                              <select 
                                className="admin-input" 
                                style={{ 
                                  width: '100%', 
                                  cursor: 'pointer',
                                  background: 'rgba(0,0,0,0.2)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '8px',
                                  color: 'white',
                                  padding: '8px 12px',
                                  fontSize: '13px',
                                  boxSizing: 'border-box'
                                }}
                                value={editingStep.expectedAction || 'click'}
                                onChange={e => setEditingStep({...editingStep, expectedAction: e.target.value})}
                              >
                                <option value="click" style={{ background: '#1e293b' }}>Click / Trigger</option>
                                <option value="input" style={{ background: '#1e293b' }}>Type / Input Value</option>
                                <option value="select" style={{ background: '#1e293b' }}>Select from Dropdown</option>
                              </select>
                            </div>

                            {/* Value Input */}
                            {(editingStep.expectedAction === 'input' || editingStep.expectedAction === 'select') && (
                              <div>
                                <label style={{ 
                                  fontSize: '11px', 
                                  fontWeight: 700, 
                                  color: 'white', 
                                  display: 'block', 
                                  marginBottom: '6px', 
                                  letterSpacing: '0.02em' 
                                }}>
                                  Value to provide
                                </label>
                                <input 
                                  className="admin-input" 
                                  style={{ 
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    padding: '8px 12px',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                  }}
                                  value={editingStep.overrideValue || ''}
                                  onChange={e => setEditingStep({...editingStep, overrideValue: e.target.value})}
                                  placeholder="Enter the value..."
                                />
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <button 
                                className="admin-btn-ghost"
                                style={{ 
                                  flex: 1, 
                                  padding: '8px 12px', 
                                  borderRadius: '8px', 
                                  fontSize: '12px',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  background: 'rgba(255,255,255,0.05)',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                                onClick={() => setEditingStep(null)}
                              >
                                Cancel
                              </button>
                              <button 
                                className="admin-btn-primary"
                                style={{ 
                                  flex: 1, 
                                  padding: '8px 12px', 
                                  borderRadius: '8px', 
                                  fontSize: '12px', 
                                  background: '#1068EB',
                                  color: 'white',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                                onClick={() => updateStep(editingStep)}
                              >
                                Apply Changes
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              padding: '12px 24px 24px 24px', 
              flexShrink: 0
            }}>
              {/* Delete Flow Button (Left) */}
              <button 
                className="admin-btn-ghost" 
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px 16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)', 
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px', 
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
                onClick={async () => {
                  const idToDelete = activeWorkflow.id;
                  wfManager.deleteWorkflow(idToDelete);
                  setWorkflows(wfManager.getWorkflows());
                  setActiveWorkflow(null);
                  setOriginalWorkflow(null);
                  try {
                    await fetch(`http://localhost:6789/api/unpublish/${idToDelete}`, {
                      method: "POST"
                    });
                  } catch (e) {
                    console.warn("Failed to automatically unpublish deleted workflow from backend service:", e);
                  }
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
                <Trash2 size={14} /> Delete Flow
              </button>

              {/* Add Action Button (Middle) */}
              <button 
                className="admin-btn-ghost" 
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '12px 16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)', 
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px', 
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flex: 1
                }}
                onClick={() => setShowLibrary(true)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <Plus size={14} /> Add Action
              </button>

              {/* Save Button (Right) */}
              <button 
                disabled={!hasChanges}
                style={{ 
                  flex: 1, 
                  justifyContent: 'center', 
                  padding: '12px', 
                  border: hasChanges ? 'none' : '1px solid rgba(255, 255, 255, 0.08)', 
                  background: hasChanges ? '#1068EB' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px', 
                  fontSize: '12px',
                  fontWeight: 600,
                  color: hasChanges ? 'white' : 'rgba(255, 255, 255, 0.3)',
                  cursor: hasChanges ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  handleSave();
                  setActiveWorkflow(null);
                  setOriginalWorkflow(null);
                }}
                onMouseEnter={(e) => {
                  if (hasChanges) {
                    e.currentTarget.style.background = '#0e59c8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasChanges) {
                    e.currentTarget.style.background = '#1068EB';
                  }
                }}
              >
                Save
              </button>
            </div>

            {/* Action Library Panel (Absolute Overlay) */}
            {showLibrary && (
              <div style={{ 
                position: 'absolute', 
                inset: 0, 
                background: '#0f172a', 
                zIndex: 100, 
                display: 'flex', 
                flexDirection: 'column' 
              }}>
                <div style={{ 
                  padding: '16px 20px', 
                  borderBottom: '1px solid rgba(255,255,255,0.05)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'white' }}>Action Library</div>
                  <button 
                    onClick={() => { setShowLibrary(false); setSearchQuery(''); setSelectedActionIds([]); }} 
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', paddingBottom: 0 }}>
                  <div style={{ position: 'relative', marginBottom: '14px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ffffff', opacity: 0.8 }} />
                    <input 
                      className="admin-input" 
                      style={{ 
                        width: '100%', 
                        paddingLeft: '34px', 
                        boxSizing: 'border-box',
                        fontSize: '13px',
                        height: '36px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px'
                      }} 
                      placeholder="Search Studio actions..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px', paddingBottom: '16px' }}>
                    {allActions.map(action => {
                      const isSelected = selectedActionIds.includes(action.id);
                      return (
                        <div 
                          key={action.id} 
                          className="wf-card" 
                          style={{ 
                            padding: '12px', 
                            background: 'rgba(255,255,255,0.02)', 
                            border: isSelected 
                              ? '1px solid rgba(16, 104, 235, 0.4)' 
                              : '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }} 
                          onClick={() => {
                            setSelectedActionIds(prev => 
                              prev.includes(action.id) 
                                ? prev.filter(id => id !== action.id) 
                                : [...prev, action.id]
                            );
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'rgba(59,130,246,0.05)';
                              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                            }
                          }}
                        >
                          {/* Custom Checkbox */}
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            background: isSelected ? '#1068EB' : 'rgba(255, 255, 255, 0.2)',
                            border: isSelected ? '1px solid #1068EB' : '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.2s'
                          }}>
                            {isSelected && (
                              <Check size={10} color="white" strokeWidth={3} />
                            )}
                          </div>

                          {/* Action Details */}
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'white', marginBottom: '6px' }}>{action.title}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', gap: '12px' }}>
                              <span 
                                style={{ 
                                  color: 'rgba(255,255,255,0.5)', 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap',
                                  flex: 1
                                }}
                                title={action.description || ''}
                              >
                                {action.description || ''}
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right' }}>
                                Page: {action.pageName}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {allActions.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.3, fontSize: '12px' }}>
                        No actions found matching search.
                      </div>
                    )}
                  </div>
                </div>

                {/* Library Footer Panel */}
                <div style={{ 
                  padding: '16px 20px', 
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
                  display: 'flex', 
                  gap: '12px',
                  background: '#0f172a'
                }}>
                  {/* Cancel Button */}
                  <button 
                    className="admin-btn-ghost" 
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '12px 16px',
                      border: '1px solid rgba(255, 255, 255, 0.08)', 
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px', 
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      flex: 1
                    }}
                    onClick={() => {
                      setShowLibrary(false);
                      setSearchQuery('');
                      setSelectedActionIds([]);
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
                    Cancel
                  </button>

                  {/* Confirm Button */}
                  <button 
                    disabled={selectedActionIds.length === 0}
                    style={{ 
                      flex: 1, 
                      justifyContent: 'center', 
                      padding: '12px', 
                      border: selectedActionIds.length > 0 ? 'none' : '1px solid rgba(255, 255, 255, 0.08)', 
                      background: selectedActionIds.length > 0 ? '#1068EB' : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px', 
                      fontSize: '12px',
                      fontWeight: 600,
                      color: selectedActionIds.length > 0 ? 'white' : 'rgba(255, 255, 255, 0.3)',
                      cursor: selectedActionIds.length > 0 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      const actionsToAdd = unfilteredActions.filter(a => selectedActionIds.includes(a.id));
                      handleAddMultipleSteps(actionsToAdd);
                    }}
                    onMouseEnter={(e) => {
                      if (selectedActionIds.length > 0) {
                        e.currentTarget.style.background = '#0e59c8';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedActionIds.length > 0) {
                        e.currentTarget.style.background = '#1068EB';
                      }
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}


          </div>
        )}
      </div>

      {/* Guideline Overlay (Absolute Overlay) */}
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
            width: '90%',
            maxHeight: '90%',
            overflowY: 'auto',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            padding: '20px 24px',
            color: '#ffffff',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowGuideline(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
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
              <X size={16} />
            </button>

            <h2 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 12px 0',
              lineHeight: '1.2'
            }}>
              {FLOW_GUIDELINE.title}
            </h2>

            <p style={{
              fontSize: '12px',
              lineHeight: '1.5',
              color: 'rgba(255, 255, 255, 0.65)',
              margin: '0 0 16px 0',
              fontWeight: 400
            }}>
              {FLOW_GUIDELINE.description}
            </p>

            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', marginBottom: '16px' }} />

            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '12px'
            }}>
              How to Use
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {FLOW_GUIDELINE.howToUse.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '6px', fontSize: '12px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.65)' }}>
                  <div style={{ fontWeight: 700, flexShrink: 0 }}>{idx + 1}.</div>
                  <div style={{ flex: 1 }}>{step}</div>
                </div>
              ))}
            </div>

            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', marginBottom: '16px' }} />

            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '12px'
            }}>
              Impact
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {FLOW_GUIDELINE.impact.map((point, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '12px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.65)' }}>
                  <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '14px', fontWeight: 800, flexShrink: 0 }}>•</div>
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
