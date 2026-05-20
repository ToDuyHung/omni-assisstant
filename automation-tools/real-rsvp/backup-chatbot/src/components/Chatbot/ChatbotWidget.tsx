import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Box, Typography, IconButton, Button, Tooltip } from '@mui/material';
import {
    Close as CloseIcon,
    Send as SendIcon,
    PlayArrow,
    DeleteOutline,
    AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import './ChatbotWidget.css';

import welcomeBg from '../../assets/chatbot/welcome_bg.png';
import botBg from '../../assets/chatbot/bot_bg.png';
import botAvatar from '../../assets/chatbot/bot.svg';
import widgetIcon from '../../assets/chatbot/icon.svg';
import { useNavigate } from 'react-router-dom';
import { useTutorial } from '../../context/TutorialContext';
import { startRequestTutorial } from '../../tutorials/startRequestTutorial';
import { updateRequestTutorial } from '../../tutorials/updateRequestTutorial';
import { useAttachments } from './useAttachments';
import { AttachmentTray } from './AttachmentTray';

const API_BASE = 'http://localhost:8080';

interface ChatMessage {
    sender: 'user' | 'bot';
    text: string;
    displayText?: string;
    buttonLabel?: string | null;
    action?: string | null;
}

export const ChatbotWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isBotThinking, setIsBotThinking] = useState(false);
    const [sendBlocked, setSendBlocked] = useState(false); // tooltip flash on blocked send
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { startTutorial } = useTutorial();

    // ── Attachment state ─────────────────────────────────────────────────────────
    const {
        attachments,
        addFiles,
        removeAttachment,
        clearAttachments,
        hasInvalid,
        isUploading,
        uploadedFileIds,
    } = useAttachments({ sessionId, apiBase: API_BASE });

    // ── Session / storage ────────────────────────────────────────────────────────
    useEffect(() => {
        const savedData = localStorage.getItem('rsvp_chatbot_storage');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setMessages(parsed.messages || []);
                setSessionId(parsed.sessionId || uuidv4());
            } catch {
                setSessionId(uuidv4());
            }
        } else {
            setSessionId(uuidv4());
        }
        const imagesToPreload = [welcomeBg, botBg, botAvatar];
        imagesToPreload.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }, []);

    useEffect(() => {
        if (sessionId) {
            localStorage.setItem('rsvp_chatbot_storage', JSON.stringify({ messages, sessionId }));
        }
    }, [messages, sessionId]);

    // ── Scroll ───────────────────────────────────────────────────────────────────
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => { scrollToBottom(); }, [messages, isBotThinking, isOpen]);

    // ── Toggle / clear ───────────────────────────────────────────────────────────
    const toggleChat = () => setIsOpen(prev => !prev);

    const handleClearChat = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMessages([]);
        clearAttachments();
        const newSessionId = uuidv4();
        setSessionId(newSessionId);
        localStorage.removeItem('rsvp_chatbot_storage');
    };

    // ── Tutorial actions ─────────────────────────────────────────────────────────
    const handleBotAction = (action?: string | null) => {
        if (action === 'create new') {
            setIsOpen(false);
            startTutorial(startRequestTutorial, 'create_request');
            navigate('/requests');
        } else if (action === 'update request') {
            setIsOpen(false);
            startTutorial(updateRequestTutorial, 'update_request');
            navigate('/requests');
        }
    };

    // ── Typing animation ─────────────────────────────────────────────────────────
    const typeText = async (fullText: string, buttonLabel?: string | null, action?: string | null) => {
        setMessages(prev => [...prev, { sender: 'bot', text: fullText, displayText: '', buttonLabel: null }]);

        let currentText = '';
        for (let i = 0; i < fullText.length; i++) {
            currentText += fullText[i];
            setMessages(prev => {
                const arr = [...prev];
                const last = arr.length - 1;
                if (last >= 0 && arr[last].sender === 'bot') {
                    arr[last] = { ...arr[last], displayText: currentText };
                }
                return arr;
            });
            await new Promise(r => setTimeout(r, 15));
            scrollToBottom();
        }

        if (buttonLabel) {
            setMessages(prev => {
                const arr = [...prev];
                const last = arr.length - 1;
                if (last >= 0) arr[last] = { ...arr[last], buttonLabel, action: action ?? null };
                return arr;
            });
            scrollToBottom();
        }
    };

    // ── File picker ──────────────────────────────────────────────────────────────
    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(e.target.files);
        }
        // Reset so same file can be re-selected
        e.target.value = '';
    };

    // ── Send ─────────────────────────────────────────────────────────────────────
    const sendMessage = async () => {
        if (newMessage.trim() === '' && uploadedFileIds.length === 0) return;

        // Block if invalid attachments present
        if (hasInvalid || isUploading) {
            setSendBlocked(true);
            setTimeout(() => setSendBlocked(false), 2000);
            return;
        }

        const userQuestion = newMessage;
        const fileIds = [...uploadedFileIds];
        const hasFiles = fileIds.length > 0;

        const userMsg: ChatMessage = { sender: 'user', text: userQuestion || '📎 [Files attached]' };
        setMessages(prev => [...prev, userMsg]);
        setNewMessage('');
        clearAttachments();
        setIsBotThinking(true);

        try {
            let data: { result?: string; reply?: string; answer?: string; citations?: unknown[] };
            console.log('Sending message with session:', 1111111);
            if (hasFiles) {
                // Document Q&A path
                const response = await fetch(`${API_BASE}/api/ask`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: userQuestion, file_ids: fileIds, session_id: sessionId }),
                });
                if (!response.ok) throw new Error('Network error');
                data = await response.json();
            } else {
                // Normal chat-intent path
                const response = await fetch(`${API_BASE}/api/chat-intent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: userQuestion, session_id: sessionId, role: 'user' }),
                });
                if (!response.ok) throw new Error('Network error');
                data = await response.json();
            }

            setIsBotThinking(false);

            let assistantMessage = '';
            let buttonLabel: string | null = null;
            let action: string | null = null;

            if (hasFiles && data.answer) {
                assistantMessage = data.answer;
            } else if (data.result === 'create new') {
                assistantMessage = "Of course! I've prepared a step-by-step guideline for creating a new request. Please click the button below to view the instructions.";
                buttonLabel = 'Start Instruction';
                action = 'create new';
            } else if (data.result === 'update request') {
                assistantMessage = "Certainly! I can guide you through updating a request. Click the button below to start.";
                buttonLabel = 'Start Instruction';
                action = 'update request';
            } else if (data.result === 'chat') {
                assistantMessage = data.reply || '';
            } else {
                assistantMessage = "I'm sorry, I didn't understand that.";
            }

            await typeText(assistantMessage, buttonLabel, action);
        } catch (error) {
            console.error('Error:', error);
            setIsBotThinking(false);
            setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I am offline.', displayText: 'Sorry, I am offline.' }]);
        }
    };

    // ── Shared input bar ─────────────────────────────────────────────────────────
    const canSend = !hasInvalid && !isUploading && (newMessage.trim() !== '' || uploadedFileIds.length > 0);

    const renderInputBar = () => (
        <Box sx={{ pt: 0, pb: 0 }}>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            {/* Attachment Tray */}
            <AttachmentTray
                attachments={attachments}
                onRemove={removeAttachment}
                hasInvalid={hasInvalid}
            />

            {/* Input row */}
            <Box sx={{ px: 2, pb: 1.5, pt: attachments.length > 0 ? 0.75 : 1.5 }}>
                <Tooltip
                    title={
                        hasInvalid
                            ? 'Remove invalid attachments before sending'
                            : isUploading
                                ? 'Please wait for uploads to finish'
                                : ''
                    }
                    open={sendBlocked || undefined}
                    placement="top"
                    arrow
                >
                    <Box
                        sx={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            bgcolor: 'rgba(255,255,255,0.05)',
                            borderRadius: 999,
                            pl: 0.5,
                            pr: 0.5,
                            py: 0.5,
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            gap: 0.5,
                        }}
                    >
                        {/* Paperclip */}
                        <IconButton
                            onClick={handleAttachClick}
                            size="small"
                            sx={{
                                color: 'rgba(255,255,255,0.6)',
                                '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                                flexShrink: 0,
                            }}
                            title="Attach .pdf or .docx"
                        >
                            <AttachFileIcon sx={{ fontSize: 18 }} />
                        </IconButton>

                        {/* Text input */}
                        <input
                            type="text"
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyUp={e => e.key === 'Enter' && sendMessage()}
                            placeholder="Ask anything…"
                            style={{
                                flex: 1,
                                background: 'transparent',
                                color: 'white',
                                border: 'none',
                                outline: 'none',
                                fontSize: '0.875rem',
                                paddingRight: 4,
                                paddingLeft: 4,
                            }}
                        />

                        {/* Send button */}
                        <Box
                            onClick={sendMessage}
                            component="button"
                            disabled={!canSend && attachments.length === 0 && newMessage.trim() === ''}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: canSend
                                    ? 'linear-gradient(to right, rgba(96,165,250,0.7), rgba(59,130,246,0.5))'
                                    : 'linear-gradient(to right, rgba(255,255,255,0.2), rgba(255,255,255,0.1))',
                                '&:hover': {
                                    background: canSend
                                        ? 'linear-gradient(to right, rgba(96,165,250,0.9), rgba(59,130,246,0.7))'
                                        : undefined,
                                },
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                border: '1px solid rgba(255,255,255,0.3)',
                                transition: 'all 0.2s',
                                mr: 0.5,
                                cursor: 'pointer',
                                flexShrink: 0,
                            }}
                        >
                            <SendIcon sx={{ fontSize: 15, color: 'white', transform: 'rotate(-45deg)', ml: 0.5, mb: 0.5 }} />
                        </Box>
                    </Box>
                </Tooltip>
            </Box>
        </Box>
    );

    // ────────────────────────────────────────────────────────────────────────────
    return (
        <>
            {/* Chat Window */}
            {isOpen && (
                <div
                    style={{
                        zIndex: 10000,
                        width: 400,
                        height: 490,
                        position: 'fixed',
                        bottom: 80,
                        right: 24,
                        borderRadius: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        color: 'white',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                        overflow: 'hidden',
                        fontFamily: 'sans-serif',
                        backgroundImage: messages.length === 0 ? `url(${welcomeBg})` : `url(${botBg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        animation: 'slideUp 0.3s ease-out forwards',
                    }}
                >
                    {/* Header */}
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '1.125rem' }}>
                        Chat with Resa
                        <Box>
                            <IconButton
                                onClick={handleClearChat}
                                sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white' }, mr: 1 }}
                                size="small"
                                title="Clear History"
                            >
                                <DeleteOutline />
                            </IconButton>
                            <IconButton
                                onClick={toggleChat}
                                sx={{ color: 'white', '&:hover': { color: '#d1d5db' } }}
                                size="small"
                            >
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>

                    {/* Message Area */}
                    <div
                        ref={chatContainerRef}
                        className="chat-scroll-container"
                        style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}
                    >
                        {messages.length === 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: 1.5 }}>
                                <img src={botAvatar} alt="Bot Avatar" className="animate-float" style={{ width: 112, height: 112, marginBottom: 8 }} />
                                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>Good day! I'm Resa - Your virtual assistant.</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>How can I help you today?</Typography>
                                <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', mt: 1 }}>
                                    📎 Attach a .pdf or .docx to ask questions about it
                                </Typography>
                            </Box>
                        ) : (
                            messages.map((message, index) => (
                                <Box
                                    key={index}
                                    sx={{ display: 'flex', flexDirection: 'column', alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start', gap: 0.5 }}
                                >
                                    <Box sx={{ display: 'flex', gap: 1, flexDirection: message.sender === 'user' ? 'row-reverse' : 'row' }}>
                                        {message.sender === 'bot' && (
                                            <img src={botAvatar} alt="Bot" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                                        )}
                                        <Box
                                            className={message.sender === 'bot' ? 'bot-message-bubble' : 'user-message-bubble'}
                                            sx={{
                                                bgcolor: message.sender === 'bot' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)',
                                                color: 'white',
                                                p: 1.5,
                                                borderRadius: 2,
                                                maxWidth: '280px',
                                                wordBreak: 'break-word',
                                                whiteSpace: 'pre-wrap',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                            }}
                                        >
                                            <span dangerouslySetInnerHTML={{ __html: message.displayText || message.text }} />
                                            {message.sender === 'bot' && message.buttonLabel && (
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={<PlayArrow />}
                                                    onClick={() => handleBotAction(message.action)}
                                                    sx={{
                                                        mt: 1.5,
                                                        textTransform: 'none',
                                                        bgcolor: '#3b82f6',
                                                        color: 'white',
                                                        fontWeight: 600,
                                                        borderRadius: '8px',
                                                        '&:hover': { bgcolor: '#2563eb' },
                                                    }}
                                                >
                                                    {message.buttonLabel}
                                                </Button>
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            ))
                        )}

                        {/* Thinking indicator */}
                        {isBotThinking && (
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <img src={botAvatar} alt="Bot" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                                <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 1.5, borderRadius: 2 }}>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <div className="dot" />
                                        <div className="dot" />
                                        <div className="dot" />
                                    </div>
                                </Box>
                            </Box>
                        )}
                    </div>

                    {/* Input section (always visible once window is open) */}
                    <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        {renderInputBar()}
                    </Box>
                </div>
            )}

            {/* Floating icon */}
            <Box className="chatbot-group" sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, '&:hover': { zIndex: 10001 } }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Box
                        onClick={toggleChat}
                        sx={{
                            cursor: 'pointer',
                            borderRadius: '50%',
                            p: '2px',
                            background: 'linear-gradient(to top right, rgba(7, 46, 103, 0.6), rgba(11, 87, 199, 0.6))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s',
                            '&:hover': { transform: 'scale(1.05) rotate(-12deg)' },
                        }}
                    >
                        <img src={widgetIcon} alt="Chatbot Icon" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                    </Box>
                    <div
                        className="chatbot-tooltip"
                        style={{
                            position: 'absolute',
                            right: 48,
                            top: '50%',
                            transform: 'translateY(-55%)',
                            background: 'linear-gradient(to right, #072E67, #0B57C7)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: 999,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        }}
                    >
                        Hi I'm Resa - Your virtual assistant.
                    </div>
                </div>
            </Box>
        </>
    );
};