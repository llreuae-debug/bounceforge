import { Ball, ArcRing, LineSegment, CollisionEvent } from './types';

/**
 * Normalizes an angle into [-PI, PI]
 */
export function normalizeAngle(angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Returns the shortest angular distance between angle a and angle b
 */
export function angleDiff(a: number, b: number): number {
  return normalizeAngle(a - b);
}

/**
 * Checks if angle phi is within any of the ring's gaps.
 */
export function isAngleInGap(phi: number, ringAngle: number, gapSize: number, gapCount: number): boolean {
  const step = (Math.PI * 2) / gapCount;
  const halfGap = gapSize / 2;

  for (let i = 0; i < gapCount; i++) {
    const centerGapAngle = ringAngle + i * step;
    const diff = Math.abs(angleDiff(phi, centerGapAngle));
    if (diff <= halfGap) {
      return true;
    }
  }
  return false;
}

/**
 * Returns angular gap boundaries for corner vertex checks
 */
export function getGapEdges(ringAngle: number, gapSize: number, gapCount: number): number[] {
  const edges: number[] = [];
  const step = (Math.PI * 2) / gapCount;
  const halfGap = gapSize / 2;
  for (let i = 0; i < gapCount; i++) {
    const center = ringAngle + i * step;
    edges.push(center - halfGap);
    edges.push(center + halfGap);
  }
  return edges;
}

/**
 * Circle vs Rotating Arc Ring Collision
 */
export function checkBallArcRingCollision(
  ball: Ball,
  ring: ArcRing,
  now: number
): { collided: boolean; escaped: boolean; event?: CollisionEvent } {
  if (ring.isShattered) return { collided: false, escaped: false };

  const dx = ball.x - ring.centerX;
  const dy = ball.y - ring.centerY;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.0001) return { collided: false, escaped: false };

  const angle = Math.atan2(dy, dx);
  const inGap = isAngleInGap(angle, ring.angle, ring.gapSize, ring.gapCount);

  const innerR = ring.radius - ring.thickness / 2;
  const outerR = ring.radius + ring.thickness / 2;

  // Check escape: Ball was inside and center passes through the gap beyond ring.radius
  if (inGap) {
    if (dist >= ring.radius && dist - ball.radius < outerR) {
      return {
        collided: false,
        escaped: true,
        event: {
          id: Math.floor(Math.random() * 1000000),
          time: now,
          type: 'escape',
          position: { x: ball.x, y: ball.y },
          velocity: { x: ball.vx, y: ball.vy },
          impulse: Math.hypot(ball.vx, ball.vy),
          ringId: ring.id,
          ballId: ball.id,
          noteIndex: 0,
        },
      };
    }
    // Check collision with the edge corners of the gap
    const gapEdges = getGapEdges(ring.angle, ring.gapSize, ring.gapCount);
    for (const edgeAngle of gapEdges) {
      // Check corner at radius R
      const cx = ring.centerX + Math.cos(edgeAngle) * ring.radius;
      const cy = ring.centerY + Math.sin(edgeAngle) * ring.radius;
      const cdx = ball.x - cx;
      const cdy = ball.y - cy;
      const cdist = Math.hypot(cdx, cdy);

      if (cdist < ball.radius && cdist > 0.0001) {
        const nx = cdx / cdist;
        const ny = cdy / cdist;

        // Separate
        const overlap = ball.radius - cdist;
        ball.x += nx * overlap;
        ball.y += ny * overlap;

        // Tangential velocity of ring corner due to rotation
        const cornerVx = -ring.angularVelocity * (cy - ring.centerY);
        const cornerVy = ring.angularVelocity * (cx - ring.centerX);

        const relVx = ball.vx - cornerVx;
        const relVy = ball.vy - cornerVy;
        const dot = relVx * nx + relVy * ny;

        if (dot < 0) {
          const impulseMag = -(1 + ball.restitution) * dot;
          ball.vx += nx * impulseMag;
          ball.vy += ny * impulseMag;

          return {
            collided: true,
            escaped: false,
            event: {
              id: Math.floor(Math.random() * 1000000),
              time: now,
              type: 'ring',
              position: { x: cx, y: cy },
              velocity: { x: ball.vx, y: ball.vy },
              impulse: impulseMag,
              ringId: ring.id,
              ballId: ball.id,
              noteIndex: 0,
            },
          };
        }
      }
    }
    return { collided: false, escaped: false };
  }

  // If NOT in gap:
  // Inside hit: ball hitting inner surface of arc
  if (dist + ball.radius > innerR && dist < ring.radius) {
    const nx = -dx / dist; // Points inward towards center
    const ny = -dy / dist;

    // Positional separation
    const overlap = dist + ball.radius - innerR;
    ball.x += (dx / dist) * -overlap;
    ball.y += (dy / dist) * -overlap;

    // Ring tangential velocity at contact point
    const ringVx = -ring.angularVelocity * dy;
    const ringVy = ring.angularVelocity * dx;

    const relVx = ball.vx - ringVx;
    const relVy = ball.vy - ringVy;
    const velAlongNormal = relVx * nx + relVy * ny;

    if (velAlongNormal < 0) {
      const impulseMag = -(1 + ball.restitution) * velAlongNormal;
      ball.vx += nx * impulseMag;
      ball.vy += ny * impulseMag;

      return {
        collided: true,
        escaped: false,
        event: {
          id: Math.floor(Math.random() * 1000000),
          time: now,
          type: 'ring',
          position: { x: ring.centerX + (dx / dist) * innerR, y: ring.centerY + (dy / dist) * innerR },
          velocity: { x: ball.vx, y: ball.vy },
          impulse: impulseMag,
          ringId: ring.id,
          ballId: ball.id,
          noteIndex: 0,
        },
      };
    }
  }

  // Outside hit: ball hitting outer surface of arc
  if (dist - ball.radius < outerR && dist > ring.radius) {
    const nx = dx / dist; // Points outward away from center
    const ny = dy / dist;

    const overlap = outerR - (dist - ball.radius);
    ball.x += (dx / dist) * overlap;
    ball.y += (dy / dist) * overlap;

    const ringVx = -ring.angularVelocity * dy;
    const ringVy = ring.angularVelocity * dx;

    const relVx = ball.vx - ringVx;
    const relVy = ball.vy - ringVy;
    const velAlongNormal = relVx * nx + relVy * ny;

    if (velAlongNormal < 0) {
      const impulseMag = -(1 + ball.restitution) * velAlongNormal;
      ball.vx += nx * impulseMag;
      ball.vy += ny * impulseMag;

      return {
        collided: true,
        escaped: false,
        event: {
          id: Math.floor(Math.random() * 1000000),
          time: now,
          type: 'ring',
          position: { x: ring.centerX + (dx / dist) * outerR, y: ring.centerY + (dy / dist) * outerR },
          velocity: { x: ball.vx, y: ball.vy },
          impulse: impulseMag,
          ringId: ring.id,
          ballId: ball.id,
          noteIndex: 0,
        },
      };
    }
  }

  return { collided: false, escaped: false };
}

