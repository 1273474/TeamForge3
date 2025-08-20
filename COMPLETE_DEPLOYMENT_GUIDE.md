# 🚀 Complete TeamForge Standalone Deployment Guide

This is your complete guide to deploy TeamForge as a standalone application that you own and control entirely.

## 📦 What You're Getting

A complete team collaboration platform with:
- **Real-time chat** with AI assistant (@ai mentions)
- **Task management** with Kanban boards
- **Smart task assignment** via @username mentions in chat
- **Team management** with invite codes
- **Google OAuth authentication**
- **Socket.IO real-time updates**
- **Modern React frontend** with Tailwind CSS
- **Node.js/Express backend** with SQLite database

## 🗂️ Project Structure

```
teamforge-standalone/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── database/       # Database setup and connection
│   │   ├── middleware/     # Authentication middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # AI service
│   │   └── sockets/        # Socket.IO handlers
│   ├── server.js           # Main server file
│   ├── package.json        # Backend dependencies
│   └── .env.example        # Environment template
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── utils/          # Utilities
│   ├── package.json        # Frontend dependencies
│   └── .env.example        # Environment template
└── README.md              # This file
```

## 🔧 Step 1: Initial Setup

### 1.1 Create Project Directory
```bash
mkdir teamforge-standalone
cd teamforge-standalone
```

### 1.2 Set up Backend
```bash
# Copy the backend files I provided
mkdir backend
cd backend

# Copy all files from standalone-backend/ folder
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

# Copy all files from standalone-frontend/ folder
# Initialize the project
npm install

# Create environment file
cp .env.example .env
```

## 🌐 Step 2: Google OAuth Setup

### 2.1 Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized redirect URIs:
     - Development: `http://localhost:5000/api/auth/google/callback`
     - Production: `https://your-backend-domain.com/api/auth/google/callback`
5. Copy Client ID and Client Secret

### 2.2 Configure Backend Environment

Edit `backend/.env`:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=sqlite:./database.sqlite

# JWT Secret (generate a strong random string - see below)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

# Session Secret (generate a strong random string - see below)
SESSION_SECRET=your-super-secret-session-key-here-make-it-long-and-random

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-from-step-2.1
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-step-2.1

# OpenAI Configuration (optional, for AI features)
OPENAI_API_KEY=your-openai-api-key

# Frontend URL
FRONTEND_URL=http://localhost:3000

# API URL (for production)
API_URL=http://localhost:5000
```

### 2.3 Configure Frontend Environment

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_NODE_ENV=development
```

### 2.4 Generate Strong Secrets

Run this command to generate secure secrets:
```bash
# Generate JWT secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate session secret
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

Copy these into your `.env` file.

## 🗄️ Step 3: Database Setup

Initialize the SQLite database:
```bash
cd backend
npm run init-db
```

This creates `database.sqlite` with all required tables.

## 🚀 Step 4: Development Setup

### 4.1 Start Backend Server
```bash
cd backend
npm run dev
```
Backend runs on http://localhost:5000

### 4.2 Start Frontend Server
```bash
cd frontend
npm run dev
```
Frontend runs on http://localhost:3000

### 4.3 Test the Application
1. Open http://localhost:3000
2. Click "Sign In" → Complete Google OAuth
3. Create a team or join with invite code
4. Test chat, tasks, and AI features

## 🌍 Step 5: Production Deployment

### Option A: VPS Deployment (Recommended)

#### 5.1 Server Setup (Ubuntu/Debian)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

#### 5.2 Deploy Backend
```bash
# Upload your code to server
git clone https://github.com/yourusername/teamforge-standalone.git
cd teamforge-standalone/backend

# Install dependencies
npm install --production

# Create production environment
cp .env.example .env
# Edit with production values:
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com
API_URL=https://your-backend-domain.com
# ... other values

# Initialize database
npm run init-db

# Start with PM2
pm2 start server.js --name "teamforge-backend"
pm2 startup
pm2 save
```

#### 5.3 Deploy Frontend
```bash
cd ../frontend

# Install dependencies
npm install

# Create production environment
cp .env.example .env
# Edit with:
VITE_API_URL=https://your-backend-domain.com
VITE_NODE_ENV=production

# Build for production
npm run build

