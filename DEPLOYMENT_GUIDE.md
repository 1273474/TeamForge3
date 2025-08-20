# 🚀 TeamForge Standalone Deployment Guide

## Complete Step-by-Step Setup Instructions

### 📋 Prerequisites
- Node.js 18+ installed
- Git installed
- Google Cloud Console account (for OAuth)
- OpenAI account (optional, for AI features)

---

## 🔧 Step 1: Project Setup

### 1.1 Create Project Directory
```bash
mkdir teamforge-standalone
cd teamforge-standalone
```

### 1.2 Set up Backend
```bash
mkdir backend
cd backend

# Copy all backend files from the provided code
# Initialize the project
npm install

# Create environment file
cp .env.example .env
```

### 1.3 Set up Frontend
```bash
cd ..
mkdir frontend
cd frontend

# Copy all frontend files from the provided code
# Initialize the project
npm install
```

---

## 🌐 Step 2: Google OAuth Setup

### 2.1 Create Google OAuth Application
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - Development: `http://localhost:5000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
7. Copy Client ID and Client Secret

### 2.2 Update Environment Variables
Edit `backend/.env`:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=sqlite:./database.sqlite

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

# Session Secret (generate a strong random string)
SESSION_SECRET=your-super-secret-session-key-here-make-it-long-and-random

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-from-step-2.1
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-step-2.1

# OpenAI Configuration (optional)
OPENAI_API_KEY=your-openai-api-key

# Frontend URL
FRONTEND_URL=http://localhost:3000

# API URL (for production)
API_URL=https://your-backend-domain.com
```

### 2.3 Create Frontend Environment File
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
```

---

## 🗄️ Step 3: Database Setup

### 3.1 Initialize Database
```bash
cd backend
npm run init-db
```

This will create the SQLite database with all required tables.

---

## 🚀 Step 4: Development Setup

### 4.1 Start Backend Server
```bash
cd backend
npm run dev
```
Backend will run on http://localhost:5000

### 4.2 Start Frontend Server
```bash
cd frontend
npm run dev
```
Frontend will run on http://localhost:3000

### 4.3 Test the Application
1. Open http://localhost:3000
2. Click "Sign In" button
3. Complete Google OAuth flow
4. You should be redirected to the dashboard

---

## 🌍 Step 5: Production Deployment

### Option A: VPS Deployment (DigitalOcean, Linode, AWS EC2)

#### 5.1 Prepare Production Environment
```bash
# On your server
git clone https://github.com/yourusername/teamforge-standalone.git
cd teamforge-standalone
```

#### 5.2 Backend Deployment
```bash
cd backend
npm install --production

# Update .env for production
NODE_ENV=production
PORT=5000
DATABASE_URL=sqlite:./database.sqlite
FRONTEND_URL=https://your-frontend-domain.com
API_URL=https://your-backend-domain.com
# ... other production values

# Initialize database
npm run init-db

# Start with PM2
npm install -g pm2
pm2 start server.js --name "teamforge-backend"
pm2 startup
pm2 save
```

#### 5.3 Frontend Deployment
```bash
cd frontend

# Update .env.production
VITE_API_URL=https://your-backend-domain.com

# Build for production
npm run build

# Serve with nginx or any static file server
# Copy dist/ folder to your web server
```

#### 5.4 Nginx Configuration
```nginx
# Backend proxy
server {
    listen 80;
    server_name your-backend-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend static files
server {
    listen 80;
    server_name your-frontend-domain.com;
    root /path/to/frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Option B: Heroku Deployment

#### 5.1 Backend on Heroku
```bash
cd backend

# Create Heroku app
heroku create teamforge-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-jwt-secret
heroku config:set SESSION_SECRET=your-session-secret
heroku config:set GOOGLE_CLIENT_ID=your-google-client-id
heroku config:set GOOGLE_CLIENT_SECRET=your-google-client-secret
heroku config:set OPENAI_API_KEY=your-openai-api-key
heroku config:set FRONTEND_URL=https://your-frontend-app.vercel.app

# Add Heroku Postgres (optional, or keep SQLite)
heroku addons:create heroku-postgresql:hobby-dev

# Deploy
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

#### 5.2 Frontend on Vercel/Netlify
```bash
cd frontend

# Build command: npm run build
# Output directory: dist
# Environment variable: VITE_API_URL=https://teamforge-backend.herokuapp.com
```

### Option C: Docker Deployment

#### 5.3 Create Docker Files

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-jwt-secret
      - SESSION_SECRET=your-session-secret
      - GOOGLE_CLIENT_ID=your-google-client-id
      - GOOGLE_CLIENT_SECRET=your-google-client-secret
      - FRONTEND_URL=http://localhost:3000
    volumes:
      - ./backend/database.sqlite:/app/database.sqlite

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=http://localhost:5000
    depends_on:
      - backend
```

---

## 🔒 Step 6: Security Considerations

### 6.1 Generate Strong Secrets
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 6.2 HTTPS Setup
- Use Let's Encrypt for free SSL certificates
- Configure nginx or your hosting provider for HTTPS
- Update OAuth redirect URLs to use HTTPS

### 6.3 Environment Security
- Never commit `.env` files
- Use environment variables in production
- Rotate secrets regularly

---

## 📝 Step 7: Customization

### 7.1 Branding
- Update `teamforge` to your app name in all files
- Change colors in `tailwind.config.js`
- Replace logos and icons
- Update meta tags in `index.html`

### 7.2 Features
- Modify database schema in `backend/src/models/`
- Add new API routes in `backend/src/routes/`
- Create new React components in `frontend/src/components/`

---

## 🐛 Troubleshooting

### Common Issues:

1. **Google OAuth not working**
   - Check redirect URIs match exactly
   - Verify environment variables are set
   - Check Google Cloud Console APIs are enabled

2. **Database errors**
   - Ensure SQLite file has write permissions
   - Run `npm run init-db` to recreate tables

3. **CORS errors**
   - Check FRONTEND_URL in backend .env
   - Verify API_URL in frontend .env

4. **Real-time features not working**
   - Check Socket.IO connection in browser dev tools
   - Verify WebSocket support on hosting platform

---

## 🎉 Success!

Your TeamForge application should now be running independently! You can:
- Create teams and invite members
- Chat in real-time
- Manage tasks with Kanban boards
- Use AI assistance with @ai mentions
- Assign/remove tasks via chat with @username

---

## 📞 Support

If you encounter any issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Test each component individually (auth, database, API)

This is now your independent TeamForge application - you own and control everything!
