# Frontend Deployment Guide

## Prerequisites

1. **Backend Deployed**: Ensure your backend is deployed and accessible
2. **Cloud Platform Account**: Choose one of the following:
   - [Vercel](https://vercel.com) (Recommended for React apps)
   - [Netlify](https://netlify.com)
   - [GitHub Pages](https://pages.github.com)

## Environment Variables

Set up these environment variables in your deployment platform:

```env
VITE_API_BASE_URL=https://your-backend-domain.railway.app/api
VITE_APP_NAME=Certificate Generator
VITE_APP_VERSION=1.0.0
VITE_NODE_ENV=production
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect Repository**:
   - Go to [Vercel](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select the frontend folder as root directory

2. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Set Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all variables listed above
   - Make sure to set them for Production environment

4. **Deploy**:
   - Click "Deploy"
   - Your app will be available at `https://your-app.vercel.app`

### Option 2: Netlify

1. **Connect Repository**:
   - Go to [Netlify](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository
   - Select the frontend folder

2. **Configure Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Base Directory**: `frontend` (if deploying from monorepo)

3. **Set Environment Variables**:
   - Go to Site Settings → Environment Variables
   - Add all variables listed above

4. **Deploy**:
   - Click "Deploy site"
   - Your app will be available at `https://your-app.netlify.app`

### Option 3: Manual Build & Upload

1. **Build Locally**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Upload dist folder**:
   - Upload the `dist` folder contents to any static hosting service
   - Examples: GitHub Pages, Firebase Hosting, AWS S3, etc.

## Build Optimization

The Vite configuration includes several optimizations:

- **Code Splitting**: Separates vendor, UI, and utility libraries
- **Minification**: Uses Terser for optimal compression
- **Caching**: Proper cache headers for static assets
- **Source Maps**: Disabled in production for smaller builds

## Post-Deployment Steps

1. **Update Backend CORS**:
   - Update `FRONTEND_URL` in your backend environment variables
   - Set it to your deployed frontend URL (e.g., `https://your-app.vercel.app`)

2. **Test Functionality**:
   - Test login/authentication
   - Test template upload and editing
   - Test certificate generation
   - Test file downloads

3. **Custom Domain (Optional)**:
   - **Vercel**: Go to Project Settings → Domains
   - **Netlify**: Go to Site Settings → Domain Management
   - Add your custom domain and configure DNS

## Environment-Specific Configuration

### Development
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_NODE_ENV=development
```

### Staging
```env
VITE_API_BASE_URL=https://your-staging-backend.railway.app/api
VITE_NODE_ENV=staging
```

### Production
```env
VITE_API_BASE_URL=https://your-production-backend.railway.app/api
VITE_NODE_ENV=production
```

## Troubleshooting

### Common Issues:

1. **API Connection Errors**:
   - Verify `VITE_API_BASE_URL` is correct
   - Check backend CORS configuration
   - Ensure backend is accessible from frontend domain

2. **Build Failures**:
   - Check Node.js version compatibility (>=18.0.0)
   - Verify all dependencies are in `package.json`
   - Check for TypeScript errors

3. **Routing Issues (404 on refresh)**:
   - Ensure SPA fallback is configured (handled by vercel.json/netlify.toml)
   - Check that all routes redirect to index.html

4. **Large Bundle Size**:
   - The build includes code splitting for optimization
   - Consider lazy loading for heavy components
   - Use bundle analyzer: `npm install --save-dev rollup-plugin-visualizer`

5. **Environment Variables Not Working**:
   - Ensure variables start with `VITE_`
   - Restart build after adding new variables
   - Check variable names match exactly

## Performance Optimization

1. **Image Optimization**:
   - Use WebP format when possible
   - Implement lazy loading for images
   - Consider using a CDN

2. **Code Splitting**:
   - Already configured in vite.config.ts
   - Consider route-based splitting for larger apps

3. **Caching Strategy**:
   - Static assets cached for 1 year
   - HTML files not cached (for updates)
   - API responses cached appropriately

## Security Considerations

1. **Environment Variables**:
   - Never expose sensitive data in frontend env vars
   - All VITE_ variables are public in the built app
   - Use backend for sensitive operations

2. **Content Security Policy**:
   - Consider adding CSP headers
   - Restrict external resource loading

3. **HTTPS**:
   - Always use HTTPS in production
   - Both Vercel and Netlify provide free SSL

## Monitoring

1. **Analytics**:
   - Add Google Analytics or similar
   - Monitor user interactions and errors

2. **Error Tracking**:
   - Consider Sentry for error monitoring
   - Set up alerts for critical errors

3. **Performance Monitoring**:
   - Use Lighthouse for performance audits
   - Monitor Core Web Vitals
   - Set up performance budgets

## Continuous Deployment

Both Vercel and Netlify support automatic deployments:

1. **Automatic Deployments**:
   - Triggered on git push to main branch
   - Preview deployments for pull requests
   - Rollback capabilities

2. **Build Hooks**:
   - Trigger rebuilds via API
   - Useful for CMS updates or scheduled rebuilds

3. **Branch Deployments**:
   - Deploy different branches to different URLs
   - Useful for staging environments