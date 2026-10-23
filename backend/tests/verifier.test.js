/**
 * @fileoverview Unit tests for the three-tier verification pipeline and urgency escalation.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { runVerificationPipeline, escalateUrgency } from '../src/services/verifier.js';
import {
  URGENCY_LEVELS,
  VERIFICATION_STATUSES,
  FACT_STATUSES
} from '../src/config/constants.js';

describe('Three-Layer Verification Pipeline', () => {
  test('escalateUrgency picks higher severity according to clinical hierarchy', () => {
    assert.equal(escalateUrgency(URGENCY_LEVELS.MEDIUM, URGENCY_LEVELS.CRITICAL), URGENCY_LEVELS.CRITICAL);
    assert.equal(escalateUrgency(URGENCY_LEVELS.HIGH, URGENCY_LEVELS.MEDIUM), URGENCY_LEVELS.HIGH);
    assert.equal(escalateUrgency(URGENCY_LEVELS.LOW, URGENCY_LEVELS.HIGH), URGENCY_LEVELS.HIGH);
    assert.equal(escalateUrgency(URGENCY_LEVELS.CRITICAL, URGENCY_LEVELS.HIGH), URGENCY_LEVELS.CRITICAL);
  });

  test('pipeline prunes UNSUPPORTED facts and flagged actions from output', async () => {
    const primaryAnalysis = {
      situation_summary: 'Reported breathlessness and cough.',
      urgency_level: URGENCY_LEVELS.HIGH,
      extracted_facts: [
        { category: 'symptom', fact: 'Severe shortness of breath', source: 'text' },
        { category: 'condition', fact: 'Patient has terminal brain cancer', source: 'hallucinated' }
      ],
      recommended_actions: [
        { action: 'Administer high-flow chemotherapy drugs', reason: 'Cancer care', time_sensitivity: 'Immediate' },
        { action: 'Help patient sit upright and call 108', reason: 'Eases respiration', time_sensitivity: 'Immediate' }
      ],
      call_108_script: 'Patient is breathless.',
      missing_information: [],
      confidence_score: 0.9
    };

    // Mock Gemini client that flags fact 2 as UNSUPPORTED
    const mockClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            fact_evaluations: [
              { fact: 'Severe shortness of breath', status: FACT_STATUSES.SUPPORTED, detail: 'Direct quote' },
              { fact: 'Patient has terminal brain cancer', status: FACT_STATUSES.UNSUPPORTED, detail: 'Not present in text' }
            ],
            overall_soundness: 'One fact unsupported.',
            suggested_action_pruning: ['Administer high-flow chemotherapy drugs']
          })
        })
      }
    };

    const { verifiedAnalysis, verificationMeta } = await runVerificationPipeline({
      text: 'Patient having severe shortness of breath.',
      primaryAnalysis,
      checkConsistency: false,
      client: mockClient
    });

    // Verify unsupported fact was pruned
    assert.equal(verifiedAnalysis.extracted_facts.length, 1);
    assert.equal(verifiedAnalysis.extracted_facts[0].fact, 'Severe shortness of breath');

    // Verify unsupported action was pruned
    assert.equal(verificationMeta.pruned_actions.includes('Administer high-flow chemotherapy drugs'), true);
    assert.equal(verifiedAnalysis.recommended_actions.some((a) => a.action.includes('chemotherapy')), false);

    // Status reflects pruning with warnings
    assert.equal(verificationMeta.status, VERIFICATION_STATUSES.VERIFIED_WITH_WARNINGS);
  });

  test('pipeline applies deterministic safety overrides (Layer B) cleanly', async () => {
    const primaryAnalysis = {
      situation_summary: 'Poison ingestion suspected.',
      urgency_level: URGENCY_LEVELS.HIGH,
      extracted_facts: [
        { category: 'symptom', fact: 'Accidental insecticide ingestion', source: 'text' }
      ],
      recommended_actions: [
        { action: 'Induce vomiting with salt water immediately', reason: 'Remove poison', time_sensitivity: 'Immediate' }
      ],
      call_108_script: 'Insecticide swallowed. Ambulance required.',
      missing_information: [],
      confidence_score: 0.85
    };

    const mockClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            fact_evaluations: [
              { fact: 'Accidental insecticide ingestion', status: FACT_STATUSES.SUPPORTED, detail: 'Present in input' }
            ],
            overall_soundness: 'Supported facts.',
            suggested_action_pruning: []
          })
        })
      }
    };

    const { verifiedAnalysis, verificationMeta } = await runVerificationPipeline({
      text: 'Child swallowed insecticide',
      primaryAnalysis,
      checkConsistency: false,
      client: mockClient
    });

    // Vomiting overridden
    assert.equal(verificationMeta.overrides_applied.length, 1);
    assert.equal(verificationMeta.overrides_applied[0].ruleId, 'RULE_NO_INDUCED_VOMITING');
    // Urgency escalated to CRITICAL
    assert.equal(verifiedAnalysis.urgency_level, URGENCY_LEVELS.CRITICAL);
    assert.equal(verificationMeta.status, VERIFICATION_STATUSES.VERIFIED_WITH_WARNINGS);
  });

  test('pipeline marks status as VERIFIED when all facts supported, no safety overrides, and consistency passed', async () => {
    const primaryAnalysis = {
      situation_summary: 'Cut on finger with mild bleeding.',
      urgency_level: URGENCY_LEVELS.LOW,
      extracted_facts: [
        { category: 'symptom', fact: 'Clean superficial cut on left index finger', source: 'text' }
      ],
      recommended_actions: [
        { action: 'Clean wound with clean tap water and apply sterile bandage.', reason: 'Prevents infection', time_sensitivity: 'Within 10 mins' }
      ],
      call_108_script: 'Minor cut. Seeking outpatient clinic info.',
      missing_information: [],
      confidence_score: 0.95
    };

    const mockClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            fact_evaluations: [
              { fact: 'Clean superficial cut on left index finger', status: FACT_STATUSES.SUPPORTED, detail: 'Verified' }
            ],
            overall_soundness: 'Solid.',
            suggested_action_pruning: []
          })
        })
      }
    };

    const { verificationMeta } = await runVerificationPipeline({
      text: 'Superficial cut on finger while chopping vegetables.',
      primaryAnalysis,
      checkConsistency: false,
      client: mockClient
    });

    assert.equal(verificationMeta.status, VERIFICATION_STATUSES.VERIFIED);
  });

  test('pipeline marks status as NEEDS_HUMAN_REVIEW when model confidence is low', async () => {
    const primaryAnalysis = {
      situation_summary: 'Extremely vague statement.',
      urgency_level: URGENCY_LEVELS.MEDIUM,
      extracted_facts: [
        { category: 'symptom', fact: 'Something feels weird', source: 'text' }
      ],
      recommended_actions: [
        { action: 'Consult doctor', reason: 'Ambiguity', time_sensitivity: 'Soon' }
      ],
      call_108_script: 'Ambiguous condition.',
      missing_information: ['Everything'],
      confidence_score: 0.40 // Low confidence
    };

    const mockClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            fact_evaluations: [
              { fact: 'Something feels weird', status: FACT_STATUSES.SUPPORTED, detail: 'Quote' }
            ],
            overall_soundness: 'Vague input.',
            suggested_action_pruning: []
          })
        })
      }
    };

    const { verificationMeta } = await runVerificationPipeline({
      text: 'Something feels weird',
      primaryAnalysis,
      checkConsistency: false,
      client: mockClient
    });

    assert.equal(verificationMeta.status, VERIFICATION_STATUSES.NEEDS_HUMAN_REVIEW);
  });
});
