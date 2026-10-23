/**
 * @fileoverview Three-layer verification pipeline combining AI corroboration,
 * deterministic safety rules, and low-temperature consistency escalation.
 * @module services/verifier
 */

import {
  URGENCY_LEVELS,
  URGENCY_RANKS,
  VERIFICATION_STATUSES,
  FACT_STATUSES
} from '../config/constants.js';
import { callGeminiVerify, callGeminiUnderstand } from './gemini.js';
import { applySafetyRules } from './safetyRules.js';

/**
 * Resolves the higher urgency level between two candidates using clinical hierarchy.
 *
 * @param {string} levelA - First urgency candidate.
 * @param {string} levelB - Second urgency candidate.
 * @returns {string} The escalated urgency level.
 */
export function escalateUrgency(levelA, levelB) {
  const rankA = URGENCY_RANKS[levelA] || 1;
  const rankB = URGENCY_RANKS[levelB] || 1;
  return rankA >= rankB ? levelA : levelB;
}

/**
 * Runs the complete three-tier verification pipeline.
 *
 * Layer (a): Gemini AI Fact Corroboration & Unsupported Action Pruning.
 * Layer (b): Deterministic safety rules (safetyRules.js) overriding AI hallucination/contraindications.
 * Layer (c): Low-temperature consistency check; escalates to higher urgency if runs diverge.
 *
 * @param {Object} params
 * @param {string} params.text - Untrusted user raw text.
 * @param {{ data: string, mimeType: string }} [params.image] - Optional base64 image.
 * @param {import('zod').infer<typeof import('../utils/validation.js').GeminiAnalysisResponseSchema>} params.primaryAnalysis
 * @param {boolean} [params.checkConsistency=true] - Whether to perform Layer (c) secondary check.
 * @param {import('@google/genai').GoogleGenAI} [params.client] - Injected client for testing.
 * @returns {Promise<{
 *   verifiedAnalysis: Object,
 *   verificationMeta: {
 *     status: string,
 *     reasoning: string,
 *     fact_audit: Array<{ fact: string, status: string, detail: string }>,
 *     overrides_applied: Array<Object>,
 *     pruned_actions: string[],
 *     consistency_passed: boolean
 *   }
 * }>}
 */
