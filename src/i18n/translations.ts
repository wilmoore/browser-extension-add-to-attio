export type TranslationKey =
  | 'popup.title'
  | 'popup.auth.description'
  | 'popup.auth.apiKeyLabel'
  | 'popup.auth.apiKeyPlaceholder'
  | 'popup.auth.connect'
  | 'popup.auth.helpLink'
  | 'popup.connected.checking'
  | 'popup.noProfile.description'
  | 'popup.disconnect'
  | 'popup.status.new'
  | 'popup.status.existing'
  | 'popup.core.nameLabel'
  | 'popup.core.linkedinLabel'
  | 'popup.core.unknown'
  | 'popup.core.empty'
  | 'popup.core.connection'
  | 'popup.field.twitter'
  | 'popup.field.description'
  | 'popup.field.email'
  | 'popup.field.website'
  | 'popup.field.location'
  | 'popup.field.connectedSince'
  | 'popup.diff.attio'
  | 'popup.diff.source.linkedin'
  | 'popup.diff.source.twitter'
  | 'popup.diff.source.reddit'
  | 'popup.cta.save'
  | 'popup.cta.update'
  | 'popup.cta.skip'
  | 'popup.cta.updateAll'
  | 'popup.cta.viewInAttio'
  | 'popup.state.upToDate'
  | 'popup.inline.updated'
  | 'popup.summary.moreEmails'
  | 'popup.summary.moreWebsites'
  | 'popup.summary.noEmail'
  | 'popup.summary.noWebsite'
  | 'popup.summary.noLocation'
  | 'popup.msg.enterApiKey'
  | 'popup.msg.connected'
  | 'popup.msg.invalidApiKey'
  | 'popup.msg.connectionFailed'
  | 'popup.msg.checkFailed'
  | 'popup.msg.captureFailed'
  | 'popup.msg.updateFailed'
  | 'popup.msg.added'
  | 'popup.msg.updated'
  | 'popup.msg.unableRefresh'
  | 'popup.msg.refreshToSeeProfile'
  | 'popup.msg.refreshToCapture'
  | 'popup.msg.extractingContactInfo'
  | 'error.notAuthenticated'
  | 'error.unsupportedField'
  | 'error.internal';

const EN: Record<TranslationKey, string> = {
  'popup.title': 'Add to Attio',
  'popup.auth.description': 'Enter your Attio API key to get started.',
  'popup.auth.apiKeyLabel': 'API Key',
  'popup.auth.apiKeyPlaceholder': 'attio_...',
  'popup.auth.connect': 'Connect',
  'popup.auth.helpLink': 'How to get your API key',
  'popup.connected.checking': 'Checking Attio...',
  'popup.noProfile.description': 'Navigate to a LinkedIn, X, or Reddit profile to capture.',
  'popup.disconnect': 'Disconnect',
  'popup.status.new': 'New',
  'popup.status.existing': 'Existing',
  'popup.core.nameLabel': 'Name',
  'popup.core.linkedinLabel': 'LinkedIn',
  'popup.core.unknown': 'Unknown',
  'popup.core.empty': '\u2014',
  'popup.core.connection': ' connection',
  'popup.field.twitter': 'X',
  'popup.field.description': 'Headline',
  'popup.field.email': 'Email',
  'popup.field.website': 'Website',
  'popup.field.location': 'Location',
  'popup.field.connectedSince': 'Connected',
  'popup.diff.attio': 'Attio:',
  'popup.diff.source.linkedin': 'LinkedIn:',
  'popup.diff.source.twitter': 'X:',
  'popup.diff.source.reddit': 'Reddit:',
  'popup.cta.save': 'Save to Attio',
  'popup.cta.update': 'Update',
  'popup.cta.skip': 'Skip',
  'popup.cta.updateAll': 'Update all',
  'popup.cta.viewInAttio': 'View in Attio',
  'popup.state.upToDate': 'Up to date \u2713',
  'popup.inline.updated': '\u2713 Updated',
  'popup.summary.moreEmails': '+{n} more',
  'popup.summary.moreWebsites': '+{n} more',
  'popup.summary.noEmail': 'No email',
  'popup.summary.noWebsite': 'No website',
  'popup.summary.noLocation': 'No location',
  'popup.msg.enterApiKey': 'Please enter your API key.',
  'popup.msg.connected': 'Connected successfully!',
  'popup.msg.invalidApiKey': 'Invalid API key. Please check and try again.',
  'popup.msg.connectionFailed': 'Connection failed. Please try again.',
  'popup.msg.checkFailed': 'Failed to check profile status.',
  'popup.msg.captureFailed': 'Failed to capture profile.',
  'popup.msg.updateFailed': 'Failed to update profile.',
  'popup.msg.added': 'Saved to Attio.',
  'popup.msg.updated': 'Updated in Attio.',
  'popup.msg.unableRefresh': 'Unable to continue. Please refresh and try again.',
  'popup.msg.refreshToSeeProfile': 'Refresh page to see full profile details.',
  'popup.msg.refreshToCapture': 'Refresh page to capture this profile.',
  'popup.msg.extractingContactInfo': 'Extracting contact info...',
  'error.notAuthenticated': 'Not authenticated. Please connect your Attio account.',
  'error.unsupportedField': 'Unsupported field.',
  'error.internal': 'Internal error.',
};

export function t(key: TranslationKey): string {
  return EN[key];
}
