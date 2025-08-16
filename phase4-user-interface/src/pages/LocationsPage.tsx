import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const LocationsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Locations Management
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>Locations management interface - Phase 4</Typography>
      </Paper>
    </Box>
  );
};

export default LocationsPage;