/**
 * Circle vs Circle Collision
 */
export function checkBallBallCollision(b1: Ball, b2: Ball, now: number): CollisionEvent | null {
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const distSq = dx * dx + dy * dy;
  const minDist = b1.radius + b2.radius;

  if (distSq >= minDist * minDist || distSq === 0) return null;

  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;

  // Positional correction
  const overlap = minDist - dist;
  const totalMass = b1.mass + b2.mass;
  const m1Ratio = b2.mass / totalMass;
  const m2Ratio = b1.mass / totalMass;

  b1.x -= nx * overlap * m1Ratio;
  b1.y -= ny * overlap * m1Ratio;
  b2.x += nx * overlap * m2Ratio;
  b2.y += ny * overlap * m2Ratio;

  // Relative velocity
  const relVx = b2.vx - b1.vx;
  const relVy = b2.vy - b1.vy;
  const velAlongNormal = relVx * nx + relVy * ny;

  if (velAlongNormal > 0) return null; // Separating

  const e = Math.min(b1.restitution, b2.restitution);
  const impulseMag = (-(1 + e) * velAlongNormal) / (1 / b1.mass + 1 / b2.mass);

  b1.vx -= (nx * impulseMag) / b1.mass;
  b1.vy -= (ny * impulseMag) / b1.mass;
  b2.vx += (nx * impulseMag) / b2.mass;
  b2.vy += (ny * impulseMag) / b2.mass;

  return {
    id: Math.floor(Math.random() * 1000000),
    time: now,
    type: 'ball',
    position: { x: b1.x + nx * b1.radius, y: b1.y + ny * b1.radius },
    velocity: { x: (b1.vx + b2.vx) / 2, y: (b1.vy + b2.vy) / 2 },
    impulse: impulseMag,
    ballId: b1.id,
    targetBallId: b2.id,
    noteIndex: 0,
  };
}

/**
 * Circle vs Line Segment Collision
 */
export function checkBallLineCollision(ball: Ball, seg: LineSegment, now: number): CollisionEvent | null {
  const x1 = seg.x1 ?? seg.p1?.x ?? 0;
  const y1 = seg.y1 ?? seg.p1?.y ?? 0;
  const x2 = seg.x2 ?? seg.p2?.x ?? 0;
  const y2 = seg.y2 ?? seg.p2?.y ?? 0;
  const vx = x2 - x1;
  const vy = y2 - y1;
  const lenSq = vx * vx + vy * vy;
  if (lenSq === 0) return null;

  // Project ball center onto line segment clamped to [0, 1]
  const t = Math.max(0, Math.min(1, ((ball.x - x1) * vx + (ball.y - y1) * vy) / lenSq));
  const projX = x1 + t * vx;
  const projY = y1 + t * vy;

  const dx = ball.x - projX;
  const dy = ball.y - projY;
  const dist = Math.hypot(dx, dy);

  if (dist < ball.radius && dist > 0.0001) {
    const nx = dx / dist;
    const ny = dy / dist;

    // Positional separation
    const overlap = ball.radius - dist;
    ball.x += nx * overlap;
    ball.y += ny * overlap;

    const velAlongNormal = ball.vx * nx + ball.vy * ny;
    if (velAlongNormal < 0) {
      const e = Math.min(ball.restitution, seg.restitution);
      const impulseMag = -(1 + e) * velAlongNormal;
      ball.vx += nx * impulseMag;
      ball.vy += ny * impulseMag;

      return {
        id: Math.floor(Math.random() * 1000000),
        time: now,
        type: 'wall',
        position: { x: projX, y: projY },
        velocity: { x: ball.vx, y: ball.vy },
        impulse: impulseMag,
        ballId: ball.id,
        noteIndex: 0,
      };
    }
  }

  return null;
}
