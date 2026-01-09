# DEPLOYMENT GUIDE - Complete Step-by-Step

## 🏗️ System Architecture Overview

**MANUS 1.6 MAX** is a production-ready autonomous AI agent system with:
- Multi-model orchestration (12 LLMs)
- Real-time news via 5 MANUS tools
- 4-phase agent loop
- Memory & RAG system with vectors
- 6-agent wide research consensus
- Zero external API dependencies for news

## ✅ Pre-Deployment Checklist

Before starting, ensure you have:

- [ ] GitHub account with repository ready
- [ ] Supabase account (free tier works)
- [ ] Git installed on your machine
- [ ] Node.js 18+ installed
- [ ] Supabase CLI installed: `npm install -g supabase`
- [ ] (Optional) GitHub CLI for easier secret management

## 📋 STEP 1: GitHub Repository Setup (5 minutes)

### 1.1 Verify Repository Exists

Your repository should already be created:
```
https://github.com/sarazakhary1988-create/data-muse-express-main
```

### 1.2 Clone the Repository

```bash
git clone https://github.com/sarazakhary1988-create/data-muse-express-main.git
cd data-muse-express-main
```

### 1.3 Install Dependencies

```bash
npm install --legacy-peer-deps
```

## 💾 STEP 2: Supabase Project Setup (5 minutes)

### 2.1 Create Supabase Project

1. Go to: https://app.supabase.com
2. Click **"New Project"**
3. Fill in the form:
   - **Name**: `data-muse-express`
   - **Database Password**: Strong password (save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. **Wait 3-5 minutes** for initialization

### 2.2 Get Supabase Credentials

1. Once project is ready, go to **Settings → General**
2. Copy these values:
   ```
   PROJECT_ID = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   PROJECT_URL = https://xxxxxxxx.supabase.co
   ```
3. Go to **Settings → API**
4. Copy these keys:
   ```
   ANON_KEY = eyJ...public...key
   SERVICE_ROLE_KEY = eyJ...secret...key (keep safe!)
   ```

### 2.3 Get Database Password

You set this in 2.1 - keep it handy for Supabase CLI

## 🔐 STEP 3: Configure GitHub Secrets (5 minutes)

### 3.1 Mandatory Secrets

Go to: https://github.com/sarazakhary1988-create/data-muse-express-main/settings/secrets/actions

Click **"New repository secret"** and add:

**Secret 1: SUPABASE_PROJECT_ID**
```
Name: SUPABASE_PROJECT_ID
Value: [paste your project ID from step 2.2]
```

**Secret 2: SUPABASE_URL**
```
Name: SUPABASE_URL
Value: https://xxxxxxxx.supabase.co
```

**Secret 3: SUPABASE_ANON_KEY**
```
Name: SUPABASE_ANON_KEY
Value: [paste anon key from step 2.2]
```

**Secret 4: SUPABASE_SERVICE_ROLE_KEY**
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: [paste service role key from step 2.2]
```

**Secret 5: SUPABASE_DB_PASSWORD**
```
Name: SUPABASE_DB_PASSWORD
Value: [password you created in step 2.1]
```

### 3.2 Optional API Keys

Add these if you have them (recommended for full functionality):

```
ANTHROPIC_API_KEY = [from https://console.anthropic.com]
OPENAI_API_KEY = [from https://platform.openai.com/api-keys]
GOOGLE_API_KEY = [from https://ai.google.dev]
TOGETHER_API_KEY = [from https://www.together.ai]
```

## 💾 STEP 4: Deploy Database Schema (5 minutes)

### 4.1 Link Supabase Project

In your cloned repository:

```bash
supabase link --project-ref xxxxx-xxxxx-xxxxx
```

Where `xxxxx-xxxxx-xxxxx` is your project ID from step 2.2

You'll be prompted for your database password - enter the one from step 2.1

### 4.2 Push Migrations

Deploy the database schema:

```bash
supabase db push
```

This will:
- Create the `manus` schema
- Create 7 production tables
- Set up vector indexes (pgvector)
- Configure RLS policies
- Create helper functions

## 🚀 STEP 5: Deploy Edge Functions (5 minutes)

### 5.1 Deploy Functions

From your repository root:

```bash
supabase functions deploy
```

### 5.2 Verify Deployments

List deployed functions:
```bash
supabase functions list
```

Test health endpoint:
```bash
curl https://[PROJECT_ID].supabase.co/functions/v1/llm-router/health
```

Expected response:
```json
{"status": "ok", "timestamp": "2026-01-09T..."}
```

## ✅ Verification & Testing

After deployment:

**Check 1: GitHub Actions**
```
https://github.com/sarazakhary1988-create/data-muse-express-main/actions
```

**Check 2: Database**
In Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'manus';
```

Should see 7 tables

**Check 3: API**
```bash
curl https://[PROJECT_ID].supabase.co/functions/v1/llm-router/health
```

Should return: `{"status": "ok"}`

---

**Total Deployment Time**: ~30 minutes

**Status**: All steps complete → System ready for production

**Last Updated**: January 9, 2026
