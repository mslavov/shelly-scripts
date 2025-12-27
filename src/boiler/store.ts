// Type definitions for store values
export type ThermostatState = "On" | "Off";
export type TemperatureUnits = "C" | "F";
export interface Schedule {
  weekDays: boolean[];
  startTime: number;
  endTime: number;
  temperature: number;
}

// Schedule config stored in KVS (extends Schedule with id and name)
export interface ScheduleConfig extends Schedule {
  id: number;
  name: string;
}

// Compact format for KVS storage (to fit within 255 char limit)
// weekDays stored as bitmask: bit 0=Sun, bit 1=Mon, ..., bit 6=Sat
interface CompactSchedule {
  i: number; // id
  n: string; // name
  d: number; // weekDays bitmask
  s: number; // startTime
  e: number; // endTime
  t: number; // temperature
}

// Convert weekDays array to bitmask
function weekDaysToBitmask(weekDays: boolean[]): number {
  let mask = 0;
  for (let i = 0; i < 7; i++) {
    if (weekDays[i]) mask |= 1 << i;
  }
  return mask;
}

// Convert bitmask to weekDays array
function bitmaskToWeekDays(mask: number): boolean[] {
  const weekDays: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push((mask & (1 << i)) !== 0);
  }
  return weekDays;
}

// Convert full schedule to compact format
function toCompact(schedule: ScheduleConfig): CompactSchedule {
  return {
    i: schedule.id,
    n: schedule.name,
    d: weekDaysToBitmask(schedule.weekDays),
    s: schedule.startTime,
    e: schedule.endTime,
    t: schedule.temperature,
  };
}

// Convert compact format to full schedule
function fromCompact(compact: CompactSchedule): ScheduleConfig {
  return {
    id: compact.i,
    name: compact.n,
    weekDays: bitmaskToWeekDays(compact.d),
    startTime: compact.s,
    endTime: compact.e,
    temperature: compact.t,
  };
}

// Store interface
interface StoreInterface {
  // Base KVS methods
  get: (key: string, defaultValue: any, callback: (result: any) => void) => void;
  set: (key: string, value: any, callback: (result: any) => void) => void;
  delete: (key: string, callback: (result: any) => void) => void;

  // Typed getters
  getState: (callback: (result: ThermostatState) => void) => void;
  getSchedule: (callback: (result: Schedule | null) => void) => void;
  getSchedules: (callback: (result: ScheduleConfig[] | null) => void) => void;
  getTargetTemperature: (callback: (result: number | null) => void) => void;
  getTemperatureUnits: (callback: (result: TemperatureUnits) => void) => void;

  // Typed setters
  setState: (value: ThermostatState, callback: (result: any) => void) => void;
  setSchedule: (value: Schedule, callback: (result: any) => void) => void;
  setSchedules: (value: ScheduleConfig[], callback: (result: any) => void) => void;
  setTargetTemperature: (value: number, callback: (result: any) => void) => void;
  setTemperatureUnits: (value: TemperatureUnits, callback: (result: any) => void) => void;

  // Delete methods
  deleteSchedule: (callback: (result: any) => void) => void;
}

// Implementation
export const store: StoreInterface = {
  // Base KVS methods
  get: function (key: string, defaultValue: any, callback: (result: any) => void) {
    Shelly.call("KVS.Get", { key }, (result: any, error_code: number) => {
      if (error_code === 0) {
        callback(result.value);
      } else {
        callback(defaultValue);
      }
    });
  },

  set: function (key: string, value: any, callback: (result: any) => void) {
    Shelly.call("KVS.Set", { key, value }, (result: any, error_code: number) => {
      if (error_code === 0) {
        Shelly.emitEvent("KVS.Set", { key, value });
        callback(result);
      } else {
        callback(null);
      }
    });
  },

  delete: function (key: string, callback: (result: any) => void) {
    Shelly.call("KVS.Delete", { key }, (result: any, error_code: number) => {
      if (error_code === 0) {
        callback(result);
      } else {
        callback(null);
      }
    });
  },

  // Typed getters
  getState: function (callback: (result: ThermostatState) => void) {
    this.get("thermostat.state", "Off", callback);
  },

  getSchedule: function (callback: (result: Schedule | null) => void) {
    this.get("thermostat.schedule", null, callback);
  },

  getSchedules: function (callback: (result: ScheduleConfig[] | null) => void) {
    this.get("thermostat.schedules", null, (compact: CompactSchedule[] | null) => {
      if (compact && compact.length > 0) {
        const schedules: ScheduleConfig[] = [];
        for (let i = 0; i < compact.length; i++) {
          schedules.push(fromCompact(compact[i]));
        }
        callback(schedules);
      } else {
        callback(null);
      }
    });
  },

  getTargetTemperature: function (callback: (result: number | null) => void) {
    this.get("thermostat.targetTemperature", null, callback);
  },

  getTemperatureUnits: function (callback: (result: TemperatureUnits) => void) {
    this.get("thermostat.temperatureUnits", "C", callback);
  },

  // Typed setters
  setState: function (value: ThermostatState, callback: (result: any) => void) {
    this.set("thermostat.state", value, callback);
  },

  setSchedule: function (value: Schedule, callback: (result: any) => void) {
    this.set("thermostat.schedule", value, callback);
  },

  setSchedules: function (value: ScheduleConfig[], callback: (result: any) => void) {
    const compact: CompactSchedule[] = [];
    for (let i = 0; i < value.length; i++) {
      compact.push(toCompact(value[i]));
    }
    this.set("thermostat.schedules", compact, callback);
  },

  setTargetTemperature: function (value: number, callback: (result: any) => void) {
    this.set("thermostat.targetTemperature", value, callback);
  },

  setTemperatureUnits: function (value: TemperatureUnits, callback: (result: any) => void) {
    this.set("thermostat.temperatureUnits", value, callback);
  },

  // Delete methods
  deleteSchedule: function (callback: (result: any) => void) {
    this.delete("thermostat.schedule", callback);
  },
};
