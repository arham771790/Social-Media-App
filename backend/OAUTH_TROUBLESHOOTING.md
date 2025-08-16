# OAuth Troubleshooting Guide

## Common OAuth Issues and Solutions

### 1. Environment Variables Not Configured

**Problem**: OAuth providers return "Missing" in configuration test.

**Solution**: 
1. Create a `.env` file in the backend directory
2. Add the following variables:

```env
# OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Application URLs
BACKEND_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="your-super-secret-jwt-key"
```

### 2. OAuth Provider Setup Issues

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:4000/api/auth/google/callback`
   - Copy Client ID and Client Secret to `.env`

#### GitHub OAuth Setup
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set Authorization callback URL: `http://localhost:4000/api/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

### 3. CORS Issues

**Problem**: Frontend can't access OAuth endpoints.

**Solution**: 
- Ensure CORS is properly configured in `app.js`
- Check that frontend URL matches CORS origin

### 4. Database Connection Issues

**Problem**: OAuth users not being created/found.

**Solution**:
1. Run database migrations:
```bash
cd backend
npx prisma migrate dev
```

2. Check database connection in `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

### 5. Callback URL Mismatch

**Problem**: OAuth providers reject callback URLs.

**Solution**:
- Ensure callback URLs in OAuth provider settings exactly match:
  - Google: `http://localhost:4000/api/auth/google/callback`
  - GitHub: `http://localhost:4000/api/auth/github/callback`

### 6. Frontend Environment Variables

**Problem**: Frontend can't find API URL.

**Solution**: Create `.env.local` in frontend directory:
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

## Testing OAuth Configuration

### 1. Test Configuration Endpoint
```bash
curl http://localhost:4000/api/auth/test-oauth
```

This will show the status of all OAuth configurations.

### 2. Test OAuth Flow
1. Start backend: `npm run dev`
2. Start frontend: `npm run dev`
3. Visit `http://localhost:3000/login`
4. Click "Continue with Google" or "Continue with GitHub"
5. Complete OAuth flow

### 3. Debug Mode
Add to `.env`:
```env
DEBUG=passport:*
NODE_ENV=development
```

## Common Error Messages

### "Invalid redirect_uri"
- Check callback URLs in OAuth provider settings
- Ensure URLs match exactly (including http/https)

### "Invalid client"
- Verify Client ID and Client Secret are correct
- Check that OAuth app is properly configured

### "User not found" or "Authentication failed"
- Check database connection
- Verify user creation logic in OAuth strategies
- Check JWT_SECRET is set

### "CORS error"
- Ensure CORS is configured for frontend URL
- Check that both servers are running

## Production Deployment

For production:
1. Update all URLs to use HTTPS
2. Set proper environment variables
3. Configure production OAuth apps
4. Update callback URLs to production domains
5. Set proper CORS origins

## Security Best Practices

1. Never commit `.env` files
2. Use strong JWT secrets
3. Keep OAuth client secrets secure
4. Use HTTPS in production
5. Regularly rotate API keys

## Getting Help

If issues persist:
1. Check server logs for detailed error messages
2. Use the test endpoint to verify configuration
3. Ensure all environment variables are set
4. Verify database migrations are applied
5. Test with a fresh OAuth app setup
