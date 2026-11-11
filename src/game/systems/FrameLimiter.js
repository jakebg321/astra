
class FrameLimiter {
  constructor() {
    this.targetFPS = 60;
    this.targetFrameTime = 1000 / this.targetFPS;
    this.lastFrameTime = 0;
    this.isActive = true;
    this.frameSkipCounter = 0;
    this.frameBudgetMs = 0;
    this.pendingDeltaSeconds = 0;
    this.frameTimingToleranceMs = 1.5;

    this.frameTimes = [];
    this.maxFrameTimeHistory = 60;

    this.lastWarningTime = 0;
    this.lastCriticalTime = 0;
    this.warningInterval = 2000;
    this.criticalInterval = 5000;

    const savedFPS = localStorage.getItem('targetFPS');
    if (savedFPS && savedFPS !== 'unlimited') {
      this.targetFPS = parseInt(savedFPS);
      this.targetFrameTime = 1000 / this.targetFPS;
      this.isActive = true;
      console.log(`Frame limiter initialized to ${this.targetFPS} FPS from settings`);
    } else {
      this.isActive = false;
      console.log('Frame limiter disabled (unlimited FPS mode)');
    }
  }
  
  shouldSkipFrame() {
    if (!this.isActive) {
      this.lastFrameTime = performance.now();
      this.frameBudgetMs = 0;
      return false;
    }

    const now = performance.now();

    if (this.lastFrameTime === 0) {
      this.lastFrameTime = now;
      return false;
    }

    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frameBudgetMs += deltaTime;

    if (this.frameBudgetMs + this.frameTimingToleranceMs < this.targetFrameTime) {
      return true;
    }

    this.frameBudgetMs = Math.max(0, this.frameBudgetMs - this.targetFrameTime);

    if (this.frameTimes.length >= this.maxFrameTimeHistory) {
      this.frameTimes.shift();
    }
    this.frameTimes.push(deltaTime);

    if (deltaTime > 100) {
      const now = performance.now();

      if (now - this.lastWarningTime > this.warningInterval) {
        this.lastWarningTime = now;
        
        console.warn(`Long frame detected: ${deltaTime.toFixed(1)}ms`);

        const stack = new Error().stack;
        const stackLines = stack.split('\n').slice(2, 7);

        const culprit = stackLines.find(line => 
          line.includes('useFrame') || 
          line.includes('Renderer') || 
          line.includes('Controller') ||
          line.includes('System')
        );
        
        if (culprit) {
          console.warn(`Likely culprit: ${culprit.trim()}`);
        }
      }

      if (deltaTime > 1000 && now - this.lastCriticalTime > this.criticalInterval) {
        this.lastCriticalTime = now;
        
        console.error(`EXTREME FRAME HANG: ${deltaTime.toFixed(0)}ms - Possible causes:`);
        console.error(`   1. Material recreation (check ShipRenderer, OtherPlayersRenderer)`);
        console.error(`   2. React re-render storm (check setState calls in useFrame)`);
        console.error(`   3. Synchronous WebGL operations (texture uploads, shader compilation)`);
        console.error(`   4. Garbage collection from object allocation in render loop`);
      }
    }
    
    return false;
  }

  wrapUseFrame(callback) {
    return (state, delta) => {
      this.pendingDeltaSeconds += delta;

      if (this.shouldSkipFrame()) return;

      const effectiveDelta = this.pendingDeltaSeconds > 0 ? this.pendingDeltaSeconds : delta;
      this.pendingDeltaSeconds = 0;

      const clampedDelta = Math.min(effectiveDelta, 0.1);

      const startTime = performance.now();
      
      try {
        callback(state, clampedDelta);
      } catch (error) {
        console.error('Error in useFrame callback:', error);
        throw error;
      }
      
      const callbackTime = performance.now() - startTime;

      if (callbackTime > 16) {
        const now = performance.now();

        if (now - this.lastWarningTime > this.warningInterval) {
          this.lastWarningTime = now;
          
          console.warn(`Slow useFrame callback: ${callbackTime.toFixed(1)}ms`);

          const stack = new Error().stack;
          const componentLine = stack.split('\n').find(line => 
            line.includes('.jsx') || line.includes('Component') || line.includes('Hook')
          );
          
          if (componentLine) {
            console.warn(`Component: ${componentLine.trim()}`);
          }
        }

        if (callbackTime > 100 && now - this.lastCriticalTime > this.criticalInterval) {
          this.lastCriticalTime = now;
          console.error(`CRITICAL: useFrame callback took ${callbackTime.toFixed(0)}ms!`);
        }
      }
    };
  }

  getAverageFrameTime() {
    if (this.frameTimes.length === 0) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return sum / this.frameTimes.length;
  }

  getCurrentFPS() {
    const avgFrameTime = this.getAverageFrameTime();
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  }
}

window.frameLimiter = new FrameLimiter();

export const useFrameLimiter = () => {
  return window.frameLimiter;
};

export const useLimitedFrame = (callback) => {
  const limiter = useFrameLimiter();
  return limiter.wrapUseFrame(callback);
};

console.log('Frame limiter initialized');
