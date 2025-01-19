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
Customer Support Dashboard with Analytics and Ticket Management
</summary_title>

<image_analysis>

1. Navigation Elements:
- Left sidebar with: Home, Inbox, Quote, Analytics, Shipments, Pickup, Settings
- Top header with: Search, Notifications, Upgrade Now, Profile


2. Layout Components:
- Main container: 100% width
- Left sidebar: 240px width
- Content area: ~calc(100% - 240px)
- Card components: ~400px width with 24px padding
- Table layout: Full width with responsive columns


3. Content Sections:
- Customer Satisfaction metrics
- Ticket Priority visualization
- Ticket Status donut chart
- Page Views statistics
- Geographic distribution map
- Issue tracking table


4. Interactive Controls:
- Filter button for issues
- Date range selector
- View All button
- Table row actions
- Status toggles
- View Report link


5. Colors:
- Primary Blue: #0066FF
- Success Green: #00C853
- Warning Purple: #9C27B0
- Negative Red: #FF4444
- Neutral Gray: #F5F5F5
- Text Dark: #333333


6. Grid/Layout Structure:
- 12-column grid system
- 24px grid gap
- Card layout with 16px internal spacing
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
│   │   └── Dashboard
│   ├── features/
│   │   ├── CustomerSatisfaction
│   │   ├── TicketManagement
│   │   ├── Analytics
│   │   └── GeographicView
│   └── shared/
├── assets/
├── styles/
├── hooks/
└── utils/
```


2. Key Features:
- Real-time ticket tracking
- Customer satisfaction monitoring
- Geographic data visualization
- Performance analytics
- Issue management system


3. State Management:
```typescript
interface AppState {
├── tickets: {
│   ├── current: Ticket[]
│   ├── status: TicketStatus
│   ├── filters: FilterOptions
│   └── statistics: TicketStats
├── analytics: {
│   ├── pageViews: number
│   ├── customers: number
│   ├── satisfaction: SatisfactionMetrics
│   └── regionalData: RegionalStats
├── }
}
```


4. Routes:
```typescript
const routes = [
├── '/dashboard',
├── '/tickets/*',
├── '/analytics/*',
├── '/settings/*',
└── '/profile/*'
]
```


5. Component Architecture:
- DashboardLayout (parent)
- MetricsCard (reusable)
- DataTable (shared)
- ChartComponents (shared)
- MapVisualization (feature)


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