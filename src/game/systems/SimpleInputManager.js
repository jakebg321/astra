
import { GAME_CONFIG } from '../config/GameConfig.js';
import inputManager from './InputManager.js';

class SimpleInputManager {
  constructor() {
    this.keys = {};
    this.mouse = { x: 0, y: 0 };
    this.mouseButtons = { left: false, right: false };
    this.callbacks = new Set();
    this.isMouseLocked = false;
    this.lastInputSent = 0;
    this.INPUT_THROTTLE = GAME_CONFIG.network.inputThrottle;
    this.isInitialized = false;
    this.previousControllerFiring = false;

    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandlePointerLockChange = this.handlePointerLockChange.bind(this);
    this.boundHandlePointerLockError = this.handlePointerLockError.bind(this);
    this.boundHandleContextRestored = this.handleContextRestored.bind(this);
    
  }
  
  init() {
    if (this.isInitialized) return;

    this.canvas = document.querySelector('canvas');
    if (!this.canvas) {
      console.warn('No canvas found, will use document events');
    }

    document.addEventListener('keydown', this.boundHandleKeyDown);
    document.addEventListener('keyup', this.boundHandleKeyUp);

    const target = this.canvas || document;
    target.addEventListener('mousedown', this.boundHandleMouseDown);
    target.addEventListener('mouseup', this.boundHandleMouseUp);
    target.addEventListener('mousemove', this.boundHandleMouseMove);

    document.addEventListener('pointerlockchange', this.boundHandlePointerLockChange);
    document.addEventListener('pointerlockerror', this.boundHandlePointerLockError);

    document.addEventListener('webgl-context-restored', this.boundHandleContextRestored);
    document.addEventListener('webgl-context-lost-force-refresh', this.boundHandleContextRestored);
    document.addEventListener('new-canvas-ready', this.boundHandleContextRestored);
    
    this.isInitialized = true;
  }
  
  handleKeyDown(e) {
    this.keys[e.code] = true;

  }
  
  handleKeyUp(e) {
    this.keys[e.code] = false;

  }
  
  handleMouseDown(e) {
    if (e.button === 0) {
      this.mouseButtons.left = true;
      
      this.fire();
    }
    if (e.button === 2) this.mouseButtons.right = true;

    if (!this.isMouseLocked && this.canvas) {
      try {
        this.requestPointerLock();
      } catch (error) {
        console.warn('Pointer lock request failed:', error);
      }
    }
  }
  
  fire() {

    const isInPortalMode = window.isInPortalMode || window.gameMovementState?.portalAbility?.isDeploying;

    if (!isInPortalMode) {

      this.callbacks.forEach(callback => {
        try {
          if (typeof callback === 'function') {
            callback();
          }
        } catch (error) {
          console.error('Fire callback error:', error);
        }
      });
    } else {
      console.log('Fire in portal mode - skipping weapon callbacks');
    }
  }

  handleMouseUp(e) {
    if (e.button === 0) this.mouseButtons.left = false;
    if (e.button === 2) this.mouseButtons.right = false;
  }
  
  handleMouseMove(e) {
    if (this.isMouseLocked) {
      const deltaX = e.movementX || 0;
      const deltaY = e.movementY || 0;

      const smoothingFactor = 0.7;
      this.mouse.x += deltaX * smoothingFactor;
      this.mouse.y += deltaY * smoothingFactor;

    }
  }

  requestPointerLock() {
    console.log('POINTER LOCK DEBUG:', {
      hasCanvas: !!this.canvas,
      isConnected: this.canvas?.isConnected,
      canvasInDOM: !!document.querySelector('canvas'),
      sameCanvas: this.canvas === document.querySelector('canvas')
    });
    
    if (this.canvas && this.canvas.isConnected) {
      this.canvas.requestPointerLock().catch(err => {
        console.warn('Pointer lock request failed:', err.message);
      });
    } else {
      console.warn('Canvas not available for pointer lock');
    }
  }
  
