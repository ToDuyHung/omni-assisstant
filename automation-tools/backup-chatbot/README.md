
# RSVP Clone - Frontend Mock

This project is a high-fidelity mock of the RSVP (Request For Service) portal, built with Vite, React, TypeScript, and MUI.

**Theme Update**: The application now features a "Standard Enterprise Portal" theme inspired by ST Engineering/OutSystems standards (Navy Blue sidebar, professional typography).

## Getting Started

1.  **Install dependencies**:
    \`\`\`bash
    npm install
    \`\`\`

2.  **Run the application**:
    \`\`\`bash
    npm run dev
    \`\`\`
    Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features & Flows

The application simulates key workflows for different roles using mock data (persisted to localStorage).

### 1. Requests Module
- **Dashboard**: View status of requests.
- **New Request**: Click "New Request" to start the wizard.
- **Sign-off Flow**: 
  - As a generic user, go to a "Discover" request and "Propose to Sign-off".
  - Switch Role to **Authorized Personnel** using the top bar switcher.
  - Go to the request (now in Sign-off stage) and click "Proceed to Sign-off" to sign with a virtual signature.

### 2. Applicant Tracking
- **Job Requisitions**: Create requisitions linked to Requests.
- **Approval**: 
  - As **Approver**, view "Pending Approval" requisitions and Approve/Reject.
- **Candidates**: 
  - Go to a Requisition Detail -> Candidates tab -> Add Candidate.
  - Click Candidate to view Profile and add skills.

### 3. Service Delivery (SOW)
- **Create SOW**: As **Contract Manager**, create an SOW linked to a Request.
- **Approvals**: 
  - As **Head of Finance**, approve Pending Review SOWs.
  - As **Authorized Personnel**, sign-off the SOW.

## Role Switching
Use the dropdown in the top navigation bar to switch roles instantly. This changes your permissions and visible actions (e.g., Approve buttons, Create SOW button).

## Project Structure
- \`src/pages\`: Feature specific pages (Requests, Requisitions, SOW).
- \`src/components\`: Shared components like RoleSwitcher.
- \`src/context\`: MockDataContext for managing state and persistence.
- \`src/mock\`: Seed data.
