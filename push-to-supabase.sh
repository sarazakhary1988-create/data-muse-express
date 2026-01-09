#!/bin/bash

# Script to push database migrations to Supabase
# Project ID: hhkbtwcmztozihipiszm

echo "Choose your authentication method:"
echo "1. Using Access Token (recommended)"
echo "2. Using Database URL directly"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" == "1" ]; then
    read -p "Enter your Supabase Access Token: " -s SUPABASE_ACCESS_TOKEN
    echo
    export SUPABASE_ACCESS_TOKEN
    
    echo "Linking to Supabase project..."
    supabase link --project-ref hhkbtwcmztozihipiszm
    
    echo "Pushing database migrations..."
    supabase db push
    
elif [ "$choice" == "2" ]; then
    read -p "Enter your database password: " -s DB_PASSWORD
    echo
    
    DB_URL="postgresql://postgres:${DB_PASSWORD}@db.hhkbtwcmztozihipiszm.supabase.co:5432/postgres"
    
    echo "Pushing database migrations..."
    supabase db push --db-url "$DB_URL"
    
else
    echo "Invalid choice"
    exit 1
fi

echo "✅ Database pushed successfully!"
echo ""
echo "Your migrations have been applied to Supabase:"
echo "- 20260101130541_e2532cc8-74c7-4fdd-8821-c6fd7596545c.sql"
echo "- 20260101131620_cd1aaa92-88a1-4454-8f10-1d1613068fca.sql"
echo "- 20260108050027_8d0606ea-b3de-4c21-ae8e-87de94560851.sql"
