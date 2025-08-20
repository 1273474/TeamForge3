# TeamForge Standalone Setup Guide

## 🚀 Complete Standalone Deployment Guide

This guide will help you create a fully independent version of TeamForge that you can deploy anywhere without any external dependencies.

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL or SQLite database
- Google OAuth App (for authentication)
- OpenAI API Key (optional, for AI features)

## 🔧 Step 1: Project Structure

Create this folder structure:
```
teamforge-standalone/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
```

## 🎯 Step 2: Backend Setup

1. Navigate to backend folder
2. Install dependencies
3. Set up environment variables
4. Initialize database
5. Start server

## 🌐 Step 3: Frontend Setup

1. Navigate to frontend folder
2. Install dependencies
3. Configure API endpoints
4. Build and deploy

## 🚀 Step 4: Deployment Options

- **Local Development**: localhost setup
- **VPS Deployment**: DigitalOcean, Linode, AWS EC2
- **Heroku**: Easy deployment platform
- **Vercel/Netlify**: For frontend + serverless backend
- **Docker**: Containerized deployment

## 📝 Environment Variables

Backend (.env):
```
PORT=5000
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OPENAI_API_KEY=your_openai_api_key
FRONTEND_URL=http://localhost:3000
```

Frontend (.env):
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

Let's start creating the complete codebase!
