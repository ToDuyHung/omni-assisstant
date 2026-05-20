
import React from 'react';
import {
    Box, Typography, Paper, Grid, Button, Card, CardContent, CardActions, Chip
} from '@mui/material';
import { useMockData } from '../../context/MockDataContext';

export const InternalJobBoard: React.FC = () => {
    const { requisitions } = useMockData();
    // Filter only those that are 'Open for Hiring' as a proxy for published
    const postedJobs = requisitions.filter(r => r.status === 'Open for Hiring');

    return (
        <Box>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography variant="h3" gutterBottom color="primary">Internal Opportunities</Typography>
                <Typography variant="h6" color="text.secondary">Find your next challenge within VCC</Typography>
            </Box>

            <Grid container spacing={3}>
                {postedJobs.length === 0 ? (
                    <Typography sx={{ mx: 'auto', mt: 4 }}>No open positions currently.</Typography>
                ) : (
                    postedJobs.map((job) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={job.id}>
                            <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="caption" color="text.secondary">REF: {job.id}</Typography>
                                    <Typography variant="h5" component="div" gutterBottom>{job.jobTitle}</Typography>
                                    <Chip label="Full Time" size="small" sx={{ mb: 2 }} />
                                    <Typography variant="body2" color="text.secondary"
                                        dangerouslySetInnerHTML={{ __html: job.description.substring(0, 100) + '...' }}
                                    />
                                </CardContent>
                                <CardActions>
                                    <Button size="small">View Details</Button>
                                    <Button size="small" variant="contained">Refer a Friend</Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))
                )}
            </Grid>
        </Box>
    );
};
