
import React, { useState } from 'react';
import {
    Box, Typography, Button, Paper, TextField, InputAdornment, Checkbox, FormControlLabel, Link,
    Container, CssBaseline, Grid
} from '@mui/material';
import { Email, Lock } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        navigate('/requests');
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f8' }}>
            <CssBaseline />

            {/* Hero Section / Login Container */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #102a43 0%, #00458d 100%)', // Brand gradient (Navy)
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Abstract shapes for visual interest */}
                <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
                <Box sx={{ position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />

                <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>

                    <Grid container spacing={4} alignItems="center" justifyContent="center">
                        {/* Left Side: Brand/Welcome Message (Hidden on small screens) */}
                        <Grid size={{ xs: 12, md: 7 }} sx={{ color: 'white', display: { xs: 'none', md: 'block' } }}>
                            <Typography variant="h2" fontWeight="bold" gutterBottom>
                                RSVP Portal
                            </Typography>
                            <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
                                Streamlining Request for Service & Resource Management
                            </Typography>
                            <Typography variant="body1" sx={{ opacity: 0.8, maxWidth: 500 }}>
                                Manage project subcontracting, manpower outsourcing, job requisitions, and contracts efficiently in one unified platform.
                            </Typography>
                        </Grid>

                        {/* Right Side: Login Form */}
                        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
                            <Paper elevation={10} sx={{ p: 4, borderRadius: 2 }}>
                                <Box sx={{ textAlign: 'center', mb: 3 }}>
                                    {/* Logo Placeholder */}
                                    <Box sx={{ width: 60, height: 60, bgcolor: '#00458d', color: 'white', borderRadius: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2, fontSize: 24, fontWeight: 'bold' }}>
                                        ST
                                    </Box>
                                    <Typography variant="h5" fontWeight="bold" color="primary">Welcome Back</Typography>
                                    <Typography variant="body2" color="text.secondary">Enter your credentials to access your account.</Typography>
                                </Box>

                                <form onSubmit={handleLogin}>
                                    <TextField
                                        fullWidth
                                        label="Email Address"
                                        variant="outlined"
                                        margin="normal"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><Email color="action" /></InputAdornment>,
                                        }}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Password"
                                        type="password"
                                        variant="outlined"
                                        margin="normal"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><Lock color="action" /></InputAdornment>,
                                        }}
                                    />

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 2 }}>
                                        <FormControlLabel
                                            control={<Checkbox size="small" />}
                                            label={<Typography variant="body2">Remember me</Typography>}
                                        />
                                        <Link href="#" underline="hover" variant="body2">Forgot Password?</Link>
                                    </Box>

                                    <Button
                                        type="submit"
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        sx={{ py: 1.5, fontSize: '1rem' }}
                                    >
                                        Login
                                    </Button>
                                </form>
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Footer */}
            <Box sx={{ py: 2, textAlign: 'center', bgcolor: 'white', borderTop: '1px solid #eee' }}>
                <Typography variant="caption" color="text.secondary">
                    © {new Date().getFullYear()} ST Engineering. All rights reserved. | Privacy Policy | Terms of Service
                </Typography>
            </Box>
        </Box>
    );
};
