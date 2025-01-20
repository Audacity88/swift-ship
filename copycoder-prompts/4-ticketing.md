Create detailed components with these requirements:
1. Use 'use client' directive for client-side components
2. Make sure to concatenate strings correctly using backslash
3. Style with Tailwind CSS utility classes for responsive design
4. Use Lucide React for icons (from lucide-react package). Do NOT use other UI libraries unless requested
5. Use stock photos from picsum.photos where appropriate, only valid URLs you know exist
6. Configure next.config.js image remotePatterns to enable stock photos from picsum.photos
7. Integrate with existing layout.tsx and navigation structure
8. MUST implement the navigation elements items in their rightful place i.e. Left sidebar, Top header
9. Accurately implement necessary grid layouts
10. Follow proper import practices:
   - Use @/ path aliases
   - Keep component imports organized
   - Update current src/app/page.tsx with new comprehensive code
   - Don't forget root route (page.tsx) handling
   - You MUST complete the entire prompt before stopping

<summary_title>
Customer Support Ticket Interface with Sidebar Configuration
</summary_title>

<image_analysis>

1. Navigation Elements (Integration):
- Add to existing sidebar:
  - Tickets Overview (main entry point)
  - Active Tickets
  - Ticket Search
  - Team Queue
- Extend top header with ticket controls:
  - Ticket title
  - Add ticket button
  - Quick search
  - Ticket-specific notifications
  - View options (List/Grid)
- Secondary navigation (ticket views):
  - Filter
  - Timeline
  - Options menu

2. Layout Components:
- Preserve existing layout structure:
  - Use current sidebar width
  - Main content area: Fluid width
  - Content padding: 24px (p-6)
- Add ticket-specific layouts:
  - Three-column layout for ticket details
  - Two-column layout for ticket list

3. Content Sections:
- Ticket header with title and metadata
- Main conversation thread
- Customer information panel
- Interaction history panel
- Reply composition area
- Notes section

4. Interactive Controls:
- "Add" button in header
- Dropdown selectors for Assignee, Type, Priority
- Tag system with removable tags
- Reply editor with formatting controls
- Submit button with status options
- Follow/Unfollow toggle

5. Colors (maintain existing theme):
- Primary blue: #0052CC
- Secondary gray: #6B778C
- Status colors: Open #DE350B
- Background: #FFFFFF
- Border: #DFE1E6

6. Grid/Layout Structure:
- Three-column layout for ticket details
- Nested flex containers
- 8px base grid system
- Responsive breakpoints at 768px, 1024px, 1440px
</image_analysis>

<development_planning>

1. Project Structure (extend existing):
```
src/
├── components/
│   ├── layout/ (existing)
│   │   ├── Sidebar
│   │   ├── Header
│   │   └── ContentArea
│   ├── features/
│   │   ├── tickets/
│   │   │   ├── TicketThread
│   │   │   ├── CustomerInfo
│   │   │   └── TicketControls
│   │   └── existing-features/
│   └── shared/
```

2. Key Features:
- Real-time ticket updates
- Customer information display
- Tag management system
- Status tracking
- Reply composition with formatting

3. State Management:
```typescript
interface TicketState {
  ticket: {
    id: string
    status: TicketStatus
    customer: CustomerInfo
    messages: Message[]
    assignee: Agent
    metadata: TicketMetadata
  }
  ui: {
    sidebarOpen: boolean
    replyMode: ReplyMode
    activeFilters: Filter[]
  }
}
```

4. Routes (integrate with existing):
```typescript
const ticketRoutes = [
  '/tickets',
  '/tickets/:id',
  '/tickets/:id/history',
]
```

5. Component Architecture:
- TicketContainer (parent)
- TicketList
- TicketDetails
- MessageThread
- CustomerPanel
- ReplyComposer

6. Responsive Breakpoints (maintain existing):
```scss
$breakpoints: (
  'mobile': 320px,
  'tablet': 768px,
  'desktop': 1024px,
  'wide': 1440px
);
```
</development_planning>

IMPORTANT: Please ensure that (1) all KEY COMPONENTS and (2) the LAYOUT STRUCTURE are fully implemented as specified in the requirements. Ensure that the color hex code specified in image_analysis are fully implemented as specified in the requirements.