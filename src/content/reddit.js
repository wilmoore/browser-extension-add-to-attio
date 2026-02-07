/**
 * Reddit content script for profile extraction
 */

/**
 * Extract profile data from Reddit user page
 */
function extractRedditProfile() {
  try {
    const url = window.location.href;

    // Extract username from URL
    const urlMatch = url.match(/reddit\.com\/user\/([^/?]+)/);
    if (!urlMatch) {
      return {
        error: 'Could not identify user. Make sure you are on a Reddit user profile page.'
      };
    }

    const username = urlMatch[1];

    // Skip special pages
    if (username === 'me') {
      return {
        error: 'Please navigate to a specific user profile page.'
      };
    }

    // Construct profile URL
    const profileUrl = `https://www.reddit.com/user/${username}`;

    // Try to get display name if available (Reddit doesn't always show this)
    // Reddit's new design uses different selectors
    const displayNameElement = document.querySelector('[data-testid="profile-header-display-name"]') ||
                               document.querySelector('h1');
    const displayName = displayNameElement?.textContent?.trim() || null;

    // Try to get user bio/description
    const bioElement = document.querySelector('[data-testid="profile-header-about"]') ||
                       document.querySelector('.Profile__description');
    const bio = bioElement?.textContent?.trim() || null;

    return {
      fullName: displayName || `u/${username}`,
      redditUsername: username,
      description: bio,
      profileUrl
    };
  } catch (error) {
    console.error('Reddit extraction error:', error);
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
    const profileData = extractRedditProfile();
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
console.log('Add to Attio: Reddit content script loaded');
