import { useState, useEffect, useRef } from 'react'
import { 
  X, Send, Trash2, Play
} from 'lucide-react';
import { workflowEngine, type WorkflowState } from './workflow-engine'
import type { Workflow } from './workflow-schema'

interface Message {
  id: string;
  type: 'bot' | 'user';
  text: string;
  actions?: { label: string; onClick: () => void }[];
  status?: 'pending' | 'success';
}

const API_BASE = "http://localhost:6789";

export default function ResaApp() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [allWorkflows, setAllWorkflows] = useState<Workflow[]>([]);
  const [engineState, setEngineState] = useState<WorkflowState>({ status: 'idle', currentStepIndex: 0, message: '' });
  const scrollRef = useRef<HTMLDivElement>(null);

  const ASSETS = {
    bot: '/resa-assets/bot.svg',
    botBg: '/resa-assets/bot_bg.png',
    welcomeBg: '/resa-assets/welcome_bg.png',
    icon: '/resa-assets/icon.svg'
  };

  useEffect(() => {
    const initResa = async () => {
      // Fetch workflows from centralized backend instead of static JSON
      try {
        const resp = await fetch(`${API_BASE}/api/workflows`);
        if (resp.ok) {
          const all = await resp.json();
          setAllWorkflows(all);
        }
      } catch (e) {
        console.error('Failed to load workflows from backend', e);
      }
    };
    initResa();
    const cleanup = workflowEngine.onStateChange(setEngineState);
    return () => { cleanup(); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, engineState, isTyping]);

  useEffect(() => {
    if (engineState.status !== 'idle' && engineState.message) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.id === 'engine-status') {
        setMessages(prev => prev.map(m => m.id === 'engine-status' ? { ...m, text: engineState.message } : m));
      } else {
        setMessages(prev => [...prev, { id: 'engine-status', type: 'bot', text: engineState.message, status: engineState.status === 'completed' ? 'success' : 'pending' }]);
      }
    }
  }, [engineState.message, engineState.status]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), type: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const resp = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text })
      });

      if (resp.ok) {
        const data = await resp.json();
        
        // Proactively fetch latest workflows to ensure buttons work even for newly published tasks
        let latestWfs = allWorkflows;
        try {
          const refreshResp = await fetch(`${API_BASE}/api/workflows`);
          if (refreshResp.ok) {
            latestWfs = await refreshResp.json();
            setAllWorkflows(latestWfs);
          }
        } catch (e) {
          console.error('Failed to refresh workflows', e);
        }

        const botMsg: Message = {
          id: Date.now().toString(),
          type: 'bot',
          text: data.text,
          actions: data.actions?.map((act: any) => ({
            label: act.label,
            onClick: () => {
              const wf = latestWfs.find((w: any) => w.id === act.workflow_id);
              if (wf) {
                handleRunWorkflow(wf);
              } else {
                console.error('[RESA] Workflow not found even after refresh', act.workflow_id);
              }
            }
          }))
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error("API Error");
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'bot', text: "Sorry, I can't reach my backend right now. Is the FastAPI server running?" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRunWorkflow = (wf: Workflow) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), type: 'user', text: `Run workflow: ${wf.name}` }]);
    workflowEngine.start(wf);
  };

  const clearHistory = () => {
    setMessages([]);
  };

  return (
    <div className="resa-assist-root" style={{ fontFamily: "'Inter', sans-serif", color: 'white' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        .resa-chat-window {
          position: fixed; bottom: 100px; right: 30px;
          width: 420px; height: 540px; maxHeight: calc(100vh - 140px);
          border-radius: 24px; display: flex; flex-direction: column;
          box-shadow: 0 40px 80px rgba(0,0,0,0.6); z-index: 10000; overflow: hidden;
          background-size: cover; background-position: center;
          border: 1px solid rgba(255,255,255,0.15);
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        .resa-header {
          padding: 16px 20px; background: transparent;
          display: flex; align-items: center; justify-content: flex-end; gap: 12px;
        }

        .resa-messages {
          flex: 1; overflow-y: auto; padding: 0 24px 24px 24px; display: flex; flex-direction: column; gap: 12px;
        }

        .resa-footer {
          padding: 16px 24px; background: transparent;
        }

        .resa-bubble {
          max-width: 85%; padding: 14px 18px; border-radius: 18px; font-size: 14px; line-height: 1.5;
        }
        .bot-bubble { background: rgba(255,255,255,0.12); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.1); border-bottom-left-radius: 4px; }
        .user-bubble { background: #2563eb; border-bottom-right-radius: 4px; align-self: flex-end; }

        .resa-action-btn {
          background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);
          color: white; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 8px; margin-top: 8px;
        }
        .resa-action-btn:hover { background: #2563eb; transform: scale(1.02); }

        .floating-launcher {
          position: fixed; bottom: 30px; right: 30px; z-index: 9999; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .launcher-icon {
          width: 64px; height: 64px; border-radius: 32px;
          background: transparent; display: flex; align-items: center; justify-content: center;
          transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .floating-launcher:hover .launcher-icon { transform: scale(1.15) rotate(-15deg); }
        
        .launcher-tooltip {
          position: absolute; right: 72px; background: #0B57C7; color: white;
          padding: 10px 18px; border-radius: 24px; white-space: nowrap; font-size: 14px; font-weight: 600;
          opacity: 0; pointer-events: none; transition: 0.3s;
          box-shadow: 0 8px 20px rgba(0,0,0,0.4);
        }
        .floating-launcher:hover .launcher-tooltip { opacity: 1; transform: translateX(-10px); }

        .animate-float { animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes typing { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
        .dot { animation: typing 1s infinite; }
      `}</style>

      {/* Launcher */}
      {!isOpen && (
        <div className="floating-launcher" onClick={() => setIsOpen(true)}>
          <div className="launcher-tooltip">Hi I'm Resa - Your virtual assistant.</div>
          <div className="launcher-icon">
            <img src={ASSETS.icon} style={{ width: '52px', height: '52px' }} alt="Bot" />
          </div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="resa-chat-window" style={{ 
          backgroundImage: messages.length === 0 ? `url(${ASSETS.welcomeBg})` : `url(${ASSETS.botBg})`
        }}>
          {/* Header Controls */}
          <div className="resa-header">
            <button onClick={clearHistory} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '6px' }} title="Clear History"><Trash2 size={20} /></button>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '6px' }}><X size={24} /></button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="resa-messages">
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '20px' }}>
                <img src={ASSETS.bot} style={{ width: '120px', height: '120px' }} className="animate-float" alt="Robot" />
                <div style={{ opacity: 0.8, fontSize: '14px' }}>Hi! I'm Resa - Your virtual assistant.</div>
                <div style={{ fontWeight: 800, fontSize: '22px', color: 'white' }}>How can I help you today?</div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', gap: '12px', flexDirection: msg.type === 'bot' ? 'row' : 'row-reverse', marginBottom: '8px' }}>
                  {msg.type === 'bot' && <img src={ASSETS.bot} style={{ width: '32px', height: '32px', marginTop: '4px' }} alt="B" />}
                  <div className={`resa-bubble ${msg.type === 'bot' ? 'bot-bubble' : 'user-bubble'}`}>
                    {msg.text}
                    {msg.actions && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {msg.actions.map((action, i) => (
                          <button key={i} className="resa-action-btn" onClick={action.onClick}>
                            <Play size={14} fill="currentColor" /> {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isTyping && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                <img src={ASSETS.bot} style={{ width: '32px', height: '32px' }} alt="B" />
                <div className="resa-bubble bot-bubble" style={{ display: 'flex', gap: '4px', padding: '12px 18px' }}>
                  <div className="dot" style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }} />
                  <div className="dot" style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%', animationDelay: '0.2s' }} />
                  <div className="dot" style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%', animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
          </div>

          {/* Footer Input */}
          <div className="resa-footer">
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '28px', padding: '6px 20px', border: '1px solid rgba(255,255,255,0.15)' }}>
              <input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask Resa anything..." 
                style={{ flex: 1, background: 'none', border: 'none', padding: '14px 0', color: 'white', fontSize: '14px', outline: 'none' }}
              />
              <button 
                onClick={handleSendMessage}
                style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}
              >
                <Send size={22} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