  exitPointerLock() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }
  
  handlePointerLockChange() {
    this.isMouseLocked = document.pointerLockElement === this.canvas;
    console.log('Pointer lock:', this.isMouseLocked ? 'LOCKED' : 'UNLOCKED');

    if (this.isMouseLocked) {
      this.mouse.x = 0;
      this.mouse.y = 0;
    }
  }
  
  handlePointerLockError() {
    console.error('Pointer lock failed');
    this.isMouseLocked = false;
  }
  
  handleContextRestored() {
    console.log('WebGL context restored - refreshing input manager canvas reference');

    const newCanvas = document.querySelector('canvas');
    if (newCanvas && newCanvas !== this.canvas) {
      console.log('Updating canvas reference for pointer lock');

      if (this.canvas) {
        this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
        this.canvas.removeEventListener('mouseup', this.boundHandleMouseUp);
        this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
      }

      this.canvas = newCanvas;

      this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
      this.canvas.addEventListener('mouseup', this.boundHandleMouseUp);
      this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);

      this.isMouseLocked = false;
      
      console.log('Input manager canvas reference updated for second game');
    } else {
      console.warn('Could not find new canvas after context restoration');
    }
  }

  isKeyPressed(keyCode) {
    return !!this.keys[keyCode];
  }
  
  isMouseButtonPressed(button) {
    return button === 'left' ? this.mouseButtons.left : this.mouseButtons.right;
  }
  
  getMouseDelta() {

    const delta = { x: this.mouse.x, y: this.mouse.y };

    this.mouse.x = 0;
    this.mouse.y = 0;
    
    return delta;
  }

  getInputState() {
    const mouseDelta = this.getMouseDelta();

    this.checkControllerFiring();
    
    return this.buildInputState(mouseDelta);
  }

  checkControllerFiring() {
    try {

      const gamepads = navigator.getGamepads();
      const hasConnectedController = Array.from(gamepads).some(pad => pad && pad.connected);
      
      if (!hasConnectedController) {

        this.clearControllerState();
        return;
      }
      
      const controllerInput = inputManager.getInputState();
      
      if (controllerInput && controllerInput.justStartedFiring) {

        console.log('Controller firing detected - triggering callbacks IMMEDIATELY (same as mouse)', {
          callbackCount: this.callbacks.length,
          fireStrength: controllerInput.fireStrength
        });

        this.callbacks.forEach(callback => {
          try {
            if (typeof callback === 'function') {
              callback();
            }
          } catch (error) {
            console.error('Controller fire callback error:', error);
          }
        });
      }
    } catch (error) {

      console.warn('Controller integration error:', error);
    }
  }

  updateControllerBridge() {
    this.checkControllerFiring();
  }

  clearControllerState() {

    try {
      if (inputManager && inputManager.clearControllerState) {
        inputManager.clearControllerState();
      }
    } catch (error) {

    }
  }

  buildInputState(mouseDelta) {

    const simpleKeys = {};
    for (const [code, pressed] of Object.entries(this.keys)) {
      if (pressed) {

        if (code.startsWith('Key')) {
          const letter = code.substring(3).toLowerCase();
          simpleKeys[letter] = true;
          simpleKeys[letter.toUpperCase()] = true;
        }

        else if (code === 'Space') {
          simpleKeys.Space = true;
        }
        else if (code === 'ShiftLeft' || code === 'ShiftRight') {
          simpleKeys.Shift = true;
        }

        else if (code.startsWith('Arrow')) {
          simpleKeys[code] = true;
        }
      }
    }
    
    return {
      keys: simpleKeys,
      mouse: mouseDelta,
      mouseButtons: { ...this.mouseButtons },
      mouseDelta: mouseDelta
    };
  }

  addCallback(callback) {
    this.callbacks.add(callback);
  }
  
  removeCallback(callback) {
    this.callbacks.delete(callback);
  }
  
  notifyCallbacks() {

    const now = Date.now();
    if (now - this.lastInputSent < this.INPUT_THROTTLE) return;
    
    this.lastInputSent = now;
    this.callbacks.forEach(callback => {
      try {
        if (typeof callback === 'function') {
          callback();
        } else {
          console.warn('Invalid callback found, removing:', callback);
          this.callbacks.delete(callback);
        }
      } catch (error) {
        console.error('Input callback error:', error);
      }
    });
  }
  
  destroy() {
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    document.removeEventListener('keyup', this.boundHandleKeyUp);
    document.removeEventListener('pointerlockchange', this.boundHandlePointerLockChange);
    document.removeEventListener('pointerlockerror', this.boundHandlePointerLockError);
    document.removeEventListener('webgl-context-restored', this.boundHandleContextRestored);
    document.removeEventListener('webgl-context-lost-force-refresh', this.boundHandleContextRestored);
    document.removeEventListener('new-canvas-ready', this.boundHandleContextRestored);
    
    const target = this.canvas || document;
    target.removeEventListener('mousedown', this.boundHandleMouseDown);
    target.removeEventListener('mouseup', this.boundHandleMouseUp);
    target.removeEventListener('mousemove', this.boundHandleMouseMove);
    
    this.callbacks.clear();
    this.isInitialized = false;
  }
}

let instance = null;
export default {
  getInstance() {
    if (!instance) {
      instance = new SimpleInputManager();
    }
    return instance;
  }
};
