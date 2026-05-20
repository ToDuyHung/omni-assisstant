import { TutorialStep } from '../context/TutorialContext';

export const startRequestTutorial: TutorialStep[] = [
    {
        target: '#nav-my-requests',
        title: "Step 1: Access My Requests",
        content: "Click on the 'My Requests' menu item in the left sidebar to view your dashboard.",
        route: '/requests'
    },
    {
        target: '#btn-new-request',
        title: "Step 2: Create New Request",
        content: "Click the 'New Request' button to start the request creation wizard.",
        route: '/requests'
    },
    {
        target: '#btn-wizard-next',
        title: "Step 3: Project Info",
        content: "Fill in the 'Project Contact Info' and select the 'Request Type'. Then click 'Next'.",
        route: '/requests/new',
        placement: 'top'
    },
    {
        target: '#btn-wizard-submit',
        title: "Step 4: Request Details",
        content: "Fill in the 'Business Request Details', add necessary resources, and click 'Submit Request'.",
        placement: 'top',
        route: '/requests/new'
    },
    {
        target: '#tile-evaluate',
        title: "Step 5: Verify Request",
        content: "Back on the dashboard, click the 'Evaluate' box to verify your newly created request is listed.",
        route: '/requests'
    }
];
