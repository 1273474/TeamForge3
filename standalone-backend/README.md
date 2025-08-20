# TeamForge Backend

A real-time collaboration platform backend built with Node.js, Express, Socket.IO, and SQLite.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Google Cloud Console account (for OAuth)
- OpenAI account (optional, for AI features)

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```
Edit `.env` with your configuration.

3. **Initialize database:**
```bash
npm run init-db
```

4. **Start development server:**
```bash
npm run dev
```

The server will run on http://localhost:5000

## 🔧 Environment Variables

Create a `.env` file with these variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=sqlite:./database.sqlite

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Session Secret (generate a strong random string) 
SESSION_SECRET=your-super-secret-session-key-here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI Configuration (optional)
OPENAI_API_KEY=your-openai-api-key

# Frontend URL
FRONTEND_URL=http://localhost:3000

# API URL (for production)
API_URL=https://your-backend-domain.com
```

## 🌐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - Development: `http://localhost:5000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
7. Copy Client ID and Client Secret to your `.env` file

## 📡 API Endpoints

### Authentication
- `GET /api/auth/google/url` - Get Google OAuth URL
- `GET /api/auth/google` - Start Google OAuth flow
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Teams
- `GET /api/teams` - Get user's teams
- `POST /api/teams` - Create new team
- `POST /api/teams/join` - Join team with invite code
- `GET /api/teams/:teamId` - Get team details
- `GET /api/teams/:teamId/members` - Get team members
- `PUT /api/teams/:teamId` - Update team (admin only)
- `DELETE /api/teams/:teamId/leave` - Leave team

### Messages
- `GET /api/messages/:teamId` - Get team messages
- `POST /api/messages/:teamId` - Send message

### Tasks
- `GET /api/tasks/:teamId` - Get team tasks
- `POST /api/tasks/:teamId` - Create new task
- `PUT /api/tasks/:teamId/:taskId` - Update task
- `DELETE /api/tasks/:teamId/:taskId` - Delete task
- `GET /api/tasks/:teamId/:taskId/comments` - Get task comments
- `POST /api/tasks/:teamId/:taskId/comments` - Add task comment

## 🤖 AI Features

The AI assistant supports:
- General coding help and questions
- Conversation summaries (use "summarize" with @ai)
- Code suggestions and repository recommendations
- Project management assistance

## 📡 WebSocket Events

### Client to Server
- `join-team` - Join a team room
- `leave-team` - Leave a team room
- `new-message` - Send new message
- `task-updated` - Task was updated
- `typing-start` - User started typing
- `typing-stop` - User stopped typing
- `status-update` - User status changed

### Server to Client
- `message-received` - New message received
- `task-update-received` - Task was updated
- `user-joined` - User joined team
- `user-left` - User left team
- `user-typing` - User is typing
- `user-stopped-typing` - User stopped typing
- `user-status-changed` - User status changed
- `error` - Error occurred

## 🗄️ Database Schema

The application uses SQLite with the following tables:
- `users` - User accounts
- `teams` - Team information
- `team_members` - Team membership
- `messages` - Chat messages
- `tasks` - Task management
- `task_comments` - Task comments

## 🚀 Production Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name "teamforge-backend"
pm2 startup
pm2 save
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong, random JWT and session secrets
3. Configure HTTPS
4. Set up proper CORS origins
5. Configure your database for production

## 🔒 Security Features

- JWT-based authentication
- Google OAuth integration
- Rate limiting
- CORS protection
- Helmet.js security headers
- Input validation
- SQL injection prevention
- Session management

## 🧪 Testing

```bash
npm test
```

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run init-db` - Initialize database
- `npm test` - Run tests

## 🐛 Troubleshooting

1. **Database errors**: Run `npm run init-db` to recreate tables
2. **OAuth errors**: Check redirect URIs and API keys
3. **CORS errors**: Verify FRONTEND_URL in .env
4. **Socket.IO issues**: Check WebSocket support

## 📞 Support

For issues and questions:
1. Check the logs for error messages
2. Verify all environment variables
3. Ensure dependencies are installed
4. Test each component individually

## 📄 License

MIT License - see LICENSE file for details
