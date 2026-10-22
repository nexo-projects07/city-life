/**
 * Gamepad Controller Manager for CityLife RP
 * Browser Gamepad API with support for Xbox, PlayStation (DualShock / DualSense) and generic USB/Bluetooth controllers.
 */

export interface GamepadState {
  isConnected: boolean;
  id: string;
  type: 'xbox' | 'playstation' | 'generic';
  moveX: number; // -1 to 1 (strafe)
  moveY: number; // -1 to 1 (forward/backward)
  lookX: number; // -1 to 1 (camera yaw)
  lookY: number; // -1 to 1 (camera pitch)
  isSprinting: boolean;
  isJumping: boolean;
  isInteracting: boolean;
  isPhoneToggle: boolean;
  isPauseToggle: boolean;
  isHorn: boolean;
  isRadioCycle: boolean;
  throttle: number; // 0 to 1
  brakeReverse: number; // 0 to 1
}

class GamepadManager {
  private activeGamepadIndex: number | null = null;
  private deadzone: number = 0.16;
  private listeners: Set<(state: { isConnected: boolean; name: string }) => void> = new Set();
  private prevButtonStates: { [key: number]: boolean } = {};

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('gamepadconnected', this.handleConnected);
      window.addEventListener('gamepaddisconnected', this.handleDisconnected);
    }
  }

  public setDeadzone(val: number) {
    this.deadzone = Math.max(0.05, Math.min(0.4, val));
  }

  public getDeadzone(): number {
    return this.deadzone;
  }

  public subscribe(callback: (state: { isConnected: boolean; name: string }) => void): () => void {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getStatus(): { isConnected: boolean; name: string; type: 'xbox' | 'playstation' | 'generic' } {
    const pad = this.getGamepad();
    if (!pad) {
      return { isConnected: false, name: 'Nenhum Controle', type: 'generic' };
    }
    const lower = pad.id.toLowerCase();
    let type: 'xbox' | 'playstation' | 'generic' = 'generic';
    let cleanName = 'Controle Conectado';

    if (lower.includes('xbox') || lower.includes('x-input') || lower.includes('microsoft')) {
      type = 'xbox';
      cleanName = 'Controle Xbox';
    } else if (lower.includes('playstation') || lower.includes('dualshock') || lower.includes('dualsense') || lower.includes('sony') || lower.includes('wireless controller')) {
      type = 'playstation';
      cleanName = 'Controle PlayStation';
    } else {
      cleanName = pad.id.slice(0, 24);
    }

    return { isConnected: true, name: cleanName, type };
  }

  private handleConnected = (e: GamepadEvent) => {
    this.activeGamepadIndex = e.gamepad.index;
    this.notify();
  };

  private handleDisconnected = (e: GamepadEvent) => {
    if (this.activeGamepadIndex === e.gamepad.index) {
      this.activeGamepadIndex = null;
      // Find fallback connected gamepad
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of pads) {
        if (p) {
          this.activeGamepadIndex = p.index;
          break;
        }
      }
    }
    this.notify();
  };

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((cb) => cb(status));
  }

  private getGamepad(): Gamepad | null {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    if (this.activeGamepadIndex !== null && pads[this.activeGamepadIndex]) {
      return pads[this.activeGamepadIndex];
    }
    for (const p of pads) {
      if (p && p.connected) {
        this.activeGamepadIndex = p.index;
        return p;
      }
    }
    return null;
  }

  private applyDeadzone(v: number): number {
    if (Math.abs(v) < this.deadzone) return 0;
    const sign = Math.sign(v);
    return sign * ((Math.abs(v) - this.deadzone) / (1 - this.deadzone));
  }

  /**
   * Polls input each tick. Returns true once when a button transition from false -> true happens.
   */
  public poll(callbacks?: {
    onInteract?: () => void;
    onPhoneToggle?: () => void;
    onPauseToggle?: () => void;
    onRadioCycle?: () => void;
    onHorn?: () => void;
  }): GamepadState {
    const pad = this.getGamepad();
    if (!pad) {
      return {
        isConnected: false,
        id: '',
        type: 'generic',
        moveX: 0,
        moveY: 0,
        lookX: 0,
        lookY: 0,
        isSprinting: false,
        isJumping: false,
        isInteracting: false,
        isPhoneToggle: false,
        isPauseToggle: false,
        isHorn: false,
        isRadioCycle: false,
        throttle: 0,
        brakeReverse: 0,
      };
    }

    const axes = pad.axes || [];
    const buttons = pad.buttons || [];

    // Left Stick: Axes 0 (X) and 1 (Y)
    const rawLeftX = axes[0] ?? 0;
    const rawLeftY = axes[1] ?? 0;
    let moveX = this.applyDeadzone(rawLeftX);
    let moveY = -this.applyDeadzone(rawLeftY); // -1 is forward in gamepad axis standard

    // D-Pad navigation fallback
    const dpadUp = buttons[12]?.pressed;
    const dpadDown = buttons[13]?.pressed;
    const dpadLeft = buttons[14]?.pressed;
    const dpadRight = buttons[15]?.pressed;

    if (dpadUp) moveY = 1;
    if (dpadDown) moveY = -1;
    if (dpadRight) moveX = 1;
    if (dpadLeft) moveX = -1;

    // Right Stick: Axes 2 (X) and 3 (Y)
    const rawRightX = axes[2] ?? 0;
    const rawRightY = axes[3] ?? 0;
    const lookX = this.applyDeadzone(rawRightX);
    const lookY = this.applyDeadzone(rawRightY);

    // Standard Buttons
    const btnA = !!buttons[0]?.pressed; // A (Xbox) / Cross (PS) -> Jump / Confirm
    const btnB = !!buttons[1]?.pressed; // B (Xbox) / Circle (PS) -> Cancel / Back
    const btnX = !!buttons[2]?.pressed; // X (Xbox) / Square (PS) -> Interact / E Key
    const btnY = !!buttons[3]?.pressed; // Y (Xbox) / Triangle (PS) -> Phone
    const btnLB = !!buttons[4]?.pressed; // L1 / LB
    const btnRB = !!buttons[5]?.pressed; // R1 / RB
    const btnLT = buttons[6]?.value ?? (buttons[6]?.pressed ? 1 : 0); // L2 / LT Trigger
    const btnRT = buttons[7]?.value ?? (buttons[7]?.pressed ? 1 : 0); // R2 / RT Trigger
    const btnStart = !!buttons[9]?.pressed; // Start / Options
    const btnL3 = !!buttons[10]?.pressed; // Left stick click -> Sprint toggle

    // Edge triggers (just pressed this frame)
    const isJustPressed = (btnIndex: number, current: boolean): boolean => {
      const prev = !!this.prevButtonStates[btnIndex];
      this.prevButtonStates[btnIndex] = current;
      return current && !prev;
    };

    const interactJustPressed = isJustPressed(2, btnX);
    const phoneJustPressed = isJustPressed(3, btnY);
    const pauseJustPressed = isJustPressed(9, btnStart);
    const radioJustPressed = isJustPressed(5, btnRB);
    const hornJustPressed = isJustPressed(4, btnLB);

    if (interactJustPressed && callbacks?.onInteract) {
      callbacks.onInteract();
    }
    if (phoneJustPressed && callbacks?.onPhoneToggle) {
      callbacks.onPhoneToggle();
    }
    if (pauseJustPressed && callbacks?.onPauseToggle) {
      callbacks.onPauseToggle();
    }
    if (radioJustPressed && callbacks?.onRadioCycle) {
      callbacks.onRadioCycle();
    }
    if (hornJustPressed && callbacks?.onHorn) {
      callbacks.onHorn();
    }

    const { type, name } = this.getStatus();

    return {
      isConnected: true,
      id: name,
      type,
      moveX,
      moveY,
      lookX,
      lookY,
      isSprinting: btnL3 || btnLB,
      isJumping: btnA,
      isInteracting: interactJustPressed,
      isPhoneToggle: phoneJustPressed,
      isPauseToggle: pauseJustPressed,
      isHorn: hornJustPressed,
      isRadioCycle: radioJustPressed,
      throttle: btnRT,
      brakeReverse: btnLT,
    };
  }
}

export const gamepadManager = new GamepadManager();
