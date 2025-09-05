# Certificate Generator Web Application

A full-stack web application for creating and managing digital certificates with customizable templates, real-time collaboration, and automated generation features.

## 🌟 Features

- 🔐 **Secure Authentication**: JWT-based admin authentication
- 📄 **Template Management**: Upload, edit, and manage certificate templates
- ✏️ **Visual Editor**: Drag-and-drop template editor with Fabric.js
- 🆔 **Unique IDs**: Automatic certificate ID generation
- 📱 **Responsive Design**: Modern UI with dark/light mode support
- 💾 **Export Options**: Generate certificates as PDF/PNG
- 🔍 **Management Dashboard**: Search and manage certificates
- 🚀 **Real-time Features**: WebSocket support for live collaboration
- 🛡️ **Production Ready**: Security, rate limiting, and monitoring

## 🏗️ Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for modern styling
- React Router for navigation
- Axios for API communication
- Fabric.js for canvas manipulation
- html2canvas + jsPDF for export

### Backend
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT authentication with bcryptjs
- Multer for file uploads
- WebSocket support
- Rate limiting and security middleware
- Production-ready configuration

## 📁 Project Structure

```
Certificate/
├── backend/                 # Node.js API server
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── .env.production     # Production config
│   ├── Dockerfile          # Container config
│   └── server.js           # Entry point
├── frontend/               # React application
│   ├── src/               # Source code
│   ├── .env.production    # Production config
│   ├── vercel.json        # Vercel config
│   └── vite.config.ts     # Vite config
├── deploy.js              # Deployment helper
├── DEPLOYMENT_GUIDE.md    # Detailed deployment guide
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Certificate
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm start
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🌐 Production Deployment

### Automated Deployment Check

Run the deployment helper to verify your setup:

```bash
node deploy.js
```

This will:
- ✅ Check all required configuration files
- ✅ Verify environment variables
- ✅ Test backend and frontend builds
- ✅ Provide deployment instructions

### Backend Deployment (Railway)

1. **Prepare Environment**
   - Configure `backend/.env.production` with:
     - MongoDB Atlas URI
     - JWT secrets
     - Admin credentials
     - Frontend URL

2. **Deploy**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Select the `backend` folder
   - Add environment variables
   - Deploy automatically

### Frontend Deployment (Vercel)

1. **Configure Environment**
   - Update `frontend/.env.production` with your backend URL

2. **Deploy**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set root directory to `frontend`
   - Add environment variables
   - Deploy

## 🔧 Configuration

### Backend Environment Variables

```env
# Server
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Admin Account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password

# CORS
FRONTEND_URL=https://your-app.vercel.app
ALLOWED_ORIGINS=https://your-app.vercel.app
```

### Frontend Environment Variables

```env
# API Configuration
VITE_API_BASE_URL=https://your-backend.railway.app/api

# App Configuration
VITE_APP_NAME=Certificate Generator
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production
```

## 🛠️ Development

### Available Scripts

**Backend:**
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/template` - Get templates
- `POST /api/template` - Create template
- `PUT /api/template/:id` - Update template
- `DELETE /api/template/:id` - Delete template
- `POST /api/certificate/create` - Generate certificate
- `GET /api/health` - Health check

## 🔒 Security Features

- **Authentication**: JWT-based authentication
- **Rate Limiting**: Multiple tiers (general, auth, upload)
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers
- **Input Validation**: Request validation and sanitization
- **File Upload Security**: Type and size restrictions

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify `FRONTEND_URL` in backend environment
   - Check `VITE_API_BASE_URL` in frontend environment

2. **Database Connection**
   - Verify MongoDB Atlas connection string
   - Check network access and IP whitelist

3. **Build Failures**
   - Run `node deploy.js` to check configuration
   - Verify all dependencies are installed

### Getting Help

- Check the [Deployment Guide](./DEPLOYMENT_GUIDE.md) for detailed instructions
- Review environment variable configuration
- Check application logs for specific errors

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Comprehensive deployment instructions
- [Backend Deployment](./backend/DEPLOYMENT.md) - Backend-specific deployment
- [Frontend Deployment](./frontend/DEPLOYMENT.md) - Frontend-specific deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License

---

**Ready to deploy?** Run `node deploy.js` to get started! 🚀