# Ticket System Implementation Checklist

## 1. Database Schema & Models
✅ Define ticket table schema in migrations
  ```sql
  -- Fields from existing Ticket interface
  - id: string (primary key)
  - title: string
  - description: text
  - status: enum (open, in_progress, resolved, closed)
  - priority: enum (low, medium, high, urgent)
  - is_archived: boolean
  - customer_id: string (foreign key)
  - assignee_id: string (foreign key, nullable)
  - created_at: timestamp
  - updated_at: timestamp
  - resolved_at: timestamp (nullable)
  ```
✅ Create metadata table or JSON column
  ```sql
  - archived_at: timestamp
  - archived_by_id: string (foreign key)
  - archive_reason: text
  - last_snapshot_at: timestamp
  - company: string
  ```
✅ Create ticket_tags junction table
  ```sql
  - ticket_id: string (foreign key)
  - tag_id: string (foreign key)
  ```
✅ Create tags table
  ```sql
  - id: string (primary key)
  - name: string
  - color: string
  ```
✅ Create ticket_comments table
  ```sql
  - id: string (primary key)
  - ticket_id: string (foreign key)
  - content: text
  - user_id: string (foreign key)
  - is_internal: boolean
  - created_at: timestamp
  - updated_at: timestamp
  ```
✅ Create ticket_snapshots table (for audit history)
  ```sql
  - id: string (primary key)
  - ticket_id: string (foreign key)
  - snapshot_at: timestamp
  - data: jsonb
  - reason: text
  - triggered_by_id: string (foreign key)
  ```
✅ Set up database indexes
  - Index on ticket status, priority
  - Index on customer_id, assignee_id
  - Index on created_at, updated_at
  - Full-text search index on title, subject, description

## 2. API Routes
✅ POST /api/tickets
  - Create ticket with required fields from Ticket interface
  - Handle metadata creation
  - Support initial tags
  - Return TicketListItem type for list view
✅ GET /api/tickets
  - Implement filtering by status, priority
  - Support search across title, subject, description
  - Include customer and assignee details
  - Return paginated TicketListItem[]
✅ GET /api/tickets/[id]
  - Return full Ticket interface data
  - Include comments, tags, snapshots
✅ PATCH /api/tickets/[id]
  - Support partial updates
  - Create snapshot of changes
  - Handle status transitions
✅ POST /api/tickets/[id]/comments
  - Create TicketComment
  - Support internal notes flag
✅ POST /api/tickets/[id]/tags
  - Add/remove Tag associations
✅ POST /api/tickets/[id]/assign
  - Update assignee
  - Create snapshot
✅ POST /api/tickets/[id]/archive
  - Set isArchived and metadata
  - Create snapshot
✅ GET /api/tickets/[id]/status
  - Return available status transitions
  - Include role requirements
  - Include transition conditions
✅ POST /api/tickets/[id]/status
  - Validate transition conditions
  - Record status change reason
  - Create audit log entry
✅ GET /api/tickets/[id]/sla
  - Calculate SLA status
  - Return deadline and progress
  - Include breach status
✅ POST /api/tickets/[id]/sla/pause
  - Pause SLA timer
  - Record pause reason
✅ GET /api/tickets/stats
  - Return ticket counts by priority
  - Return resolution times
  - Return SLA compliance rates
  - Return volume trends
  - Return agent performance metrics

## 3. Frontend Components
- [ ] Create Ticket Form (/src/components/features/tickets/CreateTicketForm.tsx)
  - Form fields matching Ticket interface
  - Customer lookup/selection
  - Tag selection/creation
  - Rich text editor for description
  - File attachments
- [ ] Update TicketList component
  - Use TicketListItem interface
  - Server-side pagination
  - Status/priority filters
  - Sort by created_at, updated_at
- [ ] Enhance TicketDetails component
  - Display all Ticket interface fields
  - Comments section with internal notes
  - Status transition workflow
  - Tag management
  - Audit log from snapshots
- [ ] Create TicketComments component
  - Support internal vs external comments
  - Rich text editor
  - File attachments
- [ ] Enhance StatusTransition component
  - Implement role-based transitions
  - Add transition conditions validation
  - Support status change reasons
- [ ] Update SLAIndicator component
  - Real-time progress tracking
  - Pause/resume functionality
  - Breach notifications
- [ ] Update TicketPriorityChart
  - Connect to real ticket stats
  - Add date range filtering
  - Include trend analysis
- [ ] Create TicketMetrics component
  - Show resolution times
  - Display SLA compliance
  - Team performance stats

## 4. Routes & Pages
- [ ] /tickets/new
  - CreateTicketForm
  - Customer selection modal
  - Tag creation modal
- [ ] /tickets
  - TicketList with filters
  - Bulk actions
  - Export options
- [ ] /tickets/[id]
  - TicketDetails
  - Comments thread
  - Activity timeline
- [ ] Add proper layouts and navigation

## 5. Services & Utils
- [ ] Implement ticket service methods
  ```typescript
  - createTicket(data: CreateTicketDTO): Promise<Ticket>
  - updateTicket(id: string, data: Partial<UpdateTicketDTO>): Promise<Ticket>
  - archiveTicket(id: string, reason?: string): Promise<void>
  - listTickets(params: TicketListParams): Promise<PaginatedResponse<TicketListItem>>
  - getTicketById(id: string): Promise<Ticket>
  - addComment(ticketId: string, data: CreateCommentDTO): Promise<TicketComment>
  - updateTags(ticketId: string, tagIds: string[]): Promise<Tag[]>
  - assignTicket(ticketId: string, assigneeId: string): Promise<void>
  ```
- [ ] Add validation schemas (Zod/Yup)
- [ ] Create React Query hooks
- [ ] Implement error handling
- [ ] Implement SLA service
  ```typescript
  - calculateSLA(ticket: Ticket): Promise<SLAStatus>
  - pauseSLA(ticketId: string, reason: string): Promise<void>
  - resumeSLA(ticketId: string): Promise<void>
  ```
- [ ] Implement status transition service
  ```typescript
  - getAvailableTransitions(ticketId: string): Promise<StatusTransition[]>
  - validateTransition(ticketId: string, newStatus: TicketStatus): Promise<boolean>
  - transitionStatus(ticketId: string, newStatus: TicketStatus, reason?: string): Promise<void>
  ```
- [ ] Add ticket statistics service
  ```typescript
  - getTicketStats(params: StatsParams): Promise<TicketStats>
  - getResolutionTimes(params: TimeParams): Promise<ResolutionMetrics>
  - getSLACompliance(params: SLAParams): Promise<SLAMetrics>
  ```

## 6. Testing
- [ ] Unit tests for API routes
- [ ] Integration tests for ticket operations
- [ ] Component tests for forms
- [ ] E2E tests for critical flows

## 7. Features & Enhancements
- [ ] Email notifications
- [ ] Ticket templates
- [ ] Bulk actions
- [ ] Export functionality
- [ ] SLA tracking
- [ ] Automated assignments
- [ ] Saved filters/views
- [ ] Advanced SLA Management
  - Multiple SLA policies
  - Business hours support
  - Pause/resume rules
- [ ] Status Workflow
  - Custom status transitions
  - Conditional transitions
  - Required fields per status
- [ ] Performance Metrics
  - Resolution time tracking
  - SLA compliance reports
  - Team performance dashboards
- [ ] Automation Rules
  - Auto-assignment based on rules
  - SLA-based escalations
  - Status auto-transitions

## 8. Documentation
- [ ] API documentation
- [ ] Component documentation
- [ ] Usage guidelines
- [ ] Deployment instructions
