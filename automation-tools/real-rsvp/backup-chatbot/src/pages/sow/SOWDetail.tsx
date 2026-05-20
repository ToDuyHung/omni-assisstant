
import React, { useState, useRef } from 'react';
import {
    Box, Typography, Paper, Grid, Button, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox
} from '@mui/material';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { useMockData } from '../../context/MockDataContext';

export const SOWDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { sows, updateSOW, currentUserRole } = useMockData();
    const sow = sows.find(s => s.id === id);

    const [signOffOpen, setSignOffOpen] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const sigCanvas = useRef<any>(null);

    if (!sow) return <Typography>SOW not found</Typography>;

    const handleApprove = () => {
        updateSOW({ ...sow, status: 'Approved' }); // Ready for sign-off
    };

    const handleSignOff = () => {
        // Mock signature save
        updateSOW({
            ...sow,
            status: 'Active',
            signedByClient: true,
            signedByVendor: true // assume vendor signed offline or first
        });
        setSignOffOpen(false);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">SOW: {sow.id}</Typography>
                <Chip label={sow.status} color="primary" />
            </Box>

            <Paper sx={{ p: 4, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Agreement Details</Typography>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 6 }}><Typography variant="subtitle2" color="text.secondary">Vendor</Typography> <Typography>{sow.vendorName}</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="subtitle2" color="text.secondary">Request ID</Typography> <Typography>{sow.requestId}</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="subtitle2" color="text.secondary">Period</Typography> <Typography>{sow.periodStart} to {sow.periodEnd}</Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="subtitle2" color="text.secondary">Value</Typography> <Typography>\${sow.contractValue.toLocaleString()}</Typography></Grid>
                </Grid>
            </Paper>

            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Actions</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    {sow.status === 'Pending Review' && currentUserRole === 'Head of Finance' && (
                        <>
                            <Button variant="outlined" color="error">Reject</Button>
                            <Button variant="contained" color="success" onClick={handleApprove}>Approve</Button>
                        </>
                    )}

                    {sow.status === 'Approved' && currentUserRole === 'Authorized Personnel' && (
                        <Button variant="contained" color="primary" onClick={() => setSignOffOpen(true)}>Sign Off SOW</Button>
                    )}

                    {sow.status === 'Active' && <Typography color="success.main">Contract is Active and Signed.</Typography>}
                </Box>
            </Paper>

            <Dialog open={signOffOpen} onClose={() => setSignOffOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Sign-off SOW</DialogTitle>
                <DialogContent>
                    <Typography paragraph>
                        I hereby authorize this Statement of Work and agree to the terms.
                    </Typography>
                    <FormControlLabel
                        control={<Checkbox checked={agreed} onChange={e => setAgreed(e.target.checked)} />}
                        label="I acknowledge and agree to the details of this SOW."
                    />

                    <Box sx={{ border: '1px solid #ccc', borderRadius: 1, mt: 2, height: 200 }}>
                        <SignatureCanvas
                            ref={sigCanvas}
                            penColor="black"
                            canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }}
                        />
                    </Box>
                    <Button size="small" onClick={() => sigCanvas.current?.clear()}>Clear Signature</Button>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSignOffOpen(false)}>Cancel</Button>
                    <Button onClick={handleSignOff} variant="contained" disabled={!agreed}>Sign Contract</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