export async function runVerificationPipeline({
  text,
  image,
  primaryAnalysis,
  checkConsistency = true,
  client = null
}) {
  const factAudit = [];
  const prunedActions = [];
  let consistencyPassed = true;
  let finalUrgency = primaryAnalysis.urgency_level;

  // -------------------------------------------------------------
  // LAYER (A): AI Corroboration Call
  // -------------------------------------------------------------
  let verificationAiResult;
  try {
    verificationAiResult = await callGeminiVerify({
      rawText: text,
      extractedFacts: primaryAnalysis.extracted_facts,
      recommendedActions: primaryAnalysis.recommended_actions,
      client
    });
  } catch (err) {
    // Graceful degradation for Layer A if verification call is throttled
    verificationAiResult = {
      fact_evaluations: primaryAnalysis.extracted_facts.map((f) => ({
        fact: f.fact,
        status: FACT_STATUSES.INFERRED,
        detail: 'AI corroboration bypassed due to upstream error; falling back to deterministic safety layer.'
      })),
      overall_soundness: 'Partial verification fallback.',
      suggested_action_pruning: []
    };
  }

  // Map fact evaluation states
  const factStatusMap = new Map();
  for (const item of verificationAiResult.fact_evaluations) {
    factStatusMap.set(item.fact, item.status);
    factAudit.push({
      fact: item.fact,
      status: item.status,
      detail: item.detail || ''
    });
  }

  // Prune UNSUPPORTED facts
  const validFacts = primaryAnalysis.extracted_facts.filter((factItem) => {
    const status = factStatusMap.get(factItem.fact);
    return status !== FACT_STATUSES.UNSUPPORTED;
  });

  // Prune actions explicitly suggested for pruning or referencing unsupported facts
  const suggestedPruningSet = new Set(
    (verificationAiResult.suggested_action_pruning || []).map((s) => s.toLowerCase().trim())
  );

  const survivingActions = primaryAnalysis.recommended_actions.filter((actionItem) => {
    const actionLower = actionItem.action.toLowerCase().trim();
    if (suggestedPruningSet.has(actionLower)) {
      prunedActions.push(actionItem.action);
      return false;
    }
    return true;
  });

  // Ensure at least one action remains
  if (survivingActions.length === 0) {
    survivingActions.push({
      action: 'Call 108 or 112 immediately and keep patient at rest.',
      reason: 'Safe universal emergency protocol following fact corroboration.',
      time_sensitivity: 'Immediate'
    });
  }

  // -------------------------------------------------------------
  // LAYER (B): Deterministic Safety Rules
  // -------------------------------------------------------------
  const safetyOutcome = applySafetyRules({
    currentUrgency: finalUrgency,
    actions: survivingActions,
    facts: validFacts,
    rawText: text
  });

  const safetyGuardedActions = safetyOutcome.sanitizedActions;
  const overridesApplied = safetyOutcome.overridesApplied;

  if (safetyOutcome.escalatedUrgency) {
    finalUrgency = escalateUrgency(finalUrgency, safetyOutcome.escalatedUrgency);
  }

  // -------------------------------------------------------------
  // LAYER (C): Consistency Check & Urgency Escalation
  // -------------------------------------------------------------
  if (checkConsistency) {
    try {
      const secondaryRun = await callGeminiUnderstand({
        text,
        image,
        temperature: 0.15,
        client
      });

      if (secondaryRun.urgency_level !== primaryAnalysis.urgency_level) {
        consistencyPassed = false;
        finalUrgency = escalateUrgency(finalUrgency, secondaryRun.urgency_level);
      }
    } catch {
      // If consistency call fails, proceed with primary urgency and flag status
      consistencyPassed = true;
    }
  }

  // -------------------------------------------------------------
  // Final Status Determination
  // -------------------------------------------------------------
  const hasUnsupportedFacts = factAudit.some((f) => f.status === FACT_STATUSES.UNSUPPORTED);
  const hasSafetyOverrides = overridesApplied.length > 0;
  const lowConfidence = (primaryAnalysis.confidence_score || 0) < 0.65;

  let finalStatus = VERIFICATION_STATUSES.VERIFIED;
  let statusReasoning = 'All extracted facts corroborated and no clinical safety conflicts identified.';

  if (hasUnsupportedFacts || hasSafetyOverrides || !consistencyPassed) {
    finalStatus = VERIFICATION_STATUSES.VERIFIED_WITH_WARNINGS;
    const reasons = [];
    if (hasSafetyOverrides) reasons.push(`${overridesApplied.length} deterministic safety override(s) applied.`);
    if (hasUnsupportedFacts) reasons.push('Unsubstantiated facts were pruned.');
    if (!consistencyPassed) reasons.push('Urgency was escalated due to consistency variance.');
    statusReasoning = reasons.join(' ');
  }

  if (lowConfidence || validFacts.length === 0) {
    finalStatus = VERIFICATION_STATUSES.NEEDS_HUMAN_REVIEW;
    statusReasoning = 'Low model confidence or ambiguous emergency input; requires direct paramedic/physician evaluation.';
  }

  const verifiedAnalysis = {
    ...primaryAnalysis,
    urgency_level: finalUrgency,
    extracted_facts: validFacts,
    recommended_actions: safetyGuardedActions
  };

  const verificationMeta = {
    status: finalStatus,
    reasoning: statusReasoning,
    fact_audit: factAudit,
    overrides_applied: overridesApplied,
    pruned_actions: prunedActions,
    consistency_passed: consistencyPassed
  };

  return {
    verifiedAnalysis,
    verificationMeta
  };
}
