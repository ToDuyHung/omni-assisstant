import React, { createContext, useContext, useState, useEffect } from 'react';

export interface TutorialStep {
    target: string; // CSS selector or unique ID
    title: string;
    content: string;
    disableBeacon?: boolean; // If true, auto-open tooltip?
    placement?: 'top' | 'bottom' | 'left' | 'right';
    actionNeeded?: boolean; // If true, user must interact to proceed?
    route?: string; // Route to check or navigate to
}

interface TutorialContextType {
    isTutorialOpen: boolean;
    currentStepIndex: number;
    activeTutorialId?: string | null;
    steps: TutorialStep[];
    currentStep: TutorialStep | null;
    startTutorial: (steps: TutorialStep[], id: string) => void;
    restoreSteps: (steps: TutorialStep[]) => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTutorial: () => void;
    toggleTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [steps, setSteps] = useState<TutorialStep[]>([]);
    const [activeTutorialId, setActiveTutorialId] = useState<string | null>(null);

    // Load state from localStorage on mount (optional persistence)
    useEffect(() => {
        const saved = localStorage.getItem('rsvp_tutorial_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.isOpen) {
                setIsTutorialOpen(true);
                setCurrentStepIndex(parsed.stepIndex || 0);
                setActiveTutorialId(parsed.tutorialId || null);
            }
        }
    }, []);

    useEffect(() => {
        if (isTutorialOpen) {
            localStorage.setItem('rsvp_tutorial_state', JSON.stringify({
                isOpen: true,
                stepIndex: currentStepIndex,
                tutorialId: activeTutorialId
            }));
        } else {
            localStorage.removeItem('rsvp_tutorial_state');
        }
    }, [isTutorialOpen, currentStepIndex, activeTutorialId]);

    const startTutorial = (newSteps: TutorialStep[], id: string) => {
        setSteps(newSteps);
        setCurrentStepIndex(0);
        setActiveTutorialId(id);
        setIsTutorialOpen(true);
    };

    // Helper to restore steps without resetting index (for page reloads)
    const restoreSteps = (newSteps: TutorialStep[]) => {
        setSteps(newSteps);
    };

    const nextStep = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            setIsTutorialOpen(false); // Finish
        }
    };

    const prevStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    const skipTutorial = () => {
        setIsTutorialOpen(false);
        setCurrentStepIndex(0);
        setActiveTutorialId(null);
    };

    const toggleTutorial = () => {
        setIsTutorialOpen(prev => !prev);
    };

    const currentStep = steps[currentStepIndex] || null;

    return (
        <TutorialContext.Provider value={{
            isTutorialOpen,
            currentStepIndex,
            activeTutorialId,
            steps,
            currentStep,
            startTutorial,
            restoreSteps,
            nextStep,
            prevStep,
            skipTutorial,
            toggleTutorial
        }}>
            {children}
        </TutorialContext.Provider>
    );
};

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (!context) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
};
