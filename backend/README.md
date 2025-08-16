# Social Media App Backend

## Features

- User authentication with JWT
- OAuth authentication (Google & GitHub)
- Forgot password with OTP email
- User management
- Posts, comments, likes, shares
- Social features (follow, stories, notifications)
- Real-time messaging and calls
- File uploads with Cloudinary

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"

# Brevo Email Configuration
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

# Application URLs
BACKEND_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:3000"

# Cloudinary (if using)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 3. OAuth Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set authorized redirect URI: `http://localhost:4000/api/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set Authorization callback URL: `http://localhost:4000/api/auth/github/callback`
4. Copy Client ID and Client Secret to your `.env` file

### 4. Brevo Email Setup
1. Sign up at [Brevo](https://www.brevo.com/) (formerly Sendinblue)
2. Go to SMTP & API section
3. Get your SMTP credentials
4. Add them to your `.env` file

### 5. Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

### 6. Start Development Server

```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/forgot-password` - Send OTP for password reset
- `POST /api/auth/reset-password` - Reset password with OTP

### OAuth
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/github/callback` - GitHub OAuth callback

### Users
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/:id` - Get user by ID

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get post by ID
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Comments
- `GET /api/comments/:postId` - Get comments for post
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Social Features
- `POST /api/social/follow/:userId` - Follow user
- `DELETE /api/social/follow/:userId` - Unfollow user
- `POST /api/social/like/:postId` - Like post
- `DELETE /api/social/like/:postId` - Unlike post

## Features

### Authentication
- JWT-based authentication
- OAuth with Google and GitHub
- Password reset with email OTP
- Secure password hashing with bcrypt

### User Management
- User registration and login
- Profile management
- Avatar uploads
- Privacy settings

### Social Features
- Follow/unfollow users
- Like/unlike posts
- Comment on posts
- Share posts
- User stories
- Notifications

### Content Management
- Create, read, update, delete posts
- Support for text, image, and video posts
- Post threading and replies
- Tag system
- Anonymous posting option

### Real-time Features
- Group chats
- Audio/video calls
- Message system
- Activity status

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key models include:

- **User**: Core user data with OAuth support
- **Post**: Social media posts with media support
- **Comment**: Post comments with threading
- **Follow**: User relationships
- **Notification**: User notifications
- **Message**: Chat messages
- **Call**: Call history
- **Story**: User stories

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Input validation with Zod
- CORS configuration
- Rate limiting (can be added)
- SQL injection prevention with Prisma
