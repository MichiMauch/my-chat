# My Chat - Slack-like Chat Application

A modern, feature-rich chat application built with Next.js 15, inspired by Slack's interface and functionality.

## 🚀 Features

### Core Chat Features
- **Real-time messaging** with Ably integration
- **Direct messages** between users
- **Thread support** (reply to messages)
- **File upload/download** with Cloudflare R2 storage
- **Drag & drop file upload** with previews
- **YouTube video previews** with in-chat playback
- **@mention system** with notifications and highlighting
- **Notification sounds** for DMs and mentions
- **Left-aligned messages** (Slack-style UI)

### Advanced Features
- **Google OAuth authentication** with profile pictures
- **Admin dashboard** for user management
- **Push notifications** via Service Worker
- **Online presence** indicators
- **File type support**: Images, videos, audio, PDFs, documents
- **Responsive design** for mobile and desktop

### Technical Features
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **SQLite database** with Turso
- **Real-time updates** with Ably
- **Cloudflare R2** for file storage
- **NextAuth.js** for authentication

## 🛠 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Turso account (for database)
- Ably account (for real-time features)
- Google OAuth credentials
- Cloudflare R2 bucket (for file uploads)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MichiMauch/my-chat.git
cd my-chat
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with the following variables:
```bash
# Database (Turso)
TURSO_DATABASE_URL=your_turso_url
TURSO_AUTH_TOKEN=your_turso_token

# Authentication (NextAuth + Google)
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Real-time (Ably)
ABLY_API_KEY=your_ably_api_key

# File Storage (Cloudflare R2)
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_PUBLIC_URL=your_public_url
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── chat/              # Main chat interface
│   └── admin/             # Admin dashboard
├── components/            # React components
│   ├── ChatArea.tsx       # Main chat interface
│   ├── ThreadArea.tsx     # Thread/reply interface
│   ├── FileUpload.tsx     # File upload component
│   ├── YouTubePreview.tsx # YouTube video previews
│   └── MentionPicker.tsx  # @mention functionality
├── lib/                   # Utilities and configurations
│   ├── db.ts             # Database setup
│   ├── auth.ts           # Authentication config
│   ├── mentions.tsx      # Mention processing
│   └── notifications.ts  # Push notifications
└── public/               # Static assets
```

## 🚦 API Endpoints

- `GET/POST /api/messages` - Chat messages
- `GET/POST /api/direct-messages` - Direct messages
- `GET/POST /api/rooms` - Chat rooms
- `GET /api/threads/[id]` - Thread messages
- `POST /api/upload` - File upload
- `GET /api/download` - File download proxy
- `GET/POST /api/users` - User management
- `/api/admin/*` - Admin endpoints

## 🔧 Configuration

### Database Schema
The app automatically creates the necessary SQLite tables on first run:
- `users` - User profiles and roles
- `messages` - Chat messages
- `rooms` - Chat rooms
- `direct_messages` - Private messages
- `mentions` - @mention tracking

### File Upload
Supports various file types with automatic preview generation:
- Images: JPG, PNG, GIF, WebP
- Videos: MP4, WebM, MOV
- Audio: MP3, WAV, OGG
- Documents: PDF, TXT, DOC, etc.

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add your environment variables
4. Deploy!

The app is optimized for Vercel deployment with:
- Automatic builds and deployments
- Environment variable management
- Global CDN distribution

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Real-time features by [Ably](https://ably.com/)
- Database by [Turso](https://turso.tech/)
- File storage by [Cloudflare R2](https://www.cloudflare.com/products/r2/)
- UI components with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide React](https://lucide.dev/)
