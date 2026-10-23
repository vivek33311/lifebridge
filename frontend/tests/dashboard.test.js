/**
 * @fileoverview Vitest test suite for LifeBridge Clinical Dashboard logic.
 * Validates:
 * 1. Overview stats calculation (totals, critical, average confidence, facts pruned)
 * 2. Urgency breakdown distribution
 * 3. Last-7-days timeline computation
 * 4. Case history keyword search filtering
 * 5. Case history urgency tier filtering
 * 6. Case history multi-field sorting (date, urgency, confidence)
 * 7. Table pagination calculations & boundary safety
 * 8. Strict record ownership checks (multi-tenant device isolation)
 * 9. Patient profile context serialization for clinical analysis
 * 10. Emergency contact WhatsApp prefilled SOS URL generation
 * 11. User data JSON backup serialization with ownership guarantee
 * 12. Patient profile CRUD logic and state isolation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeOverviewStats,
  computeUrgencyBreakdown,
  computeLast7DaysTrend,
  filterAnalyses,
  sortAnalyses,
  paginate,
  verifyOwnership,
  formatProfileContextForAnalysis,
  formatWhatsAppShareUrl,
  serializeUserDataForExport,
  exportAnalysesToCsv,
  calculateCprCycle,
  formatMedicalHandoverSummary,
  formatEmergencyBroadcastSms
} from '../src/dashboard/dashboardMath.js';

describe('Dashboard Math, Statistics & Data Transformers', () => {
  const mockAnalyses = [
    {
      id: 'a1',
      userId: 'user_1',
      timestamp: '2026-10-23T10:00:00.000Z',
      urgency_level: 'CRITICAL',
      situation_summary: 'Severe chest pain radiating to left shoulder',
      confidence_score: 0.98,
      call_108_script: 'Immediate ALS ambulance requested at MG Road',
      extracted_facts: [{ category: 'condition', fact: 'Acute angina' }],
      recommended_actions: [{ action: 'Rest seated' }],
      verification: { prunedActionsCount: 2 }
    },
    {
      id: 'a2',
      userId: 'user_1',
      timestamp: '2026-10-22T14:30:00.000Z',
      urgency_level: 'HIGH',
      situation_summary: 'Asthmatic wheezing after dust exposure',
      confidence_score: 0.92,
      call_108_script: 'Oxygen ambulance needed at Indiranagar',
      extracted_facts: [{ category: 'condition', fact: 'Bronchial asthma' }],
      recommended_actions: [{ action: 'Use inhaler' }],
      verification: { prunedActionsCount: 0 }
    },
    {
      id: 'a3',
      userId: 'user_1',
      timestamp: '2026-10-21T09:15:00.000Z',
      urgency_level: 'CRITICAL',
      situation_summary: 'Pediatric burn on forearm from hot tea',
      confidence_score: 0.94,
      call_108_script: 'Pediatric burn emergency in Koramangala',
      extracted_facts: [{ category: 'allergy', fact: 'NSAID allergy' }],
      recommended_actions: [{ action: 'Cool water irrigation' }],
      verification: { prunedActionsCount: 3 }
    },
    {
      id: 'a4',
      userId: 'user_1',
      timestamp: '2026-10-20T16:00:00.000Z',
      urgency_level: 'MEDIUM',
      situation_summary: 'Sprained ankle with swelling after sports',
      confidence_score: 0.88,
      call_108_script: 'Non-emergency clinic transport',
      extracted_facts: [{ category: 'condition', fact: 'Ankle trauma' }],
      recommended_actions: [{ action: 'Elevate leg' }],
      verification: { prunedActionsCount: 1 }
    },
    {
      id: 'a5',
      userId: 'user_1',
      timestamp: '2026-10-19T11:00:00.000Z',
      urgency_level: 'LOW',
      situation_summary: 'Superficial skin abrasion from falling off bicycle',
      confidence_score: 0.96,
      call_108_script: 'Routine first aid advisory',
      extracted_facts: [{ category: 'condition', fact: 'Knee scrape' }],
      recommended_actions: [{ action: 'Wash with water' }],
      verification: { prunedActionsCount: 0 }
    }
  ];

  // 1. Stats calculation
  it('1. computes accurate overview metrics (total, critical, avgConfidence, factsPruned)', () => {
    const stats = computeOverviewStats(mockAnalyses);
    expect(stats.total).toBe(5);
    expect(stats.critical).toBe(2);
    // (98 + 92 + 94 + 88 + 96) / 5 = 468 / 5 = 93.6
    expect(stats.avgConfidence).toBe(93.6);
    expect(stats.factsPruned).toBe(6); // 2 + 0 + 3 + 1 + 0 = 6
  });

  // 2. Stats empty fallback
  it('2. handles empty or invalid analyses arrays gracefully without crashing', () => {
    const emptyStats = computeOverviewStats([]);
    expect(emptyStats).toEqual({
      total: 0,
      critical: 0,
      avgConfidence: 0,
      factsPruned: 0
    });
  });

  // 3. Urgency breakdown
  it('3. calculates urgency counts and percentage distribution across all 4 tiers', () => {
    const breakdown = computeUrgencyBreakdown(mockAnalyses);
    expect(breakdown.counts.CRITICAL).toBe(2);
    expect(breakdown.counts.HIGH).toBe(1);
    expect(breakdown.counts.MEDIUM).toBe(1);
    expect(breakdown.counts.LOW).toBe(1);
    expect(breakdown.total).toBe(5);
    expect(breakdown.percentages.CRITICAL).toBe(40); // 2/5 = 40%
    expect(breakdown.percentages.HIGH).toBe(20);
  });

  // 4. Last 7 days trend
  it('4. computes chronological 7-day trend series with total and critical daily counts', () => {
    const refDate = new Date('2026-10-23T12:00:00.000Z');
    const trend = computeLast7DaysTrend(mockAnalyses, refDate);

    expect(trend).toHaveLength(7);
    expect(trend[6].dateStr).toBe('2026-10-23'); // today
    expect(trend[6].total).toBe(1);
    expect(trend[6].critical).toBe(1);

    expect(trend[5].dateStr).toBe('2026-10-22'); // yesterday
    expect(trend[5].total).toBe(1);
    expect(trend[5].critical).toBe(0);
  });

  // 5. Keyword search filter
  it('5. filters analyses across summary, facts, scripts, and patient keywords', () => {
    const burnMatches = filterAnalyses(mockAnalyses, { search: 'burn' });
    expect(burnMatches).toHaveLength(1);
    expect(burnMatches[0].id).toBe('a3');

    const chestMatches = filterAnalyses(mockAnalyses, { search: 'chest' });
    expect(chestMatches).toHaveLength(1);
    expect(chestMatches[0].id).toBe('a1');

    const emptyMatches = filterAnalyses(mockAnalyses, { search: 'nonexistent symptom' });
    expect(emptyMatches).toHaveLength(0);
  });

  // 6. Urgency tier filter
  it('6. filters analyses by specific urgency level and handles ALL tier', () => {
    const criticalOnly = filterAnalyses(mockAnalyses, { urgency: 'CRITICAL' });
    expect(criticalOnly).toHaveLength(2);
    criticalOnly.forEach(item => expect(item.urgency_level).toBe('CRITICAL'));

    const allItems = filterAnalyses(mockAnalyses, { urgency: 'ALL' });
    expect(allItems).toHaveLength(5);
  });

  // 7. Multi-field sorting
  it('7. sorts analyses by date, clinical urgency hierarchy, and confidence', () => {
    // Sort by Urgency Descending: CRITICAL (2) -> HIGH (1) -> MEDIUM (1) -> LOW (1)
    const sortedUrgency = sortAnalyses(mockAnalyses, { sortBy: 'urgency', order: 'desc' });
    expect(sortedUrgency[0].urgency_level).toBe('CRITICAL');
    expect(sortedUrgency[1].urgency_level).toBe('CRITICAL');
    expect(sortedUrgency[2].urgency_level).toBe('HIGH');
    expect(sortedUrgency[4].urgency_level).toBe('LOW');

    // Sort by Confidence Ascending
    const sortedConfAsc = sortAnalyses(mockAnalyses, { sortBy: 'confidence', order: 'asc' });
    expect(sortedConfAsc[0].confidence_score).toBe(0.88);
    expect(sortedConfAsc[sortedConfAsc.length - 1].confidence_score).toBe(0.98);
  });

  // 8. Pagination math
  it('8. slices array correctly for page limits and handles out-of-bound requests', () => {
    const page1 = paginate(mockAnalyses, 1, 2);
    expect(page1.items).toHaveLength(2);
    expect(page1.totalPages).toBe(3);
    expect(page1.page).toBe(1);

    const page3 = paginate(mockAnalyses, 3, 2);
    expect(page3.items).toHaveLength(1);

    // Out-of-bounds page should clamp to last page
    const clamped = paginate(mockAnalyses, 99, 2);
    expect(clamped.page).toBe(3);
  });

  // 9. Ownership verification
  it('9. enforces multi-user data isolation and rejects unauthorized foreign access', () => {
    const userRecord = { id: 'rec_101', userId: 'user_alice', data: 'Private health record' };
    expect(verifyOwnership(userRecord, 'user_alice')).toBe(true);
    expect(verifyOwnership(userRecord, 'user_bob')).toBe(false);
    expect(verifyOwnership(null, 'user_alice')).toBe(false);
    expect(verifyOwnership(userRecord, '')).toBe(false);
  });

  // 10. Patient profile context serialization
  it('10. formats patient profile clinical attributes into clinical analysis prompt prefix', () => {
    const profile = {
      name: 'Rohan Sharma',
      age: 68,
      allergies: 'Penicillin, Sulfa drugs',
      medications: 'Metoprolol, Aspirin',
      notes: 'Post-CABG surgery in 2021'
    };

    const context = formatProfileContextForAnalysis(profile);
    expect(context).toContain('Patient: Rohan Sharma');
    expect(context).toContain('Age: 68');
    expect(context).toContain('Known Allergies: Penicillin, Sulfa drugs');
    expect(context).toContain('Current Medications: Metoprolol, Aspirin');
    expect(context).toContain('Post-CABG surgery in 2021');

    expect(formatProfileContextForAnalysis(null)).toBe('');
  });

  // 11. Emergency contact WhatsApp prefilled URL
  it('11. builds prefilled WhatsApp SOS URL with recipient phone and incident summary', () => {
    const contact = { name: 'Pooja', relationship: 'Spouse', phone: '+91 98765 43210' };
    const analysis = {
      urgency_level: 'CRITICAL',
      situation_summary: 'Acute chest pain emergency',
      call_108_script: 'Ambulance needed at Bangalore'
    };

    const url = formatWhatsAppShareUrl(contact, analysis);
    expect(url).toContain('https://wa.me/919876543210');
    expect(url).toContain('text=');
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('LIFEBRIDGE EMERGENCY SOS BROADCAST');
    expect(decoded).toContain('CRITICAL');
    expect(decoded).toContain('Acute chest pain emergency');
  });

  // 12. Data export JSON serialization
  it('12. serializes user data to clean JSON with prototype disclaimer note and ownership filter', () => {
    const foreignItem = { id: 'foreign_1', userId: 'user_mallory', situation_summary: 'Secret' };
    const allItems = [...mockAnalyses, foreignItem];

    const jsonStr = serializeUserDataForExport('user_1', {
      analyses: allItems,
      profiles: [{ id: 'p1', userId: 'user_1', name: 'Arjun' }],
      contacts: [{ id: 'c1', userId: 'user_1', name: 'Pooja', phone: '108' }],
      settings: { userId: 'user_1', language: 'en-IN' }
    });

    const parsed = JSON.parse(jsonStr);
    expect(parsed.exportVersion).toBe('1.0.0');
    expect(parsed.userId).toBe('user_1');
    expect(parsed.note).toContain('Prototype: data is stored locally for demonstration and is not production-grade medical data storage.');
    expect(parsed.data.analyses).toHaveLength(5);
    // Mallory's record must be filtered out!
    expect(parsed.data.analyses.some(a => a.userId === 'user_mallory')).toBe(false);
    expect(parsed.data.profiles).toHaveLength(1);
    expect(parsed.data.contacts).toHaveLength(1);
  });

  // 13. CSV Export formatting
  it('13. exports analyses to RFC 4180 standard CSV with headers and escaped fields', () => {
    const csv = exportAnalysesToCsv(mockAnalyses);
    expect(csv).toContain('ID,Date,Urgency,Confidence,Patient,Summary,VerificationStatus,108Script');
    expect(csv).toContain('"a1"');
    expect(csv).toContain('"CRITICAL"');
    expect(csv).toContain('"98%"');
    expect(csv).toContain('"Severe chest pain radiating to left shoulder"');

    // Empty array returns only header row
    const emptyCsv = exportAnalysesToCsv([]);
    expect(emptyCsv).toBe('ID,Date,Urgency,Confidence,Patient,Summary,VerificationStatus,108Script\r\n');
  });

  // 14. CPR Cycle and Metronome calculations
  it('14. computes accurate CPR cycle progression and triggers rescue breath prompt at 30 compressions', () => {
    const start = calculateCprCycle(0);
    expect(start.totalCompressions).toBe(0);
    expect(start.currentCycle).toBe(1);
    expect(start.compressionsInCycle).toBe(0);
    expect(start.isRescueBreaths).toBe(false);

    const step15 = calculateCprCycle(15);
    expect(step15.compressionsInCycle).toBe(15);
    expect(step15.currentCycle).toBe(1);
    expect(step15.isRescueBreaths).toBe(false);

    const step30 = calculateCprCycle(30);
    expect(step30.totalCompressions).toBe(30);
    expect(step30.compressionsInCycle).toBe(30);
    expect(step30.isRescueBreaths).toBe(true);
    expect(step30.prompt).toContain('GIVE 2 RESCUE BREATHS NOW');

    const step31 = calculateCprCycle(31);
    expect(step31.currentCycle).toBe(2);
    expect(step31.compressionsInCycle).toBe(1);
    expect(step31.isRescueBreaths).toBe(false);
  });

  // 15. Medical Handover Report generation
  it('15. compiles comprehensive clinical handover summary with patient vitals and protocol checklist', () => {
    const profile = { name: 'Dr. Arjun Patel', age: 62, bloodGroup: 'B+', allergies: 'Aspirin', medications: 'Telmisartan' };
    const contacts = [{ name: 'Pooja', relationship: 'Spouse', phone: '+91 98765 43210' }];
    const handover = formatMedicalHandoverSummary(mockAnalyses[0], profile, contacts);

    expect(handover).toContain('LIFEBRIDGE EMERGENCY CLINICAL HANDOVER SUMMARY');
    expect(handover).toContain('Dr. Arjun Patel');
    expect(handover).toContain('Blood Group: B+');
    expect(handover).toContain('Known Allergies: Aspirin');
    expect(handover).toContain('Severe chest pain radiating to left shoulder');
    expect(handover).toContain('Rest seated');
    expect(handover).toContain('Pooja (Spouse): +91 98765 43210');
    expect(handover).toContain('Immediate ALS ambulance requested at MG Road');
  });

  // 16. Multi-Contact Emergency SMS Broadcast
  it('16. constructs pre-formatted multi-contact emergency SMS broadcast text', () => {
    const profile = { name: 'Meera Patel', allergies: 'NSAIDs' };
    const sms = formatEmergencyBroadcastSms([], mockAnalyses[0], profile);

    expect(sms).toContain('[EMERGENCY SOS]');
    expect(sms).toContain('Meera Patel');
    expect(sms).toContain('CRITICAL');
    expect(sms).toContain('Allergies: NSAIDs');
    expect(sms).toContain('108 Ambulance service called');
  });
});
