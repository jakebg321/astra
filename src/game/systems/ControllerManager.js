

class ControllerManager {
  constructor() {
    this.connected = false;
    this.controller = null;
    this.lastButtons = [];
    this.lastAxes = [];
    this.deadZone = 0.15;
    this.sensitivity = 1.0;

    this.state = {
      leftStick: { x: 0, y: 0 },
      rightStick: { x: 0, y: 0 },
      leftTrigger: 0,
      rightTrigger: 0,
      buttons: {},
      vibrationSupported: false
    };

    this.buttonMap = {

      0: 'boost',
      1: 'brake',
      2: 'target',
      3: 'ability',

      4: 'prevWeapon',
      5: 'nextWeapon',

      6: 'aim',
      7: 'fire',

      8: 'map',
      9: 'menu',
      10: 'leftStickBtn',
      11: 'rightStickBtn',

      12: 'dpadUp',
      13: 'dpadDown',
      14: 'dpadLeft',
      15: 'dpadRight'
    };

    this.axisMap = {
      0: 'leftStickX',
      1: 'leftStickY',
      2: 'rightStickX',
      3: 'rightStickY',

      4: 'leftTrigger',
      5: 'rightTrigger'
    };

    this.settings = {
      invertYaw: false,
      invertPitch: false,
      deadZone: 0.15,
      sensitivity: 2.5,
      movementSensitivity: 1.8,
      lookSensitivity: 4.4,
      triggerDeadZone: 0.05,
      vibrationEnabled: true,
      aimSensitivityReduction: 0.4,

      stickCurve: 'linear',
      triggerCurve: 'linear'
    };
    
    this.init();
  }
  
  init() {

    if (!navigator.getGamepads) {
      console.warn('Gamepad API not supported');
      return;
    }

    window.addEventListener('gamepadconnected', (e) => {
      console.log(`Controller connected: ${e.gamepad.id}`);
      this.onControllerConnect(e.gamepad);
    });
    
    window.addEventListener('gamepaddisconnected', (e) => {
      console.log(`Controller disconnected: ${e.gamepad.id}`);
      this.onControllerDisconnect();
    });

    this.scanForControllers();

    this.loadSettings();
  }
  
