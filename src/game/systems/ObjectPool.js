

import * as THREE from 'three';

class ObjectPool {
  constructor() {

    this.vector3Pool = [];
    this.vector3PoolSize = 1000;
    this.vector3PoolIndex = 0;

    this.eulerPool = [];
    this.eulerPoolSize = 200;
    this.eulerPoolIndex = 0;

    this.quaternionPool = [];
    this.quaternionPoolSize = 100;
    this.quaternionPoolIndex = 0;

    this.matrix4Pool = [];
    this.matrix4PoolSize = 50;
    this.matrix4PoolIndex = 0;

    this.colorPool = [];
    this.colorPoolSize = 100;
    this.colorPoolIndex = 0;

    this.initializePools();
    
    console.log('ObjectPool initialized:', {
      vector3: this.vector3PoolSize,
      euler: this.eulerPoolSize,
      quaternion: this.quaternionPoolSize,
      matrix4: this.matrix4PoolSize,
      color: this.colorPoolSize
    });
  }
  
  initializePools() {

    for (let i = 0; i < this.vector3PoolSize; i++) {
      this.vector3Pool.push(new THREE.Vector3());
    }

    for (let i = 0; i < this.eulerPoolSize; i++) {
      this.eulerPool.push(new THREE.Euler());
    }

    for (let i = 0; i < this.quaternionPoolSize; i++) {
      this.quaternionPool.push(new THREE.Quaternion());
    }

    for (let i = 0; i < this.matrix4PoolSize; i++) {
      this.matrix4Pool.push(new THREE.Matrix4());
    }

    for (let i = 0; i < this.colorPoolSize; i++) {
      this.colorPool.push(new THREE.Color());
    }
  }

  getVector3(x = 0, y = 0, z = 0) {
    const vector = this.vector3Pool[this.vector3PoolIndex];
    vector.set(x, y, z);
    
    this.vector3PoolIndex = (this.vector3PoolIndex + 1) % this.vector3PoolSize;
    return vector;
  }

  getEuler(x = 0, y = 0, z = 0, order = 'XYZ') {
    const euler = this.eulerPool[this.eulerPoolIndex];
    euler.set(x, y, z, order);
    
    this.eulerPoolIndex = (this.eulerPoolIndex + 1) % this.eulerPoolSize;
    return euler;
  }

  getQuaternion(x = 0, y = 0, z = 0, w = 1) {
    const quaternion = this.quaternionPool[this.quaternionPoolIndex];
    quaternion.set(x, y, z, w);
    
    this.quaternionPoolIndex = (this.quaternionPoolIndex + 1) % this.quaternionPoolSize;
    return quaternion;
  }

  getMatrix4() {
    const matrix = this.matrix4Pool[this.matrix4PoolIndex];
    matrix.identity();
    
    this.matrix4PoolIndex = (this.matrix4PoolIndex + 1) % this.matrix4PoolSize;
    return matrix;
  }

  getColor(r = 1, g = 1, b = 1) {
    const color = this.colorPool[this.colorPoolIndex];
    color.setRGB(r, g, b);
    
    this.colorPoolIndex = (this.colorPoolIndex + 1) % this.colorPoolSize;
    return color;
  }

  getPoolStats() {
    return {
      vector3: {
        size: this.vector3PoolSize,
        index: this.vector3PoolIndex,
        usage: `${this.vector3PoolIndex}/${this.vector3PoolSize}`
      },
      euler: {
        size: this.eulerPoolSize,
        index: this.eulerPoolIndex,
        usage: `${this.eulerPoolIndex}/${this.eulerPoolSize}`
      },
      quaternion: {
        size: this.quaternionPoolSize,
        index: this.quaternionPoolIndex,
        usage: `${this.quaternionPoolIndex}/${this.quaternionPoolSize}`
      },
      matrix4: {
        size: this.matrix4PoolSize,
        index: this.matrix4PoolIndex,
        usage: `${this.matrix4PoolIndex}/${this.matrix4PoolSize}`
      },
      color: {
        size: this.colorPoolSize,
        index: this.colorPoolIndex,
        usage: `${this.colorPoolIndex}/${this.colorPoolSize}`
      }
    };
  }

  reset() {
    this.vector3PoolIndex = 0;
    this.eulerPoolIndex = 0;
    this.quaternionPoolIndex = 0;
    this.matrix4PoolIndex = 0;
    this.colorPoolIndex = 0;
  }
}

let objectPool = null;

export const getObjectPool = () => {
  if (!objectPool) {
    objectPool = new ObjectPool();
  }
  return objectPool;
};

export const poolVector3 = (x, y, z) => getObjectPool().getVector3(x, y, z);
export const poolEuler = (x, y, z, order) => getObjectPool().getEuler(x, y, z, order);
export const poolQuaternion = (x, y, z, w) => getObjectPool().getQuaternion(x, y, z, w);
export const poolMatrix4 = () => getObjectPool().getMatrix4();
export const poolColor = (r, g, b) => getObjectPool().getColor(r, g, b);

export const logPoolStats = () => {
  console.log('ObjectPool Stats:', getObjectPool().getPoolStats());
};

export default ObjectPool;