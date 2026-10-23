/**
 * @fileoverview Pure mathematical, filtering, sorting, and transformation functions
 * for the LifeBridge Clinical Decision Dashboard. Zero side effects, fully testable.
 * @module dashboard/dashboardMath
 */

/**
 * Valid urgency levels in order of clinical severity.
 */
export const URGENCY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Computes high-level overview metrics across an array of analysis records.
 *
 * @param {Array<Object>} analyses - List of analysis records.
 * @returns {{
 *   total: number,
 *   critical: number,
 *   avgConfidence: number,
 *   factsPruned: number
 * }}
 */
export function computeOverviewStats(analyses = []) {
  if (!Array.isArray(analyses) || analyses.length === 0) {
    return {
      total: 0,
      critical: 0,
      avgConfidence: 0,
      factsPruned: 0
    };
  }

  const total = analyses.length;
  let criticalCount = 0;
  let totalConfidence = 0;
  let factsPruned = 0;

  for (const item of analyses) {
    if (item.urgency_level === 'CRITICAL') {
      criticalCount++;
    }

    // Confidence: normalize 0..1 to 0..100 if fractional
    const conf = typeof item.confidence_score === 'number'
      ? (item.confidence_score <= 1.0 ? item.confidence_score * 100 : item.confidence_score)
      : 0;
    totalConfidence += conf;

    // Pruned facts or actions count from verification metadata
    if (item.verification && typeof item.verification.prunedActionsCount === 'number') {
      factsPruned += item.verification.prunedActionsCount;
    }
  }

  const avgConfidence = total > 0 ? Math.round((totalConfidence / total) * 10) / 10 : 0;

  return {
    total,
    critical: criticalCount,
    avgConfidence,
    factsPruned
  };
}

/**
 * Computes count and percentage distribution across urgency tiers.
 *
 * @param {Array<Object>} analyses - List of analysis records.
 * @returns {{
 *   counts: Record<string, number>,
 *   percentages: Record<string, number>,
 *   total: number
 * }}
 */
export function computeUrgencyBreakdown(analyses = []) {
  const counts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  };

  if (!Array.isArray(analyses) || analyses.length === 0) {
    return {
      counts,
      percentages: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
      total: 0
    };
  }

  for (const item of analyses) {
    const level = (item.urgency_level || '').toUpperCase();
    if (counts[level] !== undefined) {
      counts[level]++;
    }
  }

  const total = analyses.length;
  const percentages = {};
  for (const level of URGENCY_LEVELS) {
    percentages[level] = total > 0 ? Math.round((counts[level] / total) * 100) : 0;
  }

  return {
    counts,
    percentages,
    total
  };
}

/**
 * Computes a day-by-day frequency timeline for the last 7 calendar days.
 *
 * @param {Array<Object>} analyses - List of analysis records.
 * @param {Date|string} [referenceDate=new Date()] - Reference end date (typically today).
 * @returns {Array<{
 *   dateStr: string,
 *   dayLabel: string,
 *   total: number,
 *   critical: number
 * }>}
 */
export function computeLast7DaysTrend(analyses = [], referenceDate = new Date()) {
  const ref = new Date(referenceDate);
  const days = [];

  // Generate 7 consecutive days ending today
  for (let i = 6; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    days.push({
      dateStr,
      dayLabel,
      total: 0,
      critical: 0
    });
  }

  const dayMap = new Map(days.map(d => [d.dateStr, d]));

  if (Array.isArray(analyses)) {
    for (const item of analyses) {
      if (!item.timestamp) continue;
      const itemDateStr = new Date(item.timestamp).toISOString().slice(0, 10);
      if (dayMap.has(itemDateStr)) {
        const slot = dayMap.get(itemDateStr);
        slot.total++;
        if (item.urgency_level === 'CRITICAL') {
          slot.critical++;
        }
      }
    }
  }

  return days;
}

/**
 * Filters analyses by text search (summary, script, facts) and urgency tier.
 *
 * @param {Array<Object>} analyses - Raw list.
 * @param {Object} filters
 * @param {string} [filters.search=''] - Keyword search.
 * @param {string} [filters.urgency='ALL'] - Urgency tier filter.
 * @returns {Array<Object>}
 */
