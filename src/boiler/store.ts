// Type definitions for store values
export type ThermostatState = "On" | "Off";
export type TemperatureUnits = "C" | "F";
export interface Schedule {
  weekDays: boolean[];
  startTime: number;
  endTime: number;
  temperature: number;
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
  getTargetTemperature: (callback: (result: number | null) => void) => void;
  getTemperatureUnits: (callback: (result: TemperatureUnits) => void) => void;

  // Typed setters
  setState: (value: ThermostatState, callback: (result: any) => void) => void;
  setSchedule: (value: Schedule, callback: (result: any) => void) => void;
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
