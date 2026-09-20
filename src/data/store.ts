import type {
  Activity,
  AppNotification,
  Appointment,
  AppState,
  Client,
  ClientContact,
  DocumentRecord,
  ListQuery,
  NotificationType,
  PagedResult,
  Profile,
  Project,
  Session,
  Task,
} from '../types/domain'
import { can } from '../lib/permissions'
import { getSupabaseClient } from '../lib/supabase'
import { hashPassword, matchesSearch, newId, nowIso, paginate } from '../lib/validation'
import { createSeedState } from './seed'

const STATE_KEY = 'bc.gms.state.v2'
const SESSION_KEY = 'bc.gms.session.v1'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function applyQuery<T>(
  items: T[],
  query: ListQuery | undefined,
  toSearch: (item: T) => string,
  statusOf?: (item: T) => string | null,
  assignedOf?: (item: T) => string | null,
  archivedOf?: (item: T) => string | null,
): PagedResult<T> {
  const search = query?.search ?? ''
  const page = query?.page ?? 1
  const pageSize = query?.pageSize ?? 10
  let next = items.filter((item) => matchesSearch(toSearch(item), search))
  if (query?.status && statusOf) {
    next = next.filter((item) => statusOf(item) === query.status)
  }
  if (query?.assignedEmployeeId && assignedOf) {
    next = next.filter((item) => assignedOf(item) === query.assignedEmployeeId)
  }
  if (!query?.includeArchived && archivedOf) {
    next = next.filter((item) => !archivedOf(item))
  }
  return paginate(next, page, pageSize)
}

export class AppStore {
  state: AppState
  session: Session | null
  error: string | null = null

  constructor(initial?: AppState, session?: Session | null, persist = false) {
    this.state = initial ? clone(initial) : createSeedState()
    this.session = session ?? null
    this.persistEnabled = persist
  }

  private persistEnabled: boolean

  static load(): AppStore {
    try {
      const raw = localStorage.getItem(STATE_KEY)
      const sessionRaw = localStorage.getItem(SESSION_KEY)
      const state = raw ? (JSON.parse(raw) as AppState) : createSeedState()
      const session = sessionRaw ? (JSON.parse(sessionRaw) as Session) : null
      return new AppStore(state, session, true)
    } catch {
      return new AppStore(createSeedState(), null, true)
    }
  }

  persist() {
    if (!this.persistEnabled) return
    localStorage.setItem(STATE_KEY, JSON.stringify(this.state))
    if (this.session) localStorage.setItem(SESSION_KEY, JSON.stringify(this.session))
    else localStorage.removeItem(SESSION_KEY)
  }

  snapshot(): AppState {
    return clone(this.state)
  }

  currentProfile(): Profile | null {
    if (!this.session) return null
    return this.state.profiles.find((profile) => profile.id === this.session?.profileId) ?? null
  }

  assert(module: Parameters<typeof can>[2], action: Parameters<typeof can>[3]) {
    if (!can(this.state, this.currentProfile(), module, action)) {
      throw new Error('You do not have permission to perform this action.')
    }
  }

  private actorId() {
    return this.currentProfile()?.id ?? 'system'
  }

  private log(eventType: string, description: string, relatedType: string | null, relatedId: string | null) {
    const activity: Activity = {
      id: newId(),
      eventType,
      description,
      actorId: this.actorId(),
      relatedType,
      relatedId,
      createdAt: nowIso(),
    }
    this.state.activities = [activity, ...this.state.activities]
  }

  private notify(
    type: NotificationType,
    title: string,
    body: string,
    recipientId: string | null,
    relatedType: string | null,
    relatedId: string | null,
  ) {
    if (!recipientId) return
    const prefs = this.state.company.notificationPreferences
    if (type === 'task_assigned' && !prefs.taskAssigned) return
    if (type === 'task_due' && !prefs.taskDue) return
    if (type === 'appointment_upcoming' && !prefs.appointmentUpcoming) return
    if ((type === 'client_update' || type === 'project_update') && !prefs.recordUpdates) return
    const notification: AppNotification = {
      id: newId(),
      type,
      title,
      body,
      recipientId,
      relatedType,
      relatedId,
      readAt: null,
      createdAt: nowIso(),
    }
    this.state.notifications = [notification, ...this.state.notifications]
  }

