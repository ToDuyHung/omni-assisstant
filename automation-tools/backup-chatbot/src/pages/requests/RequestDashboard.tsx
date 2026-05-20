
import React, { useState } from 'react';
import {
  Box, Typography, Button, Paper, TextField, InputAdornment, Grid, useTheme
} from '@mui/material';
import {
  DataGrid, type GridColDef
} from '@mui/x-data-grid';
import {
  Search as SearchIcon,
  Add as AddIcon,
  EditNote as DraftIcon,
  FindInPage as EvaluateIcon,
  YoutubeSearchedFor as DiscoverIcon,
  AssignmentTurnedIn as SignOffIcon,
  TaskAlt as FulfillIcon,
  CancelOutlined as CancelIcon,
  ArrowDropDown as ArrowDropDownIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMockData } from '../../context/MockDataContext';
import { format } from 'date-fns';
import { useTutorial } from '../../context/TutorialContext';

// Custom SVG Illustration for Empty State
const EmptyIllustration = () => (
  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#dce0e6" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const RequestDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { requests } = useMockData();
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const theme = useTheme();

  // Status Tiles Configuration
  // "Solid deep blue background" for all cards as per Target UI instructions
  const cardColor = '#00458d';

  const handleStatusClick = (status: string) => {
    setFilterStatus(prev => prev === status ? null : status);
  };

  // Helper to sync count with valid rows
  const isValid = (r: any) => r.title && r.title.trim().length > 0;

  const statusTiles = [
    { label: 'Draft', status: 'Draft', count: requests.filter(r => r.status === 'Draft' && isValid(r)).length, icon: <DraftIcon sx={{ fontSize: 56, color: 'white' }} /> },
    { label: 'Evaluate', status: 'Evaluate', count: requests.filter(r => r.status === 'Evaluate' && isValid(r)).length, icon: <EvaluateIcon sx={{ fontSize: 56, color: 'white' }} /> },
    { label: 'Discover', status: 'Discover', count: requests.filter(r => r.status === 'Discover' && isValid(r)).length, icon: <DiscoverIcon sx={{ fontSize: 56, color: 'white' }} /> },
    { label: 'Sign Off', status: 'Sign-off', count: requests.filter(r => r.status === 'Sign-off' && isValid(r)).length, icon: <SignOffIcon sx={{ fontSize: 56, color: 'white' }} /> },
    { label: 'Fulfill', status: 'Fulfill', count: requests.filter(r => r.status === 'Fulfill' && isValid(r)).length, icon: <FulfillIcon sx={{ fontSize: 56, color: 'white' }} /> },
    { label: 'Cancelled', status: 'Closed', count: requests.filter(r => r.status === 'Closed' && isValid(r)).length, icon: <CancelIcon sx={{ fontSize: 56, color: 'white' }} /> },
  ];

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    {
      field: 'title',
      headerName: 'Project Name',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Button
          className="request-item-link"
          variant="text"
          onClick={() => navigate(`/requests/${params.row.id}`)}
          sx={{
            textTransform: 'none',
            color: '#1976d2',
            fontWeight: 600,
            p: 0,
            minWidth: 'auto',
            textAlign: 'left',
            justifyContent: 'flex-start',
            '&:hover': {
              textDecoration: 'underline',
              bgcolor: 'transparent'
            }
          }}
        >
          {params.value}
        </Button>
      )
    },
    { field: 'requesterName', headerName: 'Project Contact Name', width: 180 },
    { field: 'teamSize', headerName: 'Team Size', width: 100 },
    { field: 'businessArea', headerName: 'Business Area', width: 150 },
    { field: 'lob', headerName: 'LOB', width: 100 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'submittedOn', headerName: 'Submitted On', width: 120 },
    { field: 'type', headerName: 'Request Type', width: 140 },
  ];

  const { isTutorialOpen, activeTutorialId } = useTutorial();

  // Transform data
  const rows = requests
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map(r => ({
      ...r,
      requesterName: r.projectContact?.name || 'Unknown',
      teamSize: r.teamSize || 0,
      businessArea: r.businessArea || 'Digital Systems',
      lob: r.lob || 'Marine',
      submittedOn: r.createdAt ? format(new Date(r.createdAt), 'dd/MM/yyyy') : '-',
    }));

  // Filter rows
  let filteredRows = rows.filter(r => {
    const hasTitle = r.title && r.title.trim().length > 0;
    const matchesSearch = r.title.toLowerCase().includes(searchText.toLowerCase()) ||
      r.id.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = filterStatus ? r.status === filterStatus : true;
    return hasTitle && matchesSearch && matchesStatus;
  });

  // TUTOIRAL MODE: FAKE DRAFT INJECTION
  // If Update Request tutorial is active, OR if general tutorial is open and Filter is Draft
  // We force this specific single row to appear to ensure the tutorial flow is deterministic.
  const isUpdateTutorial = activeTutorialId === 'update_request';

  if (isTutorialOpen && (isUpdateTutorial || filterStatus === 'Draft')) {
    filteredRows = [{
      id: 'draft_tutorial',
      title: 'Tutorial Draft Request',
      requesterName: 'John Doe',
      teamSize: 5,
      businessArea: 'Technology',
      lob: 'Group HQ',
      status: 'Draft',
      submittedOn: format(new Date(), 'dd/MM/yyyy'),
      type: 'Talent Augmentation',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    } as any];
  }

  return (
    <Box>
      {/* Header Row: Title and Search */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#172b4d' }}>
          My Request
        </Typography>

        <TextField
          placeholder="Search"
          size="small"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{
            width: 300,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'white',
              borderRadius: 2,
              '& fieldset': { borderColor: '#dfe1e6' },
              '&:hover fieldset': { borderColor: '#c1c7d0' },
              '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#5e6c84' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Status Cards Row */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statusTiles.map((tile, index) => {
          const isSelected = filterStatus === tile.status;
          const isDimmed = filterStatus !== null && !isSelected;

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={index}>
              <Paper
                id={`tile-${tile.status.toLowerCase().replace(' ', '-')}`}
                elevation={isSelected ? 6 : 2}
                onClick={() => handleStatusClick(tile.status)}
                sx={{
                  height: 110,
                  bgcolor: cardColor,
                  color: 'white',
                  borderRadius: 2,
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  opacity: isDimmed ? 0.6 : 1,
                  transition: 'all 0.2s',
                  transform: isSelected ? 'scale(1.02)' : 'none',
                  border: isSelected ? '2px solid white' : 'none',
                  '&:hover': {
                    transform: isSelected ? 'scale(1.02)' : 'translateY(-2px)',
                    boxShadow: '0 8px 16px rgba(0,69,141, 0.4)',
                    opacity: isDimmed ? 0.8 : 1
                  }
                }}
              >
                {/* Diagonal Highlight Overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '60%',
                    height: '100%',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.1) 100%)',
                    clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 0% 100%)',
                    pointerEvents: 'none'
                  }}
                />

                <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
                      {tile.count}
                    </Typography>
                    {tile.icon}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.9 }}>
                    {tile.label}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* New Request Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          id="btn-new-request"
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => navigate('/requests/new')}
          sx={{
            py: 1.2,
            px: 3,
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '1rem',
            bgcolor: cardColor,
            borderRadius: 1.5,
            boxShadow: 'none',
            '&:hover': {
              bgcolor: '#003a75',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }
          }}
        >
          New Request
        </Button>
      </Box>

      {/* Data Table */}
      <Paper
        elevation={0}
        sx={{
          height: 600,
          width: '100%',
          borderRadius: 2,
          bgcolor: 'white',
          border: '1px solid #ebecf0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}
      >
        <DataGrid
          rows={filteredRows}
          columns={columns}
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: 'white',
              borderBottom: '2px solid #edeff2',
              color: '#42526e',
              fontWeight: 700,
              fontSize: '0.8rem',
              textTransform: 'uppercase'
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700
            },
            '& .MuiDataGrid-iconSeparator': {
              display: 'none'
            },
            '& .MuiDataGrid-sortIcon': {
              opacity: 0.5,
              color: '#42526e'
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #edeff2',
              color: '#172b4d',
              fontSize: '0.9rem'
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: '#f5f7fa'
            }
          }}
          slots={{
            noRowsOverlay: () => (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', pb: 5 }}>
                <Box sx={{ mb: 2, opacity: 0.5 }}>
                  <EmptyIllustration />
                </Box>
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>No Data</Typography>
                <Typography variant="body2" color="text.secondary">No requests found.</Typography>
                <Box sx={{ mt: 3, width: 200, height: 4, bgcolor: '#f0f2f5', borderRadius: 2 }} />
              </Box>
            )
          }}
        />
      </Paper>
    </Box>
  );
};

