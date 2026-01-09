#!/bin/bash

# Netlify Deployment Script for Data Muse Express
# Project: pccxevnrigbwujmhlwgo

echo "🚀 Deploying Data Muse Express to Netlify"
echo "=========================================="
echo ""

# Step 1: Get Supabase credentials
echo "📋 Step 1: Configure Supabase Environment Variables"
echo "----------------------------------------------------"
echo "Go to: https://supabase.com/dashboard/project/pccxevnrigbwujmhlwgo/settings/api"
echo ""
echo "Copy the following values:"
echo "1. Project URL (already set): https://pccxevnrigbwujmhlwgo.supabase.co"
echo "2. anon/public key"
echo ""
read -p "Paste your Supabase anon/public key: " SUPABASE_ANON_KEY

# Update .env file
cat > .env << EOF
VITE_SUPABASE_PROJECT_ID="pccxevnrigbwujmhlwgo"
VITE_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_ANON_KEY"
VITE_SUPABASE_URL="https://pccxevnrigbwujmhlwgo.supabase.co"
EOF

echo "✅ Environment variables configured"
echo ""

# Step 2: Build the project
echo "🔨 Step 2: Building the project..."
echo "------------------------------------"
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Step 3: Deploy to Netlify
echo "🌐 Step 3: Deploying to Netlify..."
echo "-----------------------------------"
echo ""
echo "Choose deployment method:"
echo "1. New site (first time deployment)"
echo "2. Existing site (update existing deployment)"
read -p "Enter choice (1 or 2): " DEPLOY_CHOICE

if [ "$DEPLOY_CHOICE" == "1" ]; then
    echo ""
    echo "This will open a browser to authenticate with Netlify."
    echo "Follow the prompts to create a new site."
    echo ""
    read -p "Press Enter to continue..."
    
    # Deploy new site
    netlify deploy --prod
    
elif [ "$DEPLOY_CHOICE" == "2" ]; then
    read -p "Enter your site ID or URL: " SITE_ID
    
    # Link to existing site
    netlify link --id "$SITE_ID"
    
    # Deploy
    netlify deploy --prod
    
else
    echo "Invalid choice"
    exit 1
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "Your site should now be live on Netlify."
echo ""
echo "Next steps:"
echo "1. Go to your Netlify dashboard: https://app.netlify.com"
echo "2. Configure environment variables in Netlify:"
echo "   - VITE_SUPABASE_URL=https://pccxevnrigbwujmhlwgo.supabase.co"
echo "   - VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_ANON_KEY"
echo "   - VITE_SUPABASE_PROJECT_ID=pccxevnrigbwujmhlwgo"
echo "3. Trigger a new deployment to use the environment variables"
echo ""
echo "📚 For more info, see: docs/deployment/NETLIFY_DEPLOYMENT.md"
