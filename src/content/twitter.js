/**
 * X (Twitter) content script for profile extraction
 */

/**
 * Extract profile data from X/Twitter profile page
 */
function extractTwitterProfile() {
  try {
    const url = window.location.href;

    // Validate we're on a profile page (not a tweet, etc.)
    const urlMatch = url.match(/(?:twitter|x)\.com\/([^/?]+)/);
    if (!urlMatch) {
      return {
        error: 'Could not identify profile. Make sure you are on an X profile page.'
      };
    }

    const username = urlMatch[1];

    // Skip non-profile pages
    const nonProfilePaths = ['home', 'explore', 'notifications', 'messages', 'settings', 'i', 'search'];
    if (nonProfilePaths.includes(username.toLowerCase())) {
      return {
        error: 'Please navigate to a user profile page.'
      };
    }

    // Get display name - X uses a specific structure
    // The profile name is usually in an h1 or h2 within the profile header
    const nameElement = document.querySelector('[data-testid="UserName"] span span') ||
                       document.querySelector('h2[role="heading"] span span');
    const displayName = nameElement?.textContent?.trim() || null;

    // Get bio
    const bioElement = document.querySelector('[data-testid="UserDescription"]');
    const bio = bioElement?.textContent?.trim() || null;

    // Construct profile URL (normalize to x.com)
    const profileUrl = `https://x.com/${username}`;

    // Validate we have minimum required data
    if (!username) {
      return {
        error: 'Could not find profile information. Make sure you are on an X profile page.'
      };
    }

    return {
      fullName: displayName || username,
      twitterHandle: username,
      description: bio,
      profileUrl
    };
  } catch (error) {
    console.error('Twitter extraction error:', error);
    return {
      error: 'Failed to extract profile data. Please try again.'
    };
  }
}

/**
 * Show feedback toast on the page
 */
function showFeedback(success, message) {
  // Remove any existing feedback
  const existing = document.querySelector('.attio-feedback-toast');
  if (existing) {
    existing.remove();
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `attio-feedback-toast ${success ? 'success' : 'error'}`;
  toast.innerHTML = `
    <span class="attio-feedback-icon">${success ? '✓' : '✕'}</span>
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
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  } else {
    // Error messages dismiss on click
    toast.addEventListener('click', () => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    });
  }
}

/**
 * Message listener
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractProfile') {
    const profileData = extractTwitterProfile();
    sendResponse(profileData);
    return true;
  }

  if (message.action === 'showFeedback') {
    showFeedback(message.success, message.message);
    sendResponse({ received: true });
    return true;
  }
});

// Log when content script loads
console.log('Add to Attio: Twitter/X content script loaded');