# Copy to web server
sudo cp -r dist/* /var/www/teamforge/
```

#### 5.4 Configure Nginx

Create `/etc/nginx/sites-available/teamforge`:
```nginx
# Backend API server
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
    root /var/www/teamforge;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/teamforge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5.5 SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-frontend-domain.com -d your-backend-domain.com
```

### Option B: Heroku Deployment

#### 5.1 Backend on Heroku
```bash
cd backend

# Create Heroku app
heroku create teamforge-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-generated-jwt-secret
heroku config:set SESSION_SECRET=your-generated-session-secret
heroku config:set GOOGLE_CLIENT_ID=your-google-client-id
heroku config:set GOOGLE_CLIENT_SECRET=your-google-client-secret
heroku config:set OPENAI_API_KEY=your-openai-api-key
heroku config:set FRONTEND_URL=https://your-frontend-app.vercel.app

# Deploy
git init
git add .
git commit -m "Initial deployment"
heroku git:remote -a teamforge-backend
git push heroku main
```

#### 5.2 Frontend on Vercel

1. Connect your repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_API_URL=https://teamforge-backend.herokuapp.com`

### Option C: Docker Deployment

#### 5.3 Create Docker Files

**backend/Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

**frontend/Dockerfile:**
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**docker-compose.yml:**
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

Deploy with:
```bash
docker-compose up -d
```

## 🔒 Step 6: Security & Performance

### 6.1 Security Checklist
- ✅ Strong JWT and session secrets
- ✅ HTTPS enabled (production)
- ✅ Updated OAuth redirect URLs
- ✅ Environment variables secured
- ✅ Database file permissions
- ✅ Rate limiting enabled
- ✅ CORS properly configured

### 6.2 Performance Optimization
- Enable Nginx gzip compression
- Configure static asset caching
- Monitor with PM2 logs
- Set up log rotation
- Regular database backups

### 6.3 Monitoring
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs teamforge-backend

# Restart if needed
pm2 restart teamforge-backend
```

## 📝 Step 7: Customization

### 7.1 Branding
- Update app name in `package.json` files
- Change colors in `tailwind.config.js`
- Replace favicon in `public/favicon.svg`
- Update meta tags in `index.html`

### 7.2 Features
- Add new API routes in `backend/src/routes/`
- Create new React components in `frontend/src/components/`
- Modify database schema in `backend/src/database/`

## 🐛 Troubleshooting

### Common Issues:

1. **Google OAuth not working**
   - ✅ Check redirect URIs match exactly (including http/https)
   - ✅ Verify environment variables are set
   - ✅ Ensure Google+ API is enabled

2. **Database errors**
   - ✅ Run `npm run init-db` to recreate tables
   - ✅ Check database file permissions
   - ✅ Verify SQLite is working

3. **CORS errors**
   - ✅ Check FRONTEND_URL in backend .env
   - ✅ Verify API_URL in frontend .env
   - ✅ Ensure ports match

4. **Socket.IO not working**
   - ✅ Check WebSocket support on hosting platform
   - ✅ Verify real-time features in browser dev tools
   - ✅ Test Socket.IO connection manually

5. **AI features not working**
   - ✅ Verify OPENAI_API_KEY is set
   - ✅ Check OpenAI account has credits
   - ✅ Test API key manually

### Debug Commands:
```bash
# Check backend logs
cd backend && npm run dev

# Check frontend logs
cd frontend && npm run dev

# Test database
node -e "const db = require('./src/database/connection'); db.all('SELECT * FROM users', console.log)"

# Test API
curl http://localhost:5000/api/health
```

## 🎉 Success!

Your TeamForge application is now running independently! You can:

- ✅ Create teams and invite members
- ✅ Chat in real-time with your team
- ✅ Use AI assistance with @ai mentions
- ✅ Assign tasks via @username mentions in chat
- ✅ Manage tasks with Kanban boards
- ✅ Remove tasks with "remove task @username"
- ✅ Get conversation summaries from AI

## 📞 Support

If you encounter issues:
1. Check the logs for error messages
2. Verify all environment variables are set
3. Test each component individually
4. Check the troubleshooting section above

## 🚀 Next Steps

Consider these enhancements:
- Add email notifications
- Implement file sharing
- Add video chat integration
- Create mobile apps
- Add more AI features
- Implement advanced permissions

**You now own and control a complete team collaboration platform!** 🎊
