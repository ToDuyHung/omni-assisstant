
import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, Chip, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, TextField, DialogActions,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { useMockData } from '../../context/MockDataContext';
import { Candidate, CandidateStatus, RequisitionStatus } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export const RequisitionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    requisitions, updateRequisition,
    candidates, addCandidate, updateCandidate,
    currentUserRole
  } = useMockData();

  const req = requisitions.find(r => r.id === id);
  const reqCandidates = candidates.filter(c => c.requisitionId === id);

  const [tabValue, setTabValue] = useState(0);
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [newCandidate, setNewCandidate] = useState<Partial<Candidate>>({ name: '', email: '', phone: '' });

  if (!req) return <Typography>Requisition not found</Typography>;

  // Actions
  const handleApprove = () => {
    updateRequisition({ ...req, status: 'Approved' });
  };

  const handleReject = () => {
    const reason = prompt("Enter rejection reason:");
    if (reason) updateRequisition({ ...req, status: 'Rejected' });
  };

  const handleConfigure = () => {
    // Mock configuration of hiring process
    const template = prompt("Select Template ID (Standard, IT, Executive):", "Standard");
    if (template) {
      updateRequisition({ ...req, status: 'Open for Hiring', hiringProcessTemplateId: template });
    }
  };

  const handleCreateCandidate = () => {
    const candidate: Candidate = {
      ...newCandidate as Candidate,
      id: uuidv4(),
      requisitionId: req.id,
      status: 'Applied',
      appliedDate: new Date().toISOString(),
      skills: []
    };
    addCandidate(candidate);
    setAddCandidateOpen(false);
    setNewCandidate({ name: '', email: '', phone: '' });
  };

  const handleMoveCandidate = (id: string, newStatus: CandidateStatus) => {
    const cand = candidates.find(c => c.id === id);
    if (cand) updateCandidate({ ...cand, status: newStatus });
  };

  const candidateColumns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'email', headerName: 'Email', width: 200 },
    {
      field: 'status', headerName: 'Status', width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Select
          size="small"
          value={params.value}
          sx={{ width: 130 }}
          onChange={(e) => handleMoveCandidate(params.row.id, e.target.value as CandidateStatus)}
        >
          {['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Not Selected'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </Select>
      )
    },
    { field: 'appliedDate', headerName: 'Applied Date', width: 150, valueFormatter: (p) => new Date(p as string).toLocaleDateString() },
    {
      field: 'actions', headerName: 'Actions', width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Button size="small" onClick={() => navigate(`/candidates/${params.row.id}`)}>Profile</Button>
      )
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4">{req.jobTitle}</Typography>
          <Typography variant="subtitle1" color="text.secondary">ID: {req.id}</Typography>
        </Box>
        <Box>
          <Chip label={req.status} color="primary" sx={{ mr: 2 }} />

          {req.status === 'Pending Approval' && currentUserRole === 'Approver' && (
            <>
              <Button color="error" onClick={handleReject} sx={{ mr: 1 }}>Reject</Button>
              <Button variant="contained" color="success" onClick={handleApprove}>Approve</Button>
            </>
          )}

          {req.status === 'Approved' && currentUserRole === 'Recruitment Lead' && (
            <Button variant="contained" onClick={handleConfigure}>Configure Hiring Process</Button>
          )}
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Overview" />
          <Tab label="Candidates" />
          <Tab label="Job Postings" />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Overview</Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 6 }}><Typography variant="subtitle2">Hiring Manager</Typography> <Typography>{req.hiringManagerId}</Typography></Grid>
            <Grid size={{ xs: 6 }}><Typography variant="subtitle2">Quantity</Typography> <Typography>{req.quantity}</Typography></Grid>
            <Grid size={{ xs: 12 }}><Typography variant="subtitle2">Description</Typography> <div dangerouslySetInnerHTML={{ __html: req.description }} /></Grid>
          </Grid>
        </Paper>
      )}

      {tabValue === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" onClick={() => setAddCandidateOpen(true)}>Add Candidate</Button>
          </Box>
          <Paper sx={{ width: '100%' }}>
            <DataGrid rows={reqCandidates} columns={candidateColumns} autoHeight disableRowSelectionOnClick />
          </Paper>
        </Box>
      )}

      {tabValue === 2 && (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography color="text.secondary">No Job Postings yet.</Typography>
          <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/job-postings')}>Manage Postings</Button>
        </Box>
      )}

      <Dialog open={addCandidateOpen} onClose={() => setAddCandidateOpen(false)}>
        <DialogTitle>Add Candidate</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Full Name" value={newCandidate.name} onChange={e => setNewCandidate({ ...newCandidate, name: e.target.value })} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Email" value={newCandidate.email} onChange={e => setNewCandidate({ ...newCandidate, email: e.target.value })} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Phone" value={newCandidate.phone} onChange={e => setNewCandidate({ ...newCandidate, phone: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCandidateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCandidate}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
