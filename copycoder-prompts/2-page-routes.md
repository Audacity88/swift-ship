Set up the page structure according to the following prompt:
   
<page-structure-prompt>
Next.js route structure based on navigation menu items (excluding main route). Make sure to wrap all routes with the component:

Routes:
- /home
- /inbox
- /quote
- /analytics
- /shipments
- /pickup
- /settings
- /search
- /notifications
- /upgrade-now
- /profile

Page Implementations:
/home:
Core Purpose: Dashboard overview showing key metrics and recent activities
Key Components
- Activity feed
- Quick action buttons
- Statistics cards
- Recent shipments widget
- News

/updates section
Layout Structure:
- Grid layout with responsive cards
- Sidebar for quick navigation
- Top header with search and notifications

/inbox:
Core Purpose: Message center for customer communications
Key Components
- Message list
- Conversation view
- Filter options
- Quick reply templates
- Contact information
Layout Structure
- Split view (list + detail)
- Collapsible sidebar on mobile
- Floating action button for new message

/quote:
Core Purpose: Shipping quote calculator and request form
Key Components
- Quote calculator form
- Package details input
- Destination selector
- Price comparison table
- Booking button
Layout Structure
- Multi-step form layout
- Progress indicator
- Sticky summary sidebar

/analytics:
Core Purpose: Detailed shipping and business metrics
Key Components
- Data visualization charts
- Metric cards
- Date range selector
- Export functionality
- Filter controls
Layout Structure
- Dashboard grid
- Responsive chart containers
- Collapsible filter panel

/shipments:
Core Purpose: Shipment management and tracking
Key Components
- Shipment list

/filter options
- Bulk actions
- Tracking details
Layout Structure:
- Table view with list alternative
- Detail drawer

/pickup:
Core Purpose: Schedule and manage pickup requests
Key Components
- Pickup request form
- Calendar view
- Address selector
- Time slot picker
- Status tracker
Layout Structure
- Split view (calendar + form)
- Timeline view for mobile
- Location map

/settings:
Core Purpose: Account and application preferences
Key Components
- Settings categories
- Form controls
- Save

/reset buttons
- Profile information
Layout Structure:
- Category sidebar
- Main content area
- Responsive tabs on mobile

/search:
Core Purpose: Global search functionality
Key Components
- Search input
- Filters
- Results list
- Quick actions
Layout Structure
- Full-width search bar
- Results grid

/notifications:
Core Purpose: System and shipping notifications center
Key Components
- Notification list
- Filter options
- Mark as read

/unread
- Notification preferences
Layout Structure:
- Chronological list
- Category tabs
- Action toolbar

/upgrade-now:
Core Purpose: Premium features and subscription management
Key Components
- Plan comparison
- Feature list
- Pricing cards
- Payment form
Layout Structure
- Pricing grid
- Feature comparison table
- Checkout flow

/profile:
Core Purpose: User profile management
Key Components
- Profile information form
- Avatar upload
- Security settings
- Preferences
Layout Structure
- Profile header
- Tab-based sections
- Mobile-first form layout

Layouts:
DashboardLayout:
- Applicable routes: All except /upgrade-now
- Core components
  - Navigation sidebar
  - Header with search/notifications
  - User menu
  - Content area
- Responsive behavior
  - Collapsible sidebar on mobile
  - Stack navigation on small screens
  - Adjustable content width

AuthLayout
- Applicable routes: /upgrade-now
- Core components
  - Logo
  - Main content area
  - Footer
- Responsive behavior
  - Centered content
  - Full-width on mobile
  - Flexible height adjustment
</page-structure-prompt>