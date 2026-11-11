

const STICK_DEADZONE = 0.15;
const THRUST_THRESHOLD = 0.3;
const TRIGGER_THRESHOLD = 0.2;
const LOOK_RATE = 2.2;
const FIRE_INTERVAL_MS = 125;

const BUTTON = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7 };

const shapeStick = (value) => {
  const size = Math.abs(value);
  if (size < STICK_DEADZONE) return 0;
  const scaled = (size - STICK_DEADZONE) / (1 - STICK_DEADZONE);
  return Math.sign(value) * scaled * scaled;
};

let lastFireAt = -Infinity;

export function pollGamepad(delta, mouseSensitivity) {
  const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
  const pad = pads.find((p) => p && p.connected && p.mapping === 'standard');
  if (!pad) return null;

  const held = (index) => !!pad.buttons[index]?.pressed;
  const trigger = (index) => (pad.buttons[index]?.value || 0) > TRIGGER_THRESHOLD;
  const thrust = pad.axes[1] || 0;
  const firing = trigger(BUTTON.RT);

  const now = performance.now();
  const fireNow = firing && now - lastFireAt >= FIRE_INTERVAL_MS;
  if (fireNow) lastFireAt = now;

  return {
    keys: {
      w: thrust < -THRUST_THRESHOLD,
      s: thrust > THRUST_THRESHOLD,
      a: held(BUTTON.LB),
      d: held(BUTTON.RB),
      q: held(BUTTON.Y),
      e: held(BUTTON.A),
    },
    look: {
      x: (shapeStick(pad.axes[2] || 0) * LOOK_RATE * delta) / mouseSensitivity,
      y: (shapeStick(pad.axes[3] || 0) * LOOK_RATE * delta) / mouseSensitivity,
    },
    boost: trigger(BUTTON.LT),
    firing,
    fireNow,
    portal: held(BUTTON.X),
    crystalWall: held(BUTTON.B),
  };
}
