
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MockDataProvider } from './context/MockDataContext';
import { MainLayout } from './layouts/MainLayout';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';
import { CssBaseline } from '@mui/material';

// Real Pages
import { LoginPage } from './pages/LoginPage';
import { RequestDashboard } from './pages/requests/RequestDashboard';
import { RequestProcessing } from './pages/requests/RequestProcessing';
import { NewRequestWizard } from './pages/requests/NewRequestWizard';
import { RequestDetail } from './pages/requests/RequestDetail';

import { RequisitionList } from './pages/requisitions/RequisitionList';
import { RequisitionForm } from './pages/requisitions/RequisitionForm';
import { RequisitionDetail } from './pages/requisitions/RequisitionDetail';

import { CandidateProfile } from './pages/candidates/CandidateProfile';

import { SOWList } from './pages/sow/SOWList';
import { SOWForm } from './pages/sow/SOWForm';
import { SOWDetail } from './pages/sow/SOWDetail';

import { JobPostings } from './pages/jobRequest/JobPostings';
import { InternalJobBoard } from './pages/jobRequest/InternalJobBoard';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MockDataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/requests" replace />} />

              <Route path="requests" element={<RequestDashboard />} />
              <Route path="requests/processing" element={<RequestProcessing />} />
              <Route path="requests/new" element={<NewRequestWizard />} />
              <Route path="requests/:id" element={<RequestDetail />} />

              <Route path="job-requisitions" element={<RequisitionList />} />
              <Route path="job-requisitions/new" element={<RequisitionForm />} />
              <Route path="job-requisitions/:id" element={<RequisitionDetail />} />

              <Route path="candidates/:id" element={<CandidateProfile />} />

              <Route path="job-postings" element={<JobPostings />} />
              <Route path="internal-job-board" element={<InternalJobBoard />} />

              <Route path="sow" element={<SOWList />} />
              <Route path="sow/new" element={<SOWForm />} />
              <Route path="sow/:id" element={<SOWDetail />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MockDataProvider>
    </ThemeProvider>
  );
}

export default App;
