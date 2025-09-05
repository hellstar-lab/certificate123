# Backend Deployment Guide

## Prerequisites

1. **MongoDB Atlas Account**: Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Cloud Platform Account**: Choose one of the following:
   - [Railway](https://railway.app) (Recommended)
   - [Render](https://render.com)
   - [Heroku](https://heroku.com)

## Environment Variables

Before deploying, set up these environment variables in your cloud platform:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/certificate-generator?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=SecurePassword123!
FRONTEND_URL=https://your-frontend-domain.vercel.app
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
CERTIFICATE_ID_PREFIX=CERT
CERTIFICATE_ID_YEAR_FORMAT=YYYY
```

## Deployment Options

### Option 1: Railway (Recommended)

1. **Connect Repository**:
   - Go to [Railway](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Choose the backend folder

2. **Configure Environment**:
   - Go to your project settings
   - Add all environment variables listed above
   - Railway will automatically detect the Dockerfile

3. **Deploy**:
   - Railway will automatically build and deploy
   - Your API will be available at `https://your-app.railway.app`

### Option 2: Render

1. **Create Web Service**:
   - Go to [Render](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
   - Add all environment variables

3. **Deploy**:
   - Click "Create Web Service"
   - Your API will be available at `https://your-app.onrender.com`

### Option 3: Heroku

1. **Install Heroku CLI**:
   ```bash
   npm install -g heroku
   ```

2. **Create Heroku App**:
   ```bash
   heroku create your-app-name
   ```

3. **Set Environment Variables**:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set JWT_SECRET=your-jwt-secret
   # ... add all other variables
   ```

4. **Deploy**:
   ```bash
   git push heroku main
   ```

## MongoDB Atlas Setup

1. **Create Cluster**:
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a free M0 cluster
   - Choose a cloud provider and region

2. **Configure Access**:
   - Go to "Database Access" → Create database user
   - Go to "Network Access" → Add IP address (0.0.0.0/0 for all IPs)

3. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

## Post-Deployment Steps

1. **Test Health Endpoint**:
   ```bash
   curl https://your-api-domain.com/api/health
   ```

2. **Create Admin Account**:
   - Use the `/api/auth/register` endpoint to create your first admin
   - Or seed the database with your admin credentials

3. **Update Frontend Configuration**:
   - Update `VITE_API_BASE_URL` in your frontend to point to your deployed API

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check that all dependencies are in `package.json`
   - Ensure Node.js version compatibility (>=18.0.0)

2. **Database Connection Issues**:
   - Verify MongoDB URI is correct
   - Check network access settings in MongoDB Atlas
   - Ensure database user has proper permissions

3. **File Upload Issues**:
   - Most cloud platforms have ephemeral file systems
   - Consider using cloud storage (AWS S3, Cloudinary) for production

4. **Memory Issues**:
   - Canvas and Sharp libraries can be memory-intensive
   - Consider upgrading to a higher tier plan if needed

## Security Considerations

1. **Environment Variables**:
   - Never commit `.env` files to version control
   - Use strong, unique JWT secrets
   - Use secure admin passwords

2. **CORS Configuration**:
   - Set `FRONTEND_URL` to your actual frontend domain
   - Avoid using wildcards (*) in production

3. **Rate Limiting**:
   - The app includes rate limiting by default
   - Adjust limits based on your needs

## Monitoring

- Most platforms provide built-in monitoring
- Monitor memory usage, especially during certificate generation
- Set up alerts for API errors and downtime
- Consider using external monitoring services like Uptime Robot