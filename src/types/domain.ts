export const ROLES = {
  administrator: 'administrator',
  manager: 'manager',
  employee: 'employee',
} as const

export type RoleKey = (typeof ROLES)[keyof typeof ROLES]

export const MODULES = [
  'dashboard',
  'users',
  'roles',
  'clients',
  'leads',
  'tasks',
  'projects',
  'appointments',
  'documents',
  'activity',
  'notifications',
  'reports',
  'settings',
] as const

export type ModuleKey = (typeof MODULES)[number]

export const ACTIONS = ['view', 'create', 'edit', 'archive', 'delete', 'manage'] as const
export type ActionKey = (typeof ACTIONS)[number]

export type PermissionKey = `${ModuleKey}.${ActionKey}`

export interface Role {
  id: string
  key: RoleKey | string
  name: string
  description: string
  isSystem: boolean
}

export interface Permission {
  id: string
  key: PermissionKey | string
  module: ModuleKey | string
  action: ActionKey | string
  description: string
}

export interface RolePermission {
  roleId: string
  permissionId: string
}

export type UserStatus = 'active' | 'inactive'

export interface Profile {
  id: string
  email: string
  fullName: string
  phone: string
  title: string
  roleId: string
  status: UserStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Credential {
  profileId: string
  email: string
  passwordHash: string
  resetToken: string | null
  resetTokenExpiresAt: string | null
}

export type ClientType = 'individual' | 'business'
export type ClientStatus = 'active' | 'inactive' | 'archived'

export interface Client {
  id: string
  type: ClientType
  displayName: string
  legalName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postalCode: string
  country: string
  status: ClientStatus
  notes: string
  tags: string[]
  assignedEmployeeId: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface ClientContact {
  id: string
  clientId: string
  fullName: string
  email: string
  phone: string
  title: string
  isPrimary: boolean
}

export type LeadStatusKey =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'won'
  | 'lost'

export interface StatusOption {
  id: string
  entity: 'lead' | 'task' | 'project' | 'appointment' | 'client'
  key: string
  label: string
  sortOrder: number
  isClosed?: boolean
}

export interface LeadSource {
  id: string
  name: string
}

export interface Lead {
  id: string
  displayName: string
  email: string
  phone: string
  companyName: string
  sourceId: string
  status: LeadStatusKey
  assignedEmployeeId: string | null
  followUpDate: string | null
  notes: string
  convertedClientId: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type ProjectStatusKey = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'

export interface Project {
  id: string
  name: string
  clientId: string | null
  status: ProjectStatusKey
  startDate: string | null
  endDate: string | null
  notes: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface ProjectMember {
  projectId: string
  profileId: string
}

export type TaskStatusKey = 'todo' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatusKey
  priority: TaskPriority
  assignedEmployeeId: string | null
  clientId: string | null
  projectId: string | null
  dueDate: string | null
  completedAt: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled'

export interface Appointment {
  id: string
  title: string
  clientId: string | null
  employeeId: string | null
  date: string
  startTime: string
  endTime: string
  location: string
  notes: string
  status: AppointmentStatus
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export type DocumentCategory = 'general' | 'contract' | 'invoice' | 'correspondence' | 'other'

export interface DocumentRecord {
  id: string
  name: string
  category: DocumentCategory
  mimeType: string
  sizeBytes: number
  dataUrl: string
  clientId: string | null
  projectId: string | null
  uploadedBy: string
  createdAt: string
  archivedAt: string | null
}

export type NotificationType =
  | 'task_assigned'
  | 'task_due'
  | 'appointment_upcoming'
  | 'new_lead'
  | 'client_update'
  | 'project_update'
  | 'system'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  recipientId: string
  relatedType: string | null
  relatedId: string | null
  readAt: string | null
  createdAt: string
}

export interface Activity {
  id: string
  eventType: string
  description: string
  actorId: string
  relatedType: string | null
  relatedId: string | null
  createdAt: string
}

export interface CompanySettings {
  name: string
  email: string
  phone: string
  website: string
  address: string
  notificationPreferences: {
    taskAssigned: boolean
    taskDue: boolean
    appointmentUpcoming: boolean
    newLead: boolean
  }
}

export interface TagOption {
  id: string
  name: string
}

export interface AppState {
  roles: Role[]
  permissions: Permission[]
  rolePermissions: RolePermission[]
  profiles: Profile[]
  credentials: Credential[]
  clients: Client[]
  clientContacts: ClientContact[]
  leads: Lead[]
  leadSources: LeadSource[]
  statuses: StatusOption[]
  projects: Project[]
  projectMembers: ProjectMember[]
  tasks: Task[]
  appointments: Appointment[]
  documents: DocumentRecord[]
  notifications: AppNotification[]
  activities: Activity[]
  tags: TagOption[]
  company: CompanySettings
}

export interface Session {
  profileId: string
  email: string
}

export interface ListQuery {
  search?: string
  page?: number
  pageSize?: number
  status?: string
  assignedEmployeeId?: string
  includeArchived?: boolean
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
