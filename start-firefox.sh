#!/bin/bash

# Kill any existing React dev server
pkill -f "react-scripts start" || true

# Set environment variables for React
export PORT=3000

# Start React in the background
(BROWSER=none npm run react-start &)

# Wait for server to start
sleep 3

# Open Firefox with the dev server URL
open -a Firefox http://localhost:3000 