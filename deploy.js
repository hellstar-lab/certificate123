#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Certificate Generator Deployment Helper\n');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description}`, 'red');
    return false;
  }
}

function runCommand(command, description, cwd = process.cwd()) {
  try {
    log(`🔄 ${description}...`, 'blue');
    execSync(command, { cwd, stdio: 'inherit' });
    log(`✅ ${description} completed`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, 'red');
    console.error(error.message);
    return false;
  }
}

function checkEnvironmentFiles() {
  log('\n📋 Checking Environment Files:', 'cyan');
  
  const backendEnv = checkFile('./backend/.env.production', 'Backend production environment file');
  const frontendEnv = checkFile('./frontend/.env.production', 'Frontend production environment file');
  
  if (!backendEnv) {
    log('   Create backend/.env.production with your production settings', 'yellow');
  }
  
  if (!frontendEnv) {
    log('   Create frontend/.env.production with your API URL', 'yellow');
  }
  
  return backendEnv && frontendEnv;
}

function checkDeploymentFiles() {
  log('\n📁 Checking Deployment Files:', 'cyan');
  
  const dockerfile = checkFile('./backend/Dockerfile', 'Backend Dockerfile');
  const vercelConfig = checkFile('./frontend/vercel.json', 'Frontend Vercel configuration');
  const netlifyConfig = checkFile('./frontend/netlify.toml', 'Frontend Netlify configuration');
  const railwayConfig = checkFile('./backend/railway.json', 'Backend Railway configuration');
  
  return dockerfile && (vercelConfig || netlifyConfig) && railwayConfig;
}

function testBackend() {
  log('\n🔧 Testing Backend:', 'cyan');
  
  const backendPath = path.join(process.cwd(), 'backend');
  
  if (!fs.existsSync(backendPath)) {
    log('❌ Backend directory not found', 'red');
    return false;
  }
  
  // Install dependencies
  if (!runCommand('npm install', 'Installing backend dependencies', backendPath)) {
    return false;
  }
  
  // Check if .env exists for local testing
  const envPath = path.join(backendPath, '.env');
  if (!fs.existsSync(envPath)) {
    log('⚠️  No .env file found for local testing', 'yellow');
    log('   Copy .env.example to .env and configure for local testing', 'yellow');
  }
  
  log('✅ Backend setup completed', 'green');
  return true;
}

function testFrontend() {
  log('\n🎨 Testing Frontend:', 'cyan');
  
  const frontendPath = path.join(process.cwd(), 'frontend');
  
  if (!fs.existsSync(frontendPath)) {
    log('❌ Frontend directory not found', 'red');
    return false;
  }
  
  // Install dependencies
  if (!runCommand('npm install', 'Installing frontend dependencies', frontendPath)) {
    return false;
  }
  
  // Build for production
  if (!runCommand('npm run build', 'Building frontend for production', frontendPath)) {
    return false;
  }
  
  log('✅ Frontend build completed', 'green');
  return true;
}

function showDeploymentInstructions() {
  log('\n🚀 Deployment Instructions:', 'magenta');
  log('\n1. Backend Deployment (Railway):', 'cyan');
  log('   • Go to https://railway.app');
  log('   • Connect your GitHub repository');
  log('   • Select the backend folder');
  log('   • Add environment variables from backend/.env.production');
  log('   • Deploy automatically');
  
  log('\n2. Frontend Deployment (Vercel):', 'cyan');
  log('   • Go to https://vercel.com');
  log('   • Import your GitHub repository');
  log('   • Select the frontend folder');
  log('   • Set VITE_API_BASE_URL to your backend URL + /api');
  log('   • Deploy automatically');
  
  log('\n3. Post-Deployment:', 'cyan');
  log('   • Update backend FRONTEND_URL with your Vercel URL');
  log('   • Test the application end-to-end');
  log('   • Monitor logs for any issues');
  
  log('\n📚 For detailed instructions, see DEPLOYMENT_GUIDE.md', 'blue');
}

function main() {
  log('Starting deployment preparation...\n', 'blue');
  
  let allChecksPass = true;
  
  // Check environment files
  if (!checkEnvironmentFiles()) {
    allChecksPass = false;
  }
  
  // Check deployment configuration files
  if (!checkDeploymentFiles()) {
    allChecksPass = false;
  }
  
  // Test backend
  if (!testBackend()) {
    allChecksPass = false;
  }
  
  // Test frontend
  if (!testFrontend()) {
    allChecksPass = false;
  }
  
  if (allChecksPass) {
    log('\n🎉 All checks passed! Ready for deployment.', 'green');
    showDeploymentInstructions();
  } else {
    log('\n⚠️  Some checks failed. Please fix the issues above before deploying.', 'yellow');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('Certificate Generator Deployment Helper\n', 'cyan');
  log('Usage: node deploy.js [options]\n');
  log('Options:');
  log('  --help, -h     Show this help message');
  log('  --backend      Test backend only');
  log('  --frontend     Test frontend only');
  log('  --check        Check files only (no building)');
  process.exit(0);
}

if (args.includes('--backend')) {
  testBackend();
} else if (args.includes('--frontend')) {
  testFrontend();
} else if (args.includes('--check')) {
  checkEnvironmentFiles();
  checkDeploymentFiles();
} else {
  main();
}