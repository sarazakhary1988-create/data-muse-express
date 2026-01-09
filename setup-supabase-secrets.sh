#!/bin/bash

# Script to configure Supabase secrets for Edge Functions
# This sets up all required API keys and environment variables

echo "🔐 Setting up Supabase Secrets"
echo "==============================="
echo ""

# Check if user is logged in
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  SUPABASE_ACCESS_TOKEN not found"
    read -p "Enter your Supabase Access Token: " -s SUPABASE_ACCESS_TOKEN
    echo ""
    export SUPABASE_ACCESS_TOKEN
fi

PROJECT_REF="pccxevnrigbwujmhlwgo"

echo "📋 Required API Keys:"
echo "-------------------"
echo "1. OPENAI_API_KEY - For AI features (required)"
echo "2. ANTHROPIC_API_KEY - For Claude AI (optional)"
echo "3. ORKESTRA_API_KEY - For Orkestra services (optional)"
echo "4. EXPLORIUM_API_KEY - For lead enrichment (optional)"
echo ""

# Function to set secret
set_secret() {
    local key=$1
    local value=$2
    
    echo "Setting $key..."
    supabase secrets set "$key=$value" --project-ref "$PROJECT_REF"
}

# Get API Keys
echo "Enter your API keys (press Enter to skip optional ones):"
echo ""

read -p "OpenAI API Key (required): " -s OPENAI_KEY
echo ""

read -p "Anthropic API Key (optional, for Claude): " -s ANTHROPIC_KEY
echo ""

read -p "Orkestra API Key (optional): " -s ORKESTRA_KEY
echo ""

read -p "Explorium API Key (optional): " -s EXPLORIUM_KEY
echo ""

echo ""
echo "🔧 Setting secrets in Supabase..."
echo ""

# Set required secrets
if [ -n "$OPENAI_KEY" ]; then
    set_secret "OPENAI_API_KEY" "$OPENAI_KEY"
fi

# Set optional secrets
if [ -n "$ANTHROPIC_KEY" ]; then
    set_secret "ANTHROPIC_API_KEY" "$ANTHROPIC_KEY"
fi

if [ -n "$ORKESTRA_KEY" ]; then
    set_secret "ORKESTRA_API_KEY" "$ORKESTRA_KEY"
fi

if [ -n "$EXPLORIUM_KEY" ]; then
    set_secret "EXPLORIUM_API_KEY" "$EXPLORIUM_KEY"
fi

echo ""
echo "✅ Secrets configuration complete!"
echo ""
echo "To view all secrets, run:"
echo "  supabase secrets list --project-ref $PROJECT_REF"
echo ""
echo "To set additional secrets manually:"
echo "  supabase secrets set KEY=value --project-ref $PROJECT_REF"
