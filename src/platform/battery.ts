/**
 * Battery Status API helper
 * Checks battery level and charging state to warn users before intensive 4K exports.
 */

export interface BatteryInfo {
  supported: boolean;
  levelPercent: number;
  charging: boolean;
  lowBatteryWarning: boolean; // < 20% and not charging
}

export async function checkBatteryStatus(): Promise<BatteryInfo> {
  if (typeof window === 'undefined' || !('getBattery' in navigator)) {
    return {
      supported: false,
      levelPercent: 100,
      charging: true,
      lowBatteryWarning: false,
    };
  }

  try {
    const battery: any = await (navigator as any).getBattery();
    const levelPercent = Math.round(battery.level * 100);
    const charging = battery.charging;
    const lowBatteryWarning = levelPercent < 20 && !charging;

    return {
      supported: true,
      levelPercent,
      charging,
      lowBatteryWarning,
    };
  } catch {
    return {
      supported: false,
      levelPercent: 100,
      charging: true,
      lowBatteryWarning: false,
    };
  }
}
