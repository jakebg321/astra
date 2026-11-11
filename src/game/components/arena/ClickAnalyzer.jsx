import React, { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { checkLOS, distanceToWall } from './arenaUtils';

export default function ClickAnalyzer({ data, onCellClick, playerPos, setPlayerPos }) {
  const transientObjects = useRef([]);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const sceneRef = useRef(null);

  const { arena, planets, spawns, combat, heatmap } = data;
  const { dodgeReach, bulletRange } = combat;
  const normalSpeed = combat.speedNormal || 150;
  const boostSpeed = combat.speedBoost || normalSpeed * 1.5;

  function clampToArena(point) {
    return {
      x: Math.max(-arena.x / 2, Math.min(arena.x / 2, point.x)),
      y: Math.max(-arena.y / 2, Math.min(arena.y / 2, point.y)),
      z: Math.max(-arena.z / 2, Math.min(arena.z / 2, point.z))
    };
  }

  const clearTransient = useCallback(() => {
    transientObjects.current.forEach(obj => {
      if (obj.parent) obj.removeFromParent();
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    });
    transientObjects.current = [];
  }, []);

  const addTransient = useCallback((obj) => {
    if (sceneRef.current) {

      let root = sceneRef.current;
      while (root.parent && root.parent.type !== 'Scene') root = root.parent;
      if (root.parent) root = root.parent;
      root.add(obj);
      transientObjects.current.push(obj);
    }
  }, []);

  const createTextSprite = useCallback((text, color = '#ffffff') => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(200, 50, 1);
    return sprite;
  }, []);

  const handleHover = useCallback((event) => {
    if (!event.point) return;
    const pos = clampToArena(event.point);
    setPlayerPos(pos);
  }, [arena, setPlayerPos]);

  const handleClick = useCallback((event) => {
    if (!event.point) return;
    const newPos = clampToArena(event.point);
    setPlayerPos(newPos);
    clearTransient();

    const losToEnemy = checkLOS(newPos, spawns.p2, planets);

    const distToEnemy = Math.hypot(
      newPos.x - spawns.p2.x,
      newPos.y - spawns.p2.y,
      newPos.z - spawns.p2.z
    );
    const timeToEnemyNormal = (distToEnemy / normalSpeed).toFixed(1);
    const timeToEnemyBoost = (distToEnemy / boostSpeed).toFixed(1);

    const losPoints = [
      new THREE.Vector3(newPos.x, newPos.y, newPos.z),
      new THREE.Vector3(spawns.p2.x, spawns.p2.y, spawns.p2.z)
    ];
    const losGeo = new THREE.BufferGeometry().setFromPoints(losPoints);
    const losMat = new THREE.LineBasicMaterial({
      color: losToEnemy ? 0x00ff88 : 0xff4400,
      transparent: true,
      opacity: 0.7
    });
    addTransient(new THREE.Line(losGeo, losMat));

    const midPoint = new THREE.Vector3(
      (newPos.x + spawns.p2.x) / 2,
      (newPos.y + spawns.p2.y) / 2 + 50,
      (newPos.z + spawns.p2.z) / 2
    );
    const distLabel = createTextSprite(
      `${Math.round(distToEnemy)} units · ${timeToEnemyNormal}s/${timeToEnemyBoost}s`,
      losToEnemy ? '#00ff88' : '#ff4400'
    );
    distLabel.position.copy(midPoint);
    addTransient(distLabel);

    const bulletGeo = new THREE.RingGeometry(bulletRange - 10, bulletRange + 10, 64);
    bulletGeo.rotateX(-Math.PI / 2);
    const bulletMesh = new THREE.Mesh(
      bulletGeo,
      new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.25 })
    );
    bulletMesh.position.set(newPos.x, newPos.y, newPos.z);
    addTransient(bulletMesh);

    const dodgeGeo = new THREE.RingGeometry(dodgeReach - 6, dodgeReach + 6, 64);
    dodgeGeo.rotateX(-Math.PI / 2);
    const dodgeMesh = new THREE.Mesh(
      dodgeGeo,
      new THREE.MeshBasicMaterial({ color: 0x44aaff, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
    );
    dodgeMesh.position.set(newPos.x, newPos.y, newPos.z);
    addTransient(dodgeMesh);

    let dodgePlanet = null;
    let bestDD = Infinity;
    planets.forEach(p => {
      const dist = Math.hypot(newPos.x - p.center.x, newPos.y - p.center.y, newPos.z - p.center.z);
      const edgeDist = dist - p.radius;
      if (edgeDist <= dodgeReach && edgeDist < bestDD) {
        bestDD = edgeDist;
        dodgePlanet = p;
      }
    });

    if (dodgePlanet) {
      const p = dodgePlanet;
      const highlight = new THREE.Mesh(
        new THREE.RingGeometry(p.radius * 1.15, p.radius * 1.25, 48),
        new THREE.MeshBasicMaterial({ color: 0x44aaff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
      );
      highlight.position.set(p.center.x, p.center.y, p.center.z);
      highlight.rotation.x = Math.PI / 2;
      addTransient(highlight);

      const coverLabel = createTextSprite(
        `COVER: ${p.name} (${Math.round(bestDD)}u)`,
        '#44aaff'
      );
      coverLabel.position.set(p.center.x, p.center.y + p.radius + 60, p.center.z);
      addTransient(coverLabel);
    }

    let retreatPlanet = null;
    let retreatDist = Infinity;
    planets.forEach(p => {
      const dist = Math.hypot(newPos.x - p.center.x, newPos.y - p.center.y, newPos.z - p.center.z);
      const edgeDist = dist - p.radius;
      const angle = Math.atan2(p.center.z - newPos.z, p.center.x - newPos.x);
      const edgePoint = {
        x: p.center.x - Math.cos(angle) * p.radius,
        y: newPos.y,
        z: p.center.z - Math.sin(angle) * p.radius
      };
      const blocksLOS = checkLOS(edgePoint, spawns.p2, planets);
      if (edgeDist <= dodgeReach * 1.5 && edgeDist < retreatDist && blocksLOS) {
        retreatDist = edgeDist;
        retreatPlanet = p;
      }
    });

    if (retreatPlanet) {
      const angle = Math.atan2(
        retreatPlanet.center.z - newPos.z,
        retreatPlanet.center.x - newPos.x
      );
      const arrowLength = 30;
      const tipDist = Math.max(arrowLength + 10, retreatDist - 8);
      const arrowPos = {
        x: newPos.x + Math.cos(angle) * tipDist,
        y: newPos.y + 30,
        z: newPos.z + Math.sin(angle) * tipDist
      };
      const arrowGeo = new THREE.ConeGeometry(12, arrowLength, 8);
      arrowGeo.rotateX(-Math.PI / 2);
      const arrow = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0x00ffff }));
      arrow.position.set(arrowPos.x, arrowPos.y, arrowPos.z);
      arrow.lookAt(retreatPlanet.center.x, arrowPos.y, retreatPlanet.center.z);
      addTransient(arrow);

      const labelDist = Math.max(arrowLength + 10, retreatDist - 8) - 20;
      const retreatLabel = createTextSprite(
        `RETREAT → ${retreatPlanet.name} (${Math.round(retreatDist)}u)`,
        '#00ffff'
      );
      retreatLabel.position.set(
        newPos.x + Math.cos(angle) * labelDist,
        newPos.y + 80,
        newPos.z + Math.sin(angle) * labelDist
      );
      addTransient(retreatLabel);
    }

    let best = null;
    let bestDist = Infinity;
    heatmap.cells.forEach(cell => {
      const d = Math.hypot(newPos.x - cell.x, newPos.y - cell.y, newPos.z - cell.z);
      if (d < bestDist) { bestDist = d; best = cell; }
    });

    const covFromEnemy = losToEnemy;
    let verdict, vcol;
    if (!covFromEnemy && !retreatPlanet) {
      verdict = 'NO-MANS-LAND — exposed, no retreat';
      vcol = '#ff0000';
    } else if (!covFromEnemy) {
      verdict = 'FRONT LINE — enemy LOS, retreat available';
      vcol = '#ff8800';
    } else if (dodgePlanet) {
      verdict = 'POWER POSITION — covered with dodge cover';
      vcol = '#00ffff';
    } else {
      verdict = 'SAFE ZONE — covered from enemy';
      vcol = '#88ff44';
    }

    const distToCenter = Math.hypot(newPos.x, newPos.y, newPos.z);
    const wallDists = distanceToWall(newPos, arena);
    const nearestWall = Math.min(wallDists.x, wallDists.y, wallDists.z);

    let nearestPlanet = null;
    let nearestPlanetDist = Infinity;
    planets.forEach(p => {
      const dist = Math.hypot(newPos.x - p.center.x, newPos.y - p.center.y, newPos.z - p.center.z) - p.radius;
      if (dist < nearestPlanetDist) { nearestPlanetDist = dist; nearestPlanet = p; }
    });

    const avgLanes = heatmap.cells.map(c => c.avgLane);
    const minL = Math.min(...avgLanes);
    const maxL = Math.max(...avgLanes);
    const norm = maxL > minL && best ? (best.avgLane - minL) / (maxL - minL) : 0.5;

    onCellClick({
      verdict, vcol, pos: newPos,
      dodgePlanet: dodgePlanet ? { name: dodgePlanet.name, distance: Math.round(bestDD) } : null,
      retreatPlanet: retreatPlanet ? { name: retreatPlanet.name, distance: Math.round(retreatDist) } : null,
      coveredFromEnemy: covFromEnemy,
      distToEnemy: Math.round(distToEnemy),
      timeToEnemyNormal, timeToEnemyBoost,
      distToCenter: Math.round(distToCenter),
      nearestWall: Math.round(nearestWall),
      nearestPlanet: nearestPlanet ? { name: nearestPlanet.name, distance: Math.round(nearestPlanetDist) } : null,
      avgLane: best?.avgLane.toFixed(1) || 'N/A',
      exposure: (norm * 100).toFixed(0),
      bulletRange, dodgeReach
    });
  }, [arena, planets, spawns, combat, heatmap, dodgeReach, bulletRange, normalSpeed, boostSpeed, setPlayerPos, onCellClick, clearTransient, addTransient, createTextSprite]);

  const onPointerDown = useCallback((e) => {
    e.stopPropagation();
    isDragging.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback((e) => {
    if (Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y) > 4) {
      isDragging.current = true;
    }

    if (e.buttons === 0 && !isDragging.current) {
      handleHover(e);
    }
  }, [handleHover]);

  const onPointerUp = useCallback((e) => {
    if (!isDragging.current) {
      handleClick(e);
    }
  }, [handleClick]);

  return (
    <mesh
      ref={sceneRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <boxGeometry args={[arena.x, arena.y, arena.z]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
