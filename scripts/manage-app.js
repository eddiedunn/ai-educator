const { exec } = require('child_process');
const os = require('os');

/**
 * Script to manage application processes
 * Finds and kills any existing Node.js processes on the development port
 * Optimized for macOS and Linux only
 */

// The port your React app runs on
const REACT_PORT = 3000;
// The port your Hardhat node runs on
const HARDHAT_PORT = 8545;

// Find processes using a specific port
function findProcessByPort(port) {
  return new Promise((resolve, reject) => {
    // Unix command to find process using port
    const command = `lsof -i :${port} -t`;
    
    exec(command, (error, stdout) => {
      if (error) {
        // No process found or command failed
        console.log(`No process found using port ${port}`);
        resolve(null);
        return;
      }

      // On Unix-like systems, output is just the PID
      const pid = stdout.trim();

      if (pid) {
        console.log(`Found process ${pid} using port ${port}`);
        resolve(pid);
      } else {
        console.log(`No process found using port ${port}`);
        resolve(null);
      }
    });
  });
}

// Kill process by PID
function killProcess(pid) {
  return new Promise((resolve, reject) => {
    if (!pid) {
      resolve(false);
      return;
    }

    // Unix command to kill process
    const command = `kill -9 ${pid}`;
    
    exec(command, (error, stdout) => {
      if (error) {
        console.error(`Error killing process ${pid}: ${error.message}`);
        resolve(false);
        return;
      }
      
      console.log(`Successfully terminated process ${pid}`);
      resolve(true);
    });
  });
}

// Kill processes using React and Hardhat ports
async function killAppProcesses() {
  try {
    // Find and kill React process
    const reactPid = await findProcessByPort(REACT_PORT);
    if (reactPid) {
      await killProcess(reactPid);
    }
    
    // Find and kill Hardhat process
    const hardhatPid = await findProcessByPort(HARDHAT_PORT);
    if (hardhatPid) {
      await killProcess(hardhatPid);
    }
    
    // Wait a moment for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('All running processes terminated.');
    return true;
  } catch (error) {
    console.error('Error managing processes:', error);
    return false;
  }
}

// If script is run directly
if (require.main === module) {
  killAppProcesses()
    .then(() => {
      console.log('Process cleanup complete.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Process cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { killAppProcesses }; 