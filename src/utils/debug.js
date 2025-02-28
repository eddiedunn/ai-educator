/**
 * Debug utility functions
 */

/**
 * Determines if debug mode is enabled based on environment variables
 * 
 * @returns {boolean} True if debug mode is enabled
 */
export const isDebugMode = () => {
  // Check for explicit debug flag first
  const debugFlag = process.env.REACT_APP_ENABLE_DEBUG;
  
  if (debugFlag !== undefined) {
    return debugFlag === 'true';
  }
  
  // Fall back to development environment check
  return process.env.NODE_ENV === 'development';
};

/**
 * Logs messages to console only when in debug mode
 * 
 * @param {...any} args Arguments to pass to console.log
 */
export const debugLog = (...args) => {
  if (isDebugMode()) {
    console.log('[DEBUG]', ...args);
  }
}; 