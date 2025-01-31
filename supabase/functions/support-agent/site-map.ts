export const SITE_MAP: SiteMap = {
  General: [
    {
      title: 'Dashboard',
      description: 'Central hub showcasing key metrics, recent activities, and system alerts',
      path: '/dashboard',
      keywords: ['dashboard', 'metrics', 'alerts']
    },
    {
      title: 'Home',
      description: 'Welcome page with quick links and recent updates',
      path: '/home',
      keywords: ['home', 'main']
    },
    {
      title: 'Inbox',
      description: 'Message center for customer communications',
      path: '/inbox',
      keywords: ['inbox', 'messages']
    },
    {
      title: 'Quote',
      description: 'Shipping quote calculator and request form',
      path: '/quote',
      keywords: ['quote', 'pricing', 'calculator']
    },
    {
      title: 'Analytics',
      description: 'Business and shipping analytics dashboard',
      path: '/analytics',
      keywords: ['analytics', 'reports', 'charts']
    },
    {
      title: 'Shipments',
      description: 'Manage and track your shipments',
      path: '/shipments',
      keywords: ['shipments', 'tracking']
    },
    {
      title: 'Pickup',
      description: 'Schedule and manage pickup requests',
      path: '/pickup',
      keywords: ['pickup', 'requests']
    },
    {
      title: 'Settings',
      description: 'Account and application preferences',
      path: '/settings',
      keywords: ['settings', 'preferences']
    },
    {
      title: 'Search',
      description: 'Global search functionality',
      path: '/search',
      keywords: ['search', 'find']
    },
    {
      title: 'Notifications',
      description: 'System and shipping notifications center',
      path: '/notifications',
      keywords: ['notifications', 'alerts']
    },
    {
      title: 'Upgrade Now',
      description: 'Explore premium features and subscription options',
      path: '/upgrade-now',
      keywords: ['upgrade', 'premium']
    },
    {
      title: 'Profile',
      description: 'User profile management page',
      path: '/profile',
      keywords: ['profile', 'account']
    }
  ],
  Portal: [
    {
      title: 'Help Center',
      description: 'Self-service help center with resources and guides',
      path: '/portal/help-center',
      keywords: ['help', 'faq', 'guides']
    },
    {
      title: 'Knowledge Base',
      description: 'Browse articles covering platform usage and best practices',
      path: '/portal/knowledge-base',
      keywords: ['knowledge', 'articles', 'how-to']
    },
    {
      title: 'Portal Tickets',
      description: 'Create and manage support tickets within the customer portal',
      path: '/portal/tickets',
      keywords: ['tickets', 'support']
    },
    {
      title: 'AI Support',
      description: 'Chat interface with contextual troubleshooting and automated ticket creation',
      path: '/portal/ai-support',
      keywords: ['help', 'troubleshooting', 'chatbot']
    },
    {
      title: 'Contact',
      description: 'Live chat and contact form for support',
      path: '/portal/contact',
      keywords: ['contact', 'chat', 'support']
    }
  ],
  Tickets: [
    {
      title: 'Overview',
      description: 'Main entry point for ticket management',
      path: '/tickets/overview',
      keywords: ['tickets', 'overview']
    },
    {
      title: 'Active Tickets',
      description: 'View and manage currently active tickets',
      path: '/tickets/active',
      keywords: ['tickets', 'active']
    },
    {
      title: 'Ticket Search',
      description: 'Advanced search for tickets',
      path: '/tickets/search',
      keywords: ['tickets', 'search']
    },
    {
      title: 'Queue',
      description: 'Ticket queue and prioritization',
      path: '/tickets/queue',
      keywords: ['tickets', 'queue']
    },
    {
      title: 'Ticket Details',
      description: 'Detailed view and management for individual tickets',
      path: '/tickets/[id]/details',
      keywords: ['ticket', 'details', 'management']
    },
    {
      title: 'Ticket Assignee',
      description: 'Assign tickets to specific agents or teams',
      path: '/tickets/[id]/assignee',
      keywords: ['ticket', 'assignee']
    },
    {
      title: 'Ticket Followers',
      description: 'Manage ticket followers and notifications',
      path: '/tickets/[id]/followers',
      keywords: ['ticket', 'followers']
    },
    {
      title: 'Ticket Tags',
      description: 'Tag management for classification and filtering',
      path: '/tickets/[id]/tags',
      keywords: ['ticket', 'tags']
    },
    {
      title: 'Ticket Type',
      description: 'Set or change ticket type (support, incident, etc.)',
      path: '/tickets/[id]/type',
      keywords: ['ticket', 'type']
    },
    {
      title: 'Ticket Priority',
      description: 'Adjust priority level of a ticket',
      path: '/tickets/[id]/priority',
      keywords: ['ticket', 'priority']
    },
    {
      title: 'Linked Problem',
      description: 'Link tickets to known problems or issues',
      path: '/tickets/[id]/linked-problem',
      keywords: ['ticket', 'problem']
    },
    {
      title: 'Ticket History',
      description: 'View and restore ticket history and snapshots',
      path: '/tickets/[id]/history',
      keywords: ['ticket', 'history']
    }
  ],
  Admin: [
    {
      title: 'Knowledge Admin',
      description: 'Knowledge base management dashboard',
      path: '/admin/knowledge',
      keywords: ['admin', 'knowledge']
    },
    {
      title: 'Articles',
      description: 'Manage articles for the knowledge base',
      path: '/admin/knowledge/articles',
      keywords: ['admin', 'articles']
    },
    {
      title: 'Categories',
      description: 'Organize and manage knowledge base categories',
      path: '/admin/knowledge/categories',
      keywords: ['admin', 'categories']
    },
    {
      title: 'Analytics',
      description: 'Analytics for admin users, includes search analytics',
      path: '/admin/analytics',
      keywords: ['admin', 'analytics']
    },
    {
      title: 'Search Analytics',
      description: 'Dashboard for analyzing search effectiveness',
      path: '/admin/analytics/search',
      keywords: ['admin', 'analytics', 'search']
    },
    {
      title: 'Manage Quotes',
      description: 'Administrative management of quotes',
      path: '/admin/quotes',
      keywords: ['admin', 'quotes']
    },
    {
      title: 'Setup',
      description: 'Initial setup page for administrative tasks',
      path: '/admin/setup',
      keywords: ['admin', 'setup']
    }
  ]
}