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
  const walkSpeed = 5.8; // m/s (~21 km/h) natural brisk walk
  const runSpeed = 10.5; // m/s (~38 km/h) responsive sprint
  const targetSpeed = input.run ? runSpeed : walkSpeed;

  const fwd = input.forward; // 1 for W, -1 for S
  const str = input.strafe;  // 1 for D, -1 for A

  const inputMag = Math.hypot(fwd, str);

  if (inputMag > 0.01) {
    // Camera forward vector on horizontal XZ plane: (sin(yaw), cos(yaw))
    const camFwdX = Math.sin(input.cameraAngleY);
    const camFwdZ = Math.cos(input.cameraAngleY);

    // Camera right vector on horizontal XZ plane: (cos(yaw), -sin(yaw))
    // With yaw = 0, looking towards +Z, screen-right is +X: cos(0)=1, -sin(0)=0 -> (+1, 0)
    // D moves right (+1), A moves left (-1)
    const camRightX = Math.cos(input.cameraAngleY);
    const camRightZ = -Math.sin(input.cameraAngleY);

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
    player.rotationY += angleDiff * Math.min(1, delta * 18);

    // Target velocity along movement direction
    const targetVx = moveDirX * targetSpeed;
    const targetVz = moveDirZ * targetSpeed;

    player.vx += (targetVx - player.vx) * Math.min(1, delta * 14);
    player.vz += (targetVz - player.vz) * Math.min(1, delta * 14);
  } else {
    // Smooth damping to stop with no sudden drift
    player.vx += (0 - player.vx) * Math.min(1, delta * 16);
    player.vz += (0 - player.vz) * Math.min(1, delta * 16);
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
  const maxForwardSpeed = 30 * speedMultiplier; // m/s (~108 km/h, up to 135 km/h with tuning)
  const maxReverseSpeed = -10.5; // m/s (~38 km/h)
  const acceleration = 16.0 * speedMultiplier; // More responsive, punchy Brazilian street feel
  const brakingDecel = 28.0;
  const naturalDrag = 3.2;
  const maxSteer = 0.58;

  const targetSteer = input.steer * maxSteer;
  car.steerAngle += (targetSteer - car.steerAngle) * Math.min(1, delta * 10);

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

  // Realistic Ackerman-inspired yaw rate:
  // When forward (speed > 0), turning wheel right rotates heading clockwise (yaw angle increases or decreases based on coordinate convention).
  // When in reverse (speed < 0), turning wheel right directs the rear to the right, naturally swinging the vehicle's heading opposite.
  // Using pure car.speed without double-negation turnSign ensures reverse steering turns in the intuitive, real-car direction.
  if (Math.abs(car.speed) > 0.08) {
    const turnRate = (car.speed / 3.2) * car.steerAngle;
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
