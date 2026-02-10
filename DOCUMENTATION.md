# PACFU Hub - Project Documentation

## Overview

PACFU Hub is a comprehensive faculty management portal built for Pampanga State Agricultural University (PSAU). It serves as a centralized platform for managing faculty members, announcements, documents, communications, polls, elections, and financial records.

---

## Technology Stack

### Frontend Core
- **React 18.3.1** - UI library for building component-based interfaces
- **TypeScript 5.8.3** - Type-safe JavaScript superset
- **Vite 5.4.19** - Fast build tool and development server

### UI Framework & Styling
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Radix UI** - Unstyled, accessible UI components (20+ primitives)
- **Shadcn/ui** - Re-usable component library built on Radix UI
- **Lucide React 0.462.0** - Icon library
- **Class Variance Authority (CVA) 0.7.1** - Component variants management
- **Tailwind Merge** - Utility function for merging Tailwind classes

### State Management & Data Fetching
- **React Context API** - For global state (Auth, Faculty, Mobile)
- **TanStack Query (React Query) 5.83.0** - Server state management

### Routing
- **React Router DOM 6.30.1** - Client-side routing

### Forms & Validation
- **React Hook Form 7.61.1** - Form management
- **Zod 3.25.76** - Schema validation
- **@hookform/resolvers** - Zod resolvers for React Hook Form

### Backend Services
- **Firebase** - Authentication and Firestore database
- **Supabase** - Database for documents storage
- **Express.js** - Node.js server for file uploads
- **Resend** - Email sending service (Supabase Edge Function)

### Additional Libraries
- **date-fns 3.6.0** - Date manipulation
- **Recharts 2.15.4** - Data visualization/charts
- **jsPDF 4.0.0 + jsPDF-AutoTable 5.0.7** - PDF generation
- **JSZip 3.10.1** - ZIP file handling
- **Sonner 1.7.4** - Toast notifications
- **Embla Carousel 8.6.0** - Touch-friendly carousel

---

## Project Structure

```
pacfu-hub/
├── public/                 # Static assets
│   ├── uploads/           # User uploaded files
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── psau-logo.png
├── src/
│   ├── components/
│   │   ├── ui/           # Shadcn/ui base components
│   │   ├── layout/       # Layout components (Sidebar, DashboardLayout)
│   │   ├── dashboard/    # Dashboard-specific components
│   │   ├── announcements/# Announcement management
│   │   ├── documents/    # Document management
│   │   ├── messages/     # Chat/messaging components
│   │   ├── polls/        # Poll/voting components
│   │   ├── elections/    # Election management
│   │   ├── faculty/      # Faculty management
│   │   ├── finance/      # Financial records
│   │   ├── profile/      # User profile
│   │   └── messages/      # Chat components
│   ├── contexts/         # React Context providers
│   │   ├── AuthContext.tsx    # Authentication state
│   │   ├── FacultyContext.tsx # Faculty data state
│   │   └── MobileContext.tsx  # Mobile responsiveness
│   ├── hooks/            # Custom React hooks
│   │   ├── use-mobile.tsx
│   │   ├── useToast.ts
│   │   ├── useChat.ts
│   │   ├── useDashboardData.ts
│   │   └── useDocumentSelection.ts
│   ├── integrations/     # Third-party service configs
│   │   └── supabase/     # Supabase client & types
│   ├── lib/
│   │   ├── firebase.ts   # Firebase initialization
│   │   └── utils.ts      # Utility functions (cn class merger)
│   ├── pages/            # Route components
│   │   ├── Index.tsx     # Landing page
│   │   ├── Login.tsx    # Authentication page
│   │   ├── Dashboard.tsx # Main dashboard
│   │   ├── Announcements.tsx
│   │   ├── Messages.tsx
│   │   ├── Documents.tsx
│   │   ├── Polls.tsx
│   │   ├── Elections.tsx
│   │   ├── CreateElection.tsx
│   │   ├── Faculty.tsx
│   │   ├── Finance.tsx
│   │   ├── Logs.tsx
│   │   ├── SharedFile.tsx
│   │   ├── NotFound.tsx
│   │   └── api/          # API routes (Express)
│   ├── services/         # API/service layer
│   │   ├── authService.ts
│   │   ├── announcementService.ts
│   │   ├── chatService.ts
│   │   ├── documentService.ts
│   │   ├── electionService.ts
│   │   ├── facultyService.ts
│   │   ├── financeService.ts
│   │   ├── groupService.ts
│   │   ├── logService.ts
│   │   ├── messageFileService.ts
│   │   └── pollService.ts
│   ├── types/            # TypeScript type definitions
│   │   ├── announcement.ts
│   │   ├── auth.ts
│   │   ├── chat.ts
│   │   ├── document.ts
│   │   ├── election.ts
│   │   ├── faculty.ts
│   │   ├── finance.ts
│   │   └── poll.ts
│   ├── App.tsx           # Root component with providers
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles & design system
├── supabase/
│   └── functions/        # Supabase Edge Functions
│       └── send-announcement-email/
├── server.js             # Express server for file uploads
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies
```

---

## Design System

### Color Palette
The project uses a **green-themed** design system representing growth and nature:

