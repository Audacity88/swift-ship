export const COLORS = {
  primary: '#0066FF',
  success: '#00C853',
  warning: '#9C27B0',
  negative: '#FF4444',
  neutral: '#F5F5F5',
  textDark: '#333333',
} as const

export const ROUTES = {
  dashboard: '/',
  home: '/home',
  inbox: '/inbox',
  quote: '/quote',
  analytics: '/analytics',
  shipments: '/shipments',
  pickup: '/pickup',
  search: '/search',
  notifications: '/notifications',
  upgrade: '/upgrade-now',
  profile: '/profile',
  tickets: '/tickets',
  settings: {
    root: '/settings',
    teams: '/settings/teams',
  },
  portal: {
    home: '/portal',
    welcome: '/portal/welcome',
    tickets: '/portal/tickets',
    articles: '/portal/articles',
    profile: '/portal/profile',
  },
  auth: {
    signin: '/auth/signin',
    signup: '/auth/signup',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  admin: {
    knowledge: '/admin/knowledge',
  }
} as const 