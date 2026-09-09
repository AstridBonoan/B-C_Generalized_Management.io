import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { can } from '../lib/permissions'
import { collectErrors, isNonEmpty, newId } from '../lib/validation'
import type { Task, TaskPriority, TaskStatusKey } from '../types/domain'
import { Alert, Badge, Button, ConfirmDialog, Field, Input, Modal, PageHeader, Pagination, Select, Table, Textarea } from '../components/ui'

function blankTask(): Task {
  const now = new Date().toISOString()
  return {
    id: newId(),
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignedEmployeeId: null,
    clientId: null,
    projectId: null,
    dueDate: null,
    completedAt: null,
    createdBy: '',
    updatedBy: '',
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  }
}

export function TasksPage() {
  const { store, refresh, profile } = useApp()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [assigned, setAssigned] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<Task | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [archive, setArchive] = useState<Task | null>(null)
  const result = useMemo(() => store.listTasks({ search, status: status || undefined, assignedEmployeeId: assigned || undefined, page, pageSize: 8 }), [store, search, status, assigned, page])

  function save() {
    if (!form) return
    const errors = collectErrors([isNonEmpty(form.title, 'Title')])
    if (errors.length) {
      setError(errors[0])
      return
    }
    try {
      store.saveTask(form)
      refresh()
      setForm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save task.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Reusable work items that can reference a client, a project, both, or neither."
        actions={can(store.state, profile, 'tasks', 'create') ? <Button type="button" onClick={() => { setError(null); setForm(blankTask()) }}>New task</Button> : null}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Input placeholder="Search tasks" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </Select>
        <Select value={assigned} onChange={(event) => { setAssigned(event.target.value); setPage(1) }}>
          <option value="">All employees</option>
          {store.state.profiles.map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
        </Select>
      </div>
      <Table headers={['Task', 'Priority', 'Status', 'Due', '']}>
        {result.items.map((task) => (
          <tr key={task.id} className="border-t border-line">
            <td className="px-3 py-2">
              <button className="font-medium text-teal" type="button" onClick={() => setForm(task)}>{task.title}</button>
            </td>
            <td className="px-3 py-2"><Badge tone={task.priority === 'urgent' || task.priority === 'high' ? 'warn' : 'neutral'}>{task.priority}</Badge></td>
            <td className="px-3 py-2">{task.status.replace('_', ' ')}</td>
            <td className="px-3 py-2">{task.dueDate ?? '—'}</td>
            <td className="px-3 py-2 text-right">
              {can(store.state, profile, 'tasks', 'archive') ? <Button variant="ghost" type="button" onClick={() => setArchive(task)}>Archive</Button> : null}
            </td>
          </tr>
        ))}
      </Table>
      <div className="mt-3"><Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} /></div>
      {form ? (
        <Modal title="Task" onClose={() => setForm(null)} footer={<Button type="button" onClick={save}>Save</Button>}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Title"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field></div>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatusKey })}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </Field>
            <Field label="Assignee">
              <Select value={form.assignedEmployeeId ?? ''} onChange={(event) => setForm({ ...form, assignedEmployeeId: event.target.value || null })}>
                <option value="">Unassigned</option>
                {store.state.profiles.filter((row) => row.status === 'active').map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Due date"><Input type="date" value={form.dueDate ?? ''} onChange={(event) => setForm({ ...form, dueDate: event.target.value || null })} /></Field>
            <Field label="Client">
              <Select value={form.clientId ?? ''} onChange={(event) => setForm({ ...form, clientId: event.target.value || null })}>
                <option value="">None</option>
                {store.state.clients.filter((row) => !row.archivedAt).map((row) => <option key={row.id} value={row.id}>{row.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Project">
              <Select value={form.projectId ?? ''} onChange={(event) => setForm({ ...form, projectId: event.target.value || null })}>
                <option value="">None</option>
                {store.state.projects.filter((row) => !row.archivedAt).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>
          </div>
        </Modal>
      ) : null}
      {archive ? <ConfirmDialog title="Archive task" body="The task remains in history but leaves the working list." confirmLabel="Archive" onClose={() => setArchive(null)} onConfirm={() => { store.archiveTask(archive.id); refresh(); setArchive(null) }} /> : null}
    </div>
  )
}
