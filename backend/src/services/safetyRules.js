/**
 * @fileoverview Deterministic safety rules and contraindication overrides for emergency guidance.
 * These non-AI deterministic checks enforce strict clinical boundaries and override generative model output.
 * @module services/safetyRules
 */

import { URGENCY_LEVELS } from '../config/constants.js';

/**
 * Metadata definition for a safety override rule.
 * @typedef {Object} SafetyOverride
 * @property {string} ruleId - Unique identifier for the rule.
 * @property {string} description - Explanation of why the rule fired.
 * @property {string} severity - 'CRITICAL' | 'WARNING'.
 * @property {string} [originalAction] - Unsafe action proposed by upstream AI.
 * @property {string} [replacementAction] - Safe deterministic substitute action.
 */

/**
 * Common medication aliases and contraindication cross-references.
 */
const CONTRAINDICATIONS = [
  {
    allergyKeywords: ['aspirin', 'disprin', 'nsaid', 'ibuprofen', 'brufen', 'combiflam'],
    medicationKeywords: ['aspirin', 'disprin', 'ecospirin', 'ibuprofen', 'brufen', 'combiflam', 'naproxen'],
    contraindicationName: 'Aspirin / NSAID allergy conflict',
    safeAlternative: 'Do NOT administer Aspirin or NSAIDs due to documented allergy. Provide immediate reassurance, loosen tight clothing, and await 108 ambulance paramedics.'
  },
  {
    allergyKeywords: ['penicillin', 'amoxicillin', 'augmentin', 'ampicillin', 'beta-lactam'],
    medicationKeywords: ['penicillin', 'amoxicillin', 'augmentin', 'ampicillin', 'mox', 'clav'],
    contraindicationName: 'Penicillin / Beta-lactam allergy conflict',
    safeAlternative: 'Avoid all penicillin-derived or beta-lactam antibiotics. Await emergency physician evaluation.'
  },
  {
    allergyKeywords: ['sulfa', 'sulfonamide', 'bactrim', 'septran'],
    medicationKeywords: ['sulfa', 'sulfonamide', 'bactrim', 'septran'],
    contraindicationName: 'Sulfonamide allergy conflict',
    safeAlternative: 'Contraindicated: Patient has documented sulfa allergy. Do not administer sulfonamide medicines.'
  },
  {
    allergyKeywords: ['paracetamol', 'acetaminophen', 'crocin', 'calpol', 'dolo'],
    medicationKeywords: ['paracetamol', 'acetaminophen', 'crocin', 'calpol', 'dolo', 'pyregesic'],
    contraindicationName: 'Paracetamol / Acetaminophen allergy conflict',
    safeAlternative: 'Do NOT give Paracetamol/Crocin/Dolo due to reported hypersensitivity.'
  }
];

/**
 * Patterns that indicate unsafe recommendation to induce vomiting.
 */
const INDUCE_VOMITING_PATTERNS = [
  /\b(?:induce|cause|force|make\s+(?:him|her|them|the\s+patient|the\s+person))\s+(?:to\s+)?vomit\b/i,
  /\b(?:emesis|vomiting|gag\s+reflex|throw\s+up|ulti\s+(?:karwao|karwayen|karaye))\b/i,
  /\b(?:salt\s+water|mustard\s+water|soap\s+water)\s+to\s+vomit\b/i
];

/**
 * Patterns that indicate patient has impaired consciousness.
 */
const IMPAIRED_CONSCIOUSNESS_PATTERNS = [
  /\b(?:unconscious|unresponsive|passed\s+out|fainted|coma|semi-conscious|drowsy|stupor|fits|seizure|convulsion|behosh|hosh\s+kho)\b/i
];

/**
 * Patterns recommending giving fluids or oral food/pills.
 */
const ORAL_INTAKE_PATTERNS = [
  /\b(?:give|administer|feed|offer|make\s+drink)\s+(?:(?:him|her|them|the\s+patient)\s+)?(?:(?:warm|cold|hot|sweet|sugar)\s+)?(?:water|fluids?|juice|tea|coffee|milk|sugar|glucose|food|oral\s+medicine|pill|tablet)\b/i,
  /\b(?:water|fluids?|juice|tea|milk)\s+to\s+drink\b/i,
  /\b(?:pani\s+pilaye|pani\s+do|dudh\s+pilaye)\b/i
];

/**
 * Patterns indicating burn or scald injuries.
 */
const BURN_PATTERNS = [
  /\b(?:burn|burns|scalding|hot\s+oil|hot\s+water|acid\s+burn|fire|jal\s+gaya|chhalaka)\b/i
];

