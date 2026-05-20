import { TutorialStep } from '../context/TutorialContext';

export const updateRequestTutorial: TutorialStep[] = [
    {
        target: '#nav-my-requests',
        title: "Step 1: Access My Requests",
        content: "Click on the 'My Requests' menu item in the left sidebar to view your dashboard.",
        route: '/requests',
        placement: 'right'
    },
    {
        target: '#tile-draft',
        title: "Step 2: Filter by Draft",
        content: "Click on the 'Draft' status tile to filter for draft requests. You can only update requests that are in 'Draft' status.",
        route: '/requests',
        placement: 'bottom',
        actionNeeded: true
    },
    {
        target: '[data-id="draft_tutorial"]',
        title: "Step 3: Select a Draft Request",
        content: "Click on the 'Tutorial Draft Request' row to view its details. Notice the status is 'Draft'.",
        route: '/requests',
        placement: 'bottom'
    },
    {
        target: '#btn-update-request',
        title: "Step 4: Update Request",
        content: "Review the request details. Make any necessary changes and click 'Update Request' to save.",
        route: '/requests/draft_tutorial',
        placement: 'top'
    }
];
