import { SimpleEventEmitter } from './SimpleEventEmitter.js';

export class NetworkConnection extends SimpleEventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.manualDisconnect = false;
  }

  connect(url) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve(this.ws);
    }

    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            resolve(this.ws);
          } else if (!this.isConnecting) {
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    this.isConnecting = true;
    this.manualDisconnect = false;

    return new Promise((resolve, reject) => {
      console.log('Connecting to WebSocket:', url);
      
      try {
        this.ws = new WebSocket(url);
      } catch (error) {
        this.isConnecting = false;
        console.error('WebSocket creation failed:', error);
        reject(error);
        return;
      }
      
      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log('WebSocket connected successfully');
        this.emit('connected');
        resolve(this.ws);
      };
      
      this.ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);

          if (window.wsMonitor) {
            window.wsMonitor.measureRawServerMessage(type);
          }

          this.emit('message', { type, payload });
          
        } catch (error) {
          console.error('Message parse error:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        this.isConnecting = false;
        reject(error);
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.isConnecting = false;
        this.emit('disconnected');

        const shouldReconnect = this.reconnectAttempts < this.maxReconnectAttempts && 
                               !this.manualDisconnect && 
                               !window.gameInProgress;
        
        if (shouldReconnect) {
          this.reconnectAttempts++;
          console.log(`Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(url), 1000);
        } else {
          console.log('Auto-reconnection disabled to prevent duplicate connections');
        }
      };
      
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.isConnecting = false;
          this.ws.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, payload });
      this.ws.send(message);
      return true;
    }
    return false;
  }

  disconnect() {
    if (this.ws) {
      this.manualDisconnect = true;
      this.ws.onclose = null;
      this.ws.close(1000);
      this.ws = null;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
} 
