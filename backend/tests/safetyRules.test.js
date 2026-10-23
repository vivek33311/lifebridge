/**
 * @fileoverview Unit tests for deterministic safety rules and clinical contraindications.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { applySafetyRules } from '../src/services/safetyRules.js';
import { URGENCY_LEVELS } from '../src/config/constants.js';

describe('Deterministic Safety Rules Engine', () => {
  test('overrides hazardous recommendation to induce vomiting and substitutes safe protocol', () => {
    const actions = [
      {
        action: 'Induce vomiting immediately by sticking finger down throat.',
        reason: 'To expel ingested poison.',
        time_sensitivity: 'Immediate'
      }
    ];

    const result = applySafetyRules({
      currentUrgency: URGENCY_LEVELS.HIGH,
      actions,
      facts: [{ category: 'symptom', fact: 'Ingested cleaning chemical', source: 'user' }],
      rawText: 'Child swallowed phenyl cleaner'
    });

    assert.equal(result.overridesApplied.length, 1);
    assert.equal(result.overridesApplied[0].ruleId, 'RULE_NO_INDUCED_VOMITING');
    assert.equal(result.escalatedUrgency, URGENCY_LEVELS.CRITICAL);
    assert.match(result.sanitizedActions[1].action, /Do NOT induce vomiting/i);
  });

  test('detects allergy conflict with Aspirin/NSAIDs and overrides dangerous administration', () => {
    const actions = [
      {
        action: 'Give patient 325mg Aspirin tablet to chew.',
        reason: 'Prevents platelet aggregation in suspected heart attack.',
        time_sensitivity: 'Immediate'
      }
    ];
    const facts = [
      { category: 'allergy', fact: 'Severe allergy to Aspirin and Disprin', source: 'medical history' }
    ];

    const result = applySafetyRules({
      currentUrgency: URGENCY_LEVELS.CRITICAL,
      actions,
      facts,
      rawText: 'Patient has severe Aspirin allergy'
    });

    assert.equal(result.overridesApplied.length, 1);
    assert.equal(result.overridesApplied[0].ruleId, 'RULE_ALLERGY_MEDICATION_CONFLICT');
    assert.match(result.sanitizedActions[0].action, /Do NOT administer Aspirin or NSAIDs/i);
  });

  test('detects penicillin allergy and overrides amoxicillin advice', () => {
    const actions = [
      {
        action: 'Administer Amoxicillin 500mg capsule.',
        reason: 'Treat bacterial infection.',
        time_sensitivity: 'Within 1 hour'
      }
    ];
    const facts = [
      { category: 'allergy', fact: 'Penicillin allergy causing anaphylaxis', source: 'user' }
    ];

    const result = applySafetyRules({
      currentUrgency: URGENCY_LEVELS.MEDIUM,
      actions,
      facts,
      rawText: 'Allergic to penicillin'
    });

    assert.equal(result.overridesApplied.length, 1);
    assert.match(result.sanitizedActions[0].action, /Avoid all penicillin-derived/i);
  });

  test('blocks giving oral water/food to an unconscious or seizing individual', () => {
    const actions = [
      {
        action: 'Give him warm water with sugar to drink to restore energy.',
        reason: 'Provides hydration.',
        time_sensitivity: 'Immediate'
      }
    ];
    const facts = [
      { category: 'symptom', fact: 'Patient is unconscious and unresponsive on floor', source: 'user' }
    ];

    const result = applySafetyRules({
      currentUrgency: URGENCY_LEVELS.CRITICAL,
      actions,
      facts,
      rawText: 'Patient behosh ho gaya hai'
    });

    assert.equal(result.overridesApplied.length, 1);
    assert.equal(result.overridesApplied[0].ruleId, 'RULE_UNCONSCIOUS_ORAL_RESTRICTION');
    assert.match(result.sanitizedActions[0].action, /Do NOT administer any water, liquids, or oral medications/i);
  });

  test('blocks application of ice, butter, or toothpaste on acute burns', () => {
    const actions = [
      {
        action: 'Apply ice cubes and butter directly to the burn blister.',
        reason: 'To cool down tissue.',
        time_sensitivity: 'Immediate'
      }
    ];
    const facts = [
      { category: 'condition', fact: 'Scalding oil burn on hand', source: 'photo' }
    ];

    const result = applySafetyRules({
      currentUrgency: URGENCY_LEVELS.HIGH,
      actions,
      facts,
      rawText: 'Haath jal gaya hai garam tel se'
    });

    assert.equal(result.overridesApplied.length, 1);
    assert.equal(result.overridesApplied[0].ruleId, 'RULE_BURNS_NO_ICE_OR_IRRITANTS');
    assert.match(result.sanitizedActions[0].action, /running tap water/i);
  });

  test('blocks moving a patient following traumatic fall or road crash', () => {
    const actions = [
      {
        action: 'Help patient sit up immediately and carry him into an auto.',
        reason: 'Rush to nearest dispensary.',
        time_sensitivity: 'Immediate'
      }
    ];
    const facts = [
      { category: 'condition', fact: 'Road accident trauma victim', source: 'user' }
    ];

    const result = applySafetyRules({
      currentUrgency: URGENCY_LEVELS.HIGH,
      actions,
      facts,
      rawText: 'Road accident hua hai outer ring road pe'
    });

    assert.equal(result.overridesApplied.length, 1);
    assert.equal(result.overridesApplied[0].ruleId, 'RULE_TRAUMA_IMMOBILIZATION');
    assert.match(result.sanitizedActions[0].action, /Keep patient flat and immobile/i);
  });

  test('injects mandatory 108 ambulance call if missing in a critical scenario', () => {
    const actions = [
      {
        action: 'Keep patient calm in resting position.',
        reason: 'Conserves cardiac output.',
        time_sensitivity: 'Immediate'
      }
    ];

    const result = applySafetyRules({
      currentUrgency: URGENCY_LEVELS.CRITICAL,
      actions,
      facts: [],
      rawText: 'Severe chest tightness'
    });

    assert.match(result.sanitizedActions[0].action, /Call 108 or 112/i);
  });

  test('leaves safe, non-violating clinical actions unchanged', () => {
    const actions = [
      {
        action: 'Call 108 ambulance and report suspected stroke symptoms.',
        reason: 'Fast hospital transport needed for thrombolytic window.',
        time_sensitivity: 'Immediate'
      },
      {
        action: 'Loosen tight clothing around patient neck and chest.',
        reason: 'Assists easy respiratory excursion.',
        time_sensitivity: 'Within 2 minutes'
      }
    ];

    const result = applySafetyRules({
      currentUrgency: URGENCY_LEVELS.CRITICAL,
      actions,
      facts: [],
      rawText: 'Stroke symptoms'
    });

    assert.equal(result.overridesApplied.length, 0);
    assert.equal(result.sanitizedActions.length, 2);
  });
});
