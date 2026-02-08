/**
 * Debug logger utility using the debug package
 *
 * Enable logging via browser console:
 *   localStorage.debug = 'attio:*'       // All logs
 *   localStorage.debug = 'attio:api'     // API only
 *   localStorage.debug = 'attio:linkedin,attio:api'  // Multiple namespaces
 */

import createDebug from 'debug';

// Namespaced loggers for different parts of the extension
export const log = {
  api: createDebug('attio:api'),
  background: createDebug('attio:background'),
  linkedin: createDebug('attio:linkedin'),
  twitter: createDebug('attio:twitter'),
  reddit: createDebug('attio:reddit'),
  popup: createDebug('attio:popup'),
};

// Export individual loggers for convenience
export const logApi = log.api;
export const logBackground = log.background;
export const logLinkedin = log.linkedin;
export const logTwitter = log.twitter;
export const logReddit = log.reddit;
export const logPopup = log.popup;
