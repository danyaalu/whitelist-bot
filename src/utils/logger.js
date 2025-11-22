/**
 * Utility for logging with timestamps
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

/**
 * Get formatted timestamp
 * @returns {string} Formatted timestamp like [2025-11-22 14:30:45]
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}]`;
}

/**
 * Log message with timestamp
 * @param {string} message - Message to log
 */
function log(message) {
  console.log(`${getTimestamp()} ${message}`);
}

/**
 * Log error with timestamp in red
 * @param {string} message - Error message to log
 */
function error(message) {
  console.error(`${getTimestamp()} ${colors.red}${message}${colors.reset}`);
}

/**
 * Log warning with timestamp in yellow
 * @param {string} message - Warning message to log
 */
function warn(message) {
  console.warn(`${getTimestamp()} ${colors.yellow}${message}${colors.reset}`);
}

/**
 * Log success message with timestamp in green
 * @param {string} message - Success message to log
 */
function success(message) {
  console.log(`${getTimestamp()} ${colors.green}${message}${colors.reset}`);
}

/**
 * Log info message with timestamp in cyan
 * @param {string} message - Info message to log
 */
function info(message) {
  console.log(`${getTimestamp()} ${colors.cyan}${message}${colors.reset}`);
}

module.exports = {
  getTimestamp,
  log,
  error,
  warn,
  success,
  info,
  colors
};
