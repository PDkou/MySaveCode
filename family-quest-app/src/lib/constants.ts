// Small shared facts about the operator/service identity, pulled out once
// PrivacyPolicyPage/TermsOfServicePage/SettingsModal's contact row all
// needed the same email address (2026-08) -- previously only
// PrivacyPolicyPage had its own local copy, which would have silently
// drifted from a second hardcoded copy the moment either one got updated
// without the other.
export const OPERATOR_NAME = 'Howling Creative Studio';
export const SUPPORT_EMAIL = 'db5704@gmail.com';
