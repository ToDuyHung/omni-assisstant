import React from 'react';
import {
  Box, Typography, Button, Paper, TextField, InputAdornment, Grid, useTheme,
} from '@mui/material';
import {
  DataGrid, type GridColDef,
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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMockData } from '../../context/MockDataContext';

type ProcessingStatus =
  | 'Evaluate'
  | 'Discover'
  | 'Sign Off'
  | 'Fulfill'
  | 'Cancelled';

interface ProcessingRow {
  id: string;
  title: string;
  requesterName: string;
  teamSize: number;
  businessArea: string;
  lob: string;
  status: ProcessingStatus;
  submittedOn: string;
  type: string;
}

// Custom SVG Illustration for Empty State
const EmptyIllustration = () => (
  <svg
    width="80"
    height="80"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#dce0e6"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const RequestProcessing: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { requests } = useMockData();
  const [searchText, setSearchText] = React.useState('');
  const [activeStatus, setActiveStatus] = React.useState<ProcessingStatus | 'All'>('All');

  // "Solid deep blue background" for all cards as per Target UI instructions
  const cardColor = '#00458d';



  const dynamicRows = React.useMemo<ProcessingRow[]>(
    () => requests
      .filter(r => r.title && r.title.trim().length > 0)
      .filter(r => r.status !== 'Draft')
      .map(r => {
        let status: ProcessingStatus;
        switch (r.status) {
          case 'Evaluate':
            status = 'Evaluate';
            break;
          case 'Discover':
            status = 'Discover';
            break;
          case 'Sign-off':
            status = 'Sign Off';
            break;
          case 'Fulfill':
            status = 'Fulfill';
            break;
          case 'Closed':
            status = 'Cancelled';
            break;
          default:
            status = 'Evaluate';
        }

        const teamSize = typeof r.teamSize === 'number'
          ? r.teamSize
          : (r.resources || []).reduce((sum, res) => sum + (res.quantity || 0), 0);

        return {
          id: r.id,
          title: r.title,
          requesterName: r.projectContact?.name || r.createdBy || 'Unknown',
          teamSize,
          businessArea: r.businessArea || 'Group HQ',
          lob: r.lob || 'Group HQ',
          status,
          submittedOn: new Date(r.createdAt).toLocaleDateString(),
          type: r.requestType,
        };
      }),
    [requests],
  );

  const allRows: ProcessingRow[] = React.useMemo(
    () => dynamicRows,
    [dynamicRows],
  );

  const filteredRows = allRows.filter(row => {
    const q = searchText.trim().toLowerCase();

    const matchesSearch = !q
      || row.title.toLowerCase().includes(q)
      || row.id.toLowerCase().includes(q)
      || row.requesterName.toLowerCase().includes(q);

    const matchesStatus = activeStatus === 'All' || row.status === activeStatus;

    return matchesSearch && matchesStatus;
  });

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    {
      field: 'title',
      headerName: 'Project Name',
      flex: 1,
      minWidth: 200,
      renderCell: params => (
        <Button
          variant="text"
          onClick={() => navigate(`/requests/${params.row.id}?source=processing`)}
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
              bgcolor: 'transparent',
            },
          }}
        >
          {params.value}
        </Button>
      ),
    },
    { field: 'requesterName', headerName: 'Project Contact Name', width: 180 },
    { field: 'teamSize', headerName: 'Team Size', width: 100 },
    { field: 'businessArea', headerName: 'Business Area', width: 150 },
    { field: 'lob', headerName: 'LOB', width: 100 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'submittedOn', headerName: 'Submitted On', width: 120 },
    { field: 'type', headerName: 'Request Type', width: 160 },
  ];

  const statusCounts = allRows.reduce<Record<ProcessingStatus, number>>(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    {
      Evaluate: 0,
      Discover: 0,
      'Sign Off': 0,
      Fulfill: 0,
      Cancelled: 0,
    },
  );

  const statusTiles = [
    {
      label: 'Evaluate',
      status: 'Evaluate' as ProcessingStatus,
      count: statusCounts.Evaluate,
      delayed: 0,
      icon: <DraftIcon sx={{ fontSize: 56, color: 'white' }} />,
    },
    {
      label: 'Discover',
      status: 'Discover' as ProcessingStatus,
      count: statusCounts.Discover,
      delayed: 0,
      icon: <EvaluateIcon sx={{ fontSize: 56, color: 'white' }} />,
    },
    {
      label: 'Sign Off',
      status: 'Sign Off' as ProcessingStatus,
      count: statusCounts['Sign Off'],
      delayed: 0,
      icon: <SignOffIcon sx={{ fontSize: 56, color: 'white' }} />,
    },
    {
      label: 'Fulfill',
      status: 'Fulfill' as ProcessingStatus,
      count: statusCounts.Fulfill,
      delayed: 0,
      icon: <CancelIcon sx={{ fontSize: 56, color: 'white' }} />,
    },
    {
      label: 'Cancelled',
      status: 'Cancelled' as ProcessingStatus,
      count: statusCounts.Cancelled,
      delayed: 0,
      icon: <DiscoverIcon sx={{ fontSize: 56, color: 'white' }} />,
    },
  ];

  return (
    <Box>
      {/* Header Row: Title and Search */}
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3,
      }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#172b4d' }}>
          Business Requests
        </Typography>

        <TextField
          placeholder="Search"
          size="small"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          sx={{
            width: 300,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'white',
              borderRadius: 2,
              '& fieldset': { borderColor: '#dfe1e6' },
              '&:hover fieldset': { borderColor: '#c1c7d0' },
              '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
            },
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
      <Grid container spacing={2} sx={{ mb: 4 }} columns={{ xs: 12, sm: 12, md: 12, lg: 10, xl: 10 }}>
        {statusTiles.map(tile => {
          const isSelected = activeStatus === tile.status;
          const isDimmed = activeStatus !== 'All' && !isSelected;

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={tile.status}>
              <Paper
                elevation={isSelected ? 6 : 2}
                onClick={() => setActiveStatus(prev => (prev === tile.status ? 'All' : tile.status))}
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
                    opacity: isDimmed ? 0.8 : 1,
                  },
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
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.1) 100%)',
                    clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 0% 100%)',
                    pointerEvents: 'none',
                  }}
                />

                <Box sx={{
                  p: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  zIndex: 1,
                }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
                      {tile.count}
                    </Typography>
                    {tile.icon}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, opacity: 0.9 }}>
                      {tile.label}
                    </Typography>
                    <Box
                      sx={{
                        px: 1.2,
                        py: 0.4,
                        borderRadius: 999,
                        bgcolor: '#ff7043',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}
                    >
                      {tile.delayed} Delayed
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

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
          overflow: 'hidden',
        }}
      >
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={row => row.id}
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
              textTransform: 'uppercase',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700,
            },
            '& .MuiDataGrid-iconSeparator': {
              display: 'none',
            },
            '& .MuiDataGrid-sortIcon': {
              opacity: 0.5,
              color: '#42526e',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #edeff2',
              color: '#172b4d',
              fontSize: '0.9rem',
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: '#f5f7fa',
            },
          }}
          slots={{
            noRowsOverlay: () => (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                pb: 5,
              }}
              >
                <Box sx={{ mb: 2, opacity: 0.5 }}>
                  <EmptyIllustration />
                </Box>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{ fontWeight: 600 }}
                >
                  No Data
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No requests found.
                </Typography>
                <Box sx={{ mt: 3, width: 200, height: 4, bgcolor: '#f0f2f5', borderRadius: 2 }} />
              </Box>
            ),
          }}
        />
      </Paper>
    </Box>
  );
};


