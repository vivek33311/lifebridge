/**
 * @fileoverview Realistic seed dataset for the LifeBridge demo account.
 * Supplies 12 clinical analyses spanning the last 7 days across CRITICAL, HIGH,
 * MEDIUM, and LOW urgency tiers, all marked with `isSample: true`.
 * Also provides default family patient profiles and emergency contacts.
 * @module dashboard/dashboardSeed
 */

export const DEMO_USER_ID = 'user_demo_108';

export const DEMO_USER = {
  id: DEMO_USER_ID,
  email: 'demo@lifebridge.org',
  name: 'Dr. Aarav Patel',
  role: 'Clinical Decision Lead',
  isDemo: true
};

/**
 * Returns dynamic timestamps offset from today by N days.
 * @param {number} daysAgo - Days before today.
 * @param {number} hourOffset - Hour of the day.
 * @returns {string} ISO timestamp string.
 */
function getDateOffset(daysAgo, hourOffset = 10) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hourOffset, 24, 0, 0);
  return d.toISOString();
}

/**
 * Generates 12 sample emergency triage records for demo seeding.
 * @returns {Array<Object>}
 */
export function generateSampleAnalyses() {
  return [
    {
      id: 'analysis_sample_01',
      userId: DEMO_USER_ID,
      isSample: true,
      timestamp: getDateOffset(0, 9),
      urgency_level: 'CRITICAL',
      situation_summary: 'Acute myocardial infarction with crushing retrosternal chest pain radiating to left jaw, diaphoresis, and severe dyspnea in a 62-year-old with known hypertension.',
      confidence_score: 0.98,
      patient_name: 'Arjun Patel',
      extracted_facts: [
        { category: 'condition', fact: 'Severe acute retrosternal chest pressure', source: 'Transcript' },
        { category: 'condition', fact: 'Hypertension history', source: 'Patient profile' },
        { category: 'medication', fact: 'Telmisartan 40mg daily', source: 'Family report' },
        { category: 'symptom', fact: 'Profuse cold diaphoresis and jaw pain', source: 'Bystander' }
      ],
      recommended_actions: [
        { action: 'Call 108 Emergency Ambulance immediately', reason: 'High likelihood of acute coronary syndrome', time_sensitivity: 'Immediate (0-2 min)' },
        { action: 'Position patient seated upright at 45 degrees', reason: 'Relieves pulmonary congestion and eases cardiac workload', time_sensitivity: 'Immediate' },
        { action: 'Loosen restrictive tight neckwear and belt', reason: 'Facilitates unrestricted thoracic excursion', time_sensitivity: 'Immediate' }
      ],
      call_108_script: 'URGENT: Suspected acute heart attack at Koramangala 4th Block, Bangalore. 62-year-old male with crushing chest pain, cold sweating, and jaw radiation. Conscious, sitting upright. Dispatch ALS ambulance with cardiac monitor.',
      verification: {
        status: 'VERIFIED',
        soundness: 'All clinical symptoms corroborated with classical STEMI presentation.',
        prunedActionsCount: 1,
        safetyOverridesApplied: 1,
        timestamp: getDateOffset(0, 9)
      }
    },
    {
      id: 'analysis_sample_02',
      userId: DEMO_USER_ID,
      isSample: true,
      timestamp: getDateOffset(1, 14),
      urgency_level: 'CRITICAL',
      situation_summary: 'Pediatric hot mustard oil scald over right forearm and chest (approx 12% TBSA) in a 4-year-old with documented Ibuprofen and NSAID allergy.',
      confidence_score: 0.96,
      patient_name: 'Meera Patel',
      extracted_facts: [
        { category: 'condition', fact: 'Partial thickness scald burns with blister formation', source: 'Photo upload' },
        { category: 'allergy', fact: 'Severe Ibuprofen/NSAID hypersensitivity', source: 'Patient profile' },
        { category: 'symptom', fact: 'Severe crying, intense dermal pain', source: 'Parent' }
      ],
      recommended_actions: [
        { action: 'Irrigate burns immediately with cool running tap water for 20 minutes', reason: 'Halts thermal progression and reduces dermal destruction depth', time_sensitivity: 'Immediate (0-5 min)' },
        { action: 'Do NOT apply ice, butter, turmeric, or toothpaste', reason: 'Prevents tissue ischemia and secondary microbial wound colonization', time_sensitivity: 'Rule override' },
        { action: 'Cover wound loosely with sterile non-adherent dressing or clean plastic wrap', reason: 'Shields exposed nerve endings and reduces hypothermia risk', time_sensitivity: 'Under 10 min' }
      ],
      call_108_script: 'EMERGENCY: Pediatric boiling oil scald in Jayanagar 7th Block. 4-year-old female with blisters on right arm and chest. Cooling water applied. Known NSAID allergy. Request pediatric burn transit.',
      verification: {
        status: 'VERIFIED',
        soundness: 'Safety rules successfully overrode bystander proposal to apply ice and butter.',
        prunedActionsCount: 2,
        safetyOverridesApplied: 2,
        timestamp: getDateOffset(1, 14)
      }
    },
    {
      id: 'analysis_sample_03',
      userId: DEMO_USER_ID,
      isSample: true,
      timestamp: getDateOffset(1, 21),
      urgency_level: 'CRITICAL',
      situation_summary: 'High-speed two-wheeler highway collision on NH44. Rider thrown 10 meters, reporting cervical neck rigidity, bilateral arm numbness, and scalp laceration.',
      confidence_score: 0.95,
      patient_name: 'Unknown Male (~28)',
      extracted_facts: [
        { category: 'condition', fact: 'Suspected unstable cervical spinal column injury', source: 'Bystander transcript' },
        { category: 'symptom', fact: 'Bilateral upper limb paresthesia and motor weakness', source: 'Transcript' },
        { category: 'condition', fact: 'Forehead scalp laceration with active venous bleed', source: 'Accident photo' }
      ],
      recommended_actions: [
        { action: 'Keep patient completely still; strictly maintain manual in-line spinal stabilization', reason: 'Prevents irreversible spinal cord transection or secondary paralysis', time_sensitivity: 'Critical (DO NOT MOVE)' },
        { action: 'Block bystanders from pulling patient into an auto-rickshaw or seated posture', reason: 'Trauma safety override to avoid axial spine displacement', time_sensitivity: 'Rule override' },
        { action: 'Apply firm direct pressure to scalp laceration with clean folded cloth', reason: 'Controls bleeding without moving the cervical spine', time_sensitivity: 'Under 2 min' }
      ],
      call_108_script: 'PRIORITY 1 DISPATCH: Motorcycle crash at NH44 Electronic City toll exit. 28-year-old male with suspected neck fracture and limb numbness. Patient stabilized on ground. Require ALS ambulance with spinal backboard and cervical collar.',
      verification: {
        status: 'VERIFIED',
        soundness: 'Spinal trauma protocols verified. Moving patient strictly prohibited.',
        prunedActionsCount: 2,
        safetyOverridesApplied: 2,
        timestamp: getDateOffset(1, 21)
      }
    },
    {
      id: 'analysis_sample_04',
      userId: DEMO_USER_ID,
      isSample: true,
      timestamp: getDateOffset(2, 8),
      urgency_level: 'HIGH',
      situation_summary: 'Severe acute asthma exacerbation triggered by vehicular smog exposure. Auditory expiratory wheeze, speaking in single fragmented words, intercostal retractions.',
      confidence_score: 0.93,
      patient_name: 'Pooja Sharma',
      extracted_facts: [
        { category: 'condition', fact: 'Chronic bronchial asthma', source: 'Patient profile' },
        { category: 'medication', fact: 'Salbutamol Inhaler (100mcg)', source: 'Prescription strip' },
        { category: 'symptom', fact: 'Severe tachypnea and marked intercostal muscle retractions', source: 'Audio note' }
      ],
      recommended_actions: [
        { action: 'Administer 4 puffs of Salbutamol reliever inhaler through spacer immediately', reason: 'Rapidly dilates bronchial smooth muscle to restore alveolar ventilation', time_sensitivity: 'Immediate' },
        { action: 'Sit patient fully upright leaning forward on arms', reason: 'Optimizes diaphragm excursion and minimizes respiratory muscle fatigue', time_sensitivity: 'Immediate' },
        { action: 'Prepare emergency transport if no clinical improvement after 6 minutes', reason: 'Prevents hypoxic respiratory arrest', time_sensitivity: '5-10 min' }
      ],
      call_108_script: 'High priority ambulance needed at Indiranagar 100ft Road. 19-year-old female in acute severe asthma attack. Speaking only in words, wheezing audible, inhaler administered. Oxygen support required.',
      verification: {
        status: 'VERIFIED',
        soundness: 'Standard Global Initiative for Asthma (GINA) acute protocol confirmed.',
        prunedActionsCount: 0,
        safetyOverridesApplied: 0,
        timestamp: getDateOffset(2, 8)
      }
    },
    {
      id: 'analysis_sample_05',
      userId: DEMO_USER_ID,
      isSample: true,
      timestamp: getDateOffset(2, 17),
      urgency_level: 'HIGH',
      situation_summary: 'Diabetic hypoglycemic stupor in a 55-year-old on Insulin Glargine. Disoriented, combative, cold skin, capillary glucometer reading 38 mg/dL.',
      confidence_score: 0.97,
      patient_name: 'Rajesh Verma',
      extracted_facts: [
        { category: 'condition', fact: 'Type 1 Diabetes Mellitus', source: 'History' },
        { category: 'medication', fact: 'Insulin Glargine and Metformin', source: 'Medicine strip' },
        { category: 'symptom', fact: 'Profound neuroglycopenia, blood glucose 38 mg/dL', source: 'Transcript' }
      ],
      recommended_actions: [
        { action: 'If swallowing reflex intact, give 15-20g rapid-acting glucose (fruit juice or 4 tsp sugar)', reason: 'Rapidly reverses cellular brain hypoglycemia', time_sensitivity: 'Immediate (0-3 min)' },
        { action: 'Do NOT force liquids or food if patient is unconscious or having seizures', reason: 'Prevents pulmonary aspiration and airway asphyxiation', time_sensitivity: 'Rule override' },
        { action: 'Re-evaluate mental clarity and repeat glucose check in 15 minutes', reason: 'Validates resolution of hypoglycemic event', time_sensitivity: '15 min' }
      ],
      call_108_script: 'Urgent medical assistance: 55-year-old male diabetic with severe hypoglycemia (38 mg/dL) at T. Nagar, Chennai. Semi-conscious, sweating heavily. Need paramedic IV dextrose administration.',
      verification: {
        status: 'VERIFIED',
        soundness: 'Safety rule prevented oral forced fluids during stupor state.',
        prunedActionsCount: 1,
        safetyOverridesApplied: 1,
        timestamp: getDateOffset(2, 17)
      }
    },
    {
      id: 'analysis_sample_06',
      userId: DEMO_USER_ID,
      isSample: true,
      timestamp: getDateOffset(3, 12),
      urgency_level: 'HIGH',
      situation_summary: 'Acute anaphylactic reaction following accidental peanut ingestion in a street dessert. Facial angioedema, stridor, urticarial rash across trunk, systolic pressure dropping.',
      confidence_score: 0.94,
      patient_name: 'Kabir Patel',
      extracted_facts: [
        { category: 'allergy', fact: 'Confirmed severe peanut allergy', source: 'Patient profile' },
        { category: 'symptom', fact: 'Lip and periorbital angioedema with inspiratory stridor', source: 'Transcript' },
        { category: 'symptom', fact: 'Diffuse pruritic urticarial wheals', source: 'Photo' }
      ],
      recommended_actions: [
        { action: 'Administer EpiPen / Epinephrine autoinjector 0.3mg intramuscularly into mid-outer thigh', reason: 'Reverses systemic vasodilation and halts laryngeal edema', time_sensitivity: 'Immediate (0-1 min)' },
        { action: 'Place patient flat with legs elevated (unless struggling to breathe)', reason: 'Maintains venous blood return and preserves cerebral perfusion', time_sensitivity: 'Immediate' },
        { action: 'Call 108 immediately and state systemic anaphylaxis', reason: 'Requires secondary phase observation and hemodynamic monitoring', time_sensitivity: 'Immediate' }
      ],
      call_108_script: 'ANAPHYLAXIS ALERT: 12-year-old boy in severe allergic reaction at Bandra West, Mumbai. Facial swelling, throat tightness, hives after peanut exposure. Auto-injector given. Immediate ambulance needed.',
      verification: {
        status: 'VERIFIED',
        soundness: 'Epinephrine prioritized per international resuscitation guidelines.',
        prunedActionsCount: 0,
        safetyOverridesApplied: 0,
        timestamp: getDateOffset(3, 12)
      }
    },
    {
      id: 'analysis_sample_07',
      userId: DEMO_USER_ID,
      isSample: true,
      timestamp: getDateOffset(3, 18),
      urgency_level: 'HIGH',
      situation_summary: 'Deep industrial angle-grinder laceration across left palmar surface and wrist. Pulsatile arterial bleeding, pale nailbeds, bystander tourniquet attempted.',
      confidence_score: 0.92,
      patient_name: 'Dinesh Kumar',
      extracted_facts: [
        { category: 'condition', fact: 'Deep wrist laceration with radial artery involvement', source: 'Photo' },
        { category: 'symptom', fact: 'Pulsatile bright red blood flow', source: 'Transcript' },
        { category: 'condition', fact: 'Tetanus toxoid status unknown', source: 'Question' }
      ],
      recommended_actions: [
        { action: 'Maintain continuous, uninterrupted direct pressure over wound with sterile gauze pad', reason: 'Arrests arterial hemorrhage by mechanical vascular compression', time_sensitivity: 'Immediate' },
        { action: 'Elevate left hand above the level of the heart', reason: 'Reduces hydrostatic pressure at bleeding site', time_sensitivity: 'Immediate' },
        { action: 'If bleeding bleeds through, add additional pads on top without removing original layer', reason: 'Protects fragile early platelet clot formation', time_sensitivity: 'Ongoing' }
      ],
      call_108_script: 'URGENT EMS: Industrial cut at Peenya Industrial Area, Bangalore. 34-year-old male with deep wrist laceration and arterial bleeding. Continuous pressure held. Urgent trauma surgical care needed.',
      verification: {
        status: 'VERIFIED',
        soundness: 'Direct compression protocol verified; dangerous makeshift wire tourniquet blocked.',
        prunedActionsCount: 1,
        safetyOverridesApplied: 1,
        timestamp: getDateOffset(3, 18)
      }
    },
    {
      id: 'analysis_sample_08',
      userId: DEMO_USER_ID,
      isSample: true,
      timestamp: getDateOffset(4, 16),
      urgency_level: 'MEDIUM',
      situation_summary: 'Inversion ankle trauma during local football match. Rapid lateral malleolus ecchymosis, gross swelling, inability to bear weight on left foot.',
      confidence_score: 0.91,
      patient_name: 'Aditya Sen',
      extracted_facts: [
        { category: 'condition', fact: 'Acute lateral ligament sprain vs distal fibular fracture', source: 'Transcript' },
        { category: 'symptom', fact: 'Gross edema and bone tenderness over lateral malleolus', source: 'Photo' },
        { category: 'symptom', fact: 'Inability to take 4 weight-bearing steps', source: 'Transcript' }
      ],
      recommended_actions: [
        { action: 'Rest and immobilize left ankle; avoid all weight bearing', reason: 'Prevents displacement of potential fracture line', time_sensitivity: 'Immediate' },
        { action: 'Apply cold pack wrapped in a cloth for 15 minutes at a time', reason: 'Limits inflammatory extravasation and alleviates throbbing pain', time_sensitivity: 'Within 30 min' },
        { action: 'Elevate foot on pillows above hip level', reason: 'Promotes lymphatic drainage and limits hematoma expansion', time_sensitivity: 'Continuous' }
      ],
      call_108_script: 'Non-emergency transport assistance at Salt Lake Stadium, Kolkata. 22-year-old male with severe ankle trauma, unable to walk. Orthopedic evaluation and X-ray required.',
      verification: {
        status: 'VERIFIED',
        soundness: 'Ottawa Ankle Rules applied accurately.',
        prunedActionsCount: 0,
        safetyOverridesApplied: 0,
        timestamp: getDateOffset(4, 16)
      }
    },
    {
      id: 'analysis_sample_09',
      userId: DEMO_USER_ID,
      isSample: true,
      timestamp: getDateOffset(5, 11),
      urgency_level: 'MEDIUM',
      situation_summary: 'Acute dehydrating gastroenteritis following contaminated street meal. 8 episodes of watery emesis and diarrhea in 6 hours, dry oral mucosa, lightheaded upon standing.',
      confidence_score: 0.90,
      patient_name: 'Sunita Sharma',
      extracted_facts: [
        { category: 'condition', fact: 'Moderate isotonic dehydration from acute gastroenteritis', source: 'Transcript' },
        { category: 'symptom', fact: 'Orthostatic presyncope, dry coated tongue', source: 'Transcript' },
        { category: 'medication', fact: 'No current chronic medications', source: 'Patient profile' }
      ],
      recommended_actions: [
        { action: 'Administer WHO standard Oral Rehydration Salts (ORS) in small sips (5ml every 2-3 min)', reason: 'Restores electrolyte balance without provoking gastric distension emesis', time_sensitivity: 'Immediate' },
        { action: 'Do NOT take antimotility drugs (like Loperamide) during active bacterial diarrhea', reason: 'May cause toxic megacolon and prolonged pathogen retention', time_sensitivity: 'Contraindication' },
        { action: 'Monitor urine frequency and color', reason: 'Clear pale urine indicates adequate rehydration recovery', time_sensitivity: 'Over 4-6 hours' }
      ],
      call_108_script: 'Medical advisory: 45-year-old female at C-Scheme, Jaipur with severe dehydration from vomiting and diarrhea. Rehydration initiated. Outpatient clinic transit recommended.',
      verification: {
        status: 'VERIFIED',
        soundness: 'WHO ORS rehydration protocol verified.',
        prunedActionsCount: 1,
        safetyOverridesApplied: 1,
        timestamp: getDateOffset(5, 11)
      }
    },
    {
      id: 'analysis_sample_10',
      userId: DEMO_USER_ID,
      isSample: true,
      timestamp: getDateOffset(5, 20),
      urgency_level: 'MEDIUM',
      situation_summary: 'Simple febrile seizure in a 2-year-old toddler with acute viral pharyngitis. Axillary temperature 39.8C. Tonic clonic jerking lasting 90 seconds, now in post-ictal sleep.',
      confidence_score: 0.93,
      patient_name: 'Aarush Verma',
      extracted_facts: [
        { category: 'condition', fact: 'Simple febrile convulsion, duration < 2 minutes', source: 'Parent description' },
        { category: 'symptom', fact: 'High pyrexia (39.8C), drowsy post-ictal state', source: 'Transcript' },
        { category: 'condition', fact: 'Spontaneous breathing maintained, no cyanosis', source: 'Video transcript' }
      ],
      recommended_actions: [
        { action: 'Place child gently in left lateral recovery position on a soft flat surface', reason: 'Maintains open airway and prevents saliva aspiration during post-ictal sleep', time_sensitivity: 'Immediate' },
        { action: 'Do NOT place any object, spoon, or fingers into the child\'s mouth', reason: 'Causes severe tooth fracture, oral trauma, and airway occlusion', time_sensitivity: 'Safety rule override' },
        { action: 'Remove heavy clothing and use room-temperature sponge to comfort fever', reason: 'Gently dissipates body heat without inducing shivering vasoconstriction', time_sensitivity: 'Next 10 min' }
      ],
      call_108_script: 'Pediatric urgent advisory at Hazratganj, Lucknow. 2-year-old child had a 90-second febrile seizure with high fever (39.8C). Seizure resolved, child breathing in recovery position. Pediatric examination requested.',
      verification: {
        status: 'VERIFIED',
        soundness: 'Pediatric seizure airway safety rules applied.',
        prunedActionsCount: 1,
        safetyOverridesApplied: 1,
        timestamp: getDateOffset(5, 20)
      }
    },
    {
      id: 'analysis_sample_11',
      userId: DEMO_USER_ID,
      isSample: true,
      timestamp: getDateOffset(6, 13),
      urgency_level: 'LOW',
      situation_summary: 'Exertional heat cramps and mild exhaustion in a 38-year-old construction site supervisor working under direct sun. Bilateral calf spasms, heavy sweating, normal mentation.',
      confidence_score: 0.95,
      patient_name: 'Ramesh Yadav',
      extracted_facts: [
        { category: 'condition', fact: 'Exertional heat-related muscle cramps', source: 'Transcript' },
        { category: 'symptom', fact: 'Painful involuntary calf contractions, profuse sweating', source: 'Transcript' },
        { category: 'condition', fact: 'Alert, oriented x 3, no signs of heat stroke', source: 'Transcript' }
      ],
      recommended_actions: [
        { action: 'Move to a cool, well-ventilated shaded or air-conditioned area immediately', reason: 'Stops heat accumulation and lowers thermal body strain', time_sensitivity: 'Immediate' },
        { action: 'Sip cool salted lemon water or electrolyte sports beverage slowly', reason: 'Replenishes sodium lost via heavy perspiration', time_sensitivity: 'Over 20 min' },
        { action: 'Perform gentle passive calf stretching and light massage', reason: 'Relieves painful muscle spasm cycle', time_sensitivity: 'Next 10 min' }
      ],
      call_108_script: 'Non-emergency advisory at SG Highway, Ahmedabad. 38-year-old worker with heat cramps. Conscious and resting in shade with electrolyte fluids. No emergency dispatch needed unless condition worsens.',
      verification: {
        status: 'VERIFIED',
        soundness: 'Heat exhaustion distinguished safely from life-threatening heat stroke.',
        prunedActionsCount: 0,
        safetyOverridesApplied: 0,
        timestamp: getDateOffset(6, 13)
      }
    },
    {
      id: 'analysis_sample_12',
      userId: DEMO_USER_ID,
      isSample: true,
      timestamp: getDateOffset(6, 19),
      urgency_level: 'LOW',
      situation_summary: 'Superficial skin graze and mild knee contusion from a low-speed trip and fall on pavement. Capillary oozing controlled, full joint range of motion preserved.',
      confidence_score: 0.96,
      patient_name: 'Ananya Bose',
      extracted_facts: [
        { category: 'condition', fact: 'Epidermal knee abrasion with superficial road dirt', source: 'Photo' },
        { category: 'condition', fact: 'Intact knee joint extension and weight bearing', source: 'Transcript' },
        { category: 'medication', fact: 'Tetanus booster received 6 months ago', source: 'Patient profile' }
      ],
      recommended_actions: [
        { action: 'Rinse abrasion thoroughly under clean running water and mild soap for 5 minutes', reason: 'Flushes microscopic grit and road debris to prevent traumatic tattooing and infection', time_sensitivity: 'Within 30 min' },
        { action: 'Apply thin layer of petroleum jelly or antiseptic ointment and non-stick bandage', reason: 'Moist wound healing accelerates epithelialization and reduces scarring', time_sensitivity: 'Next 1 hour' },
        { action: 'Inspect for redness, swelling, or warmth over next 48 hours', reason: 'Detects early secondary superficial cellulitis', time_sensitivity: 'Ongoing' }
      ],
      call_108_script: 'Routine first-aid advice: Minor knee graze at Southern Avenue, Kolkata. Wound cleansed and dressed. No EMS ambulance required.',
      verification: {
        status: 'VERIFIED',
        soundness: 'Low-risk first aid protocol corroborated.',
        prunedActionsCount: 0,
        safetyOverridesApplied: 0,
        timestamp: getDateOffset(6, 19)
      }
    }
  ];
}