/**
 * Patterns indicating harmful home remedies for burns.
 */
const HARMFUL_BURN_REMEDIES = [
  /\b(?:apply|put|rub)\s+(?:ice|ice\s+cubes?|ice\s+water|butter|toothpaste|ghee|oil|turmeric|haldi)\b/i
];

/**
 * Patterns indicating traumatic injury or high velocity impact.
 */
const TRAUMA_PATTERNS = [
  /\b(?:fall\s+from|fallen\s+from|road\s+accident|car\s+crash|bike\s+accident|hit\s+by\s+vehicle|neck\s+injury|spinal|chot\s+lagi|gir\s+gaya)\b/i
];

/**
 * Patterns recommending excessive movement in trauma.
 */
const MOVING_TRAUMA_PATTERNS = [
  /\b(?:move|walk|sit\s+up|stand\s+up|carry|transport\s+in\s+auto)\s+(?:immediately|now|him|her|the\s+patient)\b/i,
  /\b(?:bithaye|uthaye|chalwaye)\b/i
];

/**
 * Evaluates and applies deterministic safety rules against proposed actions and extracted facts.
 *
 * @param {Object} params
 * @param {import('../config/constants.js').URGENCY_LEVELS[keyof typeof import('../config/constants.js').URGENCY_LEVELS]} params.currentUrgency
 * @param {Array<{ action: string, reason: string, time_sensitivity: string }>} params.actions
 * @param {Array<{ category: string, fact: string, source: string }>} params.facts
 * @param {string} params.rawText
 * @returns {{
 *   sanitizedActions: Array<{ action: string, reason: string, time_sensitivity: string }>,
 *   overridesApplied: SafetyOverride[],
 *   escalatedUrgency: string|null
 * }}
 */
