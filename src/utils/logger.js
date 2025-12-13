/**
 * Utility for logging with timestamps and file storage
 */
const fs = require('fs');
const path = require('path');

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

// Initialize log file
const logsDir = path.join(__dirname, '../../logs');
let currentLogFile = null;

try {
  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Determine log filename
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  // Find existing logs for today to determine index
  const files = fs.readdirSync(logsDir);
  const todayLogs = files.filter(file => file.startsWith(dateStr) && file.endsWith('.log'));
  
  let maxIndex = 0;
  for (const file of todayLogs) {
    // Format: YYYY-MM-DD-X.log
    const parts = file.replace('.log', '').split('-');
    const index = parseInt(parts[parts.length - 1]);
    if (!isNaN(index) && index > maxIndex) {
      maxIndex = index;
    }
  }

  const nextIndex = maxIndex + 1;
  currentLogFile = path.join(logsDir, `${dateStr}-${nextIndex}.log`);
  
  // Create the file immediately to reserve the name
  fs.writeFileSync(currentLogFile, `Log started at ${new Date().toISOString()}\n`);
  
} catch (err) {
  console.error('Failed to initialize logger:', err);
}

/**
 * Strip ANSI color codes from string
 * @param {string} str 
 * @returns {string}
 */
function stripAnsi(str) {
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

/**
 * Write message to log file
 * @param {string} message 
 */
function writeToFile(message) {
  if (currentLogFile) {
    try {
      const cleanMessage = stripAnsi(message);
      fs.appendFileSync(currentLogFile, cleanMessage + '\n');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }
}

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
  const msg = `${getTimestamp()} ${message}`;
  console.log(msg);
  writeToFile(msg);
}

/**
 * Log error with timestamp in red
 * @param {string} message - Error message to log
 */
function error(message) {
  const timestamp = getTimestamp();
  console.error(`${timestamp} ${colors.red}${message}${colors.reset}`);
  writeToFile(`${timestamp} [ERROR] ${message}`);
}

/**
 * Log warning with timestamp in yellow
 * @param {string} message - Warning message to log
 */
function warn(message) {
  const timestamp = getTimestamp();
  console.warn(`${timestamp} ${colors.yellow}${message}${colors.reset}`);
  writeToFile(`${timestamp} [WARN] ${message}`);
}

/**
 * Log success message with timestamp in green
 * @param {string} message - Success message to log
 */
function success(message) {
  const timestamp = getTimestamp();
  console.log(`${timestamp} ${colors.green}${message}${colors.reset}`);
  writeToFile(`${timestamp} [SUCCESS] ${message}`);
}

/**
 * Log info message with timestamp in cyan
 * @param {string} message - Info message to log
 */
function info(message) {
  const timestamp = getTimestamp();
  console.log(`${timestamp} ${colors.cyan}${message}${colors.reset}`);
  writeToFile(`${timestamp} [INFO] ${message}`);
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
