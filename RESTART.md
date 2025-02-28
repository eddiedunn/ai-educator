# Process Management Scripts

This document explains the process management scripts that have been added to the AI Educator platform to help manage running processes and restart the application.

## Available Scripts

The following npm scripts have been added to simplify process management:

### Basic Management

- `npm run stop` - Stops any running instances of the app (React frontend on port 3000 and Hardhat node on port 8545)
- `npm run restart` - Stops any running instances and starts the React app
- `npm run restart:chain` - Stops any running instances and starts a new Hardhat blockchain node

### Deployment Management

- `npm run restart:deploy` - Stops any running instances and deploys the smart contracts to the local network
- `npm run restart:deploy:full` - Stops any running instances and runs the full deployment process including frontend updates
- `npm run restart:all` - Stops all processes, then sequentially:
  1. Starts a Hardhat blockchain node
  2. Waits 5 seconds for the node to initialize
  3. Deploys contracts and updates the frontend
  4. Starts the React app

## How It Works

These scripts use two utility modules:

1. `scripts/manage-app.js` - Finds and terminates processes running on ports 3000 (React) and 8545 (Hardhat)
2. `scripts/restart-app.js` - Runs the process termination and then executes another specified command

The scripts are optimized for:
- macOS
- Linux

## Troubleshooting

If you encounter any issues with the restart scripts:

1. Make sure you have the necessary permissions to terminate processes
2. Run `chmod +x scripts/manage-app.js scripts/restart-app.js` to make the scripts executable
3. Make sure you have `lsof` installed on your system (available by default on macOS, may need installation on some Linux distributions)

## Quick Start

For the most convenient startup experience, you can use the shell script:

```bash
# Make the script executable (first time only)
chmod +x start.sh

# Run everything with one command
./start.sh
```

This will stop any running processes and start the entire application stack.

## Known Limitations

- The process detection relies on finding processes bound to specific ports (3000 and 8545)
- If you're running other services on these ports, they may be terminated as well
- The scripts use Unix commands like `lsof` and `kill` which are standard on macOS and most Linux distributions 