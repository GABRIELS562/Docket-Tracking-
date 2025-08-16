import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Inventory as ObjectsIcon,
  People as PeopleIcon,
  LocationOn as LocationIcon,
  Sensors as RfidIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { DashboardStats } from '@/types';
import { apiService } from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNotification } from '@/contexts/NotificationContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function StatCard({ 
  title, 
  value, 
  icon, 
  color = 'primary',
  subtitle,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {value.toLocaleString()}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUpIcon 
                  sx={{ 
                    fontSize: 16, 
                    mr: 0.5,
                    color: trend.isPositive ? 'success.main' : 'error.main',
                    transform: trend.isPositive ? 'none' : 'rotate(180deg)'
                  }} 
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: trend.isPositive ? 'success.main' : 'error.main',
                    fontWeight: 'medium'
                  }}
                >
                  {trend.value}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'error';
    case 'high': return 'warning';
    case 'normal': return 'info';
    case 'low': return 'success';
    default: return 'default';
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { subscribeToDashboardUpdates, subscribeToRfidEvents } = useWebSocket();
  const { showNotification } = useNotification();

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDashboardStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      showNotification('Failed to load dashboard statistics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardStats();
  }, []);

  useEffect(() => {
    const unsubscribeDashboard = subscribeToDashboardUpdates((updatedStats) => {
      setStats(updatedStats);
      setLastUpdated(new Date());
    });

    const unsubscribeRfid = subscribeToRfidEvents((event) => {
      showNotification(`RFID Event: ${event.tag_id} detected at ${event.reader_id}`, 'info');
    });

    return () => {
      unsubscribeDashboard();
      unsubscribeRfid();
    };
  }, [subscribeToDashboardUpdates, subscribeToRfidEvents, showNotification]);

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography>Failed to load dashboard data</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Refresh data">
            <IconButton onClick={loadDashboardStats} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Objects"
            value={stats.summary.total_objects}
            icon={<ObjectsIcon />}
            color="primary"
            subtitle={`${stats.summary.active_objects} active`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Personnel"
            value={stats.summary.total_personnel}
            icon={<PeopleIcon />}
            color="success"
            subtitle="Active staff members"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Locations"
            value={stats.summary.total_locations}
            icon={<LocationIcon />}
            color="info"
            subtitle="Tracking zones"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="RFID Events"
            value={stats.summary.recent_events_count}
            icon={<RfidIcon />}
            color={stats.summary.offline_readers_count > 0 ? 'warning' : 'success'}
            subtitle={`${stats.summary.offline_readers_count} offline readers`}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Objects by Type
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={stats.objects.by_type}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="object_type" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Priority Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={stats.objects.by_priority}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ priority_level, count }) => `${priority_level}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.objects.by_priority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Location Utilization
            </Typography>
            <List sx={{ maxHeight: 320, overflow: 'auto' }}>
              {stats.locations.utilization.slice(0, 8).map((location, index) => (
                <ListItem key={location.location_code} divider>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      {index + 1}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={location.location_name}
                    secondary={`${location.building} - ${location.zone}`}
                  />
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6">{location.object_count}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      objects
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Personnel Workload
            </Typography>
            <List sx={{ maxHeight: 320, overflow: 'auto' }}>
              {stats.personnel.workload.slice(0, 8).map((person, index) => (
                <ListItem key={person.employee_id} divider>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: 'success.main', width: 32, height: 32 }}>
                      {person.personnel_name.split(' ').map(n => n[0]).join('')}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={person.personnel_name}
                    secondary={`${person.employee_id} - ${person.department}`}
                  />
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6">{person.assigned_objects}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      assigned
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {stats.recent_activity.slice(0, 10).map((activity, index) => (
                <ListItem key={activity.id} divider={index < 9}>
                  <ListItemIcon>
                    <HistoryIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {activity.personnel_name || 'System'} - {activity.action}
                        </Typography>
                        {activity.object_name && (
                          <Chip label={activity.object_name} size="small" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {activity.notes && (
                          <Typography variant="caption" display="block">
                            {activity.notes}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {new Date(activity.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {stats.rfid.offline_readers.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ mr: 1 }} />
                <Typography variant="h6">
                  RFID System Alerts
                </Typography>
              </Box>
              <Typography variant="body2" gutterBottom>
                {stats.rfid.offline_readers.length} RFID reader(s) are currently offline:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {stats.rfid.offline_readers.map((reader) => (
                  <Chip
                    key={reader.reader_id}
                    label={reader.reader_id}
                    color="warning"
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}