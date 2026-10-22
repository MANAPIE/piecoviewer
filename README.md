# PIEcoviewer

AI-powered GitHub Pull Request code review tool built with Next.js 15, supporting multiple AI providers (Claude, GPT-4, Gemini) and MCP (Model Context Protocol).

## Features

- 🤖 **Multi-AI Provider Support**: Claude (Anthropic), GPT-4 (OpenAI), Gemini (Google)
- 🔌 **MCP Integration**: Use Model Context Protocol for AI communication
- 🔍 **Smart Code Review**: Automated PR analysis with line-by-line comments
- 📝 **Customizable Reviews**: Set review language (Korean/English) and style (brief/detailed/strict)
- 🔐 **GitHub OAuth**: Secure authentication with GitHub
- 📊 **Organization Support**: Review PRs from personal and organization repositories
- 💬 **Review Management**: Edit, save, and post reviews directly to GitHub
- 🌓 **Dark Mode**: Full dark mode support
- 📱 **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite with better-sqlite3
- **Authentication**: NextAuth.js with GitHub Provider
- **AI SDKs**:
  - Anthropic SDK (Claude)
  - OpenAI SDK (GPT-4)
  - Google Generative AI (Gemini)
  - MCP SDK (Model Context Protocol)
- **API**: GitHub REST API (Octokit)

## Prerequisites

- Node.js 24
- npm or yarn or pnpm
- GitHub account
- One of the following:
  - Claude API key (from Anthropic)
  - OpenAI API key (from OpenAI)
  - Gemini API key (from Google)
  - MCP server setup

## Installation

1. Clone the repository:
```bash
git clone https://github.com/MANAPIE/piecoviewer.git
cd piecoviewer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:
```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

4. The database will be automatically created when you first run the application.

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: PIEcoviewer
   - **Homepage URL**: `http://localhost:3000` (or your production URL)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and generate a Client Secret
5. Add them to your `.env` file

## Usage

### 1. Login with GitHub
- Click "Login with GitHub" on the home page
- Authorize the application to access your repositories

### 2. Configure AI Settings
- Go to Settings page
- Choose one of the following:
  - **Direct API**: Select AI provider and enter API key
  - **MCP**: Enable MCP and configure server settings
- Set review language and style preferences
- (Optional) Add custom prompt instructions

### 3. Review Pull Requests
- Select a repository from the dashboard
- Choose a PR to review
- Click "AI 리뷰 시작" to generate review
- Edit the review if needed
- Add line-by-line comments (optional)
- Select review type (Comment/Approve/Request Changes)
- Post to GitHub

## MCP Configuration

MCP (Model Context Protocol) allows you to use AI models without directly managing API keys.

Example MCP server configuration:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-claude"],
  "env": {
    "ANTHROPIC_API_KEY": "your-api-key-here"
  }
}
```

## Project Structure

```
piecoviewer/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── ai/           # AI provider endpoints
│   │   ├── auth/         # NextAuth endpoints
│   │   ├── github/       # GitHub API endpoints
│   │   ├── mcp/          # MCP endpoints
│   │   └── settings/     # Settings endpoints
│   ├── dashboard/        # Main dashboard
│   ├── login/            # Login page
│   ├── repo/             # Repository pages
│   └── settings/         # Settings page
├── lib/                   # Utilities and libraries
│   ├── ai/               # AI provider implementations
│   ├── db/               # Database client
│   └── mcp/              # MCP client
└── public/               # Static assets
```

## Database Schema

The application uses SQLite with better-sqlite3. Main tables:

- **users**: User account and GitHub info
- **settings**: AI provider settings and preferences
- **reviews**: Stored PR reviews

## Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | SQLite database URL | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret key | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | Yes |

## License

MIT License

## Author

Developed️ by [MANAPIE](https://manapie.me)
