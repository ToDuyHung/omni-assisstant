
import React, { useState } from 'react';
import {
   Box, Typography, Paper, TextField, Button, Grid, MenuItem,
   FormControl, InputLabel, Select
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useMockData } from '../../context/MockDataContext';
import { Requisition } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export const RequisitionForm: React.FC = () => {
   const navigate = useNavigate();
   const { addRequisition, requests } = useMockData(); // Use requests to link

   const [formData, setFormData] = useState<Partial<Requisition>>({
      jobTitle: '',
      quantity: 1,
      hiringManagerId: '',
      description: '',
      requestId: ''
   });

   const handleSubmit = (isDraft: boolean) => {
      const newReq: Requisition = {
         ...formData as Requisition,
         id: `JOB-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
         status: isDraft ? 'Draft' : 'Pending Approval',
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString(),
         recruiters: [], // Add default recruiter logic or field
         hiringProcessTemplateId: ''
      };
      addRequisition(newReq);
      navigate('/job-requisitions');
   };

   return (
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
         <Typography variant="h4" gutterBottom>Create Job Requisition</Typography>

         <Paper sx={{ p: 4 }}>
            <Grid container spacing={3}>
               <Grid size={{ xs: 12 }}>
                  <TextField
                     fullWidth label="Job Title" required
                     value={formData.jobTitle}
                     onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                  />
               </Grid>
               <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth>
                     <InputLabel>Link to Request (Optional)</InputLabel>
                     <Select
                        value={formData.requestId}
                        label="Link to Request (Optional)"
                        onChange={e => setFormData({ ...formData, requestId: e.target.value })}
                     >
                        <MenuItem value="">None</MenuItem>
                        {requests.map(r => (
                           <MenuItem key={r.id} value={r.id}>{r.id} - {r.title}</MenuItem>
                        ))}
                     </Select>
                  </FormControl>
               </Grid>
               <Grid size={{ xs: 6 }}>
                  <TextField
                     fullWidth type="number" label="Quantity"
                     value={formData.quantity}
                     onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  />
               </Grid>
               <Grid size={{ xs: 12 }}>
                  <TextField
                     fullWidth label="Hiring Manager (User ID)"
                     value={formData.hiringManagerId}
                     onChange={e => setFormData({ ...formData, hiringManagerId: e.target.value })}
                     helperText="Enter user ID (e.g., user-hm-01)"
                  />
               </Grid>
               <Grid size={{ xs: 12 }}>
                  <TextField
                     fullWidth multiline rows={6} label="Job Description"
                     placeholder="Enter detailed job description here..."
                     value={formData.description}
                     onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
               </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
               <Button onClick={() => navigate('/job-requisitions')}>Cancel</Button>
               <Button variant="outlined" onClick={() => handleSubmit(true)}>Save Draft</Button>
               <Button variant="contained" onClick={() => handleSubmit(false)}>Submit for Approval</Button>
            </Box>
         </Paper>
      </Box>
   );
};