  async login(email: string, password: string): Promise<Session> {
    const normalized = email.trim().toLowerCase()

    const credential = this.state.credentials.find((row) => row.email === normalized)
    const profile = this.state.profiles.find((row) => row.email === normalized)
    if (credential && profile) {
      if (profile.status !== 'active') throw new Error('This account is inactive.')
      const hash = await hashPassword(password)
      if (hash !== credential.passwordHash) {
        // If the local app account fails, try the configured Supabase login next.
      } else {
        this.session = { profileId: profile.id, email: profile.email }
        this.persist()
        return this.session
      }
    }

    const supabase = getSupabaseClient()
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password })
        if (!error && data.user) {
          const { data: supabaseProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', normalized)
            .maybeSingle()

          if (profileError && profileError.code !== 'PGRST116') {
            throw new Error(profileError.message)
          }

          const nextProfile = supabaseProfile ?? profile
          if (nextProfile) {
            if (nextProfile.status !== 'active') throw new Error('This account is inactive.')
            this.session = { profileId: nextProfile.id, email: nextProfile.email }
            this.persist()
            return this.session
          }
        }
      } catch {
        // Fall through to the final invalid credentials error below.
      }
    }

    if (!credential || !profile) throw new Error('Invalid email or password.')
    if (profile.status !== 'active') throw new Error('This account is inactive.')
    throw new Error('Invalid email or password.')
  }

  logout() {
    const supabase = getSupabaseClient()
    if (supabase) {
      supabase.auth.signOut().catch(() => {})
    }
    this.session = null
    this.persist()
  }

  async requestPasswordReset(email: string): Promise<{ token?: string }> {
    const normalized = email.trim().toLowerCase()
    const credential = this.state.credentials.find((row) => row.email === normalized)
    if (!credential) return {}
    const token = newId()
    credential.resetToken = token
    credential.resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString()
    this.persist()
    return { token }
  }

  async resetPassword(token: string, password: string) {
    const credential = this.state.credentials.find((row) => row.resetToken === token)
    if (!credential || !credential.resetTokenExpiresAt) throw new Error('This reset link is invalid.')
    if (new Date(credential.resetTokenExpiresAt).getTime() < Date.now()) {
      throw new Error('This reset link has expired.')
    }
    credential.passwordHash = await hashPassword(password)
    credential.resetToken = null
    credential.resetTokenExpiresAt = null
    this.persist()
  }

  listUsers(query?: ListQuery) {
    this.assert('users', 'view')
    return applyQuery(
      this.state.profiles,
      query,
      (item) => `${item.fullName} ${item.email} ${item.title}`,
      (item) => item.status,
    )
  }

  getUser(id: string) {
    this.assert('users', 'view')
    return this.state.profiles.find((profile) => profile.id === id) ?? null
  }

  async upsertUser(input: Omit<Profile, 'createdAt' | 'updatedAt'> & { createdAt?: string; password?: string }) {
    const existing = this.state.profiles.find((profile) => profile.id === input.id)
    if (existing) this.assert('users', 'edit')
    else this.assert('users', 'create')
    const now = nowIso()
    const profile: Profile = {
      id: input.id,
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      phone: input.phone,
      title: input.title,
      roleId: input.roleId,
      status: input.status,
      notes: input.notes,
      createdAt: existing?.createdAt ?? input.createdAt ?? now,
      updatedAt: now,
    }
    if (existing) {
      this.state.profiles = this.state.profiles.map((row) => (row.id === profile.id ? profile : row))
    } else {
      this.state.profiles = [...this.state.profiles, profile]
    }
    const credential = this.state.credentials.find((row) => row.profileId === profile.id)
    if (!credential) {
      this.state.credentials.push({
        profileId: profile.id,
        email: profile.email,
        passwordHash: '',
        resetToken: null,
        resetTokenExpiresAt: null,
      })
    }
    const target = this.state.credentials.find((row) => row.profileId === profile.id)!
    target.email = profile.email
    if (input.password) {
      target.passwordHash = await hashPassword(input.password)
    } else if (!existing) {
      throw new Error('A temporary password is required for new users.')
    }
    this.log(existing ? 'user_updated' : 'user_created', `User ${existing ? 'updated' : 'created'}: ${profile.fullName}`, 'user', profile.id)
    this.persist()
    return profile
  }

  async setUserPassword(profileId: string, password: string) {
    const credential = this.state.credentials.find((row) => row.profileId === profileId)
    if (!credential) throw new Error('User credential was not found.')
    credential.passwordHash = await hashPassword(password)
    this.persist()
  }

  setUserStatus(id: string, status: Profile['status']) {
    this.assert('users', 'edit')
    const profile = this.state.profiles.find((row) => row.id === id)
    if (!profile) throw new Error('User was not found.')
    profile.status = status
    profile.updatedAt = nowIso()
    this.log('user_status_changed', `User status changed: ${profile.fullName} → ${status}`, 'user', profile.id)
    this.persist()
  }

  listClients(query?: ListQuery) {
    this.assert('clients', 'view')
    return applyQuery(
      this.state.clients,
      query,
      (item) => `${item.displayName} ${item.legalName} ${item.email} ${item.tags.join(' ')}`,
      (item) => item.status,
      (item) => item.assignedEmployeeId,
      (item) => item.archivedAt,
    )
  }

  getClient(id: string) {
    this.assert('clients', 'view')
    return this.state.clients.find((row) => row.id === id) ?? null
  }

  saveClient(input: Omit<Client, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'archivedAt'> & Partial<Client>) {
    const existing = this.state.clients.find((row) => row.id === input.id)
    if (existing) this.assert('clients', 'edit')
    else this.assert('clients', 'create')
    const now = nowIso()
    const client: Client = {
      id: input.id,
      type: input.type,
      displayName: input.displayName.trim(),
      legalName: input.legalName.trim(),
      email: input.email.trim(),
      phone: input.phone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      region: input.region,
      postalCode: input.postalCode,
      country: input.country,
      status: input.status,
      notes: input.notes,
      tags: input.tags,
      assignedEmployeeId: input.assignedEmployeeId,
      createdBy: existing?.createdBy ?? this.actorId(),
      updatedBy: this.actorId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      archivedAt: input.status === 'archived' ? existing?.archivedAt ?? now : null,
    }
    this.state.clients = existing
      ? this.state.clients.map((row) => (row.id === client.id ? client : row))
      : [...this.state.clients, client]
    this.log(existing ? 'client_updated' : 'client_created', `Client ${existing ? 'updated' : 'created'}: ${client.displayName}`, 'client', client.id)
    if (existing) {
      this.notify('client_update', 'Client update', `${client.displayName} was updated.`, client.assignedEmployeeId, 'client', client.id)
    }
    this.persist()
    return client
  }

  archiveClient(id: string) {
    this.assert('clients', 'archive')
    const client = this.state.clients.find((row) => row.id === id)
    if (!client) throw new Error('Client was not found.')
    client.status = 'archived'
    client.archivedAt = nowIso()
    client.updatedAt = nowIso()
    client.updatedBy = this.actorId()
    this.log('client_archived', `Client archived: ${client.displayName}`, 'client', client.id)
    this.persist()
  }

  saveContact(contact: ClientContact) {
    this.assert('clients', 'edit')
    const existing = this.state.clientContacts.find((row) => row.id === contact.id)
    this.state.clientContacts = existing
      ? this.state.clientContacts.map((row) => (row.id === contact.id ? contact : row))
      : [...this.state.clientContacts, contact]
    this.persist()
    return contact
  }

  listProjects(query?: ListQuery) {
    this.assert('projects', 'view')
    return applyQuery(
      this.state.projects,
      query,
      (item) => item.name,
      (item) => item.status,
      undefined,
      (item) => item.archivedAt,
    )
  }

  saveProject(input: Omit<Project, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'archivedAt'> & Partial<Project>, memberIds: string[]) {
    const existing = this.state.projects.find((row) => row.id === input.id)
    if (existing) this.assert('projects', 'edit')
    else this.assert('projects', 'create')
    const now = nowIso()
    const project: Project = {
      id: input.id,
      name: input.name.trim(),
      clientId: input.clientId,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
      createdBy: existing?.createdBy ?? this.actorId(),
      updatedBy: this.actorId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      archivedAt: input.status === 'archived' ? existing?.archivedAt ?? now : null,
    }
    this.state.projects = existing
      ? this.state.projects.map((row) => (row.id === project.id ? project : row))
      : [...this.state.projects, project]
    this.state.projectMembers = [
      ...this.state.projectMembers.filter((row) => row.projectId !== project.id),
      ...memberIds.map((profileId) => ({ projectId: project.id, profileId })),
    ]
    this.log(existing ? 'project_updated' : 'project_created', `Project ${existing ? 'updated' : 'created'}: ${project.name}`, 'project', project.id)
    this.notify('project_update', 'Project update', `${project.name} was ${existing ? 'updated' : 'created'}.`, memberIds[0] ?? this.actorId(), 'project', project.id)
    this.persist()
    return project
  }

  archiveProject(id: string) {
    this.assert('projects', 'archive')
    const project = this.state.projects.find((row) => row.id === id)
    if (!project) throw new Error('Project was not found.')
    project.status = 'archived'
    project.archivedAt = nowIso()
    project.updatedAt = nowIso()
    this.log('project_archived', `Project archived: ${project.name}`, 'project', project.id)
    this.persist()
  }

  listTasks(query?: ListQuery) {
    this.assert('tasks', 'view')
    return applyQuery(
      this.state.tasks,
      query,
      (item) => `${item.title} ${item.description}`,
      (item) => item.status,
      (item) => item.assignedEmployeeId,
      (item) => item.archivedAt,
    )
  }

  saveTask(input: Omit<Task, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'completedAt' | 'archivedAt'> & Partial<Task>) {
    const existing = this.state.tasks.find((row) => row.id === input.id)
    if (existing) this.assert('tasks', 'edit')
    else this.assert('tasks', 'create')
    const now = nowIso()
    const completedAt =
      input.status === 'completed' ? existing?.completedAt ?? input.completedAt ?? now : null
    const task: Task = {
      id: input.id,
      title: input.title.trim(),
      description: input.description,
      status: input.status,
      priority: input.priority,
      assignedEmployeeId: input.assignedEmployeeId,
      clientId: input.clientId,
      projectId: input.projectId,
      dueDate: input.dueDate,
      completedAt,
      createdBy: existing?.createdBy ?? this.actorId(),
      updatedBy: this.actorId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      archivedAt: existing?.archivedAt ?? null,
    }
    this.state.tasks = existing
      ? this.state.tasks.map((row) => (row.id === task.id ? task : row))
      : [...this.state.tasks, task]
    if (!existing) this.log('task_created', `Task created: ${task.title}`, 'task', task.id)
    else if (task.status === 'completed' && existing.status !== 'completed') {
      this.log('task_completed', `Task completed: ${task.title}`, 'task', task.id)
    } else if (existing.status !== task.status) {
      this.log('status_changed', `Task status changed: ${task.title} → ${task.status}`, 'task', task.id)
    } else {
      this.log('task_updated', `Task updated: ${task.title}`, 'task', task.id)
    }
    if (!existing || existing.assignedEmployeeId !== task.assignedEmployeeId) {
      this.notify('task_assigned', 'Task assigned', `${task.title} was assigned.`, task.assignedEmployeeId, 'task', task.id)
    }
    this.persist()
    return task
  }

  archiveTask(id: string) {
    this.assert('tasks', 'archive')
    const task = this.state.tasks.find((row) => row.id === id)
    if (!task) throw new Error('Task was not found.')
    task.archivedAt = nowIso()
    this.log('task_archived', `Task archived: ${task.title}`, 'task', task.id)
    this.persist()
  }

  listAppointments(query?: ListQuery) {
    this.assert('appointments', 'view')
    return applyQuery(
      this.state.appointments,
      query,
      (item) => `${item.title} ${item.location}`,
      (item) => item.status,
      (item) => item.employeeId,
    )
  }

  saveAppointment(input: Omit<Appointment, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & Partial<Appointment>) {
    const existing = this.state.appointments.find((row) => row.id === input.id)
    if (existing) this.assert('appointments', 'edit')
    else this.assert('appointments', 'create')
    const now = nowIso()
    const appointment: Appointment = {
      id: input.id,
      title: input.title.trim(),
      clientId: input.clientId,
      employeeId: input.employeeId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      notes: input.notes,
      status: input.status,
      createdBy: existing?.createdBy ?? this.actorId(),
      updatedBy: this.actorId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    this.state.appointments = existing
      ? this.state.appointments.map((row) => (row.id === appointment.id ? appointment : row))
      : [...this.state.appointments, appointment]
    this.log(existing ? 'appointment_updated' : 'appointment_created', `Appointment ${existing ? 'updated' : 'created'}: ${appointment.title}`, 'appointment', appointment.id)
    this.notify('appointment_upcoming', 'Appointment saved', `${appointment.title} on ${appointment.date}`, appointment.employeeId, 'appointment', appointment.id)
    this.persist()
    return appointment
  }

  cancelAppointment(id: string) {
    this.assert('appointments', 'edit')
    const appointment = this.state.appointments.find((row) => row.id === id)
    if (!appointment) throw new Error('Appointment was not found.')
    appointment.status = 'cancelled'
    appointment.updatedAt = nowIso()
    this.log('appointment_cancelled', `Appointment cancelled: ${appointment.title}`, 'appointment', appointment.id)
    this.persist()
  }

  saveDocument(doc: Omit<DocumentRecord, 'createdAt' | 'archivedAt' | 'uploadedBy'> & Partial<DocumentRecord>) {
    const existing = this.state.documents.find((row) => row.id === doc.id)
    if (existing) this.assert('documents', 'edit')
    else this.assert('documents', 'create')
    const record: DocumentRecord = {
      id: doc.id,
      name: doc.name,
      category: doc.category,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      dataUrl: doc.dataUrl,
      clientId: doc.clientId ?? null,
      projectId: doc.projectId ?? null,
      uploadedBy: existing?.uploadedBy ?? this.actorId(),
      createdAt: existing?.createdAt ?? nowIso(),
      archivedAt: existing?.archivedAt ?? null,
    }
    this.state.documents = existing
      ? this.state.documents.map((row) => (row.id === record.id ? record : row))
      : [...this.state.documents, record]
    this.log('document_uploaded', `Document uploaded: ${record.name}`, 'document', record.id)
    this.persist()
    return record
  }

  archiveDocument(id: string) {
    this.assert('documents', 'archive')
    const doc = this.state.documents.find((row) => row.id === id)
    if (!doc) throw new Error('Document was not found.')
    doc.archivedAt = nowIso()
    this.log('document_archived', `Document archived: ${doc.name}`, 'document', doc.id)
    this.persist()
  }

  markNotificationRead(id: string) {
    this.assert('notifications', 'edit')
    const notification = this.state.notifications.find((row) => row.id === id)
    if (!notification) return
    notification.readAt = nowIso()
    this.persist()
  }

  saveCompany(company: AppState['company']) {
    this.assert('settings', 'edit')
    this.state.company = company
    this.log('settings_updated', 'Company settings updated', 'settings', 'company')
    this.persist()
  }

  saveRolePermissions(roleId: string, permissionIds: string[]) {
    this.assert('roles', 'manage')
    this.state.rolePermissions = [
      ...this.state.rolePermissions.filter((row) => row.roleId !== roleId),
      ...permissionIds.map((permissionId) => ({ roleId, permissionId })),
    ]
    this.log('roles_updated', 'Role permissions updated', 'role', roleId)
    this.persist()
  }

  addStatus(entity: AppState['statuses'][number]['entity'], key: string, label: string) {
    this.assert('settings', 'edit')
    this.state.statuses.push({
      id: newId(),
      entity,
      key,
      label,
      sortOrder: this.state.statuses.filter((row) => row.entity === entity).length + 1,
    })
    this.persist()
  }

  addTag(name: string) {
    this.assert('settings', 'edit')
    this.state.tags.push({ id: newId(), name })
    this.persist()
  }

  globalSearch(term: string, limit = 8) {
    const q = term.trim()
    if (!q) {
      return { clients: [], users: [], projects: [], tasks: [] }
    }
    const take = <T,>(items: T[], test: (item: T) => boolean) => items.filter(test).slice(0, limit)
    return {
      clients: take(this.state.clients, (item) => matchesSearch(`${item.displayName} ${item.email}`, q)),
      users: take(this.state.profiles, (item) => matchesSearch(`${item.fullName} ${item.email}`, q)),
      projects: take(this.state.projects, (item) => matchesSearch(item.name, q)),
      tasks: take(this.state.tasks, (item) => matchesSearch(item.title, q)),
    }
  }

  reports() {
    this.assert('reports', 'view')
    const clients = this.state.clients.filter((row) => !row.archivedAt)
    const tasks = this.state.tasks.filter((row) => !row.archivedAt)
    const projects = this.state.projects.filter((row) => !row.archivedAt)
    const appointments = this.state.appointments
    const workload = this.state.profiles.map((profile) => ({
      profile,
      openTasks: tasks.filter((task) => task.assignedEmployeeId === profile.id && task.status !== 'completed').length,
      projects: this.state.projectMembers.filter((row) => row.profileId === profile.id).length,
      appointments: appointments.filter((row) => row.employeeId === profile.id && row.status === 'scheduled').length,
    }))
    return {
      clientCount: clients.length,
      activeClients: clients.filter((row) => row.status === 'active').length,
      projectCount: projects.length,
      openTasks: tasks.filter((row) => row.status !== 'completed').length,
      completedTasks: tasks.filter((row) => row.status === 'completed').length,
      upcomingAppointments: appointments.filter((row) => row.status === 'scheduled').length,
      projectsByStatus: projects.reduce<Record<string, number>>((acc, project) => {
        acc[project.status] = (acc[project.status] ?? 0) + 1
        return acc
      }, {}),
      workload,
      recentActivity: this.state.activities.slice(0, 12),
    }
  }
}
