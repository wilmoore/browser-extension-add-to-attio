/**
 * LinkedIn content script for profile extraction
 */

/**
 * Extract profile data from LinkedIn profile page
 */
function extractLinkedInProfile() {
  try {
    // Get the profile URL (canonical)
    const profileUrl = window.location.href.split('?')[0];

    // Extract username from URL
    const usernameMatch = profileUrl.match(/linkedin\.com\/in\/([^/]+)/);
    const username = usernameMatch ? usernameMatch[1] : null;

    // Get name - try multiple selectors as LinkedIn changes their HTML
    // Priority: most specific to least specific
    const nameSelectors = [
      'h1.text-heading-xlarge',                    // Current main profile (2024+)
      '.pv-text-details__left-panel h1',           // Profile details panel
      '[data-generated-suggestion-target] h1',     // Suggested profile variant
      'h1[data-anonymize="person-name"]',          // Data attribute variant
      '.ph5 h1',                                   // Mobile/compact view
      '.pv-top-card h1',                           // Top card variant
      '.scaffold-layout__main h1',                 // Layout variant
      'section.pv-top-card h1',                    // Section variant
      '.artdeco-card h1',                          // Card container variant
      'main h1',                                   // Main content h1
      'h1'                                         // Last resort: first h1
    ];

    let fullName = null;
    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.trim();
      // Skip if text is too short or looks like a navigation element
      if (text && text.length > 1 && !text.includes('LinkedIn')) {
        fullName = text;
        console.log('[Add to Attio] Found name with selector:', selector, '→', fullName);
        break;
      }
    }

    // Get headline (usually in a div below the name)
    const headlineSelectors = [
      '.text-body-medium.break-words',
      '[data-anonymize="headline"]',
      '.pv-top-card--list .text-body-medium',
      '.pv-top-card .pv-top-card--photo-resize + div + div'
    ];

    let headline = null;
    for (const selector of headlineSelectors) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.trim();
      if (text && text.length > 1) {
        headline = text;
        console.log('[Add to Attio] Found headline with selector:', selector);
        break;
      }
    }

    console.log('[Add to Attio] Extracted profile data:', {
      fullName,
      username,
      profileUrl,
      headline: headline?.substring(0, 50) + (headline?.length > 50 ? '...' : '')
    });

    // Validate we have minimum required data
    if (!fullName && !username) {
      console.warn('[Add to Attio] Could not extract name or username');
      return {
        error: 'Could not find profile information. Make sure you are on a LinkedIn profile page.'
      };
    }

    // If we couldn't extract the name but have a username, use a formatted version of it
    // e.g., "john-doe-123" becomes "John Doe"
    let displayName = fullName;
    if (!displayName && username) {
      // Remove trailing numbers/IDs and convert dashes to spaces
      displayName = username
        .replace(/-\d+$/, '')           // Remove trailing -123 style IDs
        .replace(/-/g, ' ')             // Replace dashes with spaces
        .replace(/\b\w/g, c => c.toUpperCase());  // Capitalize each word
      console.log('[Add to Attio] Using formatted username as name:', displayName);
    }

    return {
      fullName: displayName,
      linkedinUrl: profileUrl,
      username,
      description: headline
    };
  } catch (error) {
    console.error('[Add to Attio] LinkedIn extraction error:', error);
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
    const profileData = extractLinkedInProfile();
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
console.log('Add to Attio: LinkedIn content script loaded');
