import { CollisionBox } from './cityMap';

export interface PlayerPhysicsState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotationY: number;
  isGrounded: boolean;
  radius: number;
}

export interface CarPhysicsState {
  x: number;
  y: number;
  z: number;
  rotationY: number; // heading in radians
  speed: number;     // m/s
  steerAngle: number; // radians
  radius: number;
}

/**
 * Checks if a circle at (x, z) with radius r intersects any collision box.
 * Resolves by pushing out along penetration normal with smooth multi-box corner sliding.
 */
export function resolveAABBCollision(
  x: number,
  z: number,
  radius: number,
  boxes: CollisionBox[]
): { x: number; z: number; collided: boolean } {
  let curX = x;
  let curZ = z;
  let hasCollided = false;

  // 2 passes for corner resolution
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];

      const closestX = Math.max(box.minX, Math.min(curX, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(curZ, box.maxZ));

      const dx = curX - closestX;
      const dz = curZ - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        hasCollided = true;
        const dist = Math.sqrt(distSq);

        if (dist > 0.0001) {
          const overlap = radius - dist;
          curX += (dx / dist) * overlap;
          curZ += (dz / dist) * overlap;
        } else {
          // Point is deeply inside box - push to closest edge
          const dLeft = Math.abs(curX - box.minX);
          const dRight = Math.abs(curX - box.maxX);
          const dTop = Math.abs(curZ - box.minZ);
          const dBottom = Math.abs(curZ - box.maxZ);

          const minEdge = Math.min(dLeft, dRight, dTop, dBottom);
          if (minEdge === dLeft) curX = box.minX - radius;
          else if (minEdge === dRight) curX = box.maxX + radius;
          else if (minEdge === dTop) curZ = box.minZ - radius;
          else curZ = box.maxZ + radius;
        }
      }
    }
  }

  return { x: curX, z: curZ, collided: hasCollided };
}

/**
 * Updates player movement with acceleration, damping, gravity, jump, and collision.
 * Fixed: W moves forward relative to camera, S moves backward, A moves left, D moves right.
 */
export function updatePlayerPhysics(
  player: PlayerPhysicsState,
  input: { forward: number; strafe: number; jump: boolean; run: boolean; cameraAngleY: number },
  delta: number,
  boxes: CollisionBox[]
): void {
  const walkSpeed = 5.0; // m/s (~18 km/h)
  const runSpeed = 9.5;  // m/s (~34 km/h)
  const targetSpeed = input.run ? runSpeed : walkSpeed;

  const fwd = input.forward; // 1 for W, -1 for S
  const str = input.strafe;  // 1 for D, -1 for A

  const inputMag = Math.hypot(fwd, str);

  if (inputMag > 0.01) {
    // Camera forward vector on horizontal XZ plane: (sin(yaw), cos(yaw))
    // Looking from camera position towards player
    const camFwdX = Math.sin(input.cameraAngleY);
    const camFwdZ = Math.cos(input.cameraAngleY);

    // Camera right vector on horizontal XZ plane: (-cos(yaw), sin(yaw))
    // In Three.js with camera looking at player, screen-right is (-cos(yaw), sin(yaw))
    // Perpendicular to forward: dot((sin, cos), (-cos, sin)) = -sin*cos + cos*sin = 0
    const camRightX = -Math.cos(input.cameraAngleY);
    const camRightZ = Math.sin(input.cameraAngleY);

    // Diagonal movement normalized to 1.0 (prevents 1.414x speed advantage)
    const normFwd = fwd / inputMag;
    const normStr = str / inputMag;

    // Combined movement vector: W moves forward, S backward, A moves left, D moves right
    const moveDirX = camFwdX * normFwd + camRightX * normStr;
    const moveDirZ = camFwdZ * normFwd + camRightZ * normStr;

    // Smoothly rotate character to face the movement direction
    const desiredAngle = Math.atan2(moveDirX, moveDirZ);
    let angleDiff = desiredAngle - player.rotationY;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    player.rotationY += angleDiff * Math.min(1, delta * 15);

    // Target velocity along movement direction
    const targetVx = moveDirX * targetSpeed;
    const targetVz = moveDirZ * targetSpeed;

    player.vx += (targetVx - player.vx) * Math.min(1, delta * 12);
    player.vz += (targetVz - player.vz) * Math.min(1, delta * 12);
  } else {
    // Smooth damping to stop with no sudden drift
    player.vx += (0 - player.vx) * Math.min(1, delta * 14);
    player.vz += (0 - player.vz) * Math.min(1, delta * 14);
    if (Math.hypot(player.vx, player.vz) < 0.05) {
      player.vx = 0;
      player.vz = 0;
    }
  }

  // Gravity & Jump
  const gravity = 24; // m/s^2
  if (player.isGrounded) {
    player.vy = 0;
    if (input.jump) {
      player.vy = 7.8;
      player.isGrounded = false;
    }
  } else {
    player.vy -= gravity * delta;
  }

  // Position candidate
  let nextX = player.x + player.vx * delta;
  let nextY = player.y + player.vy * delta;
  let nextZ = player.z + player.vz * delta;

  // Ground level check
  if (nextY <= 0) {
    nextY = 0;
    player.vy = 0;
    player.isGrounded = true;
  }

  // AABB wall sliding collision resolution
  const resolved = resolveAABBCollision(nextX, nextZ, player.radius, boxes);
  player.x = resolved.x;
  player.y = nextY;
  player.z = resolved.z;
}