/**
 * Returns default patient profiles for the demo account.
 * @returns {Array<Object>}
 */
export function generateSampleProfiles() {
  return [
    {
      id: 'prof_01',
      userId: DEMO_USER_ID,
      name: 'Arjun Patel',
      age: 62,
      bloodGroup: 'B+',
      allergies: 'Aspirin, Penicillin',
      medications: 'Telmisartan 40mg, Atorvastatin 10mg',
      notes: 'Hypertension diagnosed 2018. Former smoker. Regular morning walk.'
    },
    {
      id: 'prof_02',
      userId: DEMO_USER_ID,
      name: 'Meera Patel',
      age: 4,
      bloodGroup: 'O+',
      allergies: 'Ibuprofen, Combiflam, NSAIDs',
      medications: 'None',
      notes: 'No chronic conditions. Up-to-date pediatric immunizations.'
    },
    {
      id: 'prof_03',
      userId: DEMO_USER_ID,
      name: 'Kabir Patel',
      age: 12,
      bloodGroup: 'A+',
      allergies: 'Peanuts, Tree nuts, Shellfish',
      medications: 'EpiPen Junior carried in school backpack',
      notes: 'Severe anaphylaxis history in 2024. Wears medical alert bracelet.'
    }
  ];
}

/**
 * Returns default emergency contacts for the demo account.
 * @returns {Array<Object>}
 */
export function generateSampleContacts() {
  return [
    {
      id: 'contact_01',
      userId: DEMO_USER_ID,
      name: 'Pooja Patel',
      relationship: 'Spouse',
      phone: '+919876543210',
      notifyOnCritical: true
    },
    {
      id: 'contact_02',
      userId: DEMO_USER_ID,
      name: 'Dr. Vivek Sharma',
      relationship: 'Family Physician / Cardiologist',
      phone: '+919123456789',
      notifyOnCritical: true
    },
    {
      id: 'contact_03',
      userId: DEMO_USER_ID,
      name: 'National EMS Ambulance',
      relationship: 'Ambulance Dispatch',
      phone: '108',
      notifyOnCritical: true
    }
  ];
}