  scanForControllers() {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.onControllerConnect(gamepads[i]);
        break;
      }
    }
  }
  
  onControllerConnect(gamepad) {
    this.controller = gamepad;
    this.connected = true;
    this.lastButtons = new Array(gamepad.buttons.length).fill(false);
    this.lastAxes = new Array(gamepad.axes.length).fill(0);

    this.state.vibrationSupported = !!(gamepad.vibrationActuator || gamepad.hapticActuators);
    
    console.log(`Controller ready: ${gamepad.id}`);
    console.log(`Vibration support: ${this.state.vibrationSupported}`);

    this.dispatchEvent('controllerConnected', {
      id: gamepad.id,
      vibrationSupported: this.state.vibrationSupported
    });
  }
  
  onControllerDisconnect() {
    this.connected = false;
    this.controller = null;
    this.state = {
      leftStick: { x: 0, y: 0 },
      rightStick: { x: 0, y: 0 },
      leftTrigger: 0,
      rightTrigger: 0,
      buttons: {},
      vibrationSupported: false
    };

    if (typeof window !== 'undefined' && window.inputManager && window.inputManager.clearControllerState) {
      window.inputManager.clearControllerState();
    }
    
    this.dispatchEvent('controllerDisconnected');
  }

  update() {

    const gamepads = navigator.getGamepads();

    if (!gamepads || !Array.from(gamepads).some(pad => pad && pad.connected)) {
      if (this.connected) {
        this.onControllerDisconnect();
      }
      return this.state;
    }

    if (this.connected && this.controller) {
      const gamepad = gamepads[this.controller.index];
      if (!gamepad || !gamepad.connected) {
        this.onControllerDisconnect();
        return this.state;
      }
    }

    if (!this.connected) return this.state;

    const gamepad = gamepads[this.controller.index];
    
    this.controller = gamepad;
    
    this.updateSticks();
    
    this.updateTriggers();
    
    this.updateButtons();
    
    return this.getControllerInput();
  }
  
  updateSticks() {
    const gamepad = this.controller;

    let leftX = this.applyDeadZone(gamepad.axes[0]);
    let leftY = this.applyDeadZone(gamepad.axes[1]);
    
    if ((Math.abs(leftX) > 0.1 || Math.abs(leftY) > 0.1) && (!this.lastStickDebug || Date.now() - this.lastStickDebug > 500)) {
      this.lastStickDebug = Date.now();
    }

    let rightX = this.applyDeadZone(gamepad.axes[2]);
    let rightY = this.applyDeadZone(gamepad.axes[3]);

    if (this.settings.invertYaw) {
      rightX = -rightX;
    }
    if (this.settings.invertPitch) {
      rightY = -rightY;
    }

    leftX = this.applyCurve(leftX) * this.settings.movementSensitivity;
    leftY = this.applyCurve(leftY) * this.settings.movementSensitivity;
    rightX = this.applyCurve(rightX) * this.settings.lookSensitivity;
    rightY = this.applyCurve(rightY) * this.settings.lookSensitivity;

    if (this.state.leftTrigger > 0.1) {
      const reduction = this.settings.aimSensitivityReduction;
      rightX *= (1 - reduction);
      rightY *= (1 - reduction);
    }
    
    this.state.leftStick = { x: leftX, y: leftY };
    this.state.rightStick = { x: rightX, y: rightY };
  }
  
  updateTriggers() {
    const gamepad = this.controller;

    let leftTrigger = 0;
    let rightTrigger = 0;

    if (gamepad.buttons[6]) {
      leftTrigger = gamepad.buttons[6].value;
    }
    if (gamepad.buttons[7]) {
      rightTrigger = gamepad.buttons[7].value;
    }

    if (leftTrigger === 0 && gamepad.axes[4] !== undefined) {
      leftTrigger = Math.max(0, gamepad.axes[4]);
    }
    if (rightTrigger === 0 && gamepad.axes[5] !== undefined) {
      rightTrigger = Math.max(0, gamepad.axes[5]);
    }

    leftTrigger = leftTrigger > this.settings.triggerDeadZone ? leftTrigger : 0;
    rightTrigger = rightTrigger > this.settings.triggerDeadZone ? rightTrigger : 0;
    
    this.state.leftTrigger = leftTrigger;
    this.state.rightTrigger = rightTrigger;
  }
  
  updateButtons() {
    const gamepad = this.controller;
    const newButtons = {};

    for (let i = 0; i < gamepad.buttons.length; i++) {
      const button = gamepad.buttons[i];
      const isPressed = button.pressed;
      const wasPressed = this.lastButtons[i];
      
      const buttonName = this.buttonMap[i];
      if (buttonName) {
        newButtons[buttonName] = {
          pressed: isPressed,
          justPressed: isPressed && !wasPressed,
          justReleased: !isPressed && wasPressed,
          value: button.value
        };
      }
      
      this.lastButtons[i] = isPressed;
    }
    
    this.state.buttons = newButtons;
  }

  getControllerInput() {
    if (!this.connected) return null;
    
    const leftStick = this.state.leftStick;
    const rightStick = this.state.rightStick;

    const thrust = {
      forward: Math.max(-leftStick.y, 0),
      backward: Math.max(leftStick.y, 0),
      left: Math.max(-leftStick.x, 0),
      right: Math.max(leftStick.x, 0)
    };

    const look = {
      pitch: -rightStick.y,
      yaw: rightStick.x
    };
    
    if (Math.abs(leftStick.x) > 0.1 || Math.abs(leftStick.y) > 0.1) {
      if (!this.lastThrustDebug || Date.now() - this.lastThrustDebug > 500) {
        console.log('THRUST VALUES:', {
          leftStick: { x: leftStick.x.toFixed(3), y: leftStick.y.toFixed(3) },
          thrust: {
            forward: thrust.forward.toFixed(3),
            backward: thrust.backward.toFixed(3),
            left: thrust.left.toFixed(3),
            right: thrust.right.toFixed(3)
          }
        });
        this.lastThrustDebug = Date.now();
      }
    }
    
    return {
      thrust,
      look,
      aiming: this.state.leftTrigger,
      firing: this.state.rightTrigger,
      boost: this.state.buttons?.A?.pressed || false,
      brake: this.state.buttons?.B?.pressed || false
    };
  }
  
  applyDeadZone(value) {
    if (Math.abs(value) < this.settings.deadZone) {
      return 0;
    }

    const sign = Math.sign(value);
    const magnitude = Math.abs(value);
    return sign * ((magnitude - this.settings.deadZone) / (1 - this.settings.deadZone));
  }
  
  applyCurve(value) {
    const absValue = Math.abs(value);
    const sign = Math.sign(value);
    
    switch (this.settings.stickCurve) {
      case 'exponential':
        return sign * Math.pow(absValue, 2);
      case 'smooth':
        return sign * (absValue * absValue * (3 - 2 * absValue));
      case 'linear':
      default:
        return value;
    }
  }

  vibrate(duration = 200, weakMagnitude = 0.5, strongMagnitude = 0.8) {
    if (!this.settings.vibrationEnabled || !this.state.vibrationSupported || !this.controller) {
      return;
    }
    
    try {
      if (this.controller.vibrationActuator) {
        this.controller.vibrationActuator.playEffect('dual-rumble', {
          duration,
          weakMagnitude,
          strongMagnitude
        });
      }
    } catch (error) {
      console.warn('Vibration failed:', error);
    }
  }

  vibrateHit() {
    this.vibrate(150, 0.8, 0.9);
  }
  
  vibrateShoot() {
    this.vibrate(80, 0.3, 0.4);
  }
  
  vibrateBoost() {
    this.vibrate(300, 0.2, 0.6);
  }
  
  vibrateDamage() {
    this.vibrate(250, 0.9, 1.0);
  }

  isButtonPressed(buttonName) {
    return this.state.buttons[buttonName]?.pressed || false;
  }

  isButtonJustPressed(buttonName) {
    return this.state.buttons[buttonName]?.justPressed || false;
  }

  getGameInput() {
    if (!this.connected) return null;
    
    return {

      thrust: {
        forward: Math.max(0, -this.state.leftStick.y),
        backward: Math.max(0, this.state.leftStick.y),
        left: Math.max(0, -this.state.leftStick.x),
        right: Math.max(0, this.state.leftStick.x),
      },

      look: {
        yaw: this.state.rightStick.x,
        pitch: this.state.rightStick.y
      },

      aiming: this.state.leftTrigger,
      firing: this.state.rightTrigger,

      boost: this.isButtonPressed('boost'),
      brake: this.isButtonPressed('brake'),
      target: this.isButtonJustPressed('target'),

      nextWeapon: this.isButtonJustPressed('nextWeapon'),
      prevWeapon: this.isButtonJustPressed('prevWeapon'),

      powerToEngines: this.isButtonJustPressed('dpadUp'),
      powerToShields: this.isButtonJustPressed('dpadDown'),
      powerToWeapons: this.isButtonJustPressed('dpadLeft'),
      balancePower: this.isButtonJustPressed('dpadRight'),

      menu: this.isButtonJustPressed('menu'),
      map: this.isButtonJustPressed('map'),

      raw: this.state
    };
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  increaseSensitivity(amount = 0.2) {
    this.settings.movementSensitivity += amount;
    this.settings.lookSensitivity += amount;
    console.log('Sensitivity increased:', {
      movement: this.settings.movementSensitivity.toFixed(1),
      look: this.settings.lookSensitivity.toFixed(1)
    });
    this.saveSettings();
  }
  
  decreaseSensitivity(amount = 0.2) {
    this.settings.movementSensitivity = Math.max(0.1, this.settings.movementSensitivity - amount);
    this.settings.lookSensitivity = Math.max(0.1, this.settings.lookSensitivity - amount);
    console.log('Sensitivity decreased:', {
      movement: this.settings.movementSensitivity.toFixed(1),
      look: this.settings.lookSensitivity.toFixed(1)
    });
    this.saveSettings();
  }
  
  setSensitivity(movement, look) {
    this.settings.movementSensitivity = Math.max(0.1, movement);
    this.settings.lookSensitivity = Math.max(0.1, look);
    console.log('Sensitivity set:', {
      movement: this.settings.movementSensitivity.toFixed(1),
      look: this.settings.lookSensitivity.toFixed(1)
    });
    this.saveSettings();
  }
  
  saveSettings() {
    localStorage.setItem('astra_controller_settings', JSON.stringify(this.settings));
  }
  
  loadSettings() {
    const saved = localStorage.getItem('astra_controller_settings');
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (error) {
        console.warn('Failed to load controller settings:', error);
      }
    }
  }

  resetSettings() {
    this.settings = {
      invertYaw: false,
      invertPitch: false,
      deadZone: 0.15,
      sensitivity: 1.0,
      triggerDeadZone: 0.05,
      vibrationEnabled: true,
      aimSensitivityReduction: 0.4,
      stickCurve: 'linear',
      triggerCurve: 'linear'
    };
    this.saveSettings();
  }

  dispatchEvent(eventName, data = {}) {
    const event = new CustomEvent(eventName, { detail: data });
    window.dispatchEvent(event);
  }

  getStatus() {
    return {
      connected: this.connected,
      controllerId: this.controller?.id || null,
      vibrationSupported: this.state.vibrationSupported,
      settings: { ...this.settings },
      state: { ...this.state }
    };
  }
}

const controllerManager = new ControllerManager();

if (typeof window !== 'undefined') {
  window.controllerManager = controllerManager;
  window.increaseSensitivity = (amount) => controllerManager.increaseSensitivity(amount);
  window.decreaseSensitivity = (amount) => controllerManager.decreaseSensitivity(amount);
  window.setSensitivity = (movement, look) => controllerManager.setSensitivity(movement, look);
}

export default controllerManager;