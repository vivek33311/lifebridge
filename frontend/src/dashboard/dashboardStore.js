/**
 * @fileoverview LocalStorage-backed multi-user datastore with strict ownership enforcement.
 * Manages clinical analyses, patient profiles, emergency contacts, and personal settings.
 * @module dashboard/dashboardStore
 */

import { verifyOwnership, serializeUserDataForExport } from './dashboardMath.js';
import {
  DEMO_USER_ID,
  DEMO_USER,
  generateSampleAnalyses,
  generateSampleProfiles,
  generateSampleContacts
} from './dashboardSeed.js';

const STORAGE_KEYS = {
  CURRENT_USER: 'lifebridge_current_user',
  USERS: 'lifebridge_users',
  ANALYSES: 'lifebridge_analyses',
  PROFILES: 'lifebridge_profiles',
  CONTACTS: 'lifebridge_contacts',
  SETTINGS: 'lifebridge_settings',
  ACTIVE_PROFILE: 'lifebridge_active_profile'
};

/**
 * Safely parses JSON from localStorage with fallback.
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safely writes JSON to localStorage.
 * @param {string} key
 * @param {*} value
 */
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[LifeBridge Store] LocalStorage write failed for key "${key}":`, err);
  }
}

/* ==========================================================================
   AUTHENTICATION & SESSION MANAGEMENT
   ========================================================================== */

/**
 * Retrieves the currently logged-in user.
 * @returns {Object|null}
 */
export function getCurrentUser() {
  return readStorage(STORAGE_KEYS.CURRENT_USER, null);
}

/**
 * Sets the active user session.
 * @param {Object} user
 */
export function setCurrentUser(user) {
  writeStorage(STORAGE_KEYS.CURRENT_USER, user);
  notifyAuthSubscribers(user);
}

/**
 * Logs out the current user session.
 */
export function logoutUser() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE);
  notifyAuthSubscribers(null);
}

const authListeners = new Set();

/**
 * Registers an auth change observer.
 * @param {Function} cb
 * @returns {Function} Unsubscribe handler.
 */
export function onAuthStateChange(cb) {
  authListeners.add(cb);
  return () => authListeners.delete(cb);
}

function notifyAuthSubscribers(user) {
  for (const cb of authListeners) {
    try {
      cb(user);
    } catch (e) {
      console.error('[LifeBridge Store] Auth listener error:', e);
    }
  }
}

/**
 * Authenticates user credentials or provides demo session.
 * @param {string} email
 * @param {string} password
 * @returns {{ success: boolean, user?: Object, error?: string }}
 */
export function login(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();

  // Demo account instant login
  if (cleanEmail === 'demo@lifebridge.org' || cleanEmail === 'demo') {
    return loginDemoUser();
  }

  const users = readStorage(STORAGE_KEYS.USERS, []);
  const found = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);

  if (!found) {
    return { success: false, error: 'Invalid email or password.' };
  }

  const sessionUser = {
    id: found.id,
    email: found.email,
    name: found.name,
    role: found.role || 'Paramedic / Family Lead',
    isDemo: false
  };

  setCurrentUser(sessionUser);
  return { success: true, user: sessionUser };
}

/**
 * Seeds and logs into the pre-configured demo account.
 * @returns {{ success: boolean, user: Object }}
 */
export function loginDemoUser() {
  setCurrentUser(DEMO_USER);
  seedDemoDataIfNeeded(DEMO_USER_ID);
  return { success: true, user: DEMO_USER };
}

/**
 * Registers a new user account locally.
 * @param {string} email
 * @param {string} name
 * @param {string} password
 * @returns {{ success: boolean, user?: Object, error?: string }}
 */
export function registerUser(email, name, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (name || '').trim();

  if (!cleanEmail || !cleanName || !password) {
    return { success: false, error: 'Please provide email, name, and password.' };
  }

  const users = readStorage(STORAGE_KEYS.USERS, []);
  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const newUser = {
    id: 'user_' + Date.now().toString(36),
    email: cleanEmail,
    name: cleanName,
    password,
    role: 'Paramedic / Family Lead',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeStorage(STORAGE_KEYS.USERS, users);

  const sessionUser = {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    isDemo: false
  };

  setCurrentUser(sessionUser);
  return { success: true, user: sessionUser };
}

/**
 * Seeds demo data if not already present for the given user ID.
 * @param {string} userId
 */
export function seedDemoDataIfNeeded(userId) {
  if (userId !== DEMO_USER_ID) return;

  const allAnalyses = readStorage(STORAGE_KEYS.ANALYSES, []);
  const userAnalyses = allAnalyses.filter(a => a.userId === userId);

  if (userAnalyses.length === 0) {
    const samples = generateSampleAnalyses();
    allAnalyses.push(...samples);
    writeStorage(STORAGE_KEYS.ANALYSES, allAnalyses);
  }

  const allProfiles = readStorage(STORAGE_KEYS.PROFILES, []);
  const userProfiles = allProfiles.filter(p => p.userId === userId);
  if (userProfiles.length === 0) {
    allProfiles.push(...generateSampleProfiles());
    writeStorage(STORAGE_KEYS.PROFILES, allProfiles);
  }

  const allContacts = readStorage(STORAGE_KEYS.CONTACTS, []);
  const userContacts = allContacts.filter(c => c.userId === userId);
  if (userContacts.length === 0) {
    allContacts.push(...generateSampleContacts());
    writeStorage(STORAGE_KEYS.CONTACTS, allContacts);
  }
}

/* ==========================================================================
   ANALYSIS RECORDS CRUD (WITH STRICT OWNERSHIP)
   ========================================================================== */

/**
 * Returns all analysis records belonging to the specified user.
 * @param {string} userId
 * @returns {Array<Object>}
 */
export function getAnalysesForUser(userId) {
  if (!userId) return [];
  const all = readStorage(STORAGE_KEYS.ANALYSES, []);
  return all.filter(item => verifyOwnership(item, userId));
}

/**
 * Saves a new completed analysis record to the user's history.
 * @param {string} userId
 * @param {Object} analysisData
 * @param {Object} [patientProfile] - Optional active profile linked to analysis.
 * @returns {Object} Saved record.
 */
export function saveAnalysisForUser(userId, analysisData, patientProfile = null) {
  if (!userId) throw new Error('User authentication required to save analysis.');
  if (!analysisData) throw new Error('Analysis payload missing.');

  const all = readStorage(STORAGE_KEYS.ANALYSES, []);

  const newRecord = {
    id: 'analysis_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    userId,
    isSample: false,
    timestamp: new Date().toISOString(),
    patient_name: patientProfile ? patientProfile.name : 'Unassigned',
    patient_id: patientProfile ? patientProfile.id : null,
    urgency_level: analysisData.urgency_level || 'MEDIUM',
    situation_summary: analysisData.situation_summary || '',
    confidence_score: analysisData.confidence_score || 0.95,
    extracted_facts: Array.isArray(analysisData.extracted_facts) ? analysisData.extracted_facts : [],
    recommended_actions: Array.isArray(analysisData.recommended_actions) ? analysisData.recommended_actions : [],
    call_108_script: analysisData.call_108_script || '',
    missing_information: Array.isArray(analysisData.missing_information) ? analysisData.missing_information : [],
    verification: analysisData.verification || {
      status: 'VERIFIED',
      soundness: 'Corroborated by verification engine.',
      prunedActionsCount: 0,
      safetyOverridesApplied: 0,
      timestamp: new Date().toISOString()
    }
  };

  all.unshift(newRecord);
  writeStorage(STORAGE_KEYS.ANALYSES, all);
  return newRecord;
}

/**
 * Retrieves a single analysis record by ID, verifying ownership.
 * @param {string} userId
 * @param {string} analysisId
 * @returns {Object|null}
 */
export function getAnalysisById(userId, analysisId) {
  if (!userId || !analysisId) return null;
  const all = readStorage(STORAGE_KEYS.ANALYSES, []);
  const found = all.find(a => a.id === analysisId);
  if (!found || !verifyOwnership(found, userId)) {
    return null;
  }
  return found;
}

/* ==========================================================================
   PATIENT PROFILES CRUD
   ========================================================================== */

/**
 * Returns all patient profiles for the given user.
 * @param {string} userId
 * @returns {Array<Object>}
 */
export function getProfilesForUser(userId) {
  if (!userId) return [];
  const all = readStorage(STORAGE_KEYS.PROFILES, []);
  return all.filter(p => verifyOwnership(p, userId));
}

/**
 * Creates or updates a patient profile.
 * @param {string} userId
 * @param {Object} profileData
 * @returns {Object} Saved profile.
 */
export function saveProfile(userId, profileData) {
  if (!userId) throw new Error('User ID required');
  const all = readStorage(STORAGE_KEYS.PROFILES, []);

  if (profileData.id) {
    // Update existing - verify ownership first
    const idx = all.findIndex(p => p.id === profileData.id);
    if (idx === -1 || !verifyOwnership(all[idx], userId)) {
      throw new Error('Profile not found or unauthorized access.');
    }
    all[idx] = {
      ...all[idx],
      name: profileData.name.trim(),
      age: Number(profileData.age) || 0,
      allergies: (profileData.allergies || '').trim(),
      medications: (profileData.medications || '').trim(),
      notes: (profileData.notes || '').trim(),
      updatedAt: new Date().toISOString()
    };
    writeStorage(STORAGE_KEYS.PROFILES, all);
    return all[idx];
  }

  // Create new profile
  const newProfile = {
    id: 'prof_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    userId,
    name: (profileData.name || 'Unnamed').trim(),
    age: Number(profileData.age) || 0,
    allergies: (profileData.allergies || '').trim(),
    medications: (profileData.medications || '').trim(),
    notes: (profileData.notes || '').trim(),
    createdAt: new Date().toISOString()
  };

  all.push(newProfile);
  writeStorage(STORAGE_KEYS.PROFILES, all);
  return newProfile;
}

/**
 * Deletes a patient profile after ownership check.
 * @param {string} userId
 * @param {string} profileId
 * @returns {boolean} True if deleted.
 */
export function deleteProfile(userId, profileId) {
  if (!userId || !profileId) return false;
  const all = readStorage(STORAGE_KEYS.PROFILES, []);
  const target = all.find(p => p.id === profileId);

  if (!target || !verifyOwnership(target, userId)) {
    return false;
  }

  const filtered = all.filter(p => p.id !== profileId);
  writeStorage(STORAGE_KEYS.PROFILES, filtered);

  // If active profile was deleted, clear it
  const active = getActiveProfile();
  if (active && active.id === profileId) {
    setActiveProfile(null);
  }

  return true;
}

/**
 * Gets currently active profile selected for upcoming analyses.
 * @returns {Object|null}
 */
export function getActiveProfile() {
  return readStorage(STORAGE_KEYS.ACTIVE_PROFILE, null);
}

/**
 * Sets the active profile to provide clinical context during analysis.
 * @param {Object|null} profile
 */
export function setActiveProfile(profile) {
  if (!profile) {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE);
  } else {
    writeStorage(STORAGE_KEYS.ACTIVE_PROFILE, profile);
  }
}

/* ==========================================================================
   EMERGENCY CONTACTS CRUD
   ========================================================================== */

/**
 * Returns emergency contacts for a given user.
 * @param {string} userId
 * @returns {Array<Object>}
 */
export function getContactsForUser(userId) {
  if (!userId) return [];
  const all = readStorage(STORAGE_KEYS.CONTACTS, []);
  return all.filter(c => verifyOwnership(c, userId));
}

/**
 * Adds or updates an emergency contact.
 * @param {string} userId
 * @param {Object} contactData
 * @returns {Object}
 */
export function saveContact(userId, contactData) {
  if (!userId) throw new Error('User ID required');
  const all = readStorage(STORAGE_KEYS.CONTACTS, []);

  if (contactData.id) {
    const idx = all.findIndex(c => c.id === contactData.id);
    if (idx === -1 || !verifyOwnership(all[idx], userId)) {
      throw new Error('Contact not found or unauthorized access.');
    }
    all[idx] = {
      ...all[idx],
      name: contactData.name.trim(),
      relationship: (contactData.relationship || '').trim(),
      phone: contactData.phone.trim(),
      notifyOnCritical: Boolean(contactData.notifyOnCritical),
      updatedAt: new Date().toISOString()
    };
    writeStorage(STORAGE_KEYS.CONTACTS, all);
    return all[idx];
  }

  const newContact = {
    id: 'contact_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    userId,
    name: contactData.name.trim(),
    relationship: (contactData.relationship || 'Emergency Contact').trim(),
    phone: contactData.phone.trim(),
    notifyOnCritical: Boolean(contactData.notifyOnCritical),
    createdAt: new Date().toISOString()
  };

  all.push(newContact);
  writeStorage(STORAGE_KEYS.CONTACTS, all);
  return newContact;
}

/**
 * Deletes an emergency contact.
 * @param {string} userId
 * @param {string} contactId
 * @returns {boolean}
 */
export function deleteContact(userId, contactId) {
  if (!userId || !contactId) return false;
  const all = readStorage(STORAGE_KEYS.CONTACTS, []);
  const target = all.find(c => c.id === contactId);

  if (!target || !verifyOwnership(target, userId)) {
    return false;
  }

  const filtered = all.filter(c => c.id !== contactId);
  writeStorage(STORAGE_KEYS.CONTACTS, filtered);
  return true;
}

/* ==========================================================================
   SETTINGS & DATA EXPORT / DESTRUCTION
   ========================================================================== */

const DEFAULT_SETTINGS = {
  language: 'en-IN',
  textSize: 'standard', // 'standard' | 'large' | 'xlarge'
  reducedMotion: 'system' // 'system' | 'reduced' | 'normal'
};

/**
 * Returns settings for user.
 * @param {string} userId
 * @returns {Object}
 */
export function getSettingsForUser(userId) {
  if (!userId) return { ...DEFAULT_SETTINGS, userId: '' };
  const all = readStorage(STORAGE_KEYS.SETTINGS, {});
  return {
    ...DEFAULT_SETTINGS,
    userId,
    ...(all[userId] || {})
  };
}

/**
 * Updates user settings.
 * @param {string} userId
 * @param {Object} partialSettings
 * @returns {Object}
 */
export function saveSettingsForUser(userId, partialSettings) {
  if (!userId) throw new Error('User ID required');
  const all = readStorage(STORAGE_KEYS.SETTINGS, {});
  const current = all[userId] || DEFAULT_SETTINGS;
  const updated = {
    ...current,
    ...partialSettings,
    userId
  };
  all[userId] = updated;
  writeStorage(STORAGE_KEYS.SETTINGS, all);
  return updated;
}

/**
 * Exports all data for the specified user as a structured JSON string.
 * @param {string} userId
 * @returns {string} JSON export payload.
 */
export function exportUserDataJson(userId) {
  if (!userId) throw new Error('User ID required');
  const analyses = getAnalysesForUser(userId);
  const profiles = getProfilesForUser(userId);
  const contacts = getContactsForUser(userId);
  const settings = getSettingsForUser(userId);

  return serializeUserDataForExport(userId, {
    analyses,
    profiles,
    contacts,
    settings
  });
}

/**
 * Deletes all stored data for the specified user (GDPR / Right to be forgotten).
 * @param {string} userId
 * @returns {boolean}
 */
export function deleteUserData(userId) {
  if (!userId) return false;

  // 1. Remove analyses
  const analyses = readStorage(STORAGE_KEYS.ANALYSES, []);
  writeStorage(STORAGE_KEYS.ANALYSES, analyses.filter(a => a.userId !== userId));

  // 2. Remove profiles
  const profiles = readStorage(STORAGE_KEYS.PROFILES, []);
  writeStorage(STORAGE_KEYS.PROFILES, profiles.filter(p => p.userId !== userId));

  // 3. Remove contacts
  const contacts = readStorage(STORAGE_KEYS.CONTACTS, []);
  writeStorage(STORAGE_KEYS.CONTACTS, contacts.filter(c => c.userId !== userId));

  // 4. Remove settings
  const settings = readStorage(STORAGE_KEYS.SETTINGS, {});
  delete settings[userId];
  writeStorage(STORAGE_KEYS.SETTINGS, settings);

  // 5. Clear active profile if was for this user
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE);

  return true;
}
