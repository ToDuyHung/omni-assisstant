
import React, { useState } from 'react';
import {
    Box, Typography, Button, Paper, TextField, InputAdornment,
    FormControl, InputLabel, Select, MenuItem, Chip
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMockData } from '../../context/MockDataContext';

export const RequisitionList: React.FC = () => {
    const navigate = useNavigate();
    const { requisitions } = useMockData();
    const [filterMode, setFilterMode] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRequisitions = requisitions.filter(r => {
        const matchesSearch = r.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.id.toLowerCase().includes(searchTerm.toLowerCase());

        // Mock filter logic
        if (filterMode === 'My Requisitions') return matchesSearch; // assume all are 'mine' for demo
        if (filterMode === 'Pending My Approval') return matchesSearch && r.status === 'Pending Approval';
        if (filterMode === 'Assigned to Me') return matchesSearch && r.status === 'Open for Hiring';

        return matchesSearch;
    });

    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 130 },
        { field: 'jobTitle', headerName: 'Job Title', flex: 1 },
        { field: 'quantity', headerName: 'Qty', width: 70 },
        { field: 'hiringManagerId', headerName: 'Hiring Manager', width: 150 },
        {
            field: 'status',
            headerName: 'Status',
            width: 150,
            renderCell: (params: GridRenderCellParams) => {
                const color = params.value === 'Approved' ? 'success' :
                    params.value === 'Pending Approval' ? 'warning' : 'default';
                return <Chip label={params.value as string} color={color} size="small" variant="outlined" />;
            }
        },
        { field: 'createdAt', headerName: 'Created Date', width: 150, valueFormatter: (p) => new Date(p as string).toLocaleDateString() },
        {
            field: 'actions', headerName: 'Actions', width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Button size="small" onClick={() => navigate(`/job-requisitions/${params.row.id}`)}>View</Button>
       )
    }
  ];

  return (
    <Box>
       <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
         <Typography variant="h4">Job Requisitions</Typography>
         <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/job-requisitions/new')}>
            Create Requisition
         </Button>
       </Box>

       <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
             <TextField 
                label="Search" 
                size="small" 
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ width: 300 }}
             />
             <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel>Filter View</InputLabel>
                <Select value={filterMode} label="Filter View" onChange={(e) => setFilterMode(e.target.value)}>
                   <MenuItem value="All">All Requisitions</MenuItem>
                   <MenuItem value="My Requisitions">My Requisitions</MenuItem>
                   <MenuItem value="Pending My Approval">Pending My Approval</MenuItem>
                   <MenuItem value="Assigned to Me">Assigned to Me</MenuItem>
                </Select>
             </FormControl>
          </Box>
       </Paper>

       <Paper sx={{ width: '100%' }}>
         <DataGrid
           rows={filteredRequisitions}
           columns={columns}
           initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
           pageSizeOptions={[5, 10]}
           autoHeight
           sx={{ border: 0 }}
           disableRowSelectionOnClick
         />
       </Paper>
    </Box>
  );
};
