import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDate, formatDateTime } from '../lib/format'
import { Badge, Button, Card, PageHeader } from '../components/ui'

export function DashboardPage() {
  const { store } = useApp()
  const tasks = store.state.tasks.filter((row) => !row.archivedAt && row.status !== 'completed')
  const appointments = store.state.appointments.filter((row) => row.status === 'scheduled')
  const activeWork = store.state.projects.filter((row) => row.status === 'active')

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of business activity."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/clients"><Button type="button">New client</Button></Link>
            <Link to="/projects"><Button type="button" variant="secondary">New work</Button></Link>
            <Link to="/tasks"><Button type="button" variant="secondary">New task</Button></Link>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/projects">
          <Card>
            <p className="text-sm text-ink-soft">Active work</p>
            <p className="mt-2 font-display text-4xl">{activeWork.length}</p>
          </Card>
        </Link>
        <Link to="/tasks">
          <Card>
            <p className="text-sm text-ink-soft">Open tasks</p>
            <p className="mt-2 font-display text-4xl">{tasks.length}</p>
          </Card>
        </Link>
        <Link to="/appointments">
          <Card>
            <p className="text-sm text-ink-soft">Upcoming appointments</p>
            <p className="mt-2 font-display text-4xl">{appointments.length}</p>
          </Card>
        </Link>
      </div>
      <Card className="mt-4">
        <h2 className="font-display text-xl">Active work</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {activeWork.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 border-b border-line py-2 last:border-0">
              <Link className="text-teal" to={`/projects/${item.id}`}>{item.name}</Link>
              <span className="text-ink-soft">{formatDate(item.startDate)}</span>
            </li>
          ))}
        </ul>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl">Open tasks</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {tasks.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 border-b border-line py-2 last:border-0">
                <Link className="text-teal" to="/tasks">{item.title}</Link>
                <span className="text-ink-soft">{item.dueDate ?? 'No due date'}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-display text-xl">Upcoming appointments</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {appointments.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 border-b border-line py-2 last:border-0">
                <Link className="text-teal" to="/appointments">{item.title}</Link>
                <span className="text-ink-soft">{formatDate(item.date)} {item.startTime}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl">Recent activity</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {store.state.activities.slice(0, 8).map((item) => (
              <li key={item.id} className="flex justify-between gap-3 border-b border-line py-2 last:border-0">
                <span>{item.description}</span>
                <span className="shrink-0 text-ink-soft">{formatDateTime(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-display text-xl">Notifications</h2>
          <ul className="mt-3 space-y-2">
            {store.state.notifications.slice(0, 6).map((item) => (
              <li key={item.id} className="rounded-md bg-paper px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.readAt ? <Badge>Read</Badge> : <Badge tone="warn">New</Badge>}
                </div>
                <p className="text-sm text-ink-soft">{item.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
