#!/bin/bash
cd "$(dirname "$0")"
echo "🍿 Starting Famflix Server..."
# Use --env-file to pass variables from .env.local to docker-compose for variable substitution
docker-compose --env-file .env.local up -d --build
echo "✅ Server is running!"
echo "You can close this window."
