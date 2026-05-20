import React, { useState, useEffect } from 'react';
import {
  Box, Stepper, Step, StepLabel, Button, Typography, Paper,
  TextField, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  Grid, Card, CardContent, MenuItem, IconButton, InputAdornment, InputLabel, Divider,
  StepIconProps, styled, StepConnector, stepConnectorClasses, Checkbox, FormGroup, Select, Snackbar, Alert, AlertColor
} from '@mui/material';
import {
  Clear as ClearIcon,
  EditNote as EditNoteIcon, // Draft
  FindInPage as EvaluateIcon, // Evaluate
  YoutubeSearchedFor as DiscoverIcon, // Discover
  AssignmentTurnedIn as SignOffIcon, // Sign Off
  TaskAlt as FulfillIcon, // Fulfill
  GroupAdd as GroupAddIcon, // Talent Augmentation
  RocketLaunch as RocketLaunchIcon, // Solution Delivery
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  HighlightOff as ErrorIcon
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, parseISO, addWeeks, addMonths, isBefore, startOfDay, isAfter } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useMockData } from '../../context/MockDataContext';
import { Request, Resource } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { useTutorial } from '../../context/TutorialContext';
import { startRequestTutorial } from '../../tutorials/startRequestTutorial';

const STEPS = ['Draft', 'Evaluate', 'Discover', 'Sign Off', 'Fulfill'];
const COUNTRIES = ['Singapore', 'Vietnam', 'Malaysia', 'Thailand', 'Indonesia'];
const BUSINESS_AREAS = ['Group HQ', 'Corporate', 'Retail', 'Technology'];
const LOBS = ['Group HQ', 'Banking', 'Insurance', 'Investment'];

const RATE_CARD: Record<string, Record<string, number>> = {
  "Business Analyst": {
    "Junior (0-2 YOE)": 3100,
    "Middle (2-5 YOE)": 4250,
    "Senior (>5 YOE)": 6000,
    "Expert (>10 YOE)": 2000
  },
  "Developer": {
    "Junior (0-2 YOE)": 3100,
    "Middle (2-5 YOE)": 4250,
    "Senior (>5 YOE)": 6000
  },
  "DevOps Engineer": {
    "Middle (2-5 YOE)": 3100,
    "Senior (>5 YOE)": 4250,
    "Expert (>10 YOE)": 11000
  },
  "Fullstack Developer": {
    "Middle (2-5 YOE)": 4250,
    "Senior (>5 YOE)": 6000
  },
  "Scrum Master": {
    "Middle (2-5 YOE)": 6000
  },
  "Tester/QA": {
    "Junior (0-2 YOE)": 3100,
    "Middle (2-5 YOE)": 4250,
    "Senior (>5 YOE)": 6000
  },
  "UI/UX": {
    "Junior (0-2 YOE)": 3100,
    "Middle (2-5 YOE)": 4250,
    "Senior (>5 YOE)": 6000
  },
  "Others": {
    "Junior (0-2 YOE)": 3100,
    "Middle (2-5 YOE)": 4250,
    "Senior (>5 YOE)": 6000
  },
  "SAP Functional": {
    "Senior (>5 YOE)": 8000,
    "Expert (>10 YOE)": 12000
  }
};

// Custom Connector
const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage:
        'linear-gradient( 95deg, #1976d2 0%, #42a5f5 100%)', // Blue gradient
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage:
        'linear-gradient( 95deg, #1976d2 0%, #42a5f5 100%)', // Blue gradient
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor:
      theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
    borderRadius: 1,
  },
}));

// Custom Step Icon
const ColorlibStepIconRoot = styled('div')<{
  ownerState: { completed?: boolean; active?: boolean };
}>(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  ...(ownerState.active && {
    backgroundImage:
      'linear-gradient( 136deg, #1565c0 0%, #42a5f5 100%)', // Blue gradient
    boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
  }),
  ...(ownerState.completed && {
    backgroundImage:
      'linear-gradient( 136deg, #1565c0 0%, #42a5f5 100%)', // Blue gradient
  }),
}));

function ColorlibStepIcon(props: StepIconProps) {
  const { active, completed, className } = props;

  const icons: { [index: string]: React.ReactElement } = {
    1: <EditNoteIcon />,
    2: <EvaluateIcon />,
    3: <DiscoverIcon />,
    4: <SignOffIcon />,
    5: <FulfillIcon />,
  };

  return (
    <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
      {icons[String(props.icon)]}
    </ColorlibStepIconRoot>
  );
}

