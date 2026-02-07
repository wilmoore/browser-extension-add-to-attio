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

    // Get name from h1 element
    const nameElement = document.querySelector('h1.text-heading-xlarge');
    const fullName = nameElement?.textContent?.trim() || null;

    // Get headline (usually in a div below the name)
    const headlineElement = document.querySelector('.text-body-medium.break-words');
    const headline = headlineElement?.textContent?.trim() || null;

    // Validate we have minimum required data
    if (!fullName && !username) {
      return {
        error: 'Could not find profile information. Make sure you are on a LinkedIn profile page.'
      };
    }

    return {
      fullName,
      linkedinUrl: profileUrl,
      username,
      description: headline
    };
  } catch (error) {
    console.error('LinkedIn extraction error:', error);
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
