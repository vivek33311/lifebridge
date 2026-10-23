/**
 * @file controls.js
 * @description UI interaction manager: OrbitControls camera transitions,
 * lighting/time sliders, traffic play/pause, info modal, and accessibility keyboard bindings.
 */

import { CAMERA_PRESETS, BRIDGE_FACTS } from '../config/bridgeConfig.js';
import { TIME_OF_DAY } from './uiState.js';

/**
 * Initializes interactive UI controls, presets, and accessibility events.
 * 
 * @param {Object} params
 * @param {import('./uiState.js').UIStateManager} params.stateManager
 * @param {THREE.Camera} params.camera
 * @param {any} params.orbitControls
 * @param {Function} params.onTimeChange
 * @param {Function} params.onTrafficToggle
 * @param {Function} params.onReducedMotionToggle
 */
export function setupControls({
  stateManager,
  camera,
  orbitControls,
  onTimeChange,
  onTrafficToggle,
  onReducedMotionToggle
}) {
  const liveAnnouncer = document.getElementById('announcements');

  const announce = (msg) => {
    if (liveAnnouncer) {
      liveAnnouncer.textContent = msg;
    }
  };

  // 1. Populate Bridge Facts into Info Panel
  const factsTable = document.getElementById('bridge-facts-table');
  if (factsTable) {
    factsTable.innerHTML = '';
    BRIDGE_FACTS.forEach(fact => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.setAttribute('scope', 'row');
      th.textContent = fact.label;
      const td = document.createElement('td');
      td.textContent = fact.value;
      tr.appendChild(th);
      tr.appendChild(td);
      factsTable.appendChild(tr);
    });
  }

  // 2. Camera Preset Transitions
  const presetButtons = document.querySelectorAll('[data-preset]');

  const applyCameraPreset = (presetKey) => {
    const preset = CAMERA_PRESETS[presetKey];
    if (!preset) return;

    stateManager.setPreset(presetKey);

    // Update active button state
    presetButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === presetKey);
      btn.setAttribute('aria-pressed', btn.dataset.preset === presetKey ? 'true' : 'false');
    });

    // OrbitControls position & target
    camera.position.set(...preset.position);
    orbitControls.target.set(...preset.target);
    orbitControls.update();

    announce(`Camera switched to ${preset.name}: ${preset.description}`);
  };

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      applyCameraPreset(btn.dataset.preset);
    });
  });

  // 3. Time of Day Controls
  const timeSlider = document.getElementById('time-slider');
  const timeButtons = document.querySelectorAll('[data-time-mode]');

  const updateTimeUI = (state) => {
    if (timeSlider) {
      timeSlider.value = state.timeValue;
    }
    timeButtons.forEach(btn => {
      const isActive = btn.dataset.timeMode === state.timeOfDay;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  if (timeSlider) {
    timeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      stateManager.setTimeValue(val);
      const state = stateManager.getState();
      onTimeChange(state.timeOfDay, state.timeValue);
      updateTimeUI(state);
      announce(`Time adjusted to ${Math.floor(val)} hours: lighting mode ${state.timeOfDay}`);
    });
  }

  timeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.timeMode;
      stateManager.setTimeOfDay(mode);
      const state = stateManager.getState();
      onTimeChange(state.timeOfDay, state.timeValue);
      updateTimeUI(state);
      announce(`Lighting changed to ${mode} mode`);
    });
  });

  // 4. Traffic Play / Pause Button
  const trafficBtn = document.getElementById('traffic-toggle-btn');
  const trafficIcon = document.getElementById('traffic-icon');
  const trafficLabel = document.getElementById('traffic-label');

  const updateTrafficUI = (isRunning) => {
    if (trafficBtn) {
      trafficBtn.setAttribute('aria-pressed', isRunning ? 'true' : 'false');
    }
    if (trafficIcon) {
      trafficIcon.textContent = isRunning ? '⏸' : '▶';
    }
    if (trafficLabel) {
      trafficLabel.textContent = isRunning ? 'Traffic: Running' : 'Traffic: Paused';
    }
  };

  if (trafficBtn) {
    trafficBtn.addEventListener('click', () => {
      const isRunning = stateManager.toggleTraffic();
      onTrafficToggle(isRunning);
      updateTrafficUI(isRunning);
      announce(isRunning ? 'Bridge traffic resumed' : 'Bridge traffic paused');
    });
  }

  // 5. Info Panel Toggle
  const infoBtn = document.getElementById('info-toggle-btn');
  const infoCloseBtn = document.getElementById('info-close-btn');
  const infoPanel = document.getElementById('info-panel');

  const setInfoPanel = (isOpen) => {
    if (infoPanel) {
      infoPanel.classList.toggle('open', isOpen);
      infoPanel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }
    if (infoBtn) {
      infoBtn.classList.toggle('active', isOpen);
      infoBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
    announce(isOpen ? 'Opened Manhattan Bridge Facts & Specifications panel' : 'Closed Info panel');
  };

  if (infoBtn) {
    infoBtn.addEventListener('click', () => {
      const isOpen = stateManager.toggleInfo();
      setInfoPanel(isOpen);
    });
  }

  if (infoCloseBtn) {
    infoCloseBtn.addEventListener('click', () => {
      stateManager.state.infoOpen = false;
      setInfoPanel(false);
      infoBtn?.focus();
    });
  }

  // 6. Reduced Motion Detection & Button
  const motionBtn = document.getElementById('motion-toggle-btn');
  const mediaQueryMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const handleMotionChange = (prefersReduced) => {
    stateManager.setReducedMotion(prefersReduced);
    onReducedMotionToggle(prefersReduced);
    if (motionBtn) {
      motionBtn.classList.toggle('active', prefersReduced);
      motionBtn.setAttribute('aria-pressed', prefersReduced ? 'true' : 'false');
    }
    announce(prefersReduced ? 'Reduced motion enabled: waves and traffic paused' : 'Full motion enabled');
  };

  if (mediaQueryMotion.matches) {
    handleMotionChange(true);
  }

  mediaQueryMotion.addEventListener('change', (e) => {
    handleMotionChange(e.matches);
  });

  if (motionBtn) {
    motionBtn.addEventListener('click', () => {
      const current = stateManager.getState().reducedMotion;
      handleMotionChange(!current);
    });
  }

  // 7. Comprehensive Keyboard Accessibility
  window.addEventListener('keydown', (e) => {
    // Ignore input if user is focusing inside an input field
    if (e.target.tagName === 'INPUT' && e.key !== 'Escape') return;

    switch (e.key) {
      case '1':
        applyCameraPreset('aerial');
        break;
      case '2':
        applyCameraPreset('walkway');
        break;
      case '3':
        applyCameraPreset('brooklyn');
        break;
      case '4':
        applyCameraPreset('underSpan');
        break;
      case ' ':
        e.preventDefault();
        trafficBtn?.click();
        break;
      case 'i':
      case 'I':
        infoBtn?.click();
        break;
      case 't':
      case 'T': {
        const modes = [TIME_OF_DAY.DAY, TIME_OF_DAY.SUNSET, TIME_OF_DAY.NIGHT];
        const currentIdx = modes.indexOf(stateManager.getState().timeOfDay);
        const nextMode = modes[(currentIdx + 1) % modes.length];
        stateManager.setTimeOfDay(nextMode);
        const state = stateManager.getState();
        onTimeChange(state.timeOfDay, state.timeValue);
        updateTimeUI(state);
        announce(`Time changed to ${nextMode}`);
        break;
      }
      case 'Escape':
        if (stateManager.getState().infoOpen) {
          stateManager.state.infoOpen = false;
          setInfoPanel(false);
          infoBtn?.focus();
        }
        break;
      default:
        break;
    }
  });

  // Initialize UI with aerial preset
  applyCameraPreset('aerial');
  updateTrafficUI(stateManager.getState().trafficRunning);
  updateTimeUI(stateManager.getState());
}
