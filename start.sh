#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting AI Educator Platform...${NC}"
echo -e "${GREEN}This will stop any running processes and start everything fresh${NC}"

# Make sure the script is executable
chmod +x scripts/manage-app.js
chmod +x scripts/restart-app.js

# Run the restart:all script
npm run restart:all

# Note: The shell script will exit after the restart:all command is running
# This is expected, as the command will continue to run in the background 