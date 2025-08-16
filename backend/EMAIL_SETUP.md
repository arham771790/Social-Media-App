# Email Setup Guide

## Overview

The forgot password functionality uses Brevo (formerly Sendinblue) for sending emails. You need to configure the email service to make the forgot password feature work.

## Setup Steps

### 1. Create Brevo Account

1. Go to [Brevo](https://www.brevo.com/) and create a free account
2. Verify your email address
3. Add your domain or use the default sender

### 2. Get SMTP Credentials

1. In Brevo dashboard, go to **Settings** → **SMTP & API**
2. Copy your SMTP credentials:
   - **SMTP Server**: `smtp-relay.brevo.com`
   - **Port**: `587`
   - **Username**: Your Brevo username
   - **Password**: Your Brevo API key

### 3. Create Environment File

Create a `.env` file in the backend directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/social_media_app"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"

# Email Configuration (Brevo)
BREVO_HOST="smtp-relay.brevo.com"
BREVO_PORT=587
BREVO_USER="your-brevo-username"
BREVO_PASSWORD="your-brevo-api-key"
BREVO_FROM_EMAIL="noreply@yourdomain.com"

# OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Server Configuration
PORT=4000
NODE_ENV=development

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 4. Alternative Email Services

If you don't want to use Brevo, you can modify the email service to use other providers:

#### Gmail SMTP
```env
BREVO_HOST="smtp.gmail.com"
BREVO_PORT=587
BREVO_USER="your-email@gmail.com"
BREVO_PASSWORD="your-app-password"
```

#### Outlook SMTP
```env
BREVO_HOST="smtp-mail.outlook.com"
BREVO_PORT=587
BREVO_USER="your-email@outlook.com"
BREVO_PASSWORD="your-password"
```

### 5. Test Email Service

You can test the email service by making a POST request to:

```
POST http://localhost:4000/api/auth/forgot-password
Content-Type: application/json

{
  "email": "test@example.com"
}
```

### 6. Troubleshooting

#### Common Issues:

1. **"Failed to send OTP email"**
   - Check your SMTP credentials
   - Verify your Brevo account is active
   - Check if your domain is verified

2. **"Invalid credentials"**
   - Make sure you're using the API key, not your login password
   - Verify the SMTP server and port

3. **"Connection timeout"**
   - Check your internet connection
   - Verify the SMTP server is accessible
   - Try using port 465 with SSL if 587 doesn't work

#### Debug Mode:

To see detailed email logs, add this to your `.env`:

```env
DEBUG_EMAIL=true
```

### 7. Security Notes

- Never commit your `.env` file to version control
- Use environment variables in production
- Rotate your API keys regularly
- Use app-specific passwords for Gmail

### 8. Production Setup

For production, consider:

1. **Email Service**: Use a dedicated email service like SendGrid, Mailgun, or AWS SES
2. **Domain Verification**: Verify your sending domain
3. **Rate Limiting**: Implement rate limiting for forgot password requests
4. **Monitoring**: Set up email delivery monitoring

## Email Templates

The current email templates are in `src/utils/emailService.js`. You can customize them by modifying the HTML templates in the `sendOTP` and `sendPasswordResetSuccess` methods.
