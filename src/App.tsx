import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import MetricsBar from '@/components/MetricsBar';
import TaskTable from '@/components/TaskTable';
import UndoSnackbar from '@/components/UndoSnackbar';
import { useCallback, useMemo, useState } from 'react';
import { UserProvider, useUser } from '@/context/UserContext';
import { TasksProvider, useTasksContext } from '@/context/TasksContext';
import ChartsDashboard from '@/components/ChartsDashboard';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ActivityLog, { ActivityItem } from '@/components/ActivityLog';
import { downloadCSV, toCSV } from '@/utils/csv';
import type { Task } from '@/types';
import type { TaskInput } from '@/types';

function AppContent() {
  const {
    loading, error, metrics, derivedSorted,
    addTask, updateTask, deleteTask,
    undoDelete, lastDeleted, clearLastDeleted
  } = useTasksContext();

  const { user } = useUser();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('All');
  const [fPriority, setFPriority] = useState('All');

  const createActivity = useCallback(
    (type: ActivityItem['type'], summary: string): ActivityItem => ({
      id: crypto.randomUUID(),
      ts: Date.now(),
      type,
      summary
    }),
    []
  );

  const filtered = useMemo(() => {
    return derivedSorted.filter(t => {
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (fStatus !== 'All' && t.status !== fStatus) return false;
      if (fPriority !== 'All' && t.priority !== fPriority) return false;
      return true;
    });
  }, [derivedSorted, q, fStatus, fPriority]);

  const handleAdd = useCallback(
  (payload: TaskInput) => {
    addTask(payload);
  },
  [addTask]
);

  const handleUpdate = (id: string, patch: Partial<Task>) => {
    updateTask(id, patch);
    setActivity(prev => [createActivity('update', `Updated: ${Object.keys(patch).join(', ')}`), ...prev]);
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    setActivity(prev => [createActivity('delete', `Deleted: ${id}`), ...prev]);
  };

  const handleUndo = () => {
    undoDelete();
    setActivity(prev => [createActivity('undo', 'Undo delete'), ...prev]);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>

        <Stack spacing={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight={700}>
              Welcome, {user?.name ?? 'User'}
            </Typography>
            <Avatar>{user?.name?.[0] ?? 'U'}</Avatar>
          </Stack>

          {/* FIXED METRICS PROP */}
          <MetricsBar metrics={metrics} />

          <TaskTable
            tasks={filtered}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />

          <ChartsDashboard tasks={derivedSorted} />
          <AnalyticsDashboard tasks={derivedSorted} />

          <ActivityLog items={activity} />

          <Button variant="outlined" onClick={() => downloadCSV('tasks.csv', toCSV(derivedSorted))}>
            Export CSV
          </Button>
        </Stack>

        <UndoSnackbar open={!!lastDeleted} onClose={clearLastDeleted} onUndo={handleUndo} />

      </Container>
    </Box>
  );
}

export default function App() {
  return (
    <UserProvider>
      <TasksProvider>
        <AppContent />
      </TasksProvider>
    </UserProvider>
  );
}
