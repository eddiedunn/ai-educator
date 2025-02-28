#!/usr/bin/env node

/**
 * Firefox browser launcher script for Create React App
 * This script is executed by react-scripts when starting the dev server
 */

const { exec } = require('child_process');
const path = require('path');
const os = require('os');

const url = process.argv[2];
console.log(`Opening Firefox with URL: ${url}`);

// Detect the operating system to use the correct command
const platform = os.platform();

let command;

if (platform === 'darwin') {
  // macOS
  command = `open -a Firefox "${url}"`;
} else if (platform === 'win32') {
  // Windows
  command = `start firefox "${url}"`;
} else {
  // Linux and others
  command = `firefox "${url}"`;
}

console.log(`Executing: ${command}`);
exec(command, (error) => {
  if (error) {
    console.error(`Error launching Firefox: ${error}`);
    // Fallback to default browser if Firefox fails to launch
    console.log('Falling back to default browser.');
  }
}); 