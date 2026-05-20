
import React, { useState } from 'react';
import {
  Box, Typography, Button, Paper, TextField, InputAdornment, Chip
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMockData } from '../../context/MockDataContext';

export const SOWList: React.FC = () => {
  const navigate = useNavigate();
  const { sows, currentUserRole } = useMockData();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSows = sows.filter(s =>
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.vendorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'SOW #', width: 130 },
    { field: 'vendorName', headerName: 'Vendor', width: 200 },
    { field: 'periodStart', headerName: 'Start', width: 120 },
    { field: 'periodEnd', headerName: 'End', width: 120 },
    { field: 'contractValue', headerName: 'Value', width: 120, valueFormatter: (p) => `$${(p as number).toLocaleString()}` },
    {
      field: 'status', headerName: 'Status', width: 140,
      renderCell: (params: GridRenderCellParams) => {
        const color = params.value === 'Active' ? 'success' :
          params.value === 'Pending Review' ? 'warning' : 'default';
        return <Chip label={params.value as string} color={color} size="small" variant="outlined" />;
      }
    },
    {
      field: 'actions', headerName: 'Actions', width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Button size="small" onClick={() => navigate(`/sow/${params.row.id}`)}>View</Button>
      )
    }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Statement of Work</Typography>
        {currentUserRole === 'Contract Manager' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/sow/new')}>
            Create SOW
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          label="Search" size="small"
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 300 }}
        />
      </Paper>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <DataGrid
            rows={filteredSows}
            columns={columns}
            autoHeight
            sx={{ border: 0, minWidth: 800 }} // Ensure it doesn't crush too small content-wise
            disableRowSelectionOnClick
          />
        </Box>
      </Paper>
    </Box>
  );
};
