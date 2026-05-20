
import React, { useState } from 'react';
import {
    Box, Typography, Button, Paper, Chip, Dialog, DialogTitle, DialogContent,
    Grid, TextField, DialogActions, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useMockData } from '../../context/MockDataContext';

export const JobPostings: React.FC = () => {
    const { requisitions } = useMockData();
    const [open, setOpen] = useState(false);

    // Mock postings data structure since I didn't add it to main typings yet, or I can infer it.
    // I'll just show a placeholder list and a "Publish" flow.

    const [postings, setPostings] = useState([
        { id: 'JP-001', reqId: 'JOB-2023-101', title: 'Senior React Developer', channel: 'LinkedIn', status: 'Published' }
    ]);

    const [newPosting, setNewPosting] = useState({ reqId: '', channel: 'Internal' });

    const handlePublish = () => {
        const req = requisitions.find(r => r.id === newPosting.reqId);
        if (!req) return;

        setPostings([...postings, {
            id: `JP-${postings.length + 1}`, 
       reqId: req.id, 
       title: req.jobTitle, 
       channel: newPosting.channel, 
       status: 'Published' 
    }]);
    setOpen(false);
  };

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 100 },
    { field: 'title', headerName: 'Job Title', width: 200 },
    { field: 'reqId', headerName: 'Requisition ID', width: 150 },
    { field: 'channel', headerName: 'Channel', width: 150 },
    { field: 'status', headerName: 'Status', width: 150, renderCell: (p) => <Chip label={p.value} color="success" size="small" /> },
  ];

  return (
    <Box>
       <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
         <Typography variant="h4">Job Postings Management</Typography>
         <Button variant="contained" onClick={() => setOpen(true)}>Create Job Posting</Button>
       </Box>

       <Paper sx={{ width: '100%' }}>
         <DataGrid rows={postings} columns={columns} autoHeight disableRowSelectionOnClick />
       </Paper>

       <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
         <DialogTitle>Create Job Posting</DialogTitle>
         <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
               <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>Select Requisition</InputLabel>
                    <Select value={newPosting.reqId} label="Select Requisition" onChange={e => setNewPosting({...newPosting, reqId: e.target.value})}>
                       {requisitions.filter(r => r.status === 'Open for Hiring').map(r => (
                          <MenuItem key={r.id} value={r.id}>{r.jobTitle} ({r.id})</MenuItem>
                       ))}
                    </Select>
                  </FormControl>
               </Grid>
               <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>Channel</InputLabel>
                    <Select value={newPosting.channel} label="Channel" onChange={e => setNewPosting({...newPosting, channel: e.target.value})}>
                       <MenuItem value="Internal">Internal Job Board</MenuItem>
                       <MenuItem value="LinkedIn">LinkedIn</MenuItem>
                       <MenuItem value="Agency">Agency</MenuItem>
                    </Select>
                  </FormControl>
               </Grid>
            </Grid>
         </DialogContent>
         <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handlePublish}>Publish</Button>
         </DialogActions>
       </Dialog>
    </Box>
  );
};
