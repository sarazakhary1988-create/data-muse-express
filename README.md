ORKESTRA : Research Anything with Orchestrated Intelligence
## 🚀 Project Overview

**ORKESTRA** is a production-ready autonomous AI agent system based on the **Manus 1.6 Max architecture**, featuring:

- **12 LLM Models** with automatic failover and health checks
- **Real-Time News** via 5 MANUS tools (no external APIs)
- **4-Phase Agent Loop** (Analyze → Plan → Execute → Observe)
- **Memory & RAG** with vector embeddings
- **6-Agent Research** consensus system
- **Zero Mock Data** - all data is real-time and fresh

**Project URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## 📚 Documentation

### Architecture & API
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system architecture and component details
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Full API reference with examples
- **[INDEX.md](./INDEX.md)** - Documentation index and navigation guide

### Deployment Guides
- **[START HERE](./docs/deployment/START_HERE_DEPLOYMENT.md)** - Quick start deployment guide
- **[Complete Deployment Guide](./docs/deployment/DEPLOYMENT_GUIDE_COMPLETE.md)** - Comprehensive deployment instructions
- **[Netlify Deployment](./docs/deployment/NETLIFY_DEPLOYMENT.md)** - Netlify-specific deployment
- **[GitHub Deployment](./docs/deployment/GITHUB_DEPLOYMENT_COMPLETE.md)** - GitHub Pages deployment
- **[Deployment Summary](./docs/deployment/DEPLOYMENT_SUMMARY.md)** - All deployment options overview

### Repository Configuration
This project is configured to work with two GitHub repositories:
- **Primary (origin)**: https://github.com/sarazakhary1988-create/data-muse-express
- **Secondary (upstream)**: https://github.com/sarazakhary1988-create/data-muse-express-main

**Git Setup Docs**:
- **[Quick Reference](./docs/.git-remotes-cheatsheet.md)** - Common git commands
- **[Full Git Setup Guide](./docs/DUAL_REPOSITORY_SETUP.md)** - Detailed dual-repository workflow

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

### Deploy via Netlify

This project includes Netlify configuration for easy deployment. You have three options:

**1. Deploy via Netlify Dashboard (Recommended)**
- Go to [app.netlify.com](https://app.netlify.com) and click "Add new site"
- Connect your Git repository (GitHub, GitLab, or Bitbucket)
- Netlify will automatically detect the build settings from `netlify.toml`
- Click "Deploy"

**2. Deploy via Netlify CLI**
```sh
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

**3. Automatic CI/CD**
Once connected via the Netlify Dashboard, every push to your main branch will automatically deploy.

For detailed instructions, see [NETLIFY_DEPLOYMENT.md](./docs/deployment/NETLIFY_DEPLOYMENT.md)

## Can I connect a custom domain?

### Netlify

Yes! Go to Site Settings → Domain management → Add custom domain and follow the DNS configuration instructions.

For more details, see [NETLIFY_DEPLOYMENT.md](./docs/deployment/NETLIFY_DEPLOYMENT.md#custom-domain)