/**
 * Updates car movement with acceleration, steering, braking, reverse, and collision.
 */
export function updateCarPhysics(
  car: CarPhysicsState,
  input: { throttle: number; steer: number; brake: boolean },
  delta: number,
  boxes: CollisionBox[],
  speedMultiplier: number = 1.0
): { speedKmH: number; isColliding: boolean } {
  const maxForwardSpeed = 25 * speedMultiplier; // m/s (~90-105 km/h)
  const maxReverseSpeed = -8.5; // m/s (~30 km/h)
  const acceleration = 13.0 * speedMultiplier;
  const brakingDecel = 26.0;
  const naturalDrag = 3.6;
  const maxSteer = 0.55;

  const targetSteer = input.steer * maxSteer;
  car.steerAngle += (targetSteer - car.steerAngle) * Math.min(1, delta * 9);

  if (input.brake) {
    if (car.speed > 0.5) {
      car.speed = Math.max(0, car.speed - brakingDecel * delta);
    } else if (car.speed < -0.5) {
      car.speed = Math.min(0, car.speed + brakingDecel * delta);
    } else {
      car.speed = 0;
    }
  } else if (input.throttle > 0) {
    car.speed = Math.min(maxForwardSpeed, car.speed + acceleration * delta * input.throttle);
  } else if (input.throttle < 0) {
    car.speed = Math.max(maxReverseSpeed, car.speed + acceleration * delta * input.throttle);
  } else {
    if (car.speed > 0.1) {
      car.speed = Math.max(0, car.speed - naturalDrag * delta);
    } else if (car.speed < -0.1) {
      car.speed = Math.min(0, car.speed + naturalDrag * delta);
    } else {
      car.speed = 0;
    }
  }

  if (Math.abs(car.speed) > 0.1) {
    const turnSign = car.speed >= 0 ? 1 : -1;
    const turnRate = (car.speed / 3.8) * car.steerAngle * turnSign;
    car.rotationY += turnRate * delta;
  }

  const forwardX = Math.sin(car.rotationY);
  const forwardZ = Math.cos(car.rotationY);

  const nextX = car.x + forwardX * car.speed * delta;
  const nextZ = car.z + forwardZ * car.speed * delta;

  const resolved = resolveAABBCollision(nextX, nextZ, car.radius, boxes);

  let isColliding = false;
  if (resolved.collided) {
    isColliding = true;
    car.speed *= -0.3; // Elastic bounce
  }

  car.x = resolved.x;
  car.z = resolved.z;

  const speedKmH = Math.round(car.speed * 3.6);
  return { speedKmH, isColliding };
}
