Initialize Next.js in current directory:
```bash
mkdir temp; cd temp; npx create-next-app@latest . -y --typescript --tailwind --eslint --app --use-npm --src-dir --import-alias "@/*" -no --turbo
```

Now let's move back to the parent directory and move all files except prompt.md.

For Windows (PowerShell):
```powershell
cd ..; Move-Item -Path "temp*" -Destination . -Force; Remove-Item -Path "temp" -Recurse -Force
```

For Mac/Linux (bash):
```bash
cd .. && mv temp/* temp/.* . 2>/dev/null || true && rm -rf temp
```

Set up the frontend according to the following prompt:
<frontend-prompt>
Create detailed components with these requirements:
1. Use 'use client' directive for client-side components
2. Make sure to concatenate strings correctly using backslash
3. Style with Tailwind CSS utility classes for responsive design
4. Use Lucide React for icons (from lucide-react package). Do NOT use other UI libraries unless requested
5. Use stock photos from picsum.photos where appropriate, only valid URLs you know exist
6. Configure next.config.js image remotePatterns to enable stock photos from picsum.photos
7. Create root layout.tsx page that wraps necessary navigation items to all pages
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

1. Navigation Elements:
- Left sidebar with: Ticket Details, Assignee, Followers, Tags, Type, Priority, Linked Problem
- Top header with: Ticket title, Add button, Search, Notifications, Grid view, Help
- Secondary navigation: Filter, Timeline, Options menu


2. Layout Components:
- Left sidebar: 300px fixed width
- Main content area: Fluid width (60-70%)
- Right sidebar: 350px fixed width
- Header height: 60px
- Content padding: 16px-24px


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


5. Colors:
- Primary blue: #0052CC
- Secondary gray: #6B778C
- Status colors: Open #DE350B
- Background: #FFFFFF
- Border: #DFE1E6


6. Grid/Layout Structure:
- Three-column layout
- Nested flex containers
- 8px base grid system
- Responsive breakpoints at 768px, 1024px, 1440px
</image_analysis>

<development_planning>

1. Project Structure:
```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar
│   │   ├── Header
│   │   └── ContentArea
│   ├── features/
│   │   ├── TicketThread
│   │   ├── CustomerInfo
│   │   └── TicketControls
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
├── ticket: {
│   ├── id: string
│   ├── status: TicketStatus
│   ├── customer: CustomerInfo
│   ├── messages: Message[]
│   ├── assignee: Agent
│   └── metadata: TicketMetadata
├── }
└── ui: {
├── sidebarOpen: boolean
├── replyMode: ReplyMode
└── activeFilters: Filter[]
}
```


4. Routes:
```typescript
const routes = [
├── '/tickets',
├── '/tickets/:id',
├── '/tickets/:id/history',
└── '/settings/*'
]
```


5. Component Architecture:
- TicketContainer (parent)
- SidebarNavigation
- MessageThread
- CustomerPanel
- ReplyComposer


6. Responsive Breakpoints:
```scss
$breakpoints: (
├── 'mobile': 320px,
├── 'tablet': 768px,
├── 'desktop': 1024px,
└── 'wide': 1440px
);
```
</development_planning>
</frontend-prompt>

IMPORTANT: Please ensure that (1) all KEY COMPONENTS and (2) the LAYOUT STRUCTURE are fully implemented as specified in the requirements. Ensure that the color hex code specified in image_analysis are fully implemented as specified in the requirements.