```css
/* Primary - Modern Green */
--primary: 142 71% 30%;
--primary-foreground: 142 72% 96%;

/* Accent - Emerald */
--accent: 160 84% 39%;
--accent-foreground: 0 0% 100%;

/* Status Colors */
--success: 142 71% 45%;
--warning: 38 92% 50%;
--destructive: 0 72% 51%;

/* Sidebar - Deep Green */
--sidebar-background: 142 50% 22%;
--sidebar-foreground: 140 25% 92%;
```

### Typography
- **Sans-serif**: Inter (body text)
- **Display**: Playfair Display (headings)

### Border Radius
- Default: `0.625rem` (10px)
- Rounded corners for cards and components

---

## Authentication System

### Technology
- **Firebase Authentication** - Email/password auth
- **Firebase Firestore** - User data storage

### User Roles
1. **Admin** - Full system access
   - Manage faculty members
   - View financial records
   - Access activity logs
   - Create announcements

2. **Faculty** - Limited access
   - View announcements
   - Participate in polls/elections
   - Access documents
   - Chat in groups

### Auth Flow
1. User logs in with email/password
2. Firebase validates credentials
3. System fetches user data from Firestore
4. Checks `isActive` status
5. Redirects based on role

---

## Database Schema

### Firebase Firestore Collections

**users/** - User accounts
```
{
  id: string
  email: string
  name: string
  role: 'admin' | 'faculty'
  avatar?: string
  isActive: boolean
  department?: string
  position?: string
  groups?: string[]
  createdAt: Date
}
```

**announcements/** - System announcements
```
{
  id: string
  title: string
  content: string
  category: 'general' | 'urgent' | 'event' | 'academic'
  author: string
  authorId: string
  createdAt: Date
  expiresAt?: Date
}
```

**polls/** - Polls and surveys
```
{
  id: string
  question: string
  options: { id, text, votes }
  createdBy: string
  endDate: Date
  isActive: boolean
}
```

**elections/** - Election management
```
{
  id: string
  title: string
  positions: { name, candidates }
  startDate: Date
  endDate: Date
  isActive: boolean
}
```

**logs/** - Activity logs (admin only)
```
{
  id: string
  action: string
  userId: string
  userName: string
  details: string
  timestamp: Date
}
```

### Supabase Tables

**documents/** - File storage metadata
```
{
  id: string
  name: string
  type: 'file' | 'folder'
  mime_type: string
  size: number
  size_formatted: string
  storage_path: string
  created_by: string
  created_by_name: string
  parent_id: string (nullable)
  shared: boolean
  created_at: string
  updated_at: string
}
```

---

## Features

### 1. Dashboard
- **Admin View**: Announcements count, active polls/elections, net balance
- **Faculty View**: My groups, active chats, pending polls/elections
- Recent activity feed
- Quick actions panel

### 2. Announcements
- Create, edit, delete announcements
- Categories: General, Urgent, Event, Academic
- Email notifications via Resend

### 3. Messages (Chat)
- Real-time messaging via Firebase
- Direct and group chats
- File attachments
- Message search

### 4. Documents
- File upload/download
- Folder management
- Share links with expiration
- Preview support for images/PDFs

### 5. Polls & Surveys
- Create polls with multiple options
- Real-time vote tracking
- Poll results visualization

### 6. Elections
- Create elections with positions
- Add candidates per position
- Voting mechanism

### 7. Faculty Management (Admin)
- Create/edit/delete faculty accounts
- Assign departments and positions
- Group assignments
- Active/inactive status toggle

### 8. Financial Records (Admin)
- Add/edit financial records
- Generate PDF reports
- Track income/expenses
- Category filtering

### 9. Activity Logs (Admin)
- Track all system actions
- Filter by user/action type
- Audit trail for compliance

---

## API Endpoints

### Express Server (Port 3001)

**POST /api/upload**
- Upload file with multer
- Returns file path and download URL
- Max file size: 50MB

**POST /api/delete-file**
- Delete uploaded files
- Requires filePath in body

### Supabase Edge Functions

**send-announcement-email**
- Sends email notifications for announcements
- CORS-protected to allowed origins
- XSS protection with HTML escaping

---

## Configuration

### Environment Variables

```env
# Firebase (Authentication & Firestore)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Supabase (Documents Storage)
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...

# Admin Account
VITE_ADMIN_EMAIL=admin@pacfu.psau.edu
VITE_ADMIN_PASSWORD=...
VITE_ADMIN_NAME=System Administrator
```

### Vite Config
- Port: 8080
- HMR enabled
- Path aliases: `@` → `./src`
- Development mode tagging with lovable-tagger

---

## Development Commands

```bash
# Install dependencies
npm install

# Development (frontend only)
npm run dev

# Development (frontend + backend)
npm run dev:all

# Build for production
npm run build

# Build in development mode
npm run build:dev

# Start production server
npm run server
```

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## Security Features

1. **Authentication**: Firebase Auth with session management
2. **Authorization**: Role-based access control (Admin vs Faculty)
3. **XSS Protection**: HTML escaping in email templates
4. **CORS**: Restricted origins for API endpoints
5. **Input Validation**: Zod schema validation
6. **File Upload Limits**: 50MB max file size

---

## Performance Optimizations

1. **React Query**: Caching and background refetching
2. **Lazy Loading**: Components loaded on demand
3. **Code Splitting**: Vite handles chunk optimization
4. **Image Optimization**: Compressed images, lazy loading
5. **Debouncing**: Search input throttling

---

## License

Internal project for Pampanga State Agricultural University (PSAU)
