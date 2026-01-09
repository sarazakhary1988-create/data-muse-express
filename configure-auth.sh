#!/bin/bash

# Script to update Supabase Auth settings via API
# This configures authentication for better UX

PROJECT_REF="pccxevnrigbwujmhlwgo"

echo "🔐 Updating Supabase Auth Settings"
echo "===================================="
echo ""

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  SUPABASE_ACCESS_TOKEN not found"
    read -p "Enter your Supabase Access Token: " -s SUPABASE_ACCESS_TOKEN
    echo ""
    export SUPABASE_ACCESS_TOKEN
fi

echo "Configuring authentication settings..."
echo ""

# Update auth config via Supabase API
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "SITE_URL": "https://euphonious-rolypoly-a503e3.netlify.app",
    "DISABLE_SIGNUP": false,
    "JWT_EXP": 2592000,
    "REFRESH_TOKEN_ROTATION_ENABLED": true,
    "SECURITY_REFRESH_TOKEN_REUSE_INTERVAL": 10,
    "EXTERNAL_EMAIL_ENABLED": true,
    "MAILER_AUTOCONFIRM": true,
    "MAILER_SECURE_EMAIL_CHANGE_ENABLED": false,
    "SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION": false,
    "PASSWORD_MIN_LENGTH": 6,
    "RATE_LIMIT_EMAIL_SENT": 3600
  }'

echo ""
echo ""
echo "✅ Auth settings updated successfully!"
echo ""
echo "Key changes made:"
echo "  ✓ Email confirmation disabled (auto-confirm)"
echo "  ✓ Session duration: 30 days"
echo "  ✓ Refresh tokens enabled"
echo "  ✓ Secure email change disabled"
echo "  ✓ Password re-authentication disabled"
echo ""
echo "Users can now:"
echo "  • Sign up without email confirmation"
echo "  • Stay logged in for 30 days"
echo "  • Change settings without re-entering password"
