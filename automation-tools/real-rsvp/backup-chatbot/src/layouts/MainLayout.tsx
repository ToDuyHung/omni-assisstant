
import React, { useState, useEffect } from 'react';
import {
    Box, CssBaseline, AppBar, Toolbar, Typography, Drawer,
    List, ListItemButton, ListItemIcon, ListItemText,
    Collapse, IconButton, Avatar, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    Work as WorkIcon,
    ExpandLess, ExpandMore,
    People as PeopleIcon,
    Home as HomeIcon,
    Analytics as AnalyticsIcon,
    Assessment as AssessmentIcon
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation, matchPath } from 'react-router-dom';
import { useMockData } from '../context/MockDataContext';
import { ChatbotWidget } from '../components/Chatbot/ChatbotWidget';
import { TutorialProvider, useTutorial } from '../context/TutorialContext';
import { TutorialOverlay } from '../components/Tutorial/TutorialOverlay';
import { startRequestTutorial } from '../tutorials/startRequestTutorial';
import { updateRequestTutorial } from '../tutorials/updateRequestTutorial';
import { HelpOutline, Edit as EditIcon } from '@mui/icons-material';

const DRAWER_WIDTH = 260;

// Inner component to access context
const MainLayoutContent: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { startTutorial, restoreSteps, isTutorialOpen, currentStepIndex, activeTutorialId, steps } = useTutorial();

    // Start Tutorial Handler
    const handleStartTutorial = () => {
        // We define the steps here or import them
        startTutorial(startRequestTutorial, 'create_request');
        navigate('/requests'); // Ensure we start at the right place for step 1
    };

    const { currentUserRole, requests } = useMockData();
    const [drawerOpen, setDrawerOpen] = useState(!isMobile);

    const handleStartUpdateTutorial = () => {
        startTutorial(updateRequestTutorial, 'update_request');
        navigate('/requests');
    };

    // Initial sync with screen size
    useEffect(() => {
        setDrawerOpen(!isMobile);
    }, [isMobile]);

    // Restore tutorial steps on reload if needed
    useEffect(() => {
        if (isTutorialOpen && steps.length === 0 && activeTutorialId) {
            console.log('Restoring tutorial steps for:', activeTutorialId);
            if (activeTutorialId === 'update_request') {
                restoreSteps(updateRequestTutorial);
            } else if (activeTutorialId === 'create_request') {
                restoreSteps(startRequestTutorial);
            }
        }
    }, [isTutorialOpen, steps.length, activeTutorialId, restoreSteps]);


    const [mwOpen, setMwOpen] = useState(true);
    const [inOpen, setInOpen] = useState(true);
    const [atOpen, setAtOpen] = useState(true);
    const [reqOpen, setReqOpen] = useState(true);
    const [sdOpen, setSdOpen] = useState(true);
    const [repOpen, setRepOpen] = useState(true);

    // Auto-expand Sidebar & Requests Menu for Tutorial
    useEffect(() => {
        if (isTutorialOpen && currentStepIndex === 0) {
            setDrawerOpen(true);
            setReqOpen(true);
            // Optionally close others to focus? NO, user just said "make sure it shows"
        }
    }, [isTutorialOpen, currentStepIndex]);

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const handleDrawerToggle = () => {
        setDrawerOpen(!drawerOpen);
    };

    const MenuItem = ({ label, icon, path, subLevel = false, id }: { label: string, icon?: React.ReactNode, path?: string, subLevel?: boolean, id?: string }) => {
        const active = path ? isActive(path) : false;
        return (
            <ListItemButton
                id={id}
                onClick={() => {
                    if (path) navigate(path);
                    if (isMobile && path) setDrawerOpen(false); // Close drawer on mobile nav
                }}
                selected={active}
                sx={{
                    pl: subLevel ? 4 : 2,
                    py: 0.8,
                    '&.Mui-selected': {
                        bgcolor: 'rgba(56, 189, 248, 0.15) !important',
                        borderLeft: '3px solid #38bdf8 !important',
                        color: 'white'
                    },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                }}
            >
                {icon && <ListItemIcon sx={{ minWidth: 40, color: active ? '#38bdf8' : 'rgba(255,255,255,0.7)' }}>{icon}</ListItemIcon>}
                <ListItemText
                    primary={label}
                    primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: active ? 600 : 400, color: active ? 'white' : 'rgba(255,255,255,0.9)' }}
                />
            </ListItemButton>
        );
    };

    const getBreadcrumbs = (pathname: string): { section: string; page: string; id?: string } => {
        // Detail Checks using matchPath
        const reqMatch = matchPath('/requests/:id', pathname);
        if (reqMatch && reqMatch.params.id && reqMatch.params.id !== 'new' && reqMatch.params.id !== 'insights') {
            return { section: 'Requests', page: 'My Requests', id: reqMatch.params.id };
        }
        const jrMatch = matchPath('/job-requisitions/:id', pathname);
        if (jrMatch && jrMatch.params.id && jrMatch.params.id !== 'new') {
            return { section: 'Applicant Tracking', page: 'Job Requisitions', id: jrMatch.params.id };
        }
        const candMatch = matchPath('/candidates/:id', pathname);
        if (candMatch && candMatch.params.id) {
            return { section: 'Applicant Tracking', page: 'Candidates', id: candMatch.params.id };
        }
        const sowMatch = matchPath('/sow/:id', pathname);
        if (sowMatch && sowMatch.params.id && sowMatch.params.id !== 'new') {
            return { section: 'Service Delivery', page: 'Statement Of Work', id: sowMatch.params.id };
        }

        if (pathname.startsWith('/requests/insights')) return { section: 'Insights', page: 'Requests' };
        if (pathname.startsWith('/requests/new')) return { section: 'Requests', page: 'New Request' };
        if (pathname.startsWith('/requests/processing')) return { section: 'Requests', page: 'Request Processing' };
        if (pathname.startsWith('/requests')) return { section: 'Requests', page: 'My Requests' };
        if (pathname.startsWith('/job-requisitions')) return { section: 'Applicant Tracking', page: 'Job Requisitions' };
        if (pathname.startsWith('/job-postings')) return { section: 'Applicant Tracking', page: 'Job Postings' };
        if (pathname.startsWith('/internal-job-board')) return { section: 'Applicant Tracking', page: 'Internal Job Board' };
        if (pathname.startsWith('/candidates')) return { section: 'Applicant Tracking', page: 'Candidates' };
        if (pathname.startsWith('/sow')) return { section: 'Service Delivery', page: 'Statement Of Work' };
        return { section: 'Home', page: 'Overview' };
    };

    const breadcrumbs = getBreadcrumbs(location.pathname);

    const drawerContent = (
        <>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, minHeight: 64 }}>
                {/* <Box sx={{ width: 32, height: 32, borderRadius: '4px', bgcolor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>S</Box> */}
                <Typography variant="h6" color="white" fontWeight="bold" letterSpacing={1}>RSVP</Typography>
            </Box>

            <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
                <List disablePadding>
                    {/* MY WORK CENTER */}
                    <ListItemButton onClick={() => setMwOpen(!mwOpen)} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 40, color: 'rgba(255,255,255,0.7)' }}><HomeIcon /></ListItemIcon>
                        <ListItemText primary="MY WORK CENTER" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }} />
                        {mwOpen ? <ExpandLess sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <ExpandMore sx={{ color: 'rgba(255,255,255,0.5)' }} />}
                    </ListItemButton>
                    <Collapse in={mwOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {/* <MenuItem label="Overview" subLevel /> */}
                        </List>
                    </Collapse>

                    {/* INSIGHTS */}
                    <ListItemButton onClick={() => setInOpen(!inOpen)} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 40, color: 'rgba(255,255,255,0.7)' }}><AnalyticsIcon /></ListItemIcon>
                        <ListItemText primary="INSIGHTS" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }} />
                        {inOpen ? <ExpandLess sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <ExpandMore sx={{ color: 'rgba(255,255,255,0.5)' }} />}
                    </ListItemButton>
                    <Collapse in={inOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            <MenuItem label="Requests" path="/requests/insights" subLevel />
                            <MenuItem label="Job Requisitions" subLevel />
                            <MenuItem label="Candidates" subLevel />
                        </List>
                    </Collapse>

                    {/* REQUESTS */}
                    <ListItemButton onClick={() => setReqOpen(!reqOpen)} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 40, color: 'rgba(255,255,255,0.7)' }}><DashboardIcon /></ListItemIcon>
                        <ListItemText primary="REQUESTS" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }} />
                        {reqOpen ? <ExpandLess sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <ExpandMore sx={{ color: 'rgba(255,255,255,0.5)' }} />}
                    </ListItemButton>
                    <Collapse in={reqOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            <MenuItem label="My Requests" path="/requests" subLevel id="nav-my-requests" />
                            <MenuItem label="Request Processing" path="/requests/processing" subLevel />
                        </List>
                    </Collapse>

                    {/* APPLICANT TRACKING */}
                    <ListItemButton onClick={() => setAtOpen(!atOpen)} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 40, color: 'rgba(255,255,255,0.7)' }}><PeopleIcon /></ListItemIcon>
                        <ListItemText primary="APPLICANT TRACKING" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }} />
                        {atOpen ? <ExpandLess sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <ExpandMore sx={{ color: 'rgba(255,255,255,0.5)' }} />}
                    </ListItemButton>
                    <Collapse in={atOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            <MenuItem label="Job Requisitions" path="/job-requisitions" subLevel />
                            <MenuItem label="Job Postings" path="/job-postings" subLevel />
                            <MenuItem label="Internal Job Board" path="/internal-job-board" subLevel />
                            <MenuItem label="Candidates" subLevel />
                        </List>
                    </Collapse>

                    {/* SERVICE DELIVERY */}
                    <ListItemButton onClick={() => setSdOpen(!sdOpen)} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 40, color: 'rgba(255,255,255,0.7)' }}><WorkIcon /></ListItemIcon>
                        <ListItemText primary="SERVICE DELIVERY" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }} />
                        {sdOpen ? <ExpandLess sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <ExpandMore sx={{ color: 'rgba(255,255,255,0.5)' }} />}
                    </ListItemButton>
                    <Collapse in={sdOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            <MenuItem label="Statement Of Work" path="/sow" subLevel />
                            <MenuItem label="Invoices" subLevel />
                        </List>
                    </Collapse>

                    {/* REPORTS */}
                    <ListItemButton onClick={() => setRepOpen(!repOpen)} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 40, color: 'rgba(255,255,255,0.7)' }}><AssessmentIcon /></ListItemIcon>
                        <ListItemText primary="REPORTS" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }} />
                        {repOpen ? <ExpandLess sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <ExpandMore sx={{ color: 'rgba(255,255,255,0.5)' }} />}
                    </ListItemButton>
                    <Collapse in={repOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {/* Placeholder for Reports */}
                        </List>
                    </Collapse>
                </List>
            </Box>
            <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>v1.2.0</Typography>
            </Box>
        </>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
            <CssBaseline />
            {/* Top Bar */}
            <AppBar
                position="fixed"
                sx={{
                    width: { md: drawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
                    ml: { md: drawerOpen ? `${DRAWER_WIDTH}px` : 0 },
                    bgcolor: 'white',
                    color: 'text.primary',
                    borderBottom: '1px solid #eee',
                    boxShadow: 'none',
                    transition: theme.transitions.create(['width', 'margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                }}
            >
                <Toolbar sx={{ minHeight: 64 }}>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>

                    {/* Breadcrumbs */}
                    <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                            <Typography component="span" sx={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, letterSpacing: 0.5, display: { xs: 'none', sm: 'block' } }}>
                                {breadcrumbs.section}
                            </Typography>
                            <Typography component="span" sx={{ mx: 1, display: { xs: 'none', sm: 'block' } }}>&gt;</Typography>

                            <Typography component="span" sx={{
                                fontWeight: breadcrumbs.id ? 600 : 600,
                                color: breadcrumbs.id ? 'text.secondary' : 'primary',
                                textTransform: breadcrumbs.id ? 'uppercase' : 'none',
                                fontSize: breadcrumbs.id ? '0.75rem' : 'inherit',
                                letterSpacing: breadcrumbs.id ? 0.5 : 'inherit'
                            }}>
                                {breadcrumbs.page}
                            </Typography>

                            {breadcrumbs.id && (
                                <>
                                    <Typography component="span" sx={{ mx: 1 }}>&gt;</Typography>
                                    <Typography component="span" fontWeight="600" color="primary">
                                        {breadcrumbs.id}
                                    </Typography>
                                </>
                            )}
                        </Typography>
                    </Box>

                    <Box sx={{ flexGrow: 1 }} />

                    {/* <IconButton
                        onClick={handleStartUpdateTutorial}
                        sx={{ color: 'text.secondary', mr: 1 }}
                        title="Tutorial: Update Request"
                    >
                        <EditIcon />
                    </IconButton>
                    <IconButton
                        onClick={handleStartTutorial}
                        sx={{ color: 'text.secondary', mr: 2 }}
                        title="Start Tutorial"
                    >
                        <HelpOutline />
                    </IconButton> */}
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 0, cursor: 'pointer', borderLeft: '1px solid #eee', pl: 2 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: '0.9rem', mr: 1 }}>
                            {currentUserRole.charAt(0)}
                        </Avatar>
                        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                            <Typography variant="body2" fontWeight="600">To Duy Hung Tomioka</Typography>
                            <Typography variant="caption" color="text.secondary">duyhung.to@stengg.com</Typography>
                        </Box>
                        <ExpandMore sx={{ fontSize: 16, color: 'text.secondary', ml: 1 }} />
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Sidebar Component */}
            <Box
                component="nav"
                sx={{ width: { md: drawerOpen ? DRAWER_WIDTH : 0 }, flexShrink: { md: 0 }, transition: 'width 0.2s' }}
                aria-label="mailbox folders"
            >
                {/* Mobile Drawer (Temporary) */}
                <Drawer
                    variant="temporary"
                    open={isMobile && drawerOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none' },
                    }}
                >
                    {drawerContent}
                </Drawer>

                {/* Desktop Drawer (Persistent-ish via manual hiding) */}
                <Drawer
                    variant="persistent"
                    open={!isMobile && drawerOpen}
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none' },
                    }}
                >
                    {drawerContent}
                </Drawer>
            </Box>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    pt: 10, // AppBar height + buffer
                    width: { md: drawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
                    minHeight: '100vh',
                    bgcolor: 'background.default',
                    overflowX: 'hidden', // Prevent horizontal scroll on main container
                    transition: theme.transitions.create(['width', 'margin'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                }}
            >
                <Outlet />
            </Box>

            {/* Chatbot Widget - Disabled old version to use Resa Assist Automation SDK */}
            {/* <ChatbotWidget /> */}
            <TutorialOverlay sidebarWidth={!isMobile && drawerOpen ? DRAWER_WIDTH : 0} />
        </Box>
    );
};

export const MainLayout: React.FC = () => {
    return (
        <TutorialProvider>
            <MainLayoutContent />
        </TutorialProvider>
    );
};
