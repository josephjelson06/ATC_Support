export type BackendRole = 'PM' | 'SE';
export type BackendSupportLevel = 'SE1' | 'SE2' | 'SE3';
export type ScopeMode = 'GLOBAL' | 'PROJECT_SCOPED';
export type AssignmentAuthority = 'SELF_ONLY' | 'SELF_AND_OTHERS';
export type BackendUserStatus = 'ACTIVE' | 'INACTIVE';
export type ClientStatus = 'ACTIVE' | 'INACTIVE';
export type ProjectStatus = 'ACTIVE' | 'INACTIVE';
export type AmcStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type TicketDetailTab = 'summary' | 'conversation' | 'attachments' | 'email' | 'history';
export type ClientDetailTab = 'overview' | 'projects' | 'contacts' | 'consignees' | 'amcs' | 'hardware';
export type ProjectDetailTab = 'overview' | 'faqs' | 'docs';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'ESCALATED' | 'REOPENED' | 'RESOLVED';
export type TicketSource = 'WIDGET' | 'PROJECT_WIDGET' | 'GENERAL_WIDGET' | 'INTERNAL';
export type ChatSessionStatus = 'ACTIVE' | 'ENDED' | 'ESCALATED';
export type TicketMessageType = 'REPLY' | 'INTERNAL_NOTE' | 'SYSTEM';
export type ChatRole = 'USER' | 'JULIA';
export type SupportType = 'GENERAL' | 'SOFTWARE' | 'HARDWARE';
export type SupportSessionSource = 'GENERAL_WIDGET' | 'PROJECT_WIDGET' | 'INTERNAL';
export type SupportSessionStatus = 'ACTIVE' | 'ENDED' | 'ESCALATED';
export type SupportSessionMessageRole = 'USER' | 'JULIA' | 'SYSTEM';
export type HardwareCategory = 'PRINTER' | 'SCANNER' | 'NETWORK_DEVICE' | 'COMPUTER' | 'PERIPHERAL' | 'OTHER';
export type HardwareAssetStatus = 'ACTIVE' | 'INACTIVE' | 'RETIRED';
export type SupportTopicScope = 'GLOBAL' | 'CLIENT' | 'PROJECT' | 'HARDWARE_CATEGORY' | 'HARDWARE_ASSET';
export type SupportTopicKind = 'FAQ' | 'SOP' | 'PLAYBOOK' | 'VENDOR_LINK';
export type KnowledgeStatus = 'DRAFT' | 'PUBLISHED';
export type NotificationType =
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_ESCALATED'
  | 'TICKET_RESOLVED'
  | 'TICKET_REOPENED'
  | 'TICKET_CUSTOMER_REPLIED';
export type TicketEmailDirection = 'OUTBOUND' | 'INBOUND';
export type TicketEmailStatus = 'SENT' | 'LOGGED' | 'RECEIVED' | 'FAILED';

export interface UserPermissions {
  canViewClients: boolean;
  canViewProjects: boolean;
  canViewReports: boolean;
  canViewUsersAccess: boolean;
  canManageClients: boolean;
  canManageProjects: boolean;
  canManageUsers: boolean;
  canManageProjectKnowledge: boolean;
  canCreateTickets: boolean;
  canAssignTicketsToSelf: boolean;
  canAssignTicketsToOthers: boolean;
  canEscalateTickets: boolean;
  canMoveTicketsToWaiting: boolean;
  canResolveTickets: boolean;
  canReopenTickets: boolean;
  hasGlobalProjectScope: boolean;
  hasProjectScopedAccess: boolean;
}

export interface ApiProjectMembership {
  projectId: number;
  createdAt: string;
  project?: ApiProject | null;
}

export interface ApiUser {
  id: number;
  displayId: string;
  name: string;
  email: string;
  role: BackendRole;
  supportLevel?: BackendSupportLevel | null;
  scopeMode: ScopeMode;
  assignmentAuthority: AssignmentAuthority;
  status: BackendUserStatus;
  createdAt: string;
  permissions: UserPermissions;
  projectMemberships?: ApiProjectMembership[];
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
    hardwareAssets?: number;
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
  widgetAllowedDomains?: string[];
  embedCode?: string;
  juliaGreeting?: string | null;
  juliaFallbackMessage?: string | null;
  juliaEscalationHint?: string | null;
  status: ProjectStatus;
  createdAt: string;
  client?: ApiClient | null;
  assignedTo?: ApiUser | null;
  juliaReadiness?: ApiJuliaReadiness;
  memberships?: Array<{
    userId: number;
    createdAt: string;
    user?: ApiUser | null;
  }>;
}

export interface ApiJuliaReadinessCheck {
  key: string;
  label: string;
  isMet: boolean;
  detail: string;
}