export function filterAnalyses(analyses = [], { search = '', urgency = 'ALL' } = {}) {
  if (!Array.isArray(analyses)) return [];

  const query = (search || '').trim().toLowerCase();
  const filterUrgency = (urgency || 'ALL').toUpperCase();

  return analyses.filter(item => {
    // 1. Urgency filter
    if (filterUrgency !== 'ALL' && item.urgency_level !== filterUrgency) {
      return false;
    }

    // 2. Search query filter
    if (query) {
      const summaryMatch = (item.situation_summary || '').toLowerCase().includes(query);
      const scriptMatch = (item.call_108_script || '').toLowerCase().includes(query);
      const factsMatch = Array.isArray(item.extracted_facts)
        && item.extracted_facts.some(f => (f.fact || '').toLowerCase().includes(query));
      const actionsMatch = Array.isArray(item.recommended_actions)
        && item.recommended_actions.some(a => (a.action || '').toLowerCase().includes(query));
      const profileMatch = (item.patient_name || '').toLowerCase().includes(query);

      if (!summaryMatch && !scriptMatch && !factsMatch && !actionsMatch && !profileMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts analyses by specified field and direction.
 *
 * @param {Array<Object>} analyses - List to sort.
 * @param {Object} sortOptions
 * @param {'date'|'urgency'|'confidence'} [sortOptions.sortBy='date']
 * @param {'asc'|'desc'} [sortOptions.order='desc']
 * @returns {Array<Object>} New sorted array.
 */
export function sortAnalyses(analyses = [], { sortBy = 'date', order = 'desc' } = {}) {
  if (!Array.isArray(analyses)) return [];
  const copy = [...analyses];
  const isAsc = order === 'asc';

  const urgencyRank = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };

  return copy.sort((a, b) => {
    if (sortBy === 'urgency') {
      const rankA = urgencyRank[a.urgency_level] || 0;
      const rankB = urgencyRank[b.urgency_level] || 0;
      return isAsc ? rankA - rankB : rankB - rankA;
    }

    if (sortBy === 'confidence') {
      const confA = typeof a.confidence_score === 'number' ? a.confidence_score : 0;
      const confB = typeof b.confidence_score === 'number' ? b.confidence_score : 0;
      return isAsc ? confA - confB : confB - confA;
    }

    // Default: date
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return isAsc ? timeA - timeB : timeB - timeA;
  });
}

/**
 * Paginates an array of items.
 *
 * @param {Array<Object>} items - Array of items.
 * @param {number} [page=1] - 1-indexed page number.
 * @param {number} [pageSize=5] - Number of items per page.
 * @returns {{
 *   items: Array<Object>,
 *   page: number,
 *   pageSize: number,
 *   totalPages: number,
 *   totalCount: number
 * }}
 */
export function paginate(items = [], page = 1, pageSize = 5) {
  const safePageSize = Math.max(1, pageSize);
  const totalCount = Array.isArray(items) ? items.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const start = (safePage - 1) * safePageSize;
  const end = start + safePageSize;
  const sliced = Array.isArray(items) ? items.slice(start, end) : [];

  return {
    items: sliced,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    totalCount
  };
}

/**
 * Checks whether the current user is authorized to view or mutate a given record.
 * Ensures multi-user isolation on shared devices.
 *
 * @param {Object} record - The database/localStorage item.
 * @param {string} currentUserId - The authenticated user's ID.
 * @returns {boolean} True if ownership is verified.
 */
export function verifyOwnership(record, currentUserId) {
  if (!record || typeof record !== 'object') return false;
  if (!currentUserId || typeof currentUserId !== 'string') return false;
  return record.userId === currentUserId;
}

/**
 * Serializes patient profile clinical attributes into context text
 * for ingestion by the emergency triage pipeline.
 *
 * @param {Object} profile - Patient profile object.
 * @returns {string} Formatted clinical context string.
 */
export function formatProfileContextForAnalysis(profile) {
  if (!profile || typeof profile !== 'object') return '';

  const parts = [];
  if (profile.name) parts.push(`Patient: ${profile.name}`);
  if (profile.age) parts.push(`Age: ${profile.age}`);
  if (profile.allergies) parts.push(`Known Allergies: ${profile.allergies}`);
  if (profile.medications) parts.push(`Current Medications: ${profile.medications}`);
  if (profile.notes) parts.push(`Medical Background: ${profile.notes}`);

  return parts.length > 0 ? `[PATIENT PROFILE CONTEXT: ${parts.join(' | ')}]` : '';
}

/**
 * Constructs a prefilled WhatsApp deep link for an emergency contact.
 *
 * @param {Object} contact - Emergency contact object.
 * @param {Object} [analysis] - Optional current or historical analysis.
 * @returns {string} Fully encoded https://wa.me/ URL.
 */
export function formatWhatsAppShareUrl(contact, analysis) {
  if (!contact || !contact.phone) return '';
  const cleanPhone = contact.phone.replace(/[^0-9]/g, '');

  let message = `*LIFEBRIDGE EMERGENCY SOS BROADCAST*\n`;
  message += `Relationship: ${contact.relationship || 'Emergency Contact'}\n`;

  if (analysis) {
    message += `Urgency: ${analysis.urgency_level || 'UNKNOWN'}\n`;
    message += `Summary: ${analysis.situation_summary || 'Urgent medical assistance requested'}\n`;
    if (analysis.call_108_script) {
      message += `\n*108 Dispatch Script*:\n${analysis.call_108_script}\n`;
    }
  } else {
    message += `An urgent medical analysis was initiated. Please check in immediately.`;
  }

  message += `\nSent via LifeBridge Clinical Emergency Studio.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Serializes user data into a clean, portable JSON backup structure.
 *
 * @param {string} userId - User ID to export.
 * @param {Object} dataStore - User data collections.
 * @param {Array<Object>} [dataStore.analyses]
 * @param {Array<Object>} [dataStore.profiles]
 * @param {Array<Object>} [dataStore.contacts]
 * @param {Object} [dataStore.settings]
 * @returns {string} Formatted JSON string.
 */
export function serializeUserDataForExport(userId, {
  analyses = [],
  profiles = [],
  contacts = [],
  settings = {}
} = {}) {
  // Ensure strict ownership filter on all exported collections
  const userAnalyses = analyses.filter(a => verifyOwnership(a, userId));
  const userProfiles = profiles.filter(p => verifyOwnership(p, userId));
  const userContacts = contacts.filter(c => verifyOwnership(c, userId));

  const exportPayload = {
    exportVersion: '1.0.0',
    exportTimestamp: new Date().toISOString(),
    userId,
    note: 'Prototype: data is stored locally for demonstration and is not production-grade medical data storage.',
    data: {
      analyses: userAnalyses,
      profiles: userProfiles,
      contacts: userContacts,
      settings: settings.userId === userId ? settings : {}
    }
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Converts an array of analysis records into an RFC 4180 compliant CSV string.
 *
 * @param {Array<Object>} analyses - List of analysis records.
 * @returns {string} Formatted CSV string.
 */
export function exportAnalysesToCsv(analyses = []) {
  if (!Array.isArray(analyses) || analyses.length === 0) {
    return 'ID,Date,Urgency,Confidence,Patient,Summary,VerificationStatus,108Script\r\n';
  }

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = ['ID', 'Date', 'Urgency', 'Confidence', 'Patient', 'Summary', 'VerificationStatus', '108Script'];
  const rows = analyses.map(item => {
    const conf = typeof item.confidence_score === 'number'
      ? (item.confidence_score <= 1.0 ? Math.round(item.confidence_score * 100) : Math.round(item.confidence_score))
      : 0;
    const dateStr = item.timestamp ? new Date(item.timestamp).toISOString() : '';
    const verStatus = item.verification?.status || 'VERIFIED';

    return [
      escapeCsv(item.id),
      escapeCsv(dateStr),
      escapeCsv(item.urgency_level || 'UNKNOWN'),
      escapeCsv(`${conf}%`),
      escapeCsv(item.patient_name || ''),
      escapeCsv(item.situation_summary || ''),
      escapeCsv(verStatus),
      escapeCsv(item.call_108_script || '')
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n') + '\r\n';
}

/**
 * Calculates current CPR compression cycle state according to 30:2 AHA resuscitation standard.
 *
 * @param {number} compressionCount - Total number of chest compressions delivered.
 * @returns {{
 *   totalCompressions: number,
 *   currentCycle: number,
 *   compressionsInCycle: number,
 *   isRescueBreaths: boolean,
 *   prompt: string
 * }}
 */
export function calculateCprCycle(compressionCount = 0) {
  const count = Math.max(0, Math.floor(Number(compressionCount) || 0));
  const cycle = Math.floor(count / 30) + 1;
  const inCycle = count % 30;

  if (count > 0 && inCycle === 0) {
    return {
      totalCompressions: count,
      currentCycle: cycle - 1,
      compressionsInCycle: 30,
      isRescueBreaths: true,
      prompt: 'GIVE 2 RESCUE BREATHS NOW (TILT HEAD, PINCH NOSE, 1 SEC EACH)'
    };
  }

  return {
    totalCompressions: count,
    currentCycle: cycle,
    compressionsInCycle: inCycle,
    isRescueBreaths: false,
    prompt: `COMPRESS HARD & FAST (100-120 BPM) - ${inCycle}/30`
  };
}

/**
 * Formats a plain-text clinical handover summary for EMS paramedics / hospital triage.
 *
 * @param {Object} analysis - The triage analysis record.
 * @param {Object} [profile] - Active patient profile if any.
 * @param {Array<Object>} [contacts] - Emergency contacts list.
 * @returns {string} Formatted clinical handover note.
 */
export function formatMedicalHandoverSummary(analysis, profile, contacts = []) {
  if (!analysis) return '';

  const timestamp = analysis.timestamp ? new Date(analysis.timestamp).toLocaleString() : new Date().toLocaleString();
  const urgency = analysis.urgency_level || 'UNKNOWN';

  let out = `=====================================================\n`;
  out += `LIFEBRIDGE EMERGENCY CLINICAL HANDOVER SUMMARY\n`;
  out += `=====================================================\n`;
  out += `Timestamp: ${timestamp}\n`;
  out += `Urgency Tier: [${urgency}]\n`;
  out += `Confidence: ${Math.round((analysis.confidence_score <= 1.0 ? analysis.confidence_score * 100 : analysis.confidence_score) || 0)}%\n`;
  out += `Verification Status: ${analysis.verification?.status || 'VERIFIED'}\n\n`;

  out += `--- PATIENT IDENTIFICATION ---\n`;
  if (profile) {
    out += `Name: ${profile.name || 'Anonymous'}\n`;
    out += `Age: ${profile.age || 'Unknown'} yrs\n`;
    out += `Blood Group: ${profile.bloodGroup || 'Not specified'}\n`;
    out += `Known Allergies: ${profile.allergies || 'None reported'}\n`;
    out += `Current Medications: ${profile.medications || 'None reported'}\n`;
  } else {
    out += `Name: ${analysis.patient_name || 'Bystander Triage / Unnamed'}\n`;
    out += `Profile: No saved baseline linked\n`;
  }
  out += `\n`;

  out += `--- SITUATION & ASSESSMENT ---\n`;
  out += `${analysis.situation_summary || 'N/A'}\n\n`;

  if (Array.isArray(analysis.recommended_actions) && analysis.recommended_actions.length > 0) {
    out += `--- PROTOCOL ACTIONS TAKEN / DIRECTED ---\n`;
    analysis.recommended_actions.forEach((act, idx) => {
      out += `${idx + 1}. ${act.action} (${act.time_sensitivity || 'Immediate'})\n`;
      if (act.reason) out += `   Rationale: ${act.reason}\n`;
    });
    out += `\n`;
  }

  if (analysis.call_108_script) {
    out += `--- 108 / 112 DISPATCH TRANSCRIPT ---\n`;
    out += `${analysis.call_108_script}\n\n`;
  }

  if (Array.isArray(contacts) && contacts.length > 0) {
    out += `--- NOTIFIED EMERGENCY CONTACTS ---\n`;
    contacts.forEach(c => {
      out += `• ${c.name} (${c.relationship}): ${c.phone}\n`;
    });
    out += `\n`;
  }

  out += `=====================================================\n`;
  out += `Note: Prototype decision-support data for demonstration.\n`;
  out += `=====================================================\n`;

  return out;
}

/**
 * Formats a broadcast SMS message to be transmitted to all emergency contacts simultaneously.
 *
 * @param {Array<Object>} contacts - Emergency contacts list.
 * @param {Object} [analysis] - Current analysis.
 * @param {Object} [profile] - Active patient profile.
 * @returns {string} Formatted SMS broadcast text.
 */
export function formatEmergencyBroadcastSms(contacts = [], analysis, profile) {
  const patientName = profile?.name || analysis?.patient_name || 'Family member';
  const urgency = analysis?.urgency_level || 'CRITICAL';
  const summary = analysis?.situation_summary || 'Urgent medical assistance requested';

  let msg = `[EMERGENCY SOS] ${urgency} alert for ${patientName}. `;
  msg += `Condition: ${summary}. `;
  if (profile?.allergies) {
    msg += `Allergies: ${profile.allergies}. `;
  }
  msg += `108 Ambulance service called. Sent via LifeBridge.`;

  return msg;
}
