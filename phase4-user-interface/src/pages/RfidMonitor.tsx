import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const RfidMonitor: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        RFID Real-time Monitor
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>RFID monitoring interface - Phase 4</Typography>
      </Paper>
    </Box>
  );
};

export default RfidMonitor;