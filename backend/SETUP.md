# Social Media App Setup Guide

## Environment Variables Setup

Create a `.env` file in the backend directory with the following variables:

### Database Configuration
```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

### JWT Configuration
```env
JWT_SECRET="your-super-secret-jwt-key-here"
```

### Brevo Email Configuration
```env
# Brevo SMTP Settings
BREVO_HOST="smtp-relay.brevo.com"
BREVO_PORT=587
BREVO_USER="your-brevo-username"
BREVO_PASSWORD="your-brevo-api-key"
BREVO_FROM_EMAIL="noreply@yourdomain.com"
```

### OAuth Configuration
```env
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### Application URLs
```env
BACKEND_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:3000"
```

### Cloudinary (Optional)
```env
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

## OAuth Setup Instructions

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Set authorized redirect URI: `http://localhost:4000/api/auth/google/callback`
   - Copy the Client ID and Client Secret
5. Add the credentials to your `.env` file

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - Application name: "Social Media App"
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:4000/api/auth/github/callback`
4. Click "Register application"
5. Copy the Client ID and Client Secret
6. Add the credentials to your `.env` file

## Brevo Email Setup

1. Sign up at [Brevo](https://www.brevo.com/) (formerly Sendinblue)
2. Go to "SMTP & API" section
3. Get your SMTP credentials:
   - SMTP Server: `smtp-relay.brevo.com`
   - Port: `587`
   - Username: Your Brevo username
   - Password: Your Brevo API key
4. Add the credentials to your `.env` file

## Frontend Environment Variables

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

## Database Setup

1. Run the database migrations:
```bash
cd backend
npx prisma migrate dev
```

2. Generate the Prisma client:
```bash
npx prisma generate
```

## Testing the Setup

### Test Email Functionality
1. Start the backend server: `npm run dev`
2. Use the forgot password endpoint:
```bash
curl -X POST http://localhost:4000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Test OAuth
1. Visit `http://localhost:3000/login`
2. Click on "Continue with Google" or "Continue with GitHub"
3. Complete the OAuth flow

## Troubleshooting

### Common Issues

1. **OAuth redirect errors**: Make sure the callback URLs match exactly
2. **Email not sending**: Check Brevo credentials and ensure the account is verified
3. **Database connection errors**: Verify DATABASE_URL and ensure PostgreSQL is running
4. **CORS errors**: Check that the frontend URL is correctly configured

### Debug Mode

To enable debug logging, add to your `.env`:
```env
DEBUG=passport:*
NODE_ENV=development
```

## Security Notes

1. Never commit your `.env` files to version control
2. Use strong, unique JWT secrets
3. Keep OAuth client secrets secure
4. Use HTTPS in production
5. Regularly rotate API keys and secrets

## Production Deployment

For production deployment:

1. Update all URLs to use HTTPS
2. Set proper environment variables
3. Configure a production database
4. Set up proper CORS origins
5. Use environment-specific OAuth apps
6. Configure proper email sending limits 