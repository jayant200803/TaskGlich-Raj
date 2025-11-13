import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import { DerivedTask, Priority, Status, Task } from '@/types';
import TaskForm from '@/components/TaskForm';
import TaskDetailsDialog from '@/components/TaskDetailsDialog';

interface FormPayload {
  id?: string;
  title: string;
  revenue: number;
  timeTaken: number;
  priority: Priority;
  status: Status;
  notes?: string;
}
import type { TaskInput } from '@/types';


interface Props {
  tasks: DerivedTask[];
  onAdd: (payload: TaskInput) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}


export default function TaskTable({ tasks, onAdd, onUpdate, onDelete }: Props) {
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [details, setDetails] = useState<Task | null>(null);

  const existingTitles = useMemo(() => tasks.map(t => t.title), [tasks]);

  const handleAddClick = () => {
    setEditing(null);
    setOpenForm(true);
  };

  const handleEditClick = (event: any, task: Task) => {
    event.stopPropagation();
    setEditing(task);
    setOpenForm(true);
  };

  const handleDeleteClick = (event: any, id: string) => {
    event.stopPropagation();
    onDelete(id);
  };

  const handleSubmit = (value: TaskInput & { id?: string }) => {
  if (value.id) {
    const { id, ...patch } = value;
    onUpdate(id, patch);
  } else {
    onAdd(value);
  }
};


  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            Tasks
          </Typography>
          <Button startIcon={<AddIcon />} variant="contained" onClick={handleAddClick}>
            Add Task
          </Button>
        </Stack>

        <TableContainer sx={{ maxHeight: 520 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell align="right">Revenue</TableCell>
                <TableCell align="right">Time (h)</TableCell>
                <TableCell align="right">ROI</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {tasks.map(t => (
                <TableRow
                  key={t.id}
                  hover
                  onClick={() => setDetails(t)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{t.title}</Typography>
                      {t.notes && (
                        <Typography variant="caption" color="text.secondary" noWrap title={t.notes}>
                          {t.notes}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>

                  <TableCell align="right">${t.revenue.toLocaleString()}</TableCell>
                  <TableCell align="right">{t.timeTaken}</TableCell>

                  <TableCell align="right">
                    {t.roi === null ? 'N/A' : Number(t.roi).toFixed(2)}
                  </TableCell>

                  <TableCell>{t.priority}</TableCell>
                  <TableCell>{t.status}</TableCell>

                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="Edit">
                        <IconButton onClick={e => handleEditClick(e, t)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete">
                        <IconButton
                          onClick={e => handleDeleteClick(e, t.id)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}

              {tasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box py={6} textAlign="center" color="text.secondary">
                      No tasks yet. Click "Add Task" to get started.
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      <TaskForm
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSubmit={handleSubmit}
        existingTitles={existingTitles}
        initial={editing}
      />

      <TaskDetailsDialog
        open={!!details}
        task={details}
        onClose={() => setDetails(null)}
        onSave={onUpdate}
      />
    </Card>
  );
}
