const { exec } = require('child_process');
const { killAppProcesses } = require('./manage-app');

/**
 * Restart Application Script
 * 
 * This script kills any running instances of the app on ports 3000 and 8545,
 * then runs the specified npm command.
 */

async function restartApp() {
  try {
    // Get the command to run after killing processes
    const args = process.argv.slice(2);
    const command = args.join(' ');
    
    if (!command) {
      console.error('Error: No command specified');
      console.log('Usage: node restart-app.js <command>');
      console.log('Example: node restart-app.js npm start');
      process.exit(1);
    }
    
    console.log(`Preparing to run: ${command}`);
    console.log('First, stopping any running processes...');
    
    // Kill any running processes
    await killAppProcesses();
    
    console.log(`Executing: ${command}`);
    
    // Execute the requested command
    const child = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        return;
      }
      
      if (stderr) {
        console.error(`Command stderr: ${stderr}`);
      }
      
      console.log(`Command stdout: ${stdout}`);
    });
    
    // Forward the child process output to the parent process
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    
    // Handle clean exit
    process.on('SIGINT', () => {
      console.log('Received SIGINT, cleaning up...');
      if (child) {
        child.kill('SIGINT');
      }
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error restarting app:', error);
    process.exit(1);
  }
}

// Run the script
restartApp(); 