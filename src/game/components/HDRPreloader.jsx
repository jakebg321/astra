import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

class HDRPreloader {
  constructor() {
    this.loader = new RGBELoader();
    this.preloadedTextures = new Map();
    this.isPreloading = false;
  }

  async preloadHDR(hdrPath) {
    if (this.preloadedTextures.has(hdrPath)) {
      console.log(`HDR already preloaded: ${hdrPath}`);
      return this.preloadedTextures.get(hdrPath);
    }

    console.log(`Starting HDR preload: ${hdrPath}`);
    
    return new Promise((resolve, reject) => {
      this.loader.load(
        hdrPath,
        (texture) => {
          this.preloadedTextures.set(hdrPath, texture);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.warn(`Failed to preload HDR: ${hdrPath}`, error);
          reject(error);
        }
      );
    });
  }

  getPreloadedTexture(hdrPath) {
    return this.preloadedTextures.get(hdrPath);
  }

  dispose() {
    this.preloadedTextures.forEach((texture) => {
      texture.dispose();
    });
    this.preloadedTextures.clear();
  }
}

export const hdrPreloader = new HDRPreloader();
