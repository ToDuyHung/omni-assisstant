
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        primary: {
            main: '#00458d', // Brighter Corporate Blue (ST Eng / OutSystems style)
            light: '#4b70be',
            dark: '#00295f',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#A3D977', // A fresh green accent or potentially Orange if more applicable. Using a neutral complementary or the "Shark" color for other elements.
            // Let's stick to the dark grey "Shark" for secondary elements often found in their footers/text.
            light: '#d4e8b4',
            dark: '#72aa4a',
            contrastText: '#000000',
        },
        background: {
            default: '#f5f7fb', // Light gray as requested
            paper: '#ffffff',
        },
        text: {
            primary: '#23242c',
            secondary: '#5c5e66',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        // ... (keep typography settings)
        h4: { fontWeight: 600, color: '#172b4d' },
        h5: { fontWeight: 600, color: '#172b4d' },
        h6: { fontWeight: 600, color: '#172b4d' },
        button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: { borderRadius: 8 },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#ffffff',
                    color: '#172b4d',
                    boxShadow: 'none',
                    borderBottom: '1px solid #e0e0e0',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    background: 'linear-gradient(180deg, #102a43 0%, #00458d 100%)', // Deep Navy to Blue
                    color: '#ffffff',
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    '&.Mui-selected': {
                        backgroundColor: 'rgba(255, 255, 255, 0.15)', // Light overlay for selected
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.25)',
                        },
                        borderLeft: '4px solid #D4AF37', // Gold accent line
                    },
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    },
                },
            },
        },
        MuiListItemIcon: {
            styleOverrides: {
                root: {
                    color: 'rgba(255, 255, 255, 0.7)',
                },
            },
        },
        MuiListItemText: {
            styleOverrides: {
                primary: {
                    fontSize: '0.95rem',
                    fontWeight: 500,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #ebecf0',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
            },
        },
    },
});
