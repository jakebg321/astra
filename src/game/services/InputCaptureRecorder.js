class InputCaptureRecorder {
  constructor() {
    this.reset();
    this.lastState = null;
    this.maxEvents = 20000;
    this.autoStart = false;
    this.bound = false;
    this.bindWindowApi();
  }

  reset() {
    this.active = false;
    this.startedAt = 0;
    this.endedAt = 0;
    this.sessionId = null;
    this.events = [];
    this.meta = {
      source: 'PlayerController',
      version: 'v1',
      notes: '',
    };
    this.lastState = null;
  }

  bindWindowApi() {
    if (typeof window === 'undefined' || this.bound) return;
    this.bound = true;

    window.astraInputCapture = {
      start: (meta = {}) => this.start(meta),
      stop: () => this.stop(),
      reset: () => this.reset(),
      status: () => this.getStatus(),
      export: (filename = null) => this.exportJson(filename),
      mark: (label, data = {}) => this.mark(label, data),
      events: () => [...this.events],
    };

    if (window.localStorage?.getItem('astra_input_capture_autostart') === '1') {
      this.start({ reason: 'autostart_localstorage' });
    }
  }

  nowMs() {
    return Date.now();
  }

  relMs() {
    if (!this.startedAt) return 0;
    return this.nowMs() - this.startedAt;
  }

  push(event) {
    if (!this.active) return;
    if (this.events.length >= this.maxEvents) return;
    this.events.push({
      t: this.relMs(),
      atIso: new Date().toISOString(),
      ...event,
    });
  }

  start(meta = {}) {
    if (this.active) return this.getStatus();
    this.active = true;
    this.startedAt = this.nowMs();
    this.endedAt = 0;
    this.sessionId = `inputcap_${this.startedAt}`;
    this.events = [];
    this.meta = {
      ...this.meta,
      ...meta,
    };
    this.lastState = null;
    this.push({ type: 'capture_started', sessionId: this.sessionId });
    return this.getStatus();
  }

  stop() {
    if (!this.active) return this.getStatus();
    this.push({ type: 'capture_stopping' });
    this.active = false;
    this.endedAt = this.nowMs();
    return this.getStatus();
  }

  mark(label, data = {}) {
    this.push({
      type: 'marker',
      label: String(label || ''),
      data,
    });
  }

  observe(state) {
    if (!this.active || !state) return;
    if (!this.lastState) {
      this.lastState = { ...state };
      this.push({ type: 'snapshot_init', state: { ...state } });
      return;
    }

    const keysToTrack = [
      'boost',
      'brake',
      'isFiring',
      'isAiming',
      'portal',
      'portalToggleMode',
      'portalActivate',
      'portalRecall',
      'crystalWall',
      'crystalWallBehind',
      'leftMouse',
      'rightMouse',
      'w',
      'a',
      's',
      'd',
      'q',
      'e',
      'space',
      'shift',
      'usingController',
      'blinkActive',
    ];

    for (const key of keysToTrack) {
      const prev = !!this.lastState[key];
      const next = !!state[key];
      if (prev !== next) {
        this.push({
          type: 'input_transition',
          key,
          value: next,
        });
      }
    }

    this.lastState = { ...state };
  }

  getStatus() {
    return {
      active: this.active,
      sessionId: this.sessionId,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      eventCount: this.events.length,
      durationMs: this.active ? this.relMs() : (this.endedAt && this.startedAt ? this.endedAt - this.startedAt : 0),
    };
  }

  buildPayload() {
    const status = this.getStatus();
    return {
      sessionId: status.sessionId,
      startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : null,
      endedAt: this.endedAt ? new Date(this.endedAt).toISOString() : null,
      durationMs: status.durationMs,
      active: status.active,
      meta: this.meta,
      events: this.events,
    };
  }

  exportJson(filename = null) {
    const payload = this.buildPayload();
    if (typeof window === 'undefined') return payload;
    const file = filename || `${payload.sessionId || 'inputcap'}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);
    return payload;
  }
}

const recorder = new InputCaptureRecorder();

export default recorder;
