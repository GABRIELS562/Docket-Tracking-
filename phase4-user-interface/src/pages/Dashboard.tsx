import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Inventory,
  People,
  LocationOn,
  WifiTethering,
  TrendingUp,
  Schedule,
} from '@mui/icons-material';
import { analyticsAPI } from '../services/api';
import { format } from 'date-fns';

interface DashboardStats {
  total_objects: number;
  active_objects: number;
  total_dockets: number;
  total_evidence: number;
  total_equipment: number;
  created_today: number;
  updated_today: number;
  total_locations: number;
  total_personnel: number;
  events_last_hour: number;
  unacknowledged_alerts: number;
}

interface RecentMovement {
  timestamp: string;
  object_code: string;
  object_name: string;
  from_location: string;
  to_location: string;
  moved_by: string;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await analyticsAPI.getDashboard();
      if (response.data.success) {
        setStats(response.data.data.stats);
        setRecentMovements(response.data.data.recentMovements);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Total Objects',
      value: stats?.total_objects || 0,
      icon: <Inventory />,
      color: '#1976d2',
      subtitle: `${stats?.active_objects || 0} active`,
    },
    {
      title: 'Dockets',
      value: stats?.total_dockets || 0,
      icon: <Inventory />,
      color: '#388e3c',
      subtitle: 'Tracked dockets',
    },
    {
      title: 'Evidence',
      value: stats?.total_evidence || 0,
      icon: <Inventory />,
      color: '#f57c00',
      subtitle: 'Evidence items',
    },
    {
      title: 'Equipment',
      value: stats?.total_equipment || 0,
      icon: <Inventory />,
      color: '#7b1fa2',
      subtitle: 'Equipment items',
    },
    {
      title: 'Personnel',
      value: stats?.total_personnel || 0,
      icon: <People />,
      color: '#0288d1',
      subtitle: 'Active staff',
    },
    {
      title: 'Locations',
      value: stats?.total_locations || 0,
      icon: <LocationOn />,
      color: '#00796b',
      subtitle: 'Tracking zones',
    },
    {
      title: 'RFID Events',
      value: stats?.events_last_hour || 0,
      icon: <WifiTethering />,
      color: '#5e35b1',
      subtitle: 'Last hour',
    },
    {
      title: 'Today\'s Activity',
      value: (stats?.created_today || 0) + (stats?.updated_today || 0),
      icon: <TrendingUp />,
      color: '#c62828',
      subtitle: `${stats?.created_today || 0} new, ${stats?.updated_today || 0} updated`,
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Real-time overview of your RFID tracking system
      </Typography>

      {stats?.unacknowledged_alerts > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#fff3e0' }}>
          <Typography color="warning.main">
            ⚠️ You have {stats.unacknowledged_alerts} unacknowledged alerts
          </Typography>
        </Paper>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      bgcolor: card.color,
                      color: 'white',
                      mr: 2,
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Box>
                    <Typography color="text.secondary" gutterBottom variant="body2">
                      {card.title}
                    </Typography>
                    <Typography variant="h5" component="div">
                      {card.value.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {card.subtitle}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper>
        <Box p={2}>
          <Typography variant="h6" gutterBottom>
            <Schedule sx={{ verticalAlign: 'middle', mr: 1 }} />
            Recent Object Movements
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Object Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell>Moved By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No recent movements
                  </TableCell>
                </TableRow>
              ) : (
                recentMovements.map((movement, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {format(new Date(movement.timestamp), 'HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Chip label={movement.object_code} size="small" />
                    </TableCell>
                    <TableCell>{movement.object_name}</TableCell>
                    <TableCell>{movement.from_location || 'Unknown'}</TableCell>
                    <TableCell>{movement.to_location || 'Unknown'}</TableCell>
                    <TableCell>{movement.moved_by || 'System'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Dashboard;