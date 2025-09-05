# Certificate Generator - Complete Deployment Guide

This guide will help you deploy the Certificate Generator application to production with both frontend and backend components.

## 🚀 Quick Start Deployment

### Step 1: Deploy Backend (5-10 minutes)

1. **Create MongoDB Atlas Database**:
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a free M0 cluster
   - Create database user and whitelist IP addresses (0.0.0.0/0)
   - Get connection string

2. **Deploy to Railway** (Recommended):
   - Go to [Railway](https://railway.app)
   - Connect your GitHub repository
   - Select the `backend` folder
   - Add environment variables (see Backend Environment Variables below)
   - Deploy automatically detects Dockerfile

3. **Note your backend URL**: `https://your-app.railway.app`

### Step 2: Deploy Frontend (3-5 minutes)

1. **Deploy to Vercel** (Recommended):
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Select the `frontend` folder
   - Set `VITE_API_BASE_URL` to your backend URL + `/api`
   - Deploy automatically

2. **Update Backend CORS**:
   - Add your Vercel URL to backend `FRONTEND_URL` environment variable

### Step 3: Test Your Deployment

1. Visit your frontend URL
2. Create an admin account
3. Upload a template
4. Generate a test certificate

## 📋 Environment Variables

### Backend Environment Variables

```env
# Required
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/certificate-generator
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
FRONTEND_URL=https://your-frontend.vercel.app
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=SecurePassword123!

# Optional (with defaults)
PORT=5000
JWT_EXPIRES_IN=7d
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
CERTIFICATE_ID_PREFIX=CERT
```

### Frontend Environment Variables

```env
# Required
VITE_API_BASE_URL=https://your-backend.railway.app/api

# Optional
VITE_APP_NAME=Certificate Generator
VITE_APP_VERSION=1.0.0
```

## 🏗️ Deployment Platforms

### Backend Options

| Platform | Pros | Cons | Cost |
|----------|------|------|------|
| **Railway** | Easy setup, Dockerfile support, good free tier | Limited free hours | Free tier available |
| **Render** | Simple deployment, automatic SSL | Slower cold starts | Free tier available |
| **Heroku** | Mature platform, many addons | More expensive, complex setup | Paid plans only |
| **DigitalOcean** | Full control, good performance | Requires more setup | $5/month minimum |

### Frontend Options

| Platform | Pros | Cons | Cost |
|----------|------|------|------|
| **Vercel** | Excellent for React, fast CDN, easy setup | Limited build minutes | Generous free tier |
| **Netlify** | Good features, form handling | Less optimized for React | Free tier available |
| **GitHub Pages** | Free, integrated with GitHub | Static only, limited features | Free |
| **AWS S3 + CloudFront** | Highly scalable, fast | More complex setup | Pay per use |

## 🔧 Advanced Configuration

### Custom Domain Setup

1. **Frontend (Vercel)**:
   - Go to Project Settings → Domains
   - Add your domain
   - Configure DNS records as instructed

2. **Backend (Railway)**:
   - Go to Project Settings → Domains
   - Add custom domain
   - Update DNS CNAME record

3. **Update Environment Variables**:
   - Update `FRONTEND_URL` in backend
   - Update `VITE_API_BASE_URL` in frontend

### SSL/HTTPS Configuration

- Both Vercel and Railway provide automatic SSL certificates
- Ensure all API calls use HTTPS in production
- Update CORS settings to match your domains

### Database Optimization

1. **MongoDB Atlas**:
   - Enable connection pooling
   - Set up database indexes for better performance
   - Configure backup schedules
   - Monitor database metrics

2. **Connection String Optimization**:
   ```
   mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority&maxPoolSize=10&serverSelectionTimeoutMS=5000
   ```

## 🔒 Security Checklist

### Backend Security

- [ ] Strong JWT secret (minimum 32 characters)
- [ ] Secure admin password
- [ ] CORS configured for specific domains
- [ ] Rate limiting enabled
- [ ] Helmet.js security headers
- [ ] Environment variables not in code
- [ ] Database connection secured
- [ ] File upload validation

### Frontend Security

- [ ] API calls over HTTPS only
- [ ] No sensitive data in environment variables
- [ ] Content Security Policy headers
- [ ] Input validation and sanitization
- [ ] Secure authentication flow

## 📊 Monitoring & Maintenance

### Health Monitoring

1. **Backend Health Check**:
   ```bash
   curl https://your-backend.railway.app/api/health
   ```

2. **Frontend Monitoring**:
   - Set up Uptime Robot or similar
   - Monitor Core Web Vitals
   - Track user interactions

### Error Tracking

1. **Backend Logging**:
   - Railway provides built-in logs
   - Consider Sentry for error tracking
   - Monitor API response times

2. **Frontend Monitoring**:
   - Browser console errors
   - Failed API requests
   - User experience metrics

### Performance Optimization

1. **Backend**:
   - Monitor memory usage during certificate generation
   - Optimize image processing
   - Database query optimization
   - Consider Redis for caching

2. **Frontend**:
   - Bundle size optimization (already configured)
   - Image optimization
   - Lazy loading implementation
   - CDN for static assets

## 🚨 Troubleshooting

### Common Deployment Issues

1. **Backend won't start**:
   - Check environment variables
   - Verify MongoDB connection string
   - Check build logs for errors
   - Ensure Node.js version compatibility

2. **Frontend can't connect to backend**:
   - Verify `VITE_API_BASE_URL` is correct
   - Check CORS configuration
   - Ensure backend is accessible
   - Check network/firewall issues

3. **Database connection issues**:
   - Verify MongoDB Atlas network access
   - Check database user permissions
   - Test connection string locally
   - Monitor connection pool

4. **File upload/generation issues**:
   - Check file size limits
   - Verify upload directory permissions
   - Monitor memory usage
   - Check Canvas/Sharp dependencies

### Debug Commands

```bash
# Test backend health
curl https://your-backend.railway.app/api/health

# Test frontend build locally
cd frontend
npm run build
npm run preview

# Check backend logs (Railway)
railway logs

# Test database connection
mongo "mongodb+srv://your-connection-string"
```

## 📈 Scaling Considerations

### When to Scale

- High memory usage during certificate generation
- Slow API response times
- Database connection limits reached
- Storage space running low

### Scaling Options

1. **Vertical Scaling**:
   - Upgrade to higher tier plans
   - More CPU/RAM for certificate generation
   - Better database performance

2. **Horizontal Scaling**:
   - Multiple backend instances
   - Load balancer configuration
   - Database read replicas
   - CDN for file delivery

3. **Storage Scaling**:
   - Cloud storage (AWS S3, Cloudinary)
   - Database storage optimization
   - File cleanup strategies

## 💰 Cost Estimation

### Free Tier (Getting Started)
- **MongoDB Atlas**: Free M0 cluster (512MB)
- **Railway**: 500 hours/month free
- **Vercel**: Generous free tier
- **Total**: $0/month for small usage

### Production Tier (Recommended)
- **MongoDB Atlas**: M2 cluster (~$9/month)
- **Railway**: Pro plan (~$5/month)
- **Vercel**: Pro plan (~$20/month)
- **Custom Domain**: ~$10-15/year
- **Total**: ~$35-40/month

### Enterprise Tier (High Usage)
- **MongoDB Atlas**: M10+ cluster ($57+/month)
- **Railway**: Team plan ($20+/month)
- **Vercel**: Team plan ($20+/month)
- **Additional services**: Monitoring, backups, etc.
- **Total**: $100+/month

## 📞 Support & Resources

### Documentation
- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)
- [Vite Documentation](https://vitejs.dev)

### Community Support
- Railway Discord
- Vercel Discord
- MongoDB Community Forums
- Stack Overflow

### Professional Support
- Consider paid support plans for production deployments
- MongoDB Atlas support tiers
- Vercel Pro support
- Custom development services

---

**Need Help?** If you encounter issues during deployment, check the troubleshooting section or reach out to the respective platform support teams.