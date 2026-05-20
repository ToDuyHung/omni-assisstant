
import React, { useState } from 'react';
import {
    Box, Typography, Paper, Grid, TextField, Button, Chip, Divider, IconButton
} from '@mui/material';
import { useParams } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import { useMockData } from '../../context/MockDataContext';

export const CandidateProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { candidates, updateCandidate } = useMockData();
    const candidate = candidates.find(c => c.id === id);

    const [newSkill, setNewSkill] = useState('');

    if (!candidate) return <Typography>Candidate not found</Typography>;

    const handleAddSkill = () => {
        if (newSkill && !candidate.skills.includes(newSkill)) {
            updateCandidate({
                ...candidate,
                skills: [...candidate.skills, newSkill]
            });
            setNewSkill('');
        }
    };

    const handleDeleteSkill = (skillToDelete: string) => {
        updateCandidate({
            ...candidate,
            skills: candidate.skills.filter(s => s !== skillToDelete)
        });
    };

    return (
        <Box maxWidth="md" mx="auto">
            <Paper sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Typography variant="h4">{candidate.name}</Typography>
                    <Chip label={candidate.status} color="primary" />
                </Box>

                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                        <Typography variant="body1">{candidate.email}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                        <Typography variant="body1">{candidate.phone}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">Applied Date</Typography>
                        <Typography variant="body1">{new Date(candidate.appliedDate).toLocaleDateString()}</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="subtitle2" color="text.secondary">Requisition ID</Typography>
                        <Typography variant="body1">{candidate.requisitionId}</Typography>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom>Skills</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        {candidate.skills.map((skill) => (
                            <Chip key={skill} label={skill} onDelete={() => handleDeleteSkill(skill)} />
                        ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, maxWidth: 300 }}>
                        <TextField
                            size="small" label="Add Skill" fullWidth
                            value={newSkill}
                            onChange={e => setNewSkill(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                        />
                        <Button onClick={handleAddSkill}>Add</Button>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};
