
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Request, Requisition, Candidate, SOW, Notification, Role } from '../types';
import { mockRequests, mockRequisitions, mockCandidates, mockSOWs, mockNotifications } from '../mock/seed';
import { v4 as uuidv4 } from 'uuid';

interface MockDataContextType {
    currentUserRole: Role;
    switchRole: (role: Role) => void;
    requests: Request[];
    requisitions: Requisition[];
    candidates: Candidate[];
    sows: SOW[];
    notifications: Notification[];
    // Actions
    addRequest: (req: Request) => void;
    updateRequest: (req: Request) => void;
    addRequisition: (req: Requisition) => void;
    updateRequisition: (req: Requisition) => void;
    addCandidate: (cand: Candidate) => void;
    updateCandidate: (cand: Candidate) => void;
    addSOW: (sow: SOW) => void;
    updateSOW: (sow: SOW) => void;
    markNotificationRead: (id: string) => void;
    addNotification: (note: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

export const MockDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUserRole, setCurrentUserRole] = useState<Role>('Hung');

    const [requests, setRequests] = useState<Request[]>([]);
    const [requisitions, setRequisitions] = useState<Requisition[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [sows, setSows] = useState<SOW[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage or seed
    useEffect(() => {
        const loadData = (key: string, seed: any[], setter: (val: any) => void) => {
            const stored = localStorage.getItem(`rsvp_${key}`);
            if (stored) {
                setter(JSON.parse(stored));
            } else {
                setter(seed);
                localStorage.setItem(`rsvp_${key}`, JSON.stringify(seed));
            }
        };

        loadData('requests', mockRequests, setRequests);
        loadData('requisitions', mockRequisitions, setRequisitions);
        loadData('candidates', mockCandidates, setCandidates);
        loadData('sows', mockSOWs, setSows);
        loadData('notifications', mockNotifications, setNotifications);
        setIsLoaded(true);
    }, []);

    // Save changes to localStorage
    useEffect(() => { if (isLoaded) localStorage.setItem('rsvp_requests', JSON.stringify(requests)); }, [requests, isLoaded]);
    useEffect(() => { if (isLoaded) localStorage.setItem('rsvp_requisitions', JSON.stringify(requisitions)); }, [requisitions, isLoaded]);
    useEffect(() => { if (isLoaded) localStorage.setItem('rsvp_candidates', JSON.stringify(candidates)); }, [candidates, isLoaded]);
    useEffect(() => { if (isLoaded) localStorage.setItem('rsvp_sows', JSON.stringify(sows)); }, [sows, isLoaded]);
    useEffect(() => { if (isLoaded) localStorage.setItem('rsvp_notifications', JSON.stringify(notifications)); }, [notifications, isLoaded]);

    const addRequest = (req: Request) => setRequests(prev => [...prev, req]);
    const updateRequest = (req: Request) => setRequests(prev => prev.map(r => r.id === req.id ? req : r));

    const addRequisition = (req: Requisition) => setRequisitions(prev => [...prev, req]);
    const updateRequisition = (req: Requisition) => setRequisitions(prev => prev.map(r => r.id === req.id ? req : r));

    const addCandidate = (cand: Candidate) => setCandidates(prev => [...prev, cand]);
    const updateCandidate = (cand: Candidate) => setCandidates(prev => prev.map(c => c.id === cand.id ? cand : c));

    const addSOW = (sow: SOW) => setSows(prev => [...prev, sow]);
    const updateSOW = (sow: SOW) => setSows(prev => prev.map(s => s.id === sow.id ? sow : s));

    const markNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const addNotification = (note: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNote: Notification = {
            ...note,
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            read: false
        };
        setNotifications(prev => [newNote, ...prev]);
    };

    const switchRole = (role: Role) => {
        setCurrentUserRole(role);
        // Add a toast or something if needed, but for now just switch
    };

    if (!isLoaded) return <div>Loading...</div>;

    return (
        <MockDataContext.Provider value={{
            currentUserRole, switchRole,
            requests, requisitions, candidates, sows, notifications,
            addRequest, updateRequest,
            addRequisition, updateRequisition,
            addCandidate, updateCandidate,
            addSOW, updateSOW,
            markNotificationRead, addNotification
        }}>
            {children}
        </MockDataContext.Provider>
    );
};

export const useMockData = () => {
    const context = useContext(MockDataContext);
    if (context === undefined) {
        throw new Error('useMockData must be used within a MockDataProvider');
    }
    return context;
};
