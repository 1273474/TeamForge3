# TeamForge Frontend

A modern React frontend for the TeamForge collaboration platform.

## 🚀 Features

- **Modern UI**: Built with React 18 and Tailwind CSS
- **Real-time Communication**: Socket.IO integration for live updates
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Google OAuth**: Secure authentication
- **Dark Theme**: Beautiful dark interface with purple/pink gradients
- **Task Management**: Kanban-style board for project management
- **AI Assistant**: Chat with AI for help and summaries

## 📋 Prerequisites

- Node.js 18+ installed
- Backend server running (see backend README)

## 🔧 Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```
Edit `.env` with your configuration:

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_NODE_ENV=development
```

3. **Start development server:**
```bash
npm run dev
```

The app will run on http://localhost:3000

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## 📁 Project Structure

```
src/
├── components/         # Reusable React components
│   ├── ChatPanel.jsx   # Real-time chat interface
│   ├── TaskBoard.jsx   # Kanban task management
│   └── ProtectedRoute.jsx
├── contexts/           # React context providers
│   ├── AuthContext.jsx    # Authentication state
│   └── SocketContext.jsx  # Socket.IO connection
├── pages/              # Page components
│   ├── Home.jsx        # Landing page
│   ├── Dashboard.jsx   # Team dashboard
│   ├── Team.jsx        # Team workspace
│   ├── AuthSuccess.jsx # OAuth success
│   └── AuthFailed.jsx  # OAuth error
├── utils/              # Utility functions
│   └── api.js          # Axios API client
├── App.jsx             # Main app component
├── main.jsx            # App entry point
└── index.css           # Global styles
```

## 🎨 UI Components

### ChatPanel
- Real-time messaging
- AI assistant integration (@ai mentions)
- Task assignment via @username
- Message formatting (code blocks, mentions)
- Typing indicators
- Message history

### TaskBoard
- Kanban-style columns (To Do, In Progress, Done)
- Drag-and-drop task management
- Task creation and editing
- Priority levels and due dates
- Team member assignment
- Real-time updates

### Authentication
- Google OAuth integration
- Secure token storage
- Protected routes
- User session management

## 🔌 API Integration

The frontend communicates with the backend through:

- **REST API**: CRUD operations for teams, tasks, messages
- **Socket.IO**: Real-time updates and notifications
- **Authentication**: JWT tokens with automatic refresh

### API Endpoints Used

```javascript
// Authentication
GET /api/auth/google/url
GET /api/auth/me
POST /api/auth/logout

// Teams
GET /api/teams
POST /api/teams
POST /api/teams/join
GET /api/teams/:id/members

// Messages
GET /api/messages/:teamId
POST /api/messages/:teamId

// Tasks
GET /api/tasks/:teamId
POST /api/tasks/:teamId
PUT /api/tasks/:teamId/:taskId
DELETE /api/tasks/:teamId/:taskId
```

## 📡 Real-time Features

### Socket.IO Events

**Outgoing:**
- `join-team` - Join team room
- `leave-team` - Leave team room
- `new-message` - Send message
- `task-updated` - Task changed
- `typing-start/stop` - Typing indicators

**Incoming:**
- `message-received` - New message
- `task-update-received` - Task updated
- `user-joined/left` - Team member activity
- `user-typing` - Someone is typing

## 🎯 Key Features

### Chat System
- **@ai mentions**: Get AI assistance and summaries
- **@username mentions**: Assign tasks directly in chat
- **Task removal**: "remove task @username description"
- **Code formatting**: Syntax highlighting for code blocks
- **Real-time updates**: Instant message delivery

### Task Management
- **Smart assignment**: Tasks created via chat mentions
- **Status tracking**: Visual kanban board
- **Due dates**: Automatic date parsing from natural language
- **Priority levels**: Visual priority indicators
- **Team collaboration**: Assign tasks to any team member

### Team Management
- **Create teams**: Generate invite codes automatically
- **Join teams**: Simple invite code system
- **Member management**: View team members and roles
- **Admin controls**: Team settings and member management

## 🎨 Styling

- **Tailwind CSS**: Utility-first styling
- **Custom components**: Reusable UI patterns
- **Dark theme**: Purple/pink gradient design
- **Responsive**: Mobile-first approach
- **Animations**: Smooth transitions and hover effects

### Custom CSS Classes

```css
.btn-primary     /* Primary button styling */
.btn-secondary   /* Secondary button styling */
.card           /* Card container styling */
.input-field    /* Form input styling */
.text-gradient  /* Gradient text effect */
```

## 🔒 Security

- **JWT tokens**: Secure authentication
- **Protected routes**: Login required for app features
- **CORS handling**: Proper cross-origin configuration
- **Input validation**: Client-side form validation
- **XSS protection**: Safe HTML rendering

## 📱 Mobile Support

- **Responsive design**: Works on all screen sizes
- **Touch-friendly**: Optimized for mobile interaction
- **Progressive Web App**: Can be installed on mobile devices

## 🚀 Production Build

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder:

- **Code splitting**: Vendor and app bundles
- **Minification**: Compressed JavaScript and CSS
- **Asset optimization**: Optimized images and fonts
- **Tree shaking**: Remove unused code

## 🌐 Deployment

### Static Hosting (Vercel, Netlify)
```bash
npm run build
# Upload dist/ folder
```

### Docker
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
```

### Environment Variables
- `VITE_API_URL`: Backend API URL
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID
- `VITE_NODE_ENV`: Environment (development/production)

## 🐛 Troubleshooting

1. **API connection issues**: Check VITE_API_URL in .env
2. **OAuth not working**: Verify Google client ID
3. **Socket.IO issues**: Check backend WebSocket support
4. **Build errors**: Clear node_modules and reinstall

## 📄 License

MIT License - see LICENSE file for details