export function applySafetyRules({ currentUrgency, actions, facts, rawText }) {
  const overridesApplied = [];
  let escalatedUrgency = null;
  const sanitizedActions = [];

  const combinedText = `${rawText} ${facts.map((f) => f.fact).join(' ')}`.toLowerCase();
  const isUnconscious = IMPAIRED_CONSCIOUSNESS_PATTERNS.some((p) => p.test(combinedText));
  const isBurn = BURN_PATTERNS.some((p) => p.test(combinedText));
  const isTrauma = TRAUMA_PATTERNS.some((p) => p.test(combinedText));

  // Extract recorded patient allergies
  const reportedAllergies = facts
    .filter((f) => f.category === 'allergy')
    .map((f) => f.fact.toLowerCase());

  for (const item of actions) {
    let actionModified = false;
    const actionText = item.action.toLowerCase();
    const reasonText = item.reason.toLowerCase();
    const fullAction = `${actionText} ${reasonText}`;

    // 1. NEVER INDUCE VOMITING
    if (INDUCE_VOMITING_PATTERNS.some((p) => p.test(fullAction))) {
      overridesApplied.push({
        ruleId: 'RULE_NO_INDUCED_VOMITING',
        description: 'Overrode hazardous recommendation to induce vomiting. Ingested poisons, corrosives, and unknown toxins present lethal airway and esophageal perforation risks if regurgitated.',
        severity: 'CRITICAL',
        originalAction: item.action,
        replacementAction: 'Do NOT induce vomiting. Keep the patient in a calm sitting or recovery position, maintain an open airway, and call 108 / National Poisons Info immediately.'
      });
      sanitizedActions.push({
        action: 'Do NOT induce vomiting. Maintain open airway and monitor breathing continuously.',
        reason: 'Inducing vomiting risks chemical burns to esophagus, lethal airway obstruction, and aspiration pneumonia.',
        time_sensitivity: 'Immediate precaution'
      });
      escalatedUrgency = URGENCY_LEVELS.CRITICAL;
      actionModified = true;
      continue;
    }

    // 2. ALLERGY VS MEDICATION CONFLICT
    for (const rule of CONTRAINDICATIONS) {
      const allergyDetected = rule.allergyKeywords.some((kw) =>
        reportedAllergies.some((a) => a.includes(kw)) || combinedText.includes(`allergic to ${kw}`) || combinedText.includes(`${kw} allergy`)
      );

      const medPrescribed = rule.medicationKeywords.some((kw) => actionText.includes(kw));

      if (allergyDetected && medPrescribed) {
        overridesApplied.push({
          ruleId: 'RULE_ALLERGY_MEDICATION_CONFLICT',
          description: `Detected dangerous contraindication: ${rule.contraindicationName}. Overrode medication advice with allergy-safe protocol.`,
          severity: 'CRITICAL',
          originalAction: item.action,
          replacementAction: rule.safeAlternative
        });
        sanitizedActions.push({
          action: rule.safeAlternative,
          reason: `Documented patient allergy contraindicates this medication class to prevent life-threatening anaphylactic shock.`,
          time_sensitivity: 'Immediate'
        });
        escalatedUrgency = URGENCY_LEVELS.CRITICAL;
        actionModified = true;
        break;
      }
    }
    if (actionModified) continue;

    // 3. UNCONSCIOUS PATIENT ORAL RESTRICTION
    if (isUnconscious && ORAL_INTAKE_PATTERNS.some((p) => p.test(fullAction))) {
      overridesApplied.push({
        ruleId: 'RULE_UNCONSCIOUS_ORAL_RESTRICTION',
        description: 'Blocked oral fluid/medication guidance for an unresponsive patient. Unconscious individuals lack protective gag reflexes, creating an extreme risk of asphyxiation.',
        severity: 'CRITICAL',
        originalAction: item.action,
        replacementAction: 'Do NOT give any liquids, food, or oral tablets. Turn patient into the lateral recovery position.'
      });
      sanitizedActions.push({
        action: 'Do NOT administer any water, liquids, or oral medications. Place patient in the recovery position (on their side).',
        reason: 'Lack of consciousness disables normal airway protection, risking fatal aspiration and suffocating the patient.',
        time_sensitivity: 'Immediate'
      });
      escalatedUrgency = URGENCY_LEVELS.CRITICAL;
      actionModified = true;
      continue;
    }

    // 4. BURNS: NO ICE, BUTTER, OR HOME IRRITANTS
    if (isBurn && HARMFUL_BURN_REMEDIES.some((p) => p.test(fullAction))) {
      overridesApplied.push({
        ruleId: 'RULE_BURNS_NO_ICE_OR_IRRITANTS',
        description: 'Overrode harmful burn remedy. Ice induces tissue frostbite/ischemia, while butter/toothpaste traps heat and causes severe infection.',
        severity: 'WARNING',
        originalAction: item.action,
        replacementAction: 'Irrigate burns with gently flowing, clean tap water for 10-20 minutes. Cover loosely with sterile cling film or clean dry cloth.'
      });
      sanitizedActions.push({
        action: 'Cool burn area under clean, gentle running tap water for 10-20 minutes. Do NOT apply ice, butter, toothpaste, or oil.',
        reason: 'Ice causes secondary hypothermic tissue damage, and oils/creams trap heat and harbor bacterial contamination.',
        time_sensitivity: 'Immediate'
      });
      actionModified = true;
      continue;
    }

    // 5. TRAUMA: DO NOT MOVE UNLESS IMMEDIATE THREAT
    if (isTrauma && MOVING_TRAUMA_PATTERNS.some((p) => p.test(fullAction))) {
      overridesApplied.push({
        ruleId: 'RULE_TRAUMA_IMMOBILIZATION',
        description: 'Restricted patient movement following high-impact trauma to protect against catastrophic spinal cord transaction.',
        severity: 'WARNING',
        originalAction: item.action,
        replacementAction: 'Keep patient still and support head and neck aligned with the spine. Do not move or attempt to make patient sit or stand.'
      });
      sanitizedActions.push({
        action: 'Keep patient flat and immobile. Stabilize head and neck without twisting or flexing.',
        reason: 'Prevents irreversible spinal cord injury in suspected trauma or falls.',
        time_sensitivity: 'Immediate'
      });
      actionModified = true;
      continue;
    }

    // If no safety violation detected, preserve the action
    sanitizedActions.push(item);
  }

  // Ensure mandatory 108 dispatch exists in high/critical scenarios if missing
  const hasAmbulanceCall = sanitizedActions.some((a) =>
    /\b(?:108|112|ambulance|emergency\s+services)\b/i.test(a.action)
  );

  const needsAmbulancePrepended = !hasAmbulanceCall && (
    (currentUrgency === URGENCY_LEVELS.CRITICAL && overridesApplied.length === 0) ||
    overridesApplied.some((o) => o.ruleId === 'RULE_NO_INDUCED_VOMITING')
  );

  if (needsAmbulancePrepended) {
    sanitizedActions.unshift({
      action: 'Call 108 or 112 immediately for emergency medical transport.',
      reason: 'Urgent situation requires professional paramedic intervention and rapid hospital triage.',
      time_sensitivity: 'Immediate (within 60 seconds)'
    });
  }

  return {
    sanitizedActions,
    overridesApplied,
    escalatedUrgency
  };
}
