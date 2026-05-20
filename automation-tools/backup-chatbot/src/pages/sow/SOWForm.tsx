
import React, { useState } from 'react';
import {
   Box, Typography, Paper, TextField, Button, Grid, MenuItem,
   FormControl, InputLabel, Select, FormHelperText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useMockData } from '../../context/MockDataContext';
import type { SOW } from '../../types';

export const SOWForm: React.FC = () => {
   const navigate = useNavigate();
   const { addSOW, requests } = useMockData();

   const [formData, setFormData] = useState<Partial<SOW>>({
      vendorName: '',
      periodStart: '',
      periodEnd: '',
      contractValue: 0,
      requestId: '',
      pricingModel: 'Fixed Price'
   });

   const handleSubmit = (isDraft: boolean) => {
      const newSOW: SOW = {
         ...formData as SOW,
         id: `SOW-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
         status: isDraft ? 'Draft' : 'Pending Review',
         createdAt: new Date().toISOString(),
         signedByVendor: false,
         signedByClient: false,
         currency: 'USD'
      };
      addSOW(newSOW);
      navigate('/sow');
   };

   return (
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
         <Typography variant="h4" gutterBottom>Create Statement of Work</Typography>

         <Paper sx={{ p: 4 }}>
            <Grid container spacing={3}>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                     <InputLabel>Link Request</InputLabel>
                     <Select
                        value={formData.requestId}
                        label="Link Request"
                        onChange={e => setFormData({ ...formData, requestId: e.target.value })}
                     >
                        {requests.map(r => (
                           <MenuItem key={r.id} value={r.id}>{r.id} - {r.title}</MenuItem>
                        ))}
                     </Select>
                     <FormHelperText>Must link to a Request</FormHelperText>
                  </FormControl>
               </Grid>
               <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                     fullWidth label="Vendor Name"
                     value={formData.vendorName}
                     onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
                  />
               </Grid>
               <Grid size={{ xs: 6 }}>
                  <TextField
                     fullWidth type="date" label="Start Date" InputLabelProps={{ shrink: true }}
                     value={formData.periodStart}
                     onChange={e => setFormData({ ...formData, periodStart: e.target.value })}
                  />
               </Grid>
               <Grid size={{ xs: 6 }}>
                  <TextField
                     fullWidth type="date" label="End Date" InputLabelProps={{ shrink: true }}
                     value={formData.periodEnd}
                     onChange={e => setFormData({ ...formData, periodEnd: e.target.value })}
                  />
               </Grid>
               <Grid size={{ xs: 6 }}>
                  <TextField
                     fullWidth type="number" label="Contract Value (USD)"
                     value={formData.contractValue}
                     onChange={e => setFormData({ ...formData, contractValue: Number(e.target.value) })}
                  />
               </Grid>
               <Grid size={{ xs: 6 }}>
                  <FormControl fullWidth>
                     <InputLabel>Pricing Model</InputLabel>
                     <Select
                        value={formData.pricingModel}
                        label="Pricing Model"
                        onChange={e => setFormData({ ...formData, pricingModel: e.target.value as any })}
                     >
                        <MenuItem value="Fixed Price">Fixed Price</MenuItem>
                        <MenuItem value="Time & Materials">Time & Materials</MenuItem>
                     </Select>
                  </FormControl>
               </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
               <Button onClick={() => navigate('/sow')}>Cancel</Button>
               <Button variant="outlined" onClick={() => handleSubmit(true)}>Save Draft</Button>
               <Button variant="contained" onClick={() => handleSubmit(false)}>Submit</Button>
            </Box>
         </Paper>
      </Box>
   );
};
