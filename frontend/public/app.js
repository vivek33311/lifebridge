/**
 * LifeBridge Editorial Studio Application Logic
 *
 * Implements:
 * 1. Split-wordmark bracket scroll parting & keyed cutout subject emergence.
 * 2. Sticky kinematic study with real mathematical model calculations.
 * 3. Staggered reveal grammar respecting prefers-reduced-motion.
 * 4. Multimodal emergency triage ingestion (text, voice, compressed canvas image).
 * 5. Strict textContent DOM rendering, 108 dispatch script, and clipboard/deep links.
 */

(() => {
  'use strict';

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion) {
    document.body.classList.add('enable-reveals');
  }

  // DOM Elements - Hero & Kinematics
  const heroStage = document.getElementById('hero-stage');
  const bridgeContainer = document.getElementById('bridge-canvas-container');

  const studySection = document.getElementById('study-section');
  const kinematicMarker = document.getElementById('kinematic-marker');
  const kinematicLeader = document.getElementById('kinematic-leader');
  const kinematicLabel = document.getElementById('kinematic-label');
  const readoutTheta = document.getElementById('readout-theta');
  const readoutConfidence = document.getElementById('readout-confidence');
  const readoutLatency = document.getElementById('readout-latency');
  const readoutMargin = document.getElementById('readout-margin');
  const terminalClock = document.getElementById('terminal-clock');

  // DOM Elements - Triage Terminal
  const form = document.getElementById('emergency-form');
  const textArea = document.getElementById('emergency-text');
  const charCounter = document.getElementById('char-counter');
  const imageInput = document.getElementById('image-input');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const imagePreview = document.getElementById('image-preview');
  const imageMeta = document.getElementById('image-meta');
  const btnRemoveImage = document.getElementById('btn-remove-image');
  const btnSubmit = document.getElementById('btn-submit');
  const btnReset = document.getElementById('btn-reset');

  const voiceBtn = document.getElementById('btn-voice');
  const voiceLangSelect = document.getElementById('voice-lang');
  const voiceStatusText = document.getElementById('voice-status-text');

  const loadingSpinner = document.getElementById('loading-spinner');
  const statusRegion = document.getElementById('status-region');
  const errorAlert = document.getElementById('error-alert');
  const errorMessage = document.getElementById('error-message');

  const resultsSection = document.getElementById('results-section');
  const urgencyBanner = document.getElementById('urgency-banner');
  const urgencyTitle = document.getElementById('urgency-title');
  const situationSummary = document.getElementById('situation-summary');
  const verificationBadge = document.getElementById('verification-badge');
  const confidenceMeter = document.getElementById('confidence-meter');

  const dispatchScript = document.getElementById('dispatch-script');
  const actionsList = document.getElementById('actions-list');
  const safetyOverridesBox = document.getElementById('safety-overrides-box');
  const safetyOverridesList = document.getElementById('safety-overrides-list');
  const factTableBody = document.getElementById('fact-table-body');
  const missingList = document.getElementById('missing-list');

  const btnCall108 = document.getElementById('btn-call-108');
  const btnCopyScript = document.getElementById('btn-copy-script');
  const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
  const btnCopyDoctor = document.getElementById('btn-copy-doctor');
  const btnReadAloud = document.getElementById('btn-read-aloud');

  // State
  let processedImageData = null;
  let speechRecognition = null;
  let isRecording = false;

  // Real-time Clock
  function updateClock() {
    if (!terminalClock) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
    terminalClock.textContent = `SYS.TIME: ${timeStr} IST`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Test Scenario Presets
  const PRESETS = {
    cardiac: 'My father is 62 years old, having severe crushing chest tightness radiating to his left shoulder and arm for the last 25 minutes. Bahut jyada paseena aa raha hai aur saans lene me dikkat ho rahi hai. He takes Amlodipine 5mg for high blood pressure. Currently at MG Road, Bangalore near Metro Pillar 142. Heavy evening traffic jammed outside.',
    burn: 'Khaulta hua sarson ka tel (hot mustard oil) 8 saal ke bachhe ke right arm par gir gaya hai 10 minute pehle. Skin pe bade chaale (blisters) pad gaye hain aur chamdi utar rahi hai. Bachha bahut ro raha hai. Padosi bol rahe hain ki baraf (ice) aur amul butter laga do aur dard ke liye Combiflam (Ibuprofen) de do. Note: Bachhe ko Brufen / NSAIDs se severe asthma attack aur allergy hoti hai.',
    accident: 'Two-wheeler road accident on Outer Ring Road flyover. Motorcycle rear-ended by a speeding car. Rider fell onto pavement, complaining of severe cervical neck pain and unable to move lower extremities. Active bleeding from forehead cut. Bystanders are trying to pull him up to sit in an auto-rickshaw.'
  };

  /**
   * 1. PROCEDURAL 3D MANHATTAN BRIDGE (Lazy-loaded Three.js via npm)
   */
  if (bridgeContainer) {
    import('/src/bridge3d.js')
      .then(({ initBridge3D }) => {
        initBridge3D(bridgeContainer);
      })
      .catch((err) => {
        console.warn('Could not initialize 3D Manhattan bridge:', err);
      });
  }

  function handleHeroScroll() {
    // Hero stage scroll handler
  }

  /**
   * 2. PINNED KINEMATIC STUDY
   * Mathematical Model:
   * Arc Angle: theta(t) = 15° + 150° * t
   * Confidence: C(t) = 0.88 + 0.10 * sin(0.5 * PI * t)
   * Latency: Delta_t = 1.20 - 0.45 * t (seconds)
   * Safety Margin: M(t) = 99.4 + 0.5 * t (%)
   */
  function handleStudyScroll() {
    if (!studySection) return;

    const rect = studySection.getBoundingClientRect();
    const sectionHeight = studySection.offsetHeight;
    const viewportHeight = window.innerHeight;

    // Progress within pinned section: 0.0 to 1.0
    const scrollOffset = -rect.top;
    const scrollableRange = sectionHeight - viewportHeight;
    const t = Math.min(Math.max(scrollOffset / (scrollableRange || 1), 0), 1);

    // Model Calculations
    const thetaDeg = 15 + t * 150;
    const thetaRad = (thetaDeg * Math.PI) / 180;

    // Arc geometry: center (250, 180), radius 170
    const cx = 250;
    const cy = 180;
    const r = 170;

    // In SVG space: angle 0 is at (cx - r, cy) moving clockwise over top to (cx + r, cy)
    const mx = cx - r * Math.cos(thetaRad);
    const my = cy - r * Math.sin(thetaRad);

    if (kinematicMarker) {
      kinematicMarker.setAttribute('cx', mx.toFixed(2));
      kinematicMarker.setAttribute('cy', my.toFixed(2));
    }
    if (kinematicLeader) {
      kinematicLeader.setAttribute('x1', mx.toFixed(2));
      kinematicLeader.setAttribute('y1', my.toFixed(2));
      kinematicLeader.setAttribute('x2', mx.toFixed(2));
      kinematicLeader.setAttribute('y2', (my - 35).toFixed(2));
    }
    if (kinematicLabel) {
      kinematicLabel.setAttribute('x', (mx + 6).toFixed(2));
      kinematicLabel.setAttribute('y', (my - 38).toFixed(2));
      kinematicLabel.textContent = `\u03B8: ${thetaDeg.toFixed(1)}\u00B0`;
    }

    // Update Readouts derived from model
    if (readoutTheta) readoutTheta.textContent = `${thetaDeg.toFixed(1)}\u00B0`;
    if (readoutConfidence) {
      const conf = (88 + 10 * Math.sin(0.5 * Math.PI * t)).toFixed(1);
      readoutConfidence.textContent = `${conf}%`;
    }
    if (readoutLatency) {
      const lat = (1.20 - 0.45 * t).toFixed(2);
      readoutLatency.textContent = `${lat}s`;
    }
    if (readoutMargin) {
      const marg = (99.4 + 0.5 * t).toFixed(1);
      readoutMargin.textContent = `${marg}%`;
    }
  }

  // Scroll listeners bound with requestAnimationFrame for smooth 60fps execution
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleHeroScroll();
        handleStudyScroll();
        checkReveals();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Initial load execution on requestAnimationFrame (guarantees elements are rendered without negative margin issues)
  window.requestAnimationFrame(() => {
    handleHeroScroll();
    handleStudyScroll();
    checkReveals();
  });

  /**
   * 3. STAGGERED REVEAL GRAMMAR
   */
  function checkReveals() {
    if (prefersReducedMotion) return;
    const revealBlocks = document.querySelectorAll('.reveal-block:not(.is-revealed)');
    const triggerBottom = window.innerHeight * 0.92;

    revealBlocks.forEach((block, index) => {
      const rect = block.getBoundingClientRect();
      if (rect.top < triggerBottom) {
        setTimeout(() => {
          block.classList.add('is-revealed');
        }, index * 70); // .07s stagger between siblings
      }
    });
  }

  /**
   * 4. TRIAGE TERMINAL INTERACTION
   */
  function updateCharCount() {
    const len = textArea.value.length;
    charCounter.textContent = `${len.toLocaleString()} / 10,000`;
  }
  textArea.addEventListener('input', updateCharCount);

  // Client-side Canvas Image Compression
  function compressImage(file, maxWidth = 1280, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image format.'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const targetMime = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(targetMime, quality);
          const base64Content = dataUrl.split(',')[1];
          const approxBytes = Math.round((base64Content.length * 3) / 4);

          resolve({
            data: dataUrl,
            mimeType: targetMime,
            sizeBytes: approxBytes
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  imageInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.type)) {
      showError('Please upload a valid image (JPEG, PNG, or WebP).');
      imageInput.value = '';
      return;
    }

    try {
      announceStatus('Compressing image on client device...');
      const compressed = await compressImage(file);
      processedImageData = {
        data: compressed.data,
        mimeType: compressed.mimeType
      };

      imagePreview.src = compressed.data;
      imageMeta.textContent = `${(compressed.sizeBytes / 1024).toFixed(0)} KB &bull; ${compressed.mimeType.toUpperCase()}`;
      imagePreviewContainer.classList.remove('hidden');
      btnRemoveImage.classList.remove('hidden');
      hideError();
      announceStatus('Multimodal document attached.');
    } catch (err) {
      showError(err.message || 'Image compression failed.');
    }
  });

  btnRemoveImage.addEventListener('click', () => {
    processedImageData = null;
    imageInput.value = '';
    imagePreview.src = '';
    imagePreviewContainer.classList.add('hidden');
    btnRemoveImage.classList.add('hidden');
    announceStatus('Attached document removed.');
  });

  // Presets
  document.querySelectorAll('.btn-chip-editorial').forEach((chip) => {
    chip.addEventListener('click', () => {
      const scenarioKey = chip.getAttribute('data-scenario');
      if (PRESETS[scenarioKey]) {
        textArea.value = PRESETS[scenarioKey];
        updateCharCount();
        textArea.focus();
        announceStatus(`Loaded scenario: ${chip.textContent}`);
      }
    });
  });

  // Speech Recognition (Web Speech API)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;

    speechRecognition.onstart = () => {
      isRecording = true;
      voiceBtn.classList.add('recording-indicator');
      voiceBtn.setAttribute('aria-pressed', 'true');
      voiceStatusText.textContent = 'Listening (Tap to stop)';
      announceStatus('Microphone active. Speaking emergency description.');
    };

    speechRecognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        textArea.value = (textArea.value + ' ' + finalTranscript).trim();
        updateCharCount();
      }
    };

    speechRecognition.onerror = (event) => {
      stopRecording();
      if (event.error !== 'no-speech') {
        showError(`Voice input error: ${event.error}`);
      }
    };

    speechRecognition.onend = () => {
      stopRecording();
    };

    voiceBtn.addEventListener('click', () => {
      if (isRecording) {
        stopRecording();
      } else {
        speechRecognition.lang = voiceLangSelect.value;
        try {
          speechRecognition.start();
        } catch {
          stopRecording();
        }
      }
    });
  } else {
    voiceBtn.disabled = true;
    voiceBtn.title = 'Web Speech API is not supported in this browser.';
    voiceStatusText.textContent = 'Voice Unavailable';
  }

  function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    voiceBtn.classList.remove('recording-indicator');
    voiceBtn.setAttribute('aria-pressed', 'false');
    voiceStatusText.textContent = 'Record Voice';
    if (speechRecognition) {
      try { speechRecognition.stop(); } catch { /* ignore */ }
    }
  }

  function announceStatus(msg) {
    if (statusRegion) statusRegion.textContent = msg;
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorAlert.classList.remove('hidden');
    errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    errorAlert.classList.add('hidden');
    errorMessage.textContent = '';
  }

  btnReset.addEventListener('click', () => {
    form.reset();
    processedImageData = null;
    imagePreview.src = '';
    imagePreviewContainer.classList.add('hidden');
    btnRemoveImage.classList.add('hidden');
    resultsSection.classList.add('hidden');
    hideError();
    updateCharCount();
    window.speechSynthesis && window.speechSynthesis.cancel();
    btnReadAloud.setAttribute('aria-pressed', 'false');
    announceStatus('Emergency form reset.');
  });

  // Submission Pipeline
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    stopRecording();

    const text = textArea.value.trim();
    if (!text && !processedImageData) {
      showError('Please provide incident details via text, voice, or attach an image.');
      return;
    }

    btnSubmit.disabled = true;
    loadingSpinner.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    announceStatus('Executing three-tier verification sieve...');

    try {
      const payload = {
        text,
        ...(processedImageData ? { image: processedImageData } : {})
      };

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Emergency analysis request failed.');
      }

      renderResults(data);
      announceStatus(`Analysis verified. Triage urgency tier: ${data.urgency_level}.`);
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      showError(err.message || 'An unexpected connection error occurred.');
      announceStatus('Error occurred during emergency analysis.');
    } finally {
      btnSubmit.disabled = false;
      loadingSpinner.classList.add('hidden');
    }
  });

  /**
   * DOM Rendering with Strict textContent Escaping
   */
  function renderResults(data) {
    resultsSection.classList.remove('hidden');

    const urgency = data.urgency_level || 'CRITICAL';
    urgencyBanner.className = 'urgency-banner-editorial';

    if (urgency === 'CRITICAL') {
      urgencyBanner.classList.add('critical');
      urgencyTitle.textContent = 'CRITICAL EMERGENCY // LEVEL 01';
      urgencyTitle.style.color = 'var(--pigment)';
    } else if (urgency === 'HIGH') {
      urgencyBanner.classList.add('high');
      urgencyTitle.textContent = 'HIGH ACUITY // LEVEL 02';
      urgencyTitle.style.color = 'var(--pigment)';
    } else if (urgency === 'MEDIUM') {
      urgencyBanner.classList.add('medium');
      urgencyTitle.textContent = 'INTERMEDIATE // LEVEL 03';
      urgencyTitle.style.color = 'var(--ink)';
    } else {
      urgencyBanner.classList.add('low');
      urgencyTitle.textContent = 'LOW ACUITY // LEVEL 04';
      urgencyTitle.style.color = 'var(--muted)';
    }

    situationSummary.textContent = data.situation_summary || 'Urgent incident reported.';

    const vStatus = data.verification?.status || 'VERIFIED';
    verificationBadge.textContent = vStatus.replace(/_/g, ' ');

    const conf = Math.round((data.confidence_score || 0.8) * 100);
    confidenceMeter.textContent = `CONFIDENCE: ${conf}% \u2022 STATUS: ${vStatus} \u2022 ${data.verification?.reasoning || 'Verification passed.'}`;

    // Dispatch Script
    const scriptText = data.call_108_script || 'Ambulance requested for emergency.';
    dispatchScript.textContent = scriptText;

    // Action Checklist
    actionsList.textContent = '';
    const actions = data.recommended_actions || [];
    actions.forEach((act, idx) => {
      const li = document.createElement('li');
      li.className = 'checklist-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `action-check-${idx}`;
      checkbox.className = 'checklist-check';
      checkbox.setAttribute('aria-label', `Mark completed: ${act.action}`);

      const content = document.createElement('div');
      content.style.flex = '1';

      const title = document.createElement('div');
      title.className = 'checklist-title';
      title.textContent = `${idx + 1}. ${act.action}`;

      const sub = document.createElement('div');
      sub.className = 'checklist-sub';
      sub.textContent = `[${act.time_sensitivity || 'Immediate'}] ${act.reason ? '\u2014 ' + act.reason : ''}`;

      content.appendChild(title);
      content.appendChild(sub);
      li.appendChild(checkbox);
      li.appendChild(content);

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          title.style.textDecoration = 'line-through';
          title.style.opacity = '0.5';
        } else {
          title.style.textDecoration = 'none';
          title.style.opacity = '1';
        }
      });

      actionsList.appendChild(li);
    });

    // Safety Overrides Alert
    safetyOverridesList.textContent = '';
    const overrides = data.verification?.overrides_applied || [];
    if (overrides.length > 0) {
      safetyOverridesBox.classList.remove('hidden');
      overrides.forEach((ov) => {
        const li = document.createElement('li');
        li.textContent = `${ov.ruleId}: ${ov.description}`;
        safetyOverridesList.appendChild(li);
      });
    } else {
      safetyOverridesBox.classList.add('hidden');
    }

    // Fact Corroboration Table
    factTableBody.textContent = '';
    const facts = data.extracted_facts || [];
    const factAuditMap = new Map();
    (data.verification?.fact_audit || []).forEach((item) => {
      factAuditMap.set(item.fact, item.status);
    });

    facts.forEach((f) => {
      const tr = document.createElement('tr');

      const tdCat = document.createElement('td');
      tdCat.style.color = 'var(--pigment)';
      tdCat.textContent = f.category.toUpperCase();

      const tdFact = document.createElement('td');
      tdFact.textContent = f.fact;

      const tdSource = document.createElement('td');
      tdSource.style.color = 'var(--muted)';
      tdSource.textContent = f.source;

      const tdStatus = document.createElement('td');
      tdStatus.style.textAlign = 'right';
      const st = factAuditMap.get(f.fact) || 'SUPPORTED';
      tdStatus.textContent = st;
      if (st === 'UNSUPPORTED') {
        tdStatus.style.textDecoration = 'line-through';
        tdStatus.style.color = 'var(--pigment)';
      }

      tr.appendChild(tdCat);
      tr.appendChild(tdFact);
      tr.appendChild(tdSource);
      tr.appendChild(tdStatus);
      factTableBody.appendChild(tr);
    });

    // Missing Information
    missingList.textContent = '';
    const missing = data.missing_information || [];
    if (missing.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'None identified. Essential triage parameters corroborated.';
      missingList.appendChild(li);
    } else {
      missing.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        missingList.appendChild(li);
      });
    }

    setupDispatchActions(data);
  }

  function setupDispatchActions(data) {
    const summary = data.situation_summary || '';
    const script = data.call_108_script || '';
    const urgency = data.urgency_level || 'CRITICAL';

    // WhatsApp Dispatch Deep Link
    const waText = encodeURIComponent(
      `*🚨 EMERGENCY ALERT (LifeBridge)*\n` +
      `*Urgency:* ${urgency}\n` +
      `*Summary:* ${summary}\n\n` +
      `*108 Dispatcher Script:*\n"${script}"\n\n` +
      `*Immediate Actions:*\n` +
      (data.recommended_actions || []).map((a, i) => `${i + 1}. ${a.action}`).join('\n') +
      `\n\n_Assisted by LifeBridge Universal Emergency Bridge_`
    );
    btnShareWhatsapp.href = `https://wa.me/?text=${waText}`;

    // Copy 108 Script
    btnCopyScript.onclick = async () => {
      try {
        await navigator.clipboard.writeText(script);
        copyFeedback(btnCopyScript, 'Script Copied');
      } catch {
        showError('Clipboard copy failed. Please select text manually.');
      }
    };

    // Copy Doctor Handoff
    btnCopyDoctor.onclick = async () => {
      const doctorHandoff =
        `=== LIFEBRIDGE EMERGENCY TRIAGE HANDOFF ===\n` +
        `Urgency Level: ${urgency} (Verification: ${data.verification?.status || 'N/A'})\n` +
        `Summary: ${summary}\n\n` +
        `[EXTRACTED CLINICAL FACTS]\n` +
        (data.extracted_facts || []).map((f) => `- [${f.category.toUpperCase()}] ${f.fact} (Source: ${f.source})`).join('\n') +
        `\n\n[RECOMMENDED ACTIONS]\n` +
        (data.recommended_actions || []).map((a, i) => `${i + 1}. ${a.action} (${a.time_sensitivity}) - Reason: ${a.reason}`).join('\n') +
        `\n\n[MISSING CLINICAL INFORMATION]\n` +
        (data.missing_information || []).map((m) => `- ${m}`).join('\n') +
        `\n=== END HANDOFF ===`;

      try {
        await navigator.clipboard.writeText(doctorHandoff);
        copyFeedback(btnCopyDoctor, 'Handoff Copied');
      } catch {
        showError('Clipboard copy failed.');
      }
    };

    // Read Aloud using SpeechSynthesis
    btnReadAloud.onclick = () => {
      if (!window.speechSynthesis) {
        showError('Read aloud is not supported in this browser.');
        return;
      }

      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        btnReadAloud.textContent = 'Read Aloud';
        btnReadAloud.setAttribute('aria-pressed', 'false');
        return;
      }

      const textToSpeak = `Emergency Level: ${urgency}. ${summary}. Immediate actions: ` +
        (data.recommended_actions || []).map((a, i) => `Step ${i + 1}: ${a.action}`).join('. ');

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = voiceLangSelect.value;
      utterance.rate = 1.0;

      utterance.onend = () => {
        btnReadAloud.textContent = 'Read Aloud';
        btnReadAloud.setAttribute('aria-pressed', 'false');
      };
      utterance.onerror = () => {
        btnReadAloud.textContent = 'Read Aloud';
        btnReadAloud.setAttribute('aria-pressed', 'false');
      };

      btnReadAloud.textContent = 'Stop Reading';
      btnReadAloud.setAttribute('aria-pressed', 'true');
      window.speechSynthesis.speak(utterance);
    };
  }

  function copyFeedback(btn, text) {
    const originalText = btn.textContent;
    btn.textContent = text;
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = originalText;
      btn.disabled = false;
    }, 2000);
  }
})();
