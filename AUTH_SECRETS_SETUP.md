# 🔐 Authentication & Secrets Configuration Guide

## Project: pccxevnrigbwujmhlwgo

This guide will help you configure authentication settings and API secrets for your Supabase project.

---

## Part 1: Configure Authentication Settings

### Step 1: Disable Email Confirmation

1. Go to: https://supabase.com/dashboard/project/pccxevnrigbwujmhlwgo/auth/settings
2. Scroll to **Email Auth**
3. **Disable** the following:
   - ❌ **Confirm email** (turn OFF)
   - ❌ **Secure email change** (turn OFF)
   - ❌ **Email OTP** (optional, can leave OFF)

### Step 2: Configure Session Settings

1. Still in **Authentication > Settings**
2. Find **JWT Settings** section:
   - **JWT expiry**: Set to `2592000` (30 days in seconds)
3. Find **Security and Protection**:
   - ✅ **Enable refresh token rotation**: ON
   - **Reuse interval**: Set to `10` seconds

### Step 3: Update Site URL

1. In **Authentication > URL Configuration**:
   - **Site URL**: `https://euphonious-rolypoly-a503e3.netlify.app`
   - **Redirect URLs**: Add these:
     ```
     https://euphonious-rolypoly-a503e3.netlify.app/**
     http://localhost:3000/**
     http://127.0.0.1:3000/**
     ```

### Step 4: Configure Email Templates (Optional)

If you want to customize welcome emails:
1. Go to: https://supabase.com/dashboard/project/pccxevnrigbwujmhlwgo/auth/templates
2. Edit templates as needed

---

## Part 2: Set Up API Secrets

### Required Secrets

Your Edge Functions need these API keys. Set them using the Supabase CLI or dashboard.

#### Using CLI (Recommended):

```bash
# Set OpenAI API Key (REQUIRED for AI features)
supabase secrets set OPENAI_API_KEY=your_openai_key_here --project-ref pccxevnrigbwujmhlwgo

# Set Anthropic API Key (Optional, for Claude AI)
supabase secrets set ANTHROPIC_API_KEY=your_anthropic_key_here --project-ref pccxevnrigbwujmhlwgo

# Set Orkestra API Key (Optional)
supabase secrets set ORKESTRA_API_KEY=your_orkestra_key_here --project-ref pccxevnrigbwujmhlwgo

# Set Explorium API Key (Optional, for lead enrichment)
supabase secrets set EXPLORIUM_API_KEY=your_explorium_key_here --project-ref pccxevnrigbwujmhlwgo
```

#### Or use the helper script:

```bash
./setup-supabase-secrets.sh
```

#### Using Dashboard:

1. Go to: https://supabase.com/dashboard/project/pccxevnrigbwujmhlwgo/settings/vault/secrets
2. Click **New secret**
3. Add each key:
   - Name: `OPENAI_API_KEY`, Value: Your OpenAI API key
   - Name: `ANTHROPIC_API_KEY`, Value: Your Anthropic API key
   - Name: `ORKESTRA_API_KEY`, Value: Your Orkestra API key
   - Name: `EXPLORIUM_API_KEY`, Value: Your Explorium API key

### Verify Secrets

```bash
supabase secrets list --project-ref pccxevnrigbwujmhlwgo
```

---

## Part 3: Configure CORS (if needed)

CORS is already configured for your functions with `verify_jwt = false` in `config.toml`.

If you need to add additional CORS headers:

1. Go to: https://supabase.com/dashboard/project/pccxevnrigbwujmhlwgo/settings/api
2. Under **API Settings** → **Additional Configuration**
3. Add custom CORS headers if needed

Current configuration allows all origins. If you want to restrict:

Edit `supabase/config.toml` and add:

```toml
[api.cors]
allowed_origins = ["https://euphonious-rolypoly-a503e3.netlify.app", "http://localhost:3000"]
allowed_headers = ["Authorization", "Content-Type"]
```

Then redeploy:
```bash
supabase db push --project-ref pccxevnrigbwujmhlwgo
```

---

## Part 4: Session Persistence (Already Configured ✅)

Your frontend is configured to:
- ✅ Store sessions in localStorage
- ✅ Auto-refresh tokens
- ✅ Persist sessions across page reloads
- ✅ Use PKCE flow for enhanced security

Configuration in `src/integrations/supabase/client.ts`:
```typescript
{
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'data-muse-auth',
  }
}
```

---

## Part 5: Test Authentication

1. Visit your app: https://euphonious-rolypoly-a503e3.netlify.app
2. Sign up with email/password
3. You should be logged in immediately (no email confirmation)
4. Close and reopen the browser - you should still be logged in
5. Session will last 30 days

---

## Quick Checklist

- [ ] Disable email confirmation in Supabase dashboard
- [ ] Set JWT expiry to 30 days
- [ ] Update site URL to Netlify URL
- [ ] Add redirect URLs
- [ ] Set OPENAI_API_KEY secret
- [ ] Set other optional API keys
- [ ] Test sign up (should work without email confirmation)
- [ ] Test session persistence (close/reopen browser)

---

## Troubleshooting

### Users still need to confirm email?
- Check that "Confirm email" is disabled in Auth settings
- Clear browser cache and localStorage
- Try in incognito mode

### Session not persisting?
- Check browser localStorage (should see `data-muse-auth` key)
- Ensure cookies/localStorage are enabled
- Check browser console for errors

### API calls failing?
- Verify secrets are set: `supabase secrets list`
- Check function logs: https://supabase.com/dashboard/project/pccxevnrigbwujmhlwgo/logs/edge-functions
- Ensure functions are deployed

---

## Support Links

- **Auth Settings**: https://supabase.com/dashboard/project/pccxevnrigbwujmhlwgo/auth/settings
- **Secrets Vault**: https://supabase.com/dashboard/project/pccxevnrigbwujmhlwgo/settings/vault/secrets
- **Function Logs**: https://supabase.com/dashboard/project/pccxevnrigbwujmhlwgo/logs/edge-functions
- **API Settings**: https://supabase.com/dashboard/project/pccxevnrigbwujmhlwgo/settings/api
