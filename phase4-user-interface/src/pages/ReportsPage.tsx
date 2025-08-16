import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const ReportsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports & Analytics
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>Reports and analytics interface - Phase 4</Typography>
      </Paper>
    </Box>
  );
};

export default ReportsPage;