export const NewRequestWizard: React.FC = () => {
  const navigate = useNavigate();
  const { addRequest } = useMockData();
  const [activeStep, setActiveStep] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
  const [snackbarMessage, setSnackbarMessage] = useState('Request saved successfully');
  const { isTutorialOpen, currentStepIndex, steps } = useTutorial();

  // Sync wizard step with tutorial
  useEffect(() => {
    if (isTutorialOpen) {
      // Step 3 (index 2) -> Active Step 0 (Project Info)
      if (currentStepIndex === 2) setActiveStep(0);
      // Step 4 (index 3) -> Active Step 1 (Request Details)
      if (currentStepIndex === 3) setActiveStep(1);
    }
  }, [isTutorialOpen, currentStepIndex]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeStep]);

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const [formData, setFormData] = useState<Partial<Request>>({
    projectContact: {
      name: 'TO DUY HUNG',
      email: 'duyhung.to@stengg.com',
      phone: ''
    },
    country: 'Singapore',
    businessArea: 'Group HQ',
    lob: 'Group HQ',
    department: '',
    requestType: 'Talent Augmentation',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: 0,
    engagementCriteria: '',
    duration: '',
    expectedLeadTime: '',
    teamSize: 0,
    resources: []
  });



  const handleAddResource = () => {
    // Default to Business Analyst / Junior
    const defaultRole = "Business Analyst";
    const defaultSeniority = "Junior (0-2 YOE)";
    const defaultRate = RATE_CARD[defaultRole][defaultSeniority];

    const newResource: Resource = {
      id: uuidv4(),
      role: defaultRole,
      seniority: defaultSeniority,
      quantity: 1,
      rate: defaultRate,
      mandatorySkills: '',
      otherSkills: '',
      jobDescription: '',
      subtotal: defaultRate
    };
    setFormData(prev => {
      const updatedResources = [...(prev.resources || []), newResource];
      const newTeamSize = updatedResources.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
      return {
        ...prev,
        resources: updatedResources,
        teamSize: newTeamSize
      };
    });
  };

  const handleRemoveResource = (id: string) => {
    setFormData(prev => {
      const updatedResources = prev.resources?.filter(r => r.id !== id) || [];
      const newTeamSize = updatedResources.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
      return {
        ...prev,
        resources: updatedResources,
        teamSize: newTeamSize
      };
    });
  };

  const handleResourceChange = (id: string, field: keyof Resource, value: any) => {
    setFormData(prev => {
      const updatedResources = prev.resources?.map(r => {
        if (r.id === id) {
          let updated = { ...r, [field]: value };

          // Logic for Role change
          if (field === 'role') {
            const newRole = value as string;
            // When role changes, default to the first seniority of that role
            const availableSeniorities = Object.keys(RATE_CARD[newRole] || {});
            const newSeniority = availableSeniorities[0];
            const newRate = RATE_CARD[newRole]?.[newSeniority] || 0;

            updated.seniority = newSeniority;
            updated.rate = newRate;
          }

          // Logic for Seniority change
          if (field === 'seniority') {
            const newSeniority = value as string;
            // Update rate based on role + new seniority
            const newRate = RATE_CARD[updated.role]?.[newSeniority] || 0;
            updated.rate = newRate;
          }

          // Logic for Rate/Qty change -> Recalculate Subtotal
          if (field === 'quantity' || field === 'rate' || field === 'role' || field === 'seniority') {
            updated.subtotal = (Number(updated.quantity) || 0) * (Number(updated.rate) || 0);
          }
          return updated;
        }
        return r;
      }) || [];

      const newTeamSize = updatedResources.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

      return {
        ...prev,
        resources: updatedResources,
        teamSize: newTeamSize
      };
    });
  };

  const totalMonthlyCost = formData.resources?.reduce((acc, curr) => acc + (curr.subtotal || 0), 0) || 0;
  const totalWithMarkup = totalMonthlyCost; // Based on Line 2 instruction: "sum of (Qty * Rate Card)"
  const monthlyGrandTotal = totalWithMarkup * 106.5 / 100;
  const durationMonths = parseInt(formData.duration || '0') || 0;
  const grandTotal = monthlyGrandTotal * durationMonths;

  const handleNext = () => {
    if (activeStep === STEPS.length - 2) {
      // "Sign Off" step (Index 3). Clicking Next here submits and moves to "Fulfill" (Index 4)
      const newRequest: Request = {
        ...formData as Request,
        id: `REQ-${uuidv4()}`,
        status: 'Evaluate', // Initial status after submission
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: formData.projectContact?.name || 'Unknown'
      };
      addRequest(newRequest);
      setActiveStep((prev) => prev + 1);
    } else if (activeStep === STEPS.length - 1) {
      // "Fulfill" step (Index 4). Clicking Next here goes to Dashboard
      navigate('/requests');
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleSaveDraft = () => {
    // Validation 1: Resources Check
    if (!formData.resources || formData.resources.length === 0) {
      setSnackbarSeverity('error');
      setSnackbarMessage('You must add at least 1 resource before saving as draft!');
      setSnackbarOpen(true);
      return;
    }

    // Validation 2: Project Title Check
    if (!formData.title?.trim()) {
      setSnackbarSeverity('info');
      setSnackbarMessage('Please fill in Project Name / Title * before saving as draft!');
      setSnackbarOpen(true);
      return;
    }

    const newRequest: Request = {
      ...formData as Request,
      id: `REQ-${uuidv4()}`,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: formData.projectContact?.name || 'Unknown'
    };
    addRequest(newRequest);
    setSnackbarSeverity('success');
    setSnackbarMessage('Draft saved successfully');
    setSnackbarOpen(true);

    // Navigate to dashboard after a short delay
    setTimeout(() => {
      navigate('/requests');
    }, 1500);
  };

  const handleSubmit = () => {
    // Validation 1: Resources Check
    if (!formData.resources || formData.resources.length === 0) {
      setSnackbarSeverity('error');
      setSnackbarMessage('You must add at least 1 resource!');
      setSnackbarOpen(true);
      return;
    }

    // Validation 2: Required Fields Check
    // "Project Name / Title" (title), "Project Description / Note" (description), "Engagement Criteria", "Expected Started Date" (startDate), "Duration"
    if (
      !formData.title?.trim() ||
      !formData.description?.trim() ||
      !formData.engagementCriteria ||
      !formData.startDate ||
      !formData.duration
    ) {
      setSnackbarSeverity('info');
      setSnackbarMessage('Please fill in all required information!');
      setSnackbarOpen(true);
      return;
    }

    // Success
    const newRequest: Request = {
      ...formData as Request,
      id: `REQ-${uuidv4()}`,
      status: 'Evaluate', // Initial status after submission
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: formData.projectContact?.name || 'Unknown'
    };
    addRequest(newRequest);
    setSnackbarSeverity('success');
    setSnackbarMessage('Request saved successfully');
    setSnackbarOpen(true);

    // Navigate after delay
    setTimeout(() => {
      navigate('/requests');
    }, 1500);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      projectContact: {
        ...prev.projectContact!,
        [field]: value,
      },
    }));
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4 }}>
      <Typography variant="h4" sx={{ mb: 5, fontWeight: 300 }}>Business Request Form</Typography>

      <Stepper activeStep={0} alternativeLabel connector={<ColorlibConnector />} sx={{ mb: 6 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel StepIconComponent={ColorlibStepIcon}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 ? (
        <Box>
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 3, color: 'text.secondary', fontWeight: 'bold' }}>
              Project Contact Info
            </Typography>
            <Paper id="step-1-contact-info" sx={{ p: 4, borderRadius: 2, boxShadow: '0px 4px 24px rgba(0,0,0,0.05)' }}>

              <Box sx={{ minHeight: 200 }}>
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={3}>
                    {/* Country Field */}
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        select
                        fullWidth
                        label="Country"
                        required
                        value={formData.country}
                        onChange={(e) => handleChange('country', e.target.value)}
                        InputProps={{
                          endAdornment: formData.country && (
                            <InputAdornment position="end" sx={{ mr: 2 }}>
                              <IconButton size="small" onClick={() => handleChange('country', '')}>
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                      >
                        {COUNTRIES.map((c) => (
                          <MenuItem key={c} value={c}>{c}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    {/* Contact Name & Email */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        required
                        label="Project Contact Name"
                        value={formData.projectContact?.name}
                        onChange={e => handleContactChange('name', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        required
                        label="Project Contact Email"
                        type="email"
                        value={formData.projectContact?.email}
                        onChange={e => handleContactChange('email', e.target.value)}
                      />
                    </Grid>

                    {/* Business Area & LOB */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        select
                        fullWidth
                        required
                        label="Business Area"
                        value={formData.businessArea}
                        onChange={(e) => handleChange('businessArea', e.target.value)}
                      >
                        {BUSINESS_AREAS.map((area) => (
                          <MenuItem key={area} value={area}>{area}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        select
                        fullWidth
                        required
                        label="LOB"
                        value={formData.lob}
                        onChange={(e) => handleChange('lob', e.target.value)}
                      >
                        {LOBS.map((l) => (
                          <MenuItem key={l} value={l}>{l}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </Grid>
                </Box>
              </Box>

            </Paper>
          </Box>
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 3, color: 'text.secondary', fontWeight: 'bold' }}>
              Request Type
            </Typography>
            <Paper sx={{ p: 4, borderRadius: 2, boxShadow: '0px 4px 24px rgba(0,0,0,0.05)' }}>
              <Grid container spacing={3}>
                {/* Option 1: Talent Augmentation */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                  <Box
                    onClick={() => handleChange('requestType', 'Talent Augmentation')}
                    sx={{
                      p: 3,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '2px solid',
                      borderColor: formData.requestType === 'Talent Augmentation' ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s',
                      bgcolor: formData.requestType === 'Talent Augmentation' ? 'primary.50' : 'background.paper',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: 2
                      }
                    }}
                  >
                    <Box sx={{ height: 150, bgcolor: 'primary.50', mb: 2, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <GroupAddIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                    </Box>
                    <Typography variant="h6" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Talent Augmentation
                    </Typography>
                    <Box sx={{ mt: 2, flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Business (BA/IBU)</Typography>
                      <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 2, typography: 'body2' }}>
                        <li>POC for BA customer(s)</li>
                        <li>Determine size of augementation pool</li>
                        <li>Onboard VCC resource(s) to BA project</li>
                        <li>Manage Project Outcome & Budget</li>
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>VCC</Typography>
                      <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 0, typography: 'body2' }}>
                        <li>Resource(s) assignment</li>
                        <li>Escalations management (handle resource issues)</li>
                        <li>Talent management & upskilling</li>
                      </Box>
                    </Box>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                      {formData.requestType === 'Talent Augmentation' ? (
                        <CheckCircleIcon color="primary" sx={{ fontSize: 40 }} />
                      ) : (
                        <RadioButtonUncheckedIcon color="action" sx={{ fontSize: 40 }} />
                      )}
                    </Box>
                  </Box>
                </Grid>

                {/* Option 2: Solution Delivery */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                  <Box
                    onClick={() => handleChange('requestType', 'Solution Delivery')}
                    sx={{
                      p: 3,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: '2px solid',
                      borderColor: formData.requestType === 'Solution Delivery' ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s',
                      bgcolor: formData.requestType === 'Solution Delivery' ? 'primary.50' : 'background.paper',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: 2
                      }
                    }}
                  >
                    <Box sx={{ height: 150, bgcolor: 'primary.50', mb: 2, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RocketLaunchIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                    </Box>
                    <Typography variant="h6" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Solution Delivery
                    </Typography>
                    <Box sx={{ mt: 2, flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Business (BA/IBU)</Typography>
                      <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 2, typography: 'body2' }}>
                        <li>Define project scope, duration & budget</li>
                        <li>Define project deliverables</li>
                        <li>Perform User Acceptance Testing</li>
                        <li>Go-live sign-off</li>
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>VCC</Typography>
                      <Box component="ul" sx={{ pl: 2, mt: 0.5, mb: 0, typography: 'body2' }}>
                        <li>Determine project-team size & development methodology</li>
                        <li>Propose solution for business approval</li>
                        <li>End-to-end solution delivery</li>
                      </Box>
                    </Box>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                      {formData.requestType === 'Solution Delivery' ? (
                        <CheckCircleIcon color="primary" sx={{ fontSize: 40 }} />
                      ) : (
                        <RadioButtonUncheckedIcon color="action" sx={{ fontSize: 40 }} />
                      )}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button onClick={() => navigate('/requests')} sx={{ px: 4, color: 'text.secondary' }}>
              Cancel
            </Button>
            <Button
              id="btn-wizard-next"
              variant="contained"
              onClick={handleNext}
              sx={{ px: 4, py: 1, bgcolor: '#1976d2', color: 'white' }}
            >
              Next
            </Button>
          </Box>
        </Box>
      ) : (
        <Box>
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 3, color: 'text.secondary', fontWeight: 'bold' }}>
              Project Contact Info
            </Typography>
            <Paper sx={{ p: 4, borderRadius: 2, boxShadow: '0px 4px 24px rgba(0,0,0,0.05)', mb: 4 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 3 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Project Contact Name</Typography></Grid>
                <Grid size={{ xs: 9 }}><Typography>{formData.projectContact?.name}</Typography></Grid>

                <Grid size={{ xs: 3 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Project Contact Email</Typography></Grid>
                <Grid size={{ xs: 9 }}><Typography>{formData.projectContact?.email}</Typography></Grid>

                <Grid size={{ xs: 3 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Country</Typography></Grid>
                <Grid size={{ xs: 9 }}><Typography>{formData.country}</Typography></Grid>

                <Grid size={{ xs: 3 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Business Area</Typography></Grid>
                <Grid size={{ xs: 9 }}><Typography>{formData.businessArea}</Typography></Grid>

                <Grid size={{ xs: 3 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>LOB</Typography></Grid>
                <Grid size={{ xs: 9 }}><Typography>{formData.lob}</Typography></Grid>

                <Grid size={{ xs: 3 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Requested By</Typography></Grid>
                <Grid size={{ xs: 9 }}><Typography>{formData.projectContact?.name} ({formData.projectContact?.email})</Typography></Grid>
              </Grid>
            </Paper>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ mb: 3, color: 'text.secondary', fontWeight: 'bold' }}>
              Business Request Details
            </Typography>
            <Paper id="step-2-details" sx={{ p: 4, borderRadius: 2, boxShadow: '0px 4px 24px rgba(0,0,0,0.05)' }}>

              <Box sx={{ minHeight: 200 }}>
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={3}>

                    {/* Row 1: Project Name */}
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Project Name / Title <Box component="span" sx={{ color: 'error.main' }}>*</Box></Typography>
                      <TextField
                        fullWidth
                        required
                        placeholder="Name / Title"
                        value={formData.title}
                        onChange={e => handleChange('title', e.target.value)}
                      />
                    </Grid>

                    {/* Row 2: Description */}
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Project Description / Note <Box component="span" sx={{ color: 'error.main' }}>*</Box></Typography>
                      <TextField
                        fullWidth
                        required
                        multiline
                        rows={4}
                        placeholder="Description"
                        value={formData.description}
                        onChange={e => handleChange('description', e.target.value)}
                      />
                    </Grid>

                    {/* Row 3: Engagement Criteria & File Upload */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Engagement Criteria <Box component="span" sx={{ color: 'error.main' }}>*</Box></Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        All project must have IRR &gt; 15%. And / Or:
                      </Typography>
                      <RadioGroup
                        value={formData.engagementCriteria}
                        onChange={(e) => handleChange('engagementCriteria', e.target.value)}
                        sx={{ mt: 1 }}
                      >
                        {['Insourcing to VCC', 'Supported by New Revenue', 'Generate Savings', 'Offshoring of SG headcount'].map((criteria) => (
                          <FormControlLabel
                            key={criteria}
                            value={criteria}
                            control={<Radio sx={{ '&.Mui-checked': { color: '#1976d2' } }} />}
                            label={criteria}
                          />
                        ))}
                      </RadioGroup>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Upload supporting documents</Typography>
                      <Box
                        sx={{
                          border: '2px dashed',
                          borderColor: 'divider',
                          borderRadius: 2,
                          p: 4,
                          mt: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="body2" color="text.primary">
                          Drop file here or browse to upload
                        </Typography>
                        <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 1, fontStyle: 'italic' }}>
                          File number limit: 10 &nbsp;&nbsp; Single file size limit: 10MB <br />
                          Allowed file types: Word, Excel, PDF, Image
                        </Typography>
                      </Box>
                    </Grid>


                    {/* Row 4: Expected Start Date & Duration */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Expected Started Date <Box component="span" sx={{ color: 'error.main' }}>*</Box></Typography>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                          format="dd/MM/yyyy"
                          disablePast
                          value={formData.startDate ? parseISO(formData.startDate) : null}
                          onChange={(newValue: Date | null) => {
                            if (!newValue) {
                              setFormData(prev => ({ ...prev, startDate: '', expectedLeadTime: '' }));
                              return;
                            }
                            const dateStr = format(newValue, 'yyyy-MM-dd');

                            // Calculate Lead Time
                            const today = startOfDay(new Date());
                            const sixWeeks = addWeeks(today, 6);
                            const threeMonths = addMonths(today, 3);

                            let leadTime = "Low (> 3 months)"; // Default/Else case

                            // Check if date is within 6 weeks (inclusive)
                            // using isBefore check: isBefore(date, sixWeeks) -> true if date < sixWeeks.
                            // To include the day itself, we can check if it's NOT after sixWeeks? Or compare strictly.
                            // User example: today 18/01. 6 weeks is ~01/03.
                            // "from 19/01 to 01/03 is High". So <= 6 weeks.

                            if (isBefore(newValue, sixWeeks) || newValue.getTime() === sixWeeks.getTime()) {
                              leadTime = "High (6 weeks)";
                            } else if (isBefore(newValue, threeMonths) || newValue.getTime() === threeMonths.getTime()) {
                              leadTime = "Medium (6 weeks - 3 months)";
                            }

                            setFormData(prev => ({
                              ...prev,
                              startDate: dateStr,
                              expectedLeadTime: leadTime
                            }));
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              required: true,
                              placeholder: "dd/mm/yy"
                            }
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Duration <Box component="span" sx={{ color: 'error.main' }}>*</Box></Typography>
                      <FormControl fullWidth required>
                        <Select
                          displayEmpty
                          value={formData.duration}
                          onChange={(e) => handleChange('duration', e.target.value)}
                        >
                          <MenuItem value="">
                            <Typography color="text.secondary">Select expected duration</Typography>
                          </MenuItem>
                          <MenuItem value="12 months">12 months</MenuItem>
                          <MenuItem value="24 months">24 months</MenuItem>
                          <MenuItem value="36 months">36 months</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Row 5: Expected Lead Time & Team Size */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Expected Lead Time <Box component="span" sx={{ color: 'error.main' }}>*</Box></Typography>
                      <FormControl fullWidth disabled sx={{ bgcolor: 'action.disabledBackground', borderRadius: 1 }}>
                        <Select
                          displayEmpty
                          value={formData.expectedLeadTime}
                          onChange={(e) => handleChange('expectedLeadTime', e.target.value)}
                        >
                          <MenuItem value="">
                            <Typography color="text.secondary">Select Expected Lead Time</Typography>
                          </MenuItem>
                          <MenuItem value="High (6 weeks)">High (6 weeks)</MenuItem>
                          <MenuItem value="Medium (6 weeks - 3 months)">Medium (6 weeks - 3 months)</MenuItem>
                          <MenuItem value="Low (> 3 months)">Low (&gt; 3 months)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Team Size <Box component="span" sx={{ color: 'error.main' }}>*</Box></Typography>
                      <TextField
                        fullWidth
                        disabled
                        type="number"
                        value={formData.teamSize || 0}
                        sx={{ bgcolor: 'action.disabledBackground', borderRadius: 1 }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Box>

            </Paper>
          </Box>

          <Box>
            <Button
              variant="contained"
              sx={{ bgcolor: 'white', color: '#1976d2', border: '1px solid #1976d2', mt: 3, mb: 2, '&:hover': { bgcolor: '#f5f5f5' } }}
              onClick={handleAddResource}
            >
              Add Resource(s)
            </Button>
            <Paper sx={{ p: 4, borderRadius: 2, boxShadow: '0px 4px 24px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
              <Box sx={{ minWidth: 1300 }}>
                <Grid container spacing={2} sx={{ mb: 2, borderBottom: '1px solid #eee', pb: 1 }}>
                  <Grid size={{ xs: 2 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Role *</Typography></Grid>
                  <Grid size={{ xs: 2 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Seniority *</Typography></Grid>
                  <Grid size={{ xs: 0.75 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Qty *</Typography></Grid>
                  <Grid size={{ xs: 1.25 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Rate Card *</Typography></Grid>
                  <Grid size={{ xs: 1.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Mandatory Skills</Typography></Grid>
                  <Grid size={{ xs: 1.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Other Skills</Typography></Grid>
                  <Grid size={{ xs: 2 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Job Description *</Typography></Grid>
                  <Grid size={{ xs: 1 }}><Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Subtotal</Typography></Grid>
                </Grid>

                {formData.resources?.map((resource) => (
                  <Grid container spacing={2} key={resource.id} sx={{ mb: 2, alignItems: 'center' }}>
                    <Grid size={{ xs: 2 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={resource.role}
                        onChange={(e) => handleResourceChange(resource.id, 'role', e.target.value)}
                      >
                        {Object.keys(RATE_CARD).map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 2 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        value={resource.seniority}
                        onChange={(e) => handleResourceChange(resource.id, 'seniority', e.target.value)}
                      >
                        {(Object.keys(RATE_CARD[resource.role] || {})).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 0.75 }}>
                      <TextField
                        type="number"
                        fullWidth
                        size="small"
                        value={resource.quantity}
                        onChange={(e) => handleResourceChange(resource.id, 'quantity', Number(e.target.value))}
                      />
                    </Grid>
                    <Grid size={{ xs: 1.25 }}>
                      <TextField
                        type="number"
                        fullWidth
                        size="small"
                        value={resource.rate}
                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                        onChange={(e) => handleResourceChange(resource.id, 'rate', Number(e.target.value))}
                      />
                    </Grid>
                    <Grid size={{ xs: 1.5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        value={resource.mandatorySkills}
                        onChange={(e) => handleResourceChange(resource.id, 'mandatorySkills', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 1.5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        value={resource.otherSkills}
                        onChange={(e) => handleResourceChange(resource.id, 'otherSkills', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 2 }}>
                      <TextField
                        fullWidth
                        size="small"
                        value={resource.jobDescription}
                        onChange={(e) => handleResourceChange(resource.id, 'jobDescription', e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 1 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography>${resource.subtotal.toLocaleString()}</Typography>
                      <IconButton onClick={() => handleRemoveResource(resource.id)} color="error" size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
              </Box>
            </Paper>
          </Box>

          <Box>
            <Typography variant="caption" display="block" sx={{ mb: 2, mt: 3, fontStyle: 'italic', color: 'text.secondary' }}>
              *Please note this is an indicative pricing only. Final amount will be confirmed before sign-off.
            </Typography>

            <Paper sx={{ p: 4, borderRadius: 2, boxShadow: '0px 4px 24px rgba(0,0,0,0.05)' }}>
              {/* Line 0 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}></Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>In SGD</Typography>
              </Box>

              {/* Line 1 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Total per month</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>${totalWithMarkup.toLocaleString()}</Typography>
              </Box>

              {/* Line 2 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Total with markup (6.5%)</Typography>
                <Typography variant="body1">${Math.ceil(monthlyGrandTotal).toLocaleString()}</Typography>
              </Box>

              {/* Line 3 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Grand total ({formData.duration || '0 months'})</Typography>
                <Typography variant="body1">${Math.ceil(grandTotal).toLocaleString()}</Typography>
              </Box>
            </Paper>
          </Box>


          {/* Navigation Buttons for steps > 0 */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              sx={{ px: 4, color: '#1976d2', borderColor: '#1976d2', bgcolor: 'white' }}
            >
              Back
            </Button>

            <Button
              variant="outlined"
              onClick={handleSaveDraft}
              sx={{ px: 4, color: '#1976d2', borderColor: '#1976d2', bgcolor: 'white' }}
            >
              Save as Draft
            </Button>

            <Button
              id="btn-wizard-submit"
              variant="contained"
              onClick={handleSubmit}
              sx={{ px: 4, py: 1, bgcolor: '#1976d2', color: 'white' }}
            >
              Submit Request
            </Button>
          </Box>
        </Box>
      )}

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          icon={snackbarSeverity === 'error' ? <ErrorIcon fontSize="inherit" /> : snackbarSeverity === 'info' ? <InfoIcon fontSize="inherit" /> : <CheckCircleIcon fontSize="inherit" />}
          sx={{
            width: '100%',
            color: 'white',
            bgcolor: snackbarSeverity === 'error' ? 'error.main' : snackbarSeverity === 'info' ? '#2196f3' : 'success.dark',
            '& .MuiAlert-icon': { color: 'white' }
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
