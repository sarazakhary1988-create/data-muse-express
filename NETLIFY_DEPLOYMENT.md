# Netlify Deployment Guide

This project is configured to deploy on Netlify. Follow the steps below to set up and deploy your application.

## Prerequisites

- A Netlify account (sign up at [netlify.com](https://netlify.com))
- Git repository (GitHub, GitLab, or Bitbucket)
- Node.js and npm installed locally

## Deployment Methods

### Method 1: Deploy via Netlify UI (Recommended)

1. **Connect your repository**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Select your Git provider (GitHub, GitLab, or Bitbucket)
   - Authorize Netlify to access your repositories
   - Choose the `data-muse-express` repository

2. **Configure build settings**
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - These are already configured in `netlify.toml`, so Netlify will detect them automatically

3. **Set environment variables** (if needed)
   - Go to Site Settings → Build & Deploy → Environment
   - Add any required environment variables (e.g., API keys, database URLs)
   - You can also create a `.env.production` file locally

4. **Deploy**
   - Click "Deploy site"
   - Netlify will automatically build and deploy your site
   - Your site will be available at `https://[your-site-name].netlify.app`

### Method 2: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Link your local repository to Netlify**
   ```bash
   netlify link
   ```

4. **Deploy**
   ```bash
   netlify deploy --prod
   ```

### Method 3: Automatic Deployments (CI/CD)

Once connected via the Netlify UI:
- **Preview deployments**: Every pull request automatically gets a preview URL
- **Production deployments**: Merges to the main branch automatically deploy to production
- Enable branch deployments in Site Settings → Deploy contexts

## Environment Variables

### Development
Create a `.env` file in the root directory:
```env
VITE_API_URL=https://api.example.com
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Production
Set environment variables in Netlify Dashboard:
- Go to Site Settings → Build & Deploy → Environment
- Add your production environment variables

## Configuration Details

The `netlify.toml` file includes:

- **Build settings**: Specifies build command and output directory
- **Redirects**: Routes all requests to `/index.html` for client-side routing (SPA)
- **Headers**: Security headers and cache control policies
  - Long-term caching for versioned assets (`.css`, `.js` in `/assets/`)
  - Short-term caching for HTML files
  - Security headers for XSS, clickjacking, and content type protection

## Troubleshooting

### Build fails
1. Check build logs in Netlify Dashboard (Deploys → View logs)
2. Ensure all dependencies are installed: `npm install`
3. Verify Node version compatibility
4. Check for missing environment variables

### Site shows 404 errors
- The `netlify.toml` includes a redirect rule to handle client-side routing
- If still getting 404s, verify the `publish` directory is set to `dist`

### Environment variables not working
1. Verify variables are set in Netlify Dashboard
2. Ensure they're prefixed with `VITE_` to be accessible in the frontend
3. Rebuild after adding/updating variables

### Slow performance
- Check Netlify Analytics in the dashboard
- Consider using a CDN for static assets
- Optimize images and bundle size

## Custom Domain

To use a custom domain:
1. Go to Site Settings → Domain management
2. Click "Add custom domain"
3. Follow the DNS configuration instructions for your domain registrar

## Monitoring and Analytics

- **Netlify Analytics**: View site analytics in the dashboard
- **Build minutes**: Monitor your usage in Billing
- **Performance**: Use Netlify's built-in performance monitoring

## Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Netlify CLI Reference](https://docs.netlify.com/cli/overview/)
- [Deploy Preview Guide](https://docs.netlify.com/site-deploys/overview/#branch-and-deploy-previews)

## Support

For issues or questions:
- Check [Netlify Community Forums](https://answers.netlify.com/)
- Contact [Netlify Support](https://support.netlify.com/)
