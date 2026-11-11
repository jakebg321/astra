

export function segHit(p1x, p1y, p1z, p2x, p2y, p2z, cx, cy, cz, sr) {
  const dx = p2x - p1x;
  const dy = p2y - p1y;
  const dz = p2z - p1z;
  const fx = p1x - cx;
  const fy = p1y - cy;
  const fz = p1z - cz;
  const A = dx * dx + dy * dy + dz * dz;
  if (A < 1e-12) return false;
  const B = 2 * (fx * dx + fy * dy + fz * dz);
  const C = fx * fx + fy * fy + fz * fz - sr * sr;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return false;
  const sq = Math.sqrt(disc);
  const t1 = (-B - sq) / (2 * A);
  const t2 = (-B + sq) / (2 * A);
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

export function checkLOS(from, to, planets, padding = 4) {
  return planets.some(p => {
    const r = p.radius + padding;
    const d1 = Math.hypot(from.x - p.center.x, from.y - p.center.y, from.z - p.center.z);
    const d2 = Math.hypot(to.x - p.center.x, to.y - p.center.y, to.z - p.center.z);
    if (d1 < r || d2 < r) return false;
    return segHit(
      from.x, from.y, from.z,
      to.x, to.y, to.z,
      p.center.x, p.center.y, p.center.z,
      r
    );
  });
}

export function distanceToWall(pos, arena) {
  const hx = arena.x / 2;
  const hy = arena.y / 2;
  const hz = arena.z / 2;
  return {
    x: hx - Math.abs(pos.x),
    y: hy - Math.abs(pos.y),
    z: hz - Math.abs(pos.z)
  };
}
