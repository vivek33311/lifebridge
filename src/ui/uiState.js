/**
 * @file uiState.js
 * @description State container for application HUD and interaction controls.
 */

export const TIME_OF_DAY = {
  DAY: 'day',
  SUNSET: 'sunset',
  NIGHT: 'night'
};

export class UIStateManager {
  constructor(initialState = {}) {
    this.state = {
      timeOfDay: initialState.timeOfDay || TIME_OF_DAY.DAY,
      timeValue: initialState.timeValue !== undefined ? initialState.timeValue : 12, // 0 to 24 hrs
      trafficRunning: initialState.trafficRunning !== undefined ? initialState.trafficRunning : true,
      infoOpen: initialState.infoOpen || false,
      activePreset: initialState.activePreset || 'aerial',
      reducedMotion: initialState.reducedMotion || false,
      wireframe: false
    };
    this.listeners = new Set();
  }

  getState() {
    return { ...this.state };
  }

  setTimeOfDay(mode) {
    if (!Object.values(TIME_OF_DAY).includes(mode)) {
      throw new Error(`Invalid time mode: ${mode}`);
    }
    this.state.timeOfDay = mode;
    if (mode === TIME_OF_DAY.DAY) this.state.timeValue = 12;
    else if (mode === TIME_OF_DAY.SUNSET) this.state.timeValue = 18.5;
    else if (mode === TIME_OF_DAY.NIGHT) this.state.timeValue = 22;
    this.notify('time');
  }

  setTimeValue(hours) {
    const val = Math.max(0, Math.min(24, Number(hours)));
    this.state.timeValue = val;
    if (val >= 6.5 && val < 17.5) {
      this.state.timeOfDay = TIME_OF_DAY.DAY;
    } else if ((val >= 17.5 && val < 20.0) || (val >= 5.5 && val < 6.5)) {
      this.state.timeOfDay = TIME_OF_DAY.SUNSET;
    } else {
      this.state.timeOfDay = TIME_OF_DAY.NIGHT;
    }
    this.notify('time');
  }

  toggleTraffic() {
    this.state.trafficRunning = !this.state.trafficRunning;
    this.notify('traffic');
    return this.state.trafficRunning;
  }

  setTraffic(running) {
    this.state.trafficRunning = Boolean(running);
    this.notify('traffic');
  }

  toggleInfo() {
    this.state.infoOpen = !this.state.infoOpen;
    this.notify('info');
    return this.state.infoOpen;
  }

  setPreset(presetKey) {
    this.state.activePreset = presetKey;
    this.notify('preset');
  }

  setReducedMotion(enabled) {
    this.state.reducedMotion = Boolean(enabled);
    this.notify('motion');
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(changeType) {
    const state = this.getState();
    this.listeners.forEach(fn => {
      try {
        fn(state, changeType);
      } catch (err) {
        console.error('Error in UI state listener:', err);
      }
    });
  }
}
