export type BackendRole = 'PM' | 'PL' | 'SE';
export type BackendUserStatus = 'ACTIVE' | 'INACTIVE';
export type ClientStatus = 'ACTIVE' | 'INACTIVE';
export type ProjectStatus = 'ACTIVE' | 'INACTIVE';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'ESCALATED' | 'REOPENED' | 'RESOLVED';
export type TicketSource = 'WIDGET';
export type ChatSessionStatus = 'ACTIVE' | 'ENDED' | 'ESCALATED';
export type TicketMessageType = 'REPLY' | 'INTERNAL_NOTE' | 'SYSTEM';
export type ChatRole = 'USER' | 'JULIA';
export type KnowledgeStatus = 'DRAFT' | 'PUBLISHED';
export type NotificationType = 'TICKET_CREATED' | 'TICKET_ASSIGNED' | 'TICKET_ESCALATED' | 'TICKET_RESOLVED' | 'TICKET_REOPENED';

export interface ApiUser {
  id: number;
  displayId: string;
  name: string;
  email: string;
  role: BackendRole;
  status: BackendUserStatus;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: ApiUser;
}

export interface AuthMeResponse {
  user: ApiUser;
}

export interface NotificationListResponse {
  items: ApiNotification[];
  unreadCount: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiClient {
  id: number;
  displayId: string;
  name: string;
  industry?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  notes?: string | null;
  status: ClientStatus;
  createdAt: string;
  _count?: {
    contacts: number;
    consignees: number;
    projects: number;
    amcs: number;
  };
}

export interface ApiClientContact {
  id: number;
  clientId?: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  isPrimary?: boolean;
}

export interface ApiConsigneeContact {
  id: number;
  consigneeId?: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
}

export interface ApiConsignee {
  id: number;
  clientId?: number;
  name: string;
  address: string;
  contacts?: ApiConsigneeContact[];
}

export interface ApiProject {
  id: number;
  displayId: string;
  clientId?: number;
  assignedToId?: number | null;
  name: string;
  description?: string | null;
  widgetKey?: string;
  widgetEnabled?: boolean;
  embedCode?: string;
  juliaGreeting?: string | null;
  juliaFallbackMessage?: string | null;
  juliaEscalationHint?: string | null;
  status: ProjectStatus;
  createdAt: string;
  client?: ApiClient | null;
  assignedTo?: ApiUser | null;
}

export interface ApiAmc {
  id: number;
  displayId: string;
  clientId?: number;
  projectId?: number | null;
  hoursIncluded: number;
  hoursUsed: number;
  startDate: string;
  endDate: string;
  status: string;
  project?: ApiProject | null;
}

export interface ApiClientDetail extends ApiClient {
  contacts: ApiClientContact[];
  consignees: ApiConsignee[];
  amcs: ApiAmc[];
  projects: ApiProject[];
}

export interface ApiTicketMessage {
  id: number;
  ticketId?: number;
  userId?: number | null;
  content: string;
  type?: TicketMessageType;
  createdAt: string;
  user?: ApiUser | null;
  attachments?: ApiTicketAttachment[];
}

export interface ApiTicketAttachment {
  id: number;
  ticketId: number;
  ticketMessageId?: number | null;
  uploadedById?: number | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy?: ApiUser | null;
}

export interface ApiNotification {
  id: number;
  displayId: string;
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface ApiEscalationHistory {
  id: number;
  ticketId: number;
  createdById?: number | null;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  fromAssigneeId?: number | null;
  toAssigneeId?: number | null;
  note?: string | null;
  createdAt: string;
  createdBy?: ApiUser | null;
}

export interface ApiChatMessage {
  id: number;
  chatSessionId?: number;
  role: ChatRole;
  content: string;
  sourceRefs?: {
    runbookIds: number[];
    projectDocIds: number[];
  } | null;
  createdAt: string;
}

export interface ApiChatSession {
  id: number;
  projectId?: number;
  clientName: string;
  clientEmail: string;
  status: ChatSessionStatus;
  createdAt: string;
  endedAt?: string | null;
  project?: ApiProject | null;
  messages?: ApiChatMessage[];
}

export interface ApiTicket {
  id: number;
  displayId: string;
  projectId?: number;
  chatSessionId?: number | null;
  title: string;
  description?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  source?: TicketSource;
  assignedToId?: number | null;
  resolutionSummary?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  project?: ApiProject | null;
  assignedTo?: ApiUser | null;
  messages?: ApiTicketMessage[];
  chatSession?: ApiChatSession | null;
  escalationHistory?: ApiEscalationHistory[];
}

export interface ApiRunbook {
  id: number;
  displayId: string;
  title: string;
  content: string;
  category?: string | null;
  status: KnowledgeStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: ApiUser | null;
}

export interface ApiProjectDoc {
  id: number;
  projectId: number;
  title: string;
  content: string;
  status: KnowledgeStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: ApiUser | null;
}

export interface ApiFaq {
  id: number;
  projectId: number;
  question: string;
  answer: string;
  sortOrder: number;
  createdAt: string;
}

export interface DashboardStats {
  role: BackendRole;
  totalClients?: number;
  totalProjects?: number;
  totalOpenTickets?: number;
  totalResolvedTickets?: number;
  totalRunbooks?: number;
  openTickets?: number;
  resolvedTickets?: number;
  totalDocs?: number;
  totalFaqs?: number;
  unassignedTickets?: number;
  myOpenTickets?: number;
  myResolvedTickets?: number;
}

export interface WidgetFaq {
  id: number;
  projectId: number;
  question: string;
  answer: string;
  sortOrder: number;
  createdAt: string;
}

export interface WidgetFaqResponse {
  project: {
    id: number;
    name: string;
    status: string;
    widgetEnabled?: boolean;
  };
  faqs: WidgetFaq[];
}

export interface WidgetStartResponse {
  sessionId: number;
}

export interface WidgetMessageResponse {
  sessionId: number;
  reply: string;
  message: ApiChatMessage;
}
