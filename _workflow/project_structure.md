# Project Structure Documentation

This document outlines the structure and organization of the Zendesk Clone project.

## Directory Structure

```
/
├── src/                    # Source code
│   ├── app/               # Next.js 13+ App Router pages and layouts
│   ├── components/        # React components
│   ├── lib/              # Utility functions and constants
│   ├── types/            # TypeScript type definitions
│   └── middleware.ts     # Next.js middleware for auth etc.
├── public/                # Static files
│   └── default-avatar.png # Default user avatar
├── _workflow/             # Project documentation and workflows
├── .next/                 # Next.js build output (generated)
├── node_modules/         # Dependencies (generated)
└── config files          # Various configuration files:
    ├── .env.local        # Environment variables
    ├── .gitignore        # Git ignore rules
    ├── components.json   # Shadcn UI configuration
    ├── next.config.ts    # Next.js configuration
    ├── package.json      # Project dependencies and scripts
    ├── postcss.config.mjs # PostCSS configuration
    ├── tailwind.config.ts # Tailwind CSS configuration
    ├── tsconfig.json     # TypeScript configuration
    └── eslint.config.mjs # ESLint configuration
```

## Configuration Files

### Build and Development
- `next.config.ts`: Next.js configuration including build settings and environment variables
- `tsconfig.json`: TypeScript compiler configuration
- `package.json`: Project metadata, dependencies, and scripts
- `components.json`: Shadcn UI component configuration

### Styling
- `tailwind.config.ts`: Tailwind CSS configuration including theme customization
- `postcss.config.mjs`: PostCSS plugins configuration (used by Tailwind)

### Code Quality
- `eslint.config.mjs`: ESLint rules and plugins for code linting
- `.gitignore`: Specifies which files Git should ignore

### Environment
- `.env.local`: Local environment variables (not committed to Git)
- `.env.example`: Example environment variables template

## Key Directories and Files

### `/src/app`

The main application directory using Next.js 13+ App Router. Each subdirectory represents a route in the application.

- `/api`: Server-side API routes
- `/tickets`: Ticket management pages and functionality
  - `[id]/`: Individual ticket view and management
  - `overview/`: Tickets overview and listing
  - `active/`: Active tickets view
  - `search/`: Ticket search functionality
- `/settings`: Application configuration pages
- `/notifications`: Notification center
- `/analytics`: Reporting and analytics dashboards

### `/src/components`

React components organized by their purpose and scope.

#### `/features`
Feature-specific components that implement business logic:
- `tickets/`: Ticket-related components (TicketList, TicketDetails, etc.)
- `custom-fields/`: Custom field components
- `audit/`: Audit log components
- `tags/`: Tag management components

#### `/ui`
Reusable UI components following the Shadcn UI pattern:
- `button.tsx`
- `input.tsx`
- `select.tsx`
- `dropdown-menu.tsx`
- etc.

#### `/layout`
Layout-related components:
- `Sidebar.tsx`
- `Header.tsx`
- `Navigation.tsx`

### `/src/lib`

Utility functions, constants, and shared logic:
- `constants.ts`: Application-wide constants
- `utils.ts`: Utility functions
- `api.ts`: API client functions

### `/src/types`

TypeScript type definitions:
- `ticket.ts`: Ticket-related types
- `user.ts`: User and authentication types
- `custom-field.ts`: Custom field types

## Component Organization

Components are organized following these principles:

1. **Feature Components**: Business logic components in `/features`
2. **UI Components**: Reusable UI elements in `/ui`
3. **Layout Components**: Page structure components in `/layout`

## Routing Structure

The application uses Next.js App Router with the following main routes:

- `/`: Home page
- `/tickets`: Ticket management
  - `/tickets/[id]`: Individual ticket view
  - `/tickets/overview`: Tickets overview
  - `/tickets/active`: Active tickets
- `/settings`: Settings pages
- `/analytics`: Analytics dashboard
- `/notifications`: Notification center

## State Management

- React's built-in state management with `useState` and `useEffect`
- Server state managed through API routes
- Form state handled with controlled components

## API Structure

API routes are organized under `/src/app/api`:

- `/tickets`: Ticket management endpoints
- `/users`: User management endpoints
- `/custom-fields`: Custom field configuration
- `/analytics`: Analytics data endpoints

## Styling

The project uses:
- Tailwind CSS for styling
- CSS Modules for component-specific styles
- Shadcn UI components for consistent design

## Best Practices

1. **Component Organization**
   - One component per file
   - Clear separation of concerns
   - Reusable components in `/ui`

2. **Naming Conventions**
   - PascalCase for components
   - camelCase for functions and variables
   - kebab-case for CSS classes

3. **Code Structure**
   - Imports organized by type
   - Props interfaces defined at top of file
   - Consistent use of TypeScript

4. **State Management**
   - Local state for UI
   - API calls for server state
   - Clear data flow patterns