export interface ApiJuliaReadiness {
  isReady: boolean;
  allowedDomainCount: number;
  minimumAllowedDomainCount: number;
  faqCount: number;
  minimumFaqCount: number;
  publishedDocCount: number;
  minimumPublishedDocCount: number;
  checks: ApiJuliaReadinessCheck[];
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
  status: AmcStatus;
  project?: ApiProject | null;
}

export interface ApiHardwareAsset {
  id: number;
  displayId: string;
  clientId: number;
  projectId?: number | null;
  amcId?: number | null;
  category: HardwareCategory;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  status: HardwareAssetStatus;
  notes?: string | null;
  vendorSupportUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: ApiClient | null;
  project?: ApiProject | null;
  amc?: ApiAmc | null;
}

export interface ApiSupportTopic {
  id: number;
  displayId: string;
  scope: SupportTopicScope;
  kind: SupportTopicKind;
  supportType: SupportType;
  status: KnowledgeStatus;
  title: string;
  summary?: string | null;
  content: string;
  clientId?: number | null;
  projectId?: number | null;
  hardwareCategory?: HardwareCategory | null;
  hardwareAssetId?: number | null;
  vendorUrl?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  client?: ApiClient | null;
  project?: ApiProject | null;
  hardwareAsset?: ApiHardwareAsset | null;
}

export interface ApiSupportSessionMessage {
  id: number;
  supportSessionId?: number;
  role: SupportSessionMessageRole;
  content: string;
  sourceRefs?: {
    runbookIds?: number[];
    projectDocIds?: number[];
    supportTopicIds?: number[];
  } | null;
  createdAt: string;
}

export interface ApiSupportSession {
  id: number;
  displayId: string;
  source: SupportSessionSource;
  status: SupportSessionStatus;
  supportType: SupportType;
  clientId?: number | null;
  projectId?: number | null;
  hardwareAssetId?: number | null;
  selectedTopicId?: number | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
  issueSummary?: string | null;
  supportSummary?: string | null;
  confidenceScore?: number | null;
  createdAt: string;
  endedAt?: string | null;
  escalatedAt?: string | null;
  client?: ApiClient | null;
  project?: ApiProject | null;
  hardwareAsset?: ApiHardwareAsset | null;
  selectedTopic?: ApiSupportTopic | null;
  messages?: ApiSupportSessionMessage[];
  ticket?: ApiTicket | null;
  _count?: {
    messages?: number;
  };
}

export interface ApiClientDetail extends ApiClient {
  contacts: ApiClientContact[];
  consignees: ApiConsignee[];
  amcs: ApiAmc[];
  projects: ApiProject[];
  hardwareAssets: ApiHardwareAsset[];
}

export interface ApiTicketMessage {
  id: number;
  ticketId?: number;
  userId?: number | null;
  senderName?: string | null;
  senderEmail?: string | null;
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

export interface ApiTicketEmail {
  id: number;
  ticketId: number;
  ticketMessageId?: number | null;
  createdById?: number | null;
  direction: TicketEmailDirection;
  status: TicketEmailStatus;
  subject: string;
  bodyText: string;
  fromName?: string | null;
  fromEmail: string;
  toName?: string | null;
  toEmail: string;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  deliveredAt?: string | null;
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
  requesterName?: string | null;
  requesterEmail?: string | null;
  emailThreadToken?: string | null;
  title: string;
  description?: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  source?: TicketSource;
  supportType?: SupportType | null;
  assignedToId?: number | null;
  resolutionSummary?: string | null;
  supportSummary?: string | null;
  confidenceScore?: number | null;
  createdAt: string;
  resolvedAt?: string | null;
  client?: ApiClient | null;
  project?: ApiProject | null;
  hardwareAsset?: ApiHardwareAsset | null;
  assignedTo?: ApiUser | null;
  messages?: ApiTicketMessage[];
  chatSession?: ApiChatSession | null;
  supportSession?: ApiSupportSession | null;
  emailEvents?: ApiTicketEmail[];
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
  totalHardwareAssets?: number;
  activeSupportSessions?: number;
  escalatedSupportSessions?: number;
  hardwareSupportSessions?: number;
  softwareSupportSessions?: number;
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
    juliaReadiness?: ApiJuliaReadiness;
  };
  faqs: WidgetFaq[];
}

export interface SupportContextResponse {
  mode: SupportSessionSource;
  project?: ApiProject | null;
  client?: ApiClient | null;
  projects: ApiProject[];
  hardwareAssets: ApiHardwareAsset[];
  amcs: ApiAmc[];
  topics: ApiSupportTopic[];
  faqs: WidgetFaq[];
  supportTypes: SupportType[];
  hardwareCategories: HardwareCategory[];
}

export interface WidgetStartResponse {
  sessionId: number;
}

export interface WidgetMessageResponse {
  sessionId: number;
  reply: string;
  message: ApiChatMessage;
}

export interface SupportSessionStartResponse extends ApiSupportSession {}

export interface SupportSessionMessageResponse {
  sessionId: number;
  reply: string;
  message: ApiSupportSessionMessage;
}
