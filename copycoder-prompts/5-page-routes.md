Set up the page structure according to the following prompt:
   
<page-structure-prompt>
Next.js route structure integrating with existing navigation. All routes should use the existing layout components.

Routes:
/tickets
├── overview (main tickets landing page)
├── active
├── search
├── queue
└── [id]/ (ticket details)
    ├── details
    ├── assignee
    ├── followers
    ├── tags
    ├── type
    ├── priority
    ├── linked-problem
    └── history

Page Implementations:

/tickets/overview:
Core Purpose: Main entry point for ticket management
Key Components:
- Ticket statistics dashboard
- Recent tickets list
- Quick actions panel
Layout Structure:
- Two-column layout
- Left: Statistics and metrics
- Right: Action items

/tickets/active:
Core Purpose: View and manage active tickets
Key Components:
- Ticket list with filters
- Bulk actions
- Status indicators
Layout Structure:
- List/Grid toggle view
- Filter sidebar
- Main content area

/tickets/search:
Core Purpose: Advanced ticket search
Key Components:
- Advanced search form
- Saved searches
- Results grid
Layout Structure:
- Search header
- Filter panel
- Results area

/tickets/queue:
Core Purpose: Team workload management
Key Components:
- Team queue overview
- Assignment panel
- Priority sorting
Layout Structure:
- Queue statistics header
- Team member list
- Ticket assignment area

/tickets/[id]/details:
Core Purpose: Display comprehensive ticket information
Key Components:
- Ticket summary card
- Status timeline
- Comment thread
- Activity log
Layout Structure:
- Three-column layout
- Left: Main ticket info
- Center: Activity
- Right: Meta info

/tickets/[id]/assignee:
Core Purpose: Manage ticket assignment
Key Components:
- User search
- Team member list
- Assignment history
Layout Structure:
- Single column with filters
- Grid of assignable users
- Assignment confirmation

/tickets/[id]/followers:
Core Purpose: Manage ticket watchers
Key Components:
- Follower list
- Add/remove controls
- Notification preferences
Layout Structure:
- Vertical list
- Quick actions
- Settings panel

/tickets/[id]/tags:
Core Purpose: Organize with labels
Key Components:
- Tag management
- Category groups
- Quick apply
Layout Structure:
- Tag cloud
- Category sections
- Creation panel

/tickets/[id]/type:
Core Purpose: Set ticket classification
Key Components:
- Type selector
- Template options
- Impact settings
Layout Structure:
- Type grid
- Template preview
- Settings panel

/tickets/[id]/priority:
Core Purpose: Set urgency levels
Key Components:
- Priority matrix
- SLA settings
- Impact assessment
Layout Structure:
- Priority grid
- SLA timeline
- Impact panel

/tickets/[id]/linked-problem:
Core Purpose: Connect related issues
Key Components:
- Problem search
- Relationship mapper
- Impact analysis
Layout Structure:
- Network view
- List view
- Details panel

/tickets/[id]/history:
Core Purpose: Track ticket changes
Key Components:
- Timeline view
- Change details
- Filter options
Layout Structure:
- Chronological list
- Change details
- Filter sidebar

Layouts:
Main Layout (existing):
- Navigation header
- Sidebar menu
- Content area
- Footer
- Responsive behavior

Ticket Layout (new):
Core components:
- Ticket header
- Navigation tabs
- Content area
- Action panel
Responsive behavior:
- Collapsible sections
- Stack on mobile
- Fluid width content

List Layout (new):
Core components:
- Filter header
- List/Grid toggle
- Content grid
- Bulk actions
Responsive behavior:
- Filter sidebar collapse
- Responsive grid
- Mobile optimized
</page-structure-prompt>