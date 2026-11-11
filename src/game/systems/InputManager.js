import controllerManager from './ControllerManager.js';

class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = { x: 0, y: 0, deltaX: 0, deltaY: 0 };
    this.mouseButtons = { left: false, right: false, middle: false };
    this.previousMouseButtons = { left: false, right: false, middle: false };
    this.mouseWheel = { delta: 0 };

    this.mouseActiveThisFrame = false;
    this.mouseHasAuthority = false;

    this.forceResetControllerState();
    
    this.inputState = {

      movement: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },

      isAiming: false,
      aimStrength: 0,
      isFiring: false,
      fireStrength: 0,
      justStartedAiming: false,
      justStoppedAiming: false,
      justStartedFiring: false,
      justStoppedFiring: false,

      boost: false,
      brake: false,
      portal: false,
      portalCancel: false,
      crystalWall: false,
      crystalWallBehind: false,

      usingController: false,
      lastInputMethod: 'keyboard',

      analogMovement: { x: 0, y: 0, z: 0 },
      analogLook: { x: 0, y: 0 }
    };
    
    this.previousInputState = { ...this.inputState };
    this.callbacks = [];
    
    this.init();
  }
  
  init() {

    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('wheel', this.handleMouseWheel.bind(this));

    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    window.addEventListener('blur', this.handleWindowBlur.bind(this));

    window.addEventListener('controllerConnected', () => {
      console.log('Controller connected to InputManager');
    });
    
    window.addEventListener('controllerDisconnected', () => {
      console.log('Controller disconnected from InputManager');
      this.inputState.usingController = false;
    });

    document.addEventListener('contextmenu', (e) => {
      if (e.target.tagName === 'CANVAS' || e.target.closest('.game-container')) {
        e.preventDefault();
      }
    });
  }

  update() {

    this.inputState.usingController = false;
    this.mouseHasAuthority = true;

    this.previousInputState = { 
      ...this.inputState,
      movement: { ...this.inputState.movement },
      rotation: { ...this.inputState.rotation },
      analogMovement: { ...this.inputState.analogMovement },
      analogLook: { ...this.inputState.analogLook }
    };
    
    this.previousMouseButtons = { ...this.mouseButtons };

    const controllerInput = controllerManager.update();

    this.processInputMethod(controllerInput);

    if (this.inputState.usingController && controllerInput && controllerManager.connected) {

      this.processController(controllerInput);
    } else {

      this.processKeyboardMouse();
    }

    this.detectAimFireChanges();

    this.notifyCallbacks();

    this.mouseActiveThisFrame = false;
    
    return this.inputState;
  }
  
  processInputMethod(controllerInput) {

    this.inputState.usingController = false;
    this.inputState.lastInputMethod = 'keyboard';

    this.inputState.analogMovement = { x: 0, y: 0, z: 0 };
    this.inputState.analogLook = { x: 0, y: 0 };
  }
  
  processKeyboardMouse() {

    let moveX = 0, moveY = 0, moveZ = 0;
    
    if (this.keys['w'] || this.keys['W']) moveZ -= 1;
    if (this.keys['s'] || this.keys['S']) moveZ += 1;
    if (this.keys['a'] || this.keys['A']) moveX -= 1;
    if (this.keys['d'] || this.keys['D']) moveX += 1;
    if (this.keys['q'] || this.keys['Q']) moveY -= 1;
    if (this.keys['e'] || this.keys['E']) moveY += 1;

    const length = Math.sqrt(moveX * moveX + moveY * moveY + moveZ * moveZ);
    if (length > 0) {
      moveX /= length;
      moveY /= length;
      moveZ /= length;
    }
    
    this.inputState.movement = { x: moveX, y: moveY, z: moveZ };

    const hasMouseInput = Math.abs(this.mouse.deltaX) > 0.001 || Math.abs(this.mouse.deltaY) > 0.001;
    
    if (hasMouseInput) {

      this.inputState.rotation.x = this.mouse.deltaY;
      this.inputState.rotation.y = this.mouse.deltaX;
      this.inputState.rotation.z = 0;

      this.mouseHasAuthority = true;
      if (this.inputState.usingController) {
        console.log('MOUSE AUTHORITY: Overriding controller state with mouse input');
        this.inputState.usingController = false;
      }
    } else if (!this.inputState.usingController) {

      this.inputState.rotation.x = this.mouse.deltaY;
      this.inputState.rotation.y = this.mouse.deltaX;
      this.inputState.rotation.z = 0;
    }

    this.inputState.isAiming = this.mouseButtons.right;
    this.inputState.isFiring = this.mouseButtons.left;
    this.inputState.aimStrength = this.mouseButtons.right ? 1.0 : 0.0;
    this.inputState.fireStrength = this.mouseButtons.left ? 1.0 : 0.0;

    this.inputState.boost = this.keys['Shift'] || false;
    this.inputState.brake = this.keys['Control'];
    this.inputState.portal = this.keys['1'] || this.mouseButtons.middle;

    const twoPressed = !!(this.keys['2'] || this.keys['Digit2'] || this.keys['Numpad2']);
    const shiftHeld = !!(this.keys['Shift'] || this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    this.inputState.crystalWall = twoPressed && !shiftHeld;
    this.inputState.crystalWallBehind = twoPressed && shiftHeld;

    this.inputState.portalToggleMode = this.keys['v'] || this.keys['V'] || false;
    this.inputState.portalActivate = this.keys['3'] || false;
    this.inputState.portalRecall = this.keys['f'] || this.keys['F'] || false;

    if (this.keys['1']) {
      console.log('Portal key active in input state:', this.inputState.portal);
    }

    this.mouse.deltaX = 0;
    this.mouse.deltaY = 0;

  }
  
  processController(controllerInput) {
    if (!controllerInput) return;

    const hasMouseInput = Math.abs(this.mouse.deltaX) > 0.001 || Math.abs(this.mouse.deltaY) > 0.001;
    
    if (controllerInput.thrust) {
      this.inputState.analogMovement = {
        x: (controllerInput.thrust.right || 0) - (controllerInput.thrust.left || 0),
        y: 0,
        z: (controllerInput.thrust.backward || 0) - (controllerInput.thrust.forward || 0)
      };
    }
    
    if (controllerInput.look) {
      this.inputState.analogLook = {
        x: controllerInput.look.pitch || 0,
        y: controllerInput.look.yaw || 0
      };
    }

    if (this.inputState.usingController && !hasMouseInput) {
      this.inputState.movement = { ...this.inputState.analogMovement };
      this.inputState.rotation = {
        x: this.inputState.analogLook?.x || 0,
        y: this.inputState.analogLook?.y || 0,
        z: 0
      };
    } else if (this.inputState.usingController) {

      this.inputState.movement = { ...this.inputState.analogMovement };
    }

    this.inputState.isAiming = (controllerInput.aiming || 0) > 0.1;
    this.inputState.isFiring = (controllerInput.firing || 0) > 0.1;
    this.inputState.aimStrength = controllerInput.aiming || 0;
    this.inputState.fireStrength = controllerInput.firing || 0;
    
    this.inputState.boost = controllerInput.boost || false;
    this.inputState.brake = controllerInput.brake || false;
    this.inputState.portal = controllerInput.portal || false;
  }
  
  detectAimFireChanges() {

    this.inputState.justStartedAiming = 
      this.inputState.isAiming && !this.previousInputState.isAiming;
    this.inputState.justStoppedAiming = 
      !this.inputState.isAiming && this.previousInputState.isAiming;

    this.inputState.justStartedFiring = 
      this.inputState.isFiring && !this.previousInputState.isFiring;
    this.inputState.justStoppedFiring = 
      !this.inputState.isFiring && this.previousInputState.isFiring;

    if (this.inputState.usingController) {
      if (this.inputState.justStartedAiming) {
        controllerManager.vibrate(100, 0.2, 0.3);
      }
      if (this.inputState.justStartedFiring) {
        controllerManager.vibrateShoot();
      }
    }
  }

  handleMouseMove(event) {
    this.mouse.deltaX += event.movementX || 0;
    this.mouse.deltaY += event.movementY || 0;
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;

    if (Math.abs(event.movementX || 0) > 0.1 || Math.abs(event.movementY || 0) > 0.1) {
      this.mouseActiveThisFrame = true;
    }
  }
  
  handleMouseDown(event) {
    switch (event.button) {
      case 0:
        this.mouseButtons.left = true;
        break;
      case 1:
        this.mouseButtons.middle = true;
        break;
      case 2:
        this.mouseButtons.right = true;
        event.preventDefault();
        break;
    }
  }
  
  handleMouseUp(event) {
    switch (event.button) {
      case 0:
        this.mouseButtons.left = false;
        break;
      case 1:
        this.mouseButtons.middle = false;
        break;
      case 2:
        this.mouseButtons.right = false;
        break;
    }
  }
  
  handleMouseWheel(event) {

    const delta = event.deltaY > 0 ? -1 : 1;
    this.mouseWheel.delta += delta;
    
    if (window.isInPortalMode || window.isInWallMode) {
      console.log('Mouse wheel in deploy mode:', {
        delta: delta,
        total: this.mouseWheel.delta,
        instance: this.constructor.name,
        timestamp: Date.now()
      });
    }

    if (document.pointerLockElement || window.isInPortalMode || window.isInWallMode) {
      event.preventDefault();
    }
  }

  handleKeyDown(event) {
    this.keys[event.key] = true;
    this.keys[event.code] = true;
    
    if (event.key === '1') {
      console.log('Key 1 pressed, portal state:', this.inputState.portal);
    }
  }
  
  handleKeyUp(event) {
    this.keys[event.key] = false;
    this.keys[event.code] = false;
  }

  handleWindowBlur() {

    this.keys = {};
    this.mouseButtons = { left: false, right: false, middle: false };
  }

  getInputState() {
    return this.inputState;
  }

  getKeys() {

    return { ...this.keys };
  }
  
  getMouse() {
    return this.mouse;
  }
  
  getMouseButtons() {
    return this.mouseButtons;
  }
  
  getMouseWheel() {
    return this.mouseWheel;
  }

  onInputChange(callback) {
    this.callbacks.push(callback);
  }

  removeInputChangeCallback(callback) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }
  
  notifyCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.inputState);
      } catch (error) {
        console.error('Input callback error:', error);
      }
    });
  }

  getAccuracyModifier() {
    if (this.inputState.isAiming) {

      return 0.4;
    }
    return 1.0;
  }

  getStickyAimBoost() {
    if (this.inputState.isAiming) {

      return 1.5;
    }
    return 1.0;
  }

  hasActiveInput() {
    const state = this.inputState;
    return state.isAiming || state.isFiring || state.boost || 
           Math.abs(state.movement.x) > 0.1 || 
           Math.abs(state.movement.y) > 0.1 || 
           Math.abs(state.movement.z) > 0.1 ||
           Math.abs(state.rotation.x) > 0.1 ||
           Math.abs(state.rotation.y) > 0.1;
  }

  getDebugInfo() {
    return {
      inputMethod: this.inputState.lastInputMethod,
      usingController: this.inputState.usingController,
      controllerConnected: controllerManager.connected,
      isAiming: this.inputState.isAiming,
      isFiring: this.inputState.isFiring,
      aimStrength: this.inputState.aimStrength.toFixed(2),
      fireStrength: this.inputState.fireStrength.toFixed(2),
      hasActiveInput: this.hasActiveInput(),
      movement: {
        x: this.inputState.movement.x.toFixed(2),
        y: this.inputState.movement.y.toFixed(2),
        z: this.inputState.movement.z.toFixed(2)
      }
    };
  }

  forceResetControllerState() {
    console.log('STARTUP: Force clearing browser gamepad state corruption');

    if (typeof window !== 'undefined') {

      if (window.controllerManager) {
        window.controllerManager.connected = false;
        window.controllerManager.controller = null;
      }

      try {
        const pads = navigator.getGamepads();
        const staleControllers = pads ? Array.from(pads).filter(p => p && p.connected).length : 0;
        if (staleControllers > 0) {
          console.log(`DETECTED ${staleControllers} stale browser controllers - forcing clean state`);
        }
      } catch (error) {
        console.warn('Could not check gamepad state:', error);
      }
    }
  }

  clearControllerState() {

    this.inputState.usingController = false;
    this.inputState.lastInputMethod = 'keyboard';

    this.inputState.analogMovement = { x: 0, y: 0, z: 0 };
    this.inputState.analogLook = { x: 0, y: 0 };

    this.inputState.rotation = { x: 0, y: 0, z: 0 };

    this.inputState.isAiming = false;
    this.inputState.aimStrength = 0;
    this.inputState.isFiring = false;
    this.inputState.fireStrength = 0;
    this.inputState.justStartedAiming = false;
    this.inputState.justStoppedAiming = false;
    this.inputState.justStartedFiring = false;
    this.inputState.justStoppedFiring = false;
    this.inputState.boost = false;
    this.inputState.brake = false;

    this.inputState.movement = { x: 0, y: 0, z: 0 };

    if (!this.mouseActiveThisFrame) {
      this.inputState.rotation = { x: 0, y: 0, z: 0 };
    }

    const keysToCheck = ['w', 'W', 'a', 'A', 's', 'S', 'd', 'D', 'q', 'Q', 'e', 'E', 'Space', 'Control'];
    keysToCheck.forEach(key => {
      if (this.keys[key]) {
        delete this.keys[key];
      }
    });

    try {
      if (controllerManager && controllerManager.clearState) {
        controllerManager.clearState();
      }
    } catch (error) {

    }
  }
}

const inputManager = new InputManager();

if (typeof window !== 'undefined') {
  window.inputManager = inputManager;
}

export default inputManager;
