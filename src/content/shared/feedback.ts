/**
 * Shared feedback toast functionality for content scripts
 */

import { TIMING } from '../../constants/index.js';

/**
 * Show feedback toast on the page
 */
export function showFeedback(success: boolean, message: string): void {
  // Remove any existing feedback
  const existing = document.querySelector('.attio-feedback-toast');
  if (existing) {
    existing.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `attio-feedback-toast ${success ? 'success' : 'error'}`;
  toast.innerHTML = `
    <span class="attio-feedback-icon">${success ? '\u2713' : '\u2715'}</span>
    <span class="attio-feedback-message">${message}</span>
  `;

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  // Auto-dismiss success messages
  if (success) {
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), TIMING.TOAST_FADE_DURATION);
    }, TIMING.TOAST_AUTO_DISMISS);
  } else {
    // Error messages dismiss on click
    toast.addEventListener('click', () => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), TIMING.TOAST_FADE_DURATION);
    });
  }
}
