#!/usr/bin/env node

/**
 * Firefox browser launcher script for Create React App
 * Optimized for macOS and Linux only
 */

const { exec, execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const url = process.argv[2];
console.log(`Opening Firefox with URL: ${url}`);

// Detect the operating system to use the correct command
const platform = os.platform();

function findFirefoxPath() {
  if (platform === 'darwin') {
    // macOS
    const defaultPath = '/Applications/Firefox.app/Contents/MacOS/firefox';
    if (fs.existsSync(defaultPath)) {
      return defaultPath;
    }
    
    try {
      // Try to find Firefox with mdfind (macOS)
      const output = execSync('mdfind "kMDItemCFBundleIdentifier == org.mozilla.firefox"').toString().trim();
      if (output) {
        const appPath = output.split('\n')[0];
        return `${appPath}/Contents/MacOS/firefox`;
      }
    } catch (error) {
      console.error('Error finding Firefox:', error);
    }
    
    return 'open -a Firefox';
  } else {
    // Linux
    return 'firefox';
  }
}

const firefoxPath = findFirefoxPath();

let command;
if (platform === 'darwin') {
  // macOS - special handling
  if (firefoxPath.startsWith('open')) {
    command = `${firefoxPath} "${url}"`;
  } else {
    command = `"${firefoxPath}" "${url}"`;
  }
} else {
  // Linux
  command = `${firefoxPath} "${url}"`;
}

console.log(`Executing: ${command}`);

// Check if Firefox is already running - if so, it will just open a new tab
exec(command, (error) => {
  if (error) {
    console.error(`Error launching Firefox: ${error}`);
    // Fallback to default browser if Firefox fails to launch
    console.log('Falling back to default browser.');
    
    // Use simpler command as fallback
    if (platform === 'darwin') {
      exec(`open "${url}"`);
    } else {
      exec(`xdg-open "${url}"`);
    }
  }
}); 