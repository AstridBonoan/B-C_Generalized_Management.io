import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDate, formatDateTime } from '../lib/format'
import { Badge, Button, Card, PageHeader } from '../components/ui'

export function DashboardPage() {
  const { store } = useApp()
  const clients = store.state.clients.filter((row) => !row.archivedAt)
  const leads = store.state.leads.filter((row) => !row.archivedAt && !['won', 'lost'].includes(row.status))
  const tasks = store.state.tasks.filter((row) => !row.archivedAt && row.status !== 'completed')
  const appointments = store.state.appointments.filter((row) => row.status === 'scheduled')
  const projects = store.state.projects.filter((row) => row.status === 'active')
  const cards = [
    { label: 'Total clients', value: clients.length, to: '/clients' },
    { label: 'Active clients', value: clients.filter((row) => row.status === 'active').length, to: '/clients' },
    { label: 'New leads', value: leads.filter((row) => row.status === 'new').length, to: '/leads' },
    { label: 'Open tasks', value: tasks.length, to: '/tasks' },
    { label: 'Upcoming appointments', value: appointments.length, to: '/appointments' },
    { label: 'Active projects', value: projects.length, to: '/projects' },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A modular snapshot of clients, pipeline, and work. Industry dashboards can replace these cards later."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/clients"><Button type="button">New client</Button></Link>
            <Link to="/leads"><Button type="button" variant="secondary">New lead</Button></Link>
            <Link to="/tasks"><Button type="button" variant="secondary">New task</Button></Link>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} to={card.to}>
            <Card>
              <p className="text-sm text-ink-soft">{card.label}</p>
              <p className="mt-2 font-display text-4xl">{card.value}</p>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl">Recent activity</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {store.state.activities.slice(0, 6).map((item) => (
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
            {store.state.notifications.slice(0, 5).map((item) => (
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
      <Card className="mt-4">
        <h2 className="font-display text-xl">Upcoming appointments</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {appointments.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>{item.title}</span>
              <span className="text-ink-soft">
                {formatDate(item.date)} {item.startTime}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
