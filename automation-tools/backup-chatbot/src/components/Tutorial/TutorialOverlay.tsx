import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Button, Paper, Fade, useTheme } from '@mui/material';
import { useTutorial } from '../../context/TutorialContext';
import { NavigateNext } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

// import ResaImage from '../../assets/resa.png';
import ResaImage from '../../assets/chatbot/bot.svg';

// Mascot placeholder (Robot)
const Mascot = () => (
    <Box
        component="img"
        src={ResaImage}
        alt="Assistant"
        sx={{
            height: '33vh', // Responsive height (approx 1/3 of screen)
            width: 'auto', // Maintain aspect ratio
            filter: 'drop-shadow(0px 8px 24px rgba(0,0,0,0.3))',
            pointerEvents: 'none', // Allow clicks through if needed, though it's "support"
            animation: 'float 6s ease-in-out infinite',
            '@keyframes float': {
                '0%': { transform: 'translateY(0px)' },
                '50%': { transform: 'translateY(-15px)' },
                '100%': { transform: 'translateY(0px)' },
            },
            marginBottom: '20px'
        }}
    />
);

interface TutorialOverlayProps {
    sidebarWidth?: number;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ sidebarWidth = 0 }) => {
    const { isTutorialOpen, currentStep, nextStep, prevStep, skipTutorial, currentStepIndex, steps } = useTutorial();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const theme = useTheme();
    const retryCount = useRef(0);
    const navigate = useNavigate();
    const location = useLocation();

    // Smart Docking State (Vertical Shift)
    const [dynamicBottom, setDynamicBottom] = useState(0);

    // Auto-navigate if route is specified
    useEffect(() => {
        if (!isTutorialOpen || !currentStep?.route) return;
        if (location.pathname !== currentStep.route) {
            navigate(currentStep.route);
        }
    }, [currentStep, isTutorialOpen, location.pathname, navigate]);

    // Track target element position (Polling for animations/layout shifts)
    useEffect(() => {
        if (!isTutorialOpen || !currentStep) return;

        // Reset target rect for new step
        setTargetRect(null);

        let hasScrolled = false;

        const updateTargetRect = () => {
            const el = document.querySelector(currentStep.target);
            if (el) {
                const rect = el.getBoundingClientRect();
                // Check if visible and dimensions changed significantly to avoid excessive re-renders
                if (rect.width > 0 && rect.height > 0) {
                    setTargetRect(prev => {
                        if (!prev) return rect;
                        const isSame = prev.top === rect.top && prev.left === rect.left && prev.width === rect.width && prev.height === rect.height;
                        return isSame ? prev : rect;
                    });

                    // Initial scroll if just found and haven't scrolled yet for this step
                    if (!hasScrolled) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        hasScrolled = true;
                    }
                }
            } else {
                setTargetRect(null);
            }
        };

        // Run immediately
        updateTargetRect();

        // Poll every 100ms to handle animations (like sidebar opening)
        const intervalId = setInterval(updateTargetRect, 100);

        // Listen for resize/scroll as well for immediate feedback
        window.addEventListener('resize', updateTargetRect);
        window.addEventListener('scroll', updateTargetRect, true);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('resize', updateTargetRect);
            window.removeEventListener('scroll', updateTargetRect, true);
        };
    }, [isTutorialOpen, currentStep, currentStep?.target]);

    // Smart Shift Logic
    useEffect(() => {
        if (!targetRect) {
            setDynamicBottom(0);
            return;
        }

        const padding = 24; // Safe padding
        const mascotWidth = 180;
        const tooltipWidth = 480;
        const totalWidth = mascotWidth + tooltipWidth + 50; // + gap
        const totalHeight = window.innerHeight * 0.33; // 33vh

        // Default area check (Bottom-Left)
        // We only care if the target intersects with our default position
        // Default area: Bottom 0, Left 32+sidebarWidth, Height 33vh (approx)

        // Note: totalHeight is just mascot height, but let's assume worst case overlap
        const defaultAreaTop = window.innerHeight - totalHeight;
        const defaultAreaRight = 32 + sidebarWidth + totalWidth;

        // Simple Intersection Check
        // If target is IN the bottom-left corner zone
        const isOverlapping = !(targetRect.right < (32 + sidebarWidth) ||
            targetRect.left > defaultAreaRight ||
            targetRect.bottom < defaultAreaTop ||
            targetRect.top > window.innerHeight);

        if (isOverlapping) {
            // Shift up just enough to clear the target top
            // targetRect.top is distance from viewport top
            // We want our bottom to be at targetRect.top - padding
            // So CSS bottom = window.innerHeight - (targetRect.top - padding)
            // Ensure we don't shift down (negative bottom)
            const newBottom = Math.max(0, window.innerHeight - targetRect.top + padding);

            setDynamicBottom(newBottom);
        } else {
            setDynamicBottom(0);
        }

    }, [targetRect, sidebarWidth]);

    // Dynamic Position Styles
    const getContainerStyles = () => {
        return {
            position: 'fixed' as const,
            zIndex: 1302,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth dynamic movement
            display: 'flex',
            alignItems: 'flex-end', // Align items to bottom so they move up together
            left: 32 + sidebarWidth,
            bottom: dynamicBottom,
            gap: 2
        };
    };

    if (!isTutorialOpen || !currentStep) return null;

    const handleTutorialExit = () => {
        skipTutorial();
        // Strict check: Only redirect if we are actually on the fake draft page
        if (location.pathname.includes('draft_tutorial')) {
            window.location.replace('/requests');
        }
    };

    const renderBackdrop = () => {
        if (!targetRect) return (
            <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.6)', zIndex: 1300 }} />
        );

        const { top, left, width, height } = targetRect;
        const padding = 8; // Breathing room
        const holeTop = top - padding;
        const holeLeft = left - padding;
        const holeWidth = width + padding * 2;
        const holeHeight = height + padding * 2;

        return (
            <Box sx={{ position: 'fixed', inset: 0, zIndex: 1300, pointerEvents: 'none' }}>
                {/* Top */}
                <Box onClick={handleTutorialExit} sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(0, holeTop), bgcolor: 'rgba(0,0,0,0.6)', pointerEvents: 'auto', cursor: 'pointer' }} />
                {/* Bottom */}
                <Box onClick={handleTutorialExit} sx={{ position: 'absolute', top: holeTop + holeHeight, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.6)', pointerEvents: 'auto', cursor: 'pointer' }} />
                {/* Left */}
                <Box onClick={handleTutorialExit} sx={{ position: 'absolute', top: holeTop, left: 0, width: Math.max(0, holeLeft), height: holeHeight, bgcolor: 'rgba(0,0,0,0.6)', pointerEvents: 'auto', cursor: 'pointer' }} />
                {/* Right */}
                <Box onClick={handleTutorialExit} sx={{ position: 'absolute', top: holeTop, left: holeLeft + holeWidth, right: 0, height: holeHeight, bgcolor: 'rgba(0,0,0,0.6)', pointerEvents: 'auto', cursor: 'pointer' }} />

                {/* Glow/Border around target */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: holeTop,
                        left: holeLeft,
                        width: holeWidth,
                        height: holeHeight,
                        boxShadow: '0 0 0 2px rgba(56, 189, 248, 0.5), 0 0 20px rgba(56, 189, 248, 0.3)',
                        borderRadius: 1,
                        pointerEvents: 'none',
                    }}
                />
            </Box>
        );
    };

    return (
        <>
            {renderBackdrop()}

            {/* Assistant Container (Mascot + Tooltip) */}
            <Fade in={true}>
                <Box sx={getContainerStyles()}>
                    <Mascot />

                    {/* Tooltip Card */}
                    <Paper
                        elevation={12}
                        key={currentStepIndex}
                        sx={{
                            width: 480,
                            p: 3,
                            borderRadius: 3,
                            bgcolor: '#2D3748', // Dark grey
                            color: 'white',
                            transition: 'all 0.3s ease',
                            border: '1px solid rgba(255,255,255,0.1)',
                            position: 'relative', // Ensure stacking
                            marginBottom: '40px' // Lift tooltip slightly relative to Mascot bottom
                        }}
                    >
                        {/* Header */}
                        <Box sx={{ mb: 1 }}>
                            <Typography variant="overline" sx={{ color: '#A0AEC0', fontWeight: 700, letterSpacing: 1.2 }}>
                                Step {currentStepIndex + 1}
                            </Typography>
                        </Box>

                        {/* Content */}
                        <Typography variant="body1" sx={{ color: '#E2E8F0', mb: 3, lineHeight: 1.6 }}>
                            {currentStep.content}
                        </Typography>

                        {/* Footer: Dots + Controls */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
                            {/* Progress Dots */}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {steps.map((_, i) => (
                                    <Box
                                        key={i}
                                        sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            bgcolor: i === currentStepIndex ? 'white' : 'rgba(255,255,255,0.3)',
                                            transition: 'all 0.3s'
                                        }}
                                    />
                                ))}
                            </Box>

                            {/* Controls */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Button
                                    size="small"
                                    onClick={handleTutorialExit}
                                    sx={{
                                        color: 'rgba(255,255,255,0.5)',
                                        textTransform: 'none',
                                        minWidth: 'auto',
                                        mr: 1,
                                        '&:hover': { color: 'white' }
                                    }}
                                >
                                    Skip
                                </Button>

                                {currentStepIndex > 0 && (
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            // Handle Back Logic
                                            // If we are on the fake draft page (e.g. step 4) and going back (to step 3 on /requests),
                                            // we might need a hard replace to avoid stuck state
                                            if (location.pathname.includes('draft_tutorial')) {
                                                prevStep(); // State update
                                                window.location.replace('/requests'); // Force navigation
                                            } else {
                                                prevStep();
                                            }
                                        }}
                                        variant="outlined"
                                        sx={{
                                            color: 'white',
                                            borderColor: 'rgba(255,255,255,0.3)',
                                            textTransform: 'none',
                                            borderRadius: 2,
                                            minWidth: 'auto',
                                            px: 2,
                                            '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                                        }}
                                    >
                                        Back
                                    </Button>
                                )}

                                <Button
                                    size="small"
                                    onClick={() => {
                                        const isLastStep = currentStepIndex === steps.length - 1;

                                        // Advance or Finish (which closes tutorial) FIRST
                                        nextStep();

                                        // If it was the last step, navigate AFTER closing to avoid route fighting
                                        if (isLastStep) {
                                            if (location.pathname.includes('draft_tutorial')) {
                                                window.location.replace('/requests');
                                            }
                                        }
                                    }}
                                    variant="contained"
                                    sx={{
                                        bgcolor: '#38bdf8',
                                        color: '#0f172a',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        px: 2,
                                        '&:hover': { bgcolor: '#7dd3fc' }
                                    }}
                                >
                                    {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                </Box>
            </Fade>
        </>
    );
};
