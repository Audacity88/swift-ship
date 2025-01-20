Set up the page structure according to the following prompt:
   
<page-structure-prompt>
Next.js route structure based on navigation menu items (excluding main route). Make sure to wrap all routes with the component:

Routes:
- /ticket-details
- /assignee
- /followers
- /tags
- /type
- /priority
- /linked-problem
- /ticket-title
- /add-button
- /search
- /notifications
- /grid-view
- /help

Page Implementations:
/ticket-details:
Core Purpose: Display comprehensive ticket information and history
Key Components
- Ticket summary card
- Status timeline
- Comment thread
- Activity log
- Attachment section
Layout Structure
- Two-column layout
- Left: Main ticket info
- Right: Activity

/assignee:
Core Purpose: Manage ticket assignment and reassignment
Key Components
- User search

/filter
- Team member list
- Assignment history
- Workload indicators
Layout Structure:
- Single column with filters
- Grid of assignable users
- Modal for assignment confirmation

/followers:
Core Purpose: Manage ticket watchers and notifications
Key Components
- Follower list
- Add

/remove controls
- Notification preferences
- Team suggestions
Layout Structure:
- Vertical list layout
- Quick actions sidebar
- Notification settings panel

/tags:
Core Purpose: Organize tickets with labels and categories
Key Components
- Tag creator

/editor
- Tag categories
- Color picker
- Tag search
Layout Structure:
- Tag cloud view
- Category groups
- Creation modal

/type:
Core Purpose: Set and manage ticket types
Key Components
- Type selector
- Custom type creator
- Type hierarchy view
- Templates by type
Layout Structure
- Grid of type cards
- Type details sidebar
- Template preview

/priority:
Core Purpose: Set ticket priority and urgency levels
Key Components
- Priority matrix
- SLA indicators
- Impact assessment
- Priority history
Layout Structure
- Priority grid
- Impact

/linked-problem:
Core Purpose: Connect related tickets and issues
Key Components
- Problem search
- Relationship mapper
- Dependency viewer
- Impact analysis
Layout Structure
- Network diagram
- List of linked items
- Relationship details panel

/ticket-title:
Core Purpose: Edit and format ticket titles
Key Components
- Title editor
- Format tools
- Auto-suggestions
- Title history
Layout Structure
- Single column
- Preview panel
- Version history sidebar

/add-button:
Core Purpose: Create new tickets and items
Key Components
- Quick create forms
- Template selector
- Field configurator
- Workflow starter
Layout Structure
- Modal overlay
- Multi-step wizard
- Template preview

/search:
Core Purpose: Find and filter tickets
Key Components
- Search bar
- Advanced filters
- Results grid
- Saved searches
Layout Structure
- Search header
- Filter sidebar
- Results main area

/notifications:
Core Purpose: Manage system notifications
Key Components
- Notification feed
- Filter controls
- Read

/unread status
- Action center
Layout Structure:
- Notification list
- Quick actions
- Settings panel

/grid-view:
Core Purpose: Display tickets in customizable grid
Key Components
- Column customizer
- Sort controls
- Bulk actions
- View presets
Layout Structure
- Toolbar header
- Main grid area
- Column configuration panel

/help:
Core Purpose: Provide user assistance and documentation
Key Components
- Search help topics
- Tutorial videos
- FAQ section
- Contact support
Layout Structure
- Search header
- Topic categories
- Content area
- Quick links sidebar

Layouts:
Main Layout:
- Applicable routes: All routes
- Core components
  - Navigation header
  - Sidebar menu
  - Content area
  - Footer
- Responsive behavior
  - Collapsible sidebar
  - Stack layout on mobile
  - Adaptive content width

Modal Layout
- Applicable routes: /add-button, quick actions
- Core components
  - Modal container
  - Header
  - Action buttons
  - Close button
- Responsive behavior
  - Full screen on mobile
  - Centered on desktop
  - Scrollable content

Dashboard Layout
- Applicable routes: /grid-view, /search
- Core components
  - Toolbar
  - Main content
  - Filters panel
- Responsive behavior
  - Collapsible panels
  - Responsive grid
  - Mobile-optimized filters
</page-structure-prompt>