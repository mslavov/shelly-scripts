import { CONFIG } from "./config";
import { store, ScheduleConfig } from "./store";

// Default schedules used when KVS is empty
const DEFAULT_SCHEDULES: ScheduleConfig[] = [
  {
    id: 1,
    name: "Morning",
    weekDays: [false, true, true, true, true, true, false], // 0 = sunday, 6 = saturday
    startTime: 6,
    endTime: 9,
    temperature: 39,
  },
  {
    id: 2,
    name: "Evening",
    weekDays: [false, true, true, true, true, true, false], // 0 = sunday, 6 = saturday
    startTime: 14,
    endTime: 20,
    temperature: 39,
  },
  {
    id: 3,
    name: "Weekend",
    weekDays: [true, false, false, false, false, false, true], // 0 = sunday, 6 = saturday
    startTime: 7,
    endTime: 20,
    temperature: 39,
  },
];

/*
 * Check if the temperature is within the target temperature
 */
function checkTemperature(res: TemperatureStatus, error_code: number, error_msg: string, targetTemperature: any) {
  if (error_code > 0) {
    print("Error getting temperature: " + error_msg);
    return;
  }
  if (!res) {
    print("No temperature data received");
    return;
  }
  print("Temperature: " + res.tC);
  print("Target temperature: " + targetTemperature);
  if (targetTemperature) {
    if (res.tC < parseFloat(targetTemperature) - CONFIG.hysteresis) {
      print("Turning on boiler");
      Shelly.call("switch.set", {
        id: CONFIG.switchId,
        on: true,
      });
    } else if (res.tC > parseFloat(targetTemperature) + CONFIG.hysteresis) {
      print("Turning off boiler");
      Shelly.call("switch.set", {
        id: CONFIG.switchId,
        on: false,
      });
    } else {
      print("Boiler is already in the correct state");
    }
  } else {
    print("No target temperature found");
  }
}

/*
 * Find the current schedule from the provided schedules array
 */
function findCurrentSchedule(schedules: ScheduleConfig[]): ScheduleConfig | null {
  const now = new Date();
  let currentSchedule: ScheduleConfig | null = null;
  for (let i = 0; i < schedules.length; i++) {
    let schedule = schedules[i];
    if (schedule.weekDays[now.getDay()] && now.getHours() >= schedule.startTime && now.getHours() <= schedule.endTime) {
      currentSchedule = schedule;
      break;
    }
  }
  return currentSchedule;
}

/*
 * Check if the schedule is active and if it is, set the target temperature
 */
function checkSchedule(isBoilerOn: boolean, schedules: ScheduleConfig[]) {
  store.getSchedule((previousSchedule) => {
    print("Previous schedule: " + previousSchedule);
    const currentSchedule = findCurrentSchedule(schedules);
    print("Current schedule: " + currentSchedule);
    if (!previousSchedule && currentSchedule) {
      store.setState("On", (res) => {
        print("Boiler state set: " + res);
      });
      store.setSchedule(currentSchedule, (res) => {
        print("Active schedule set: " + res);
      });
      store.setTargetTemperature(currentSchedule.temperature, (res) => {
        print("Target temperature set: " + res);
      });
      Shelly.call("Temperature.GetStatus", { id: CONFIG.sensorId }, checkTemperature, currentSchedule.temperature);
      return;
    }
    if (previousSchedule && !currentSchedule) {
      store.setState("Off", (res) => {
        print("Boiler state set: " + res);
      });
      store.deleteSchedule((res) => {
        print("Active schedule deleted: " + res);
      });
      return;
    }
    if (isBoilerOn) {
      store.getTargetTemperature((targetTemperature) => {
        if (targetTemperature) {
          Shelly.call("Temperature.GetStatus", { id: CONFIG.sensorId }, checkTemperature, targetTemperature);
        }
      });
    } else {
      print("Boiler is off, make sure switch is off");
      Shelly.call("switch.set", {
        id: CONFIG.switchId,
        on: false,
      });
    }
  });
}

/*
 * Check if the boiler is on and if it is, get the temperature
 */
function checkBoiler() {
  // Load schedules from KVS, use defaults if not set
  store.getSchedules((schedules) => {
    let activeSchedules = schedules;
    if (!activeSchedules || activeSchedules.length === 0) {
      print("No schedules in KVS, using defaults");
      activeSchedules = DEFAULT_SCHEDULES;
      // Persist defaults to KVS for future runs
      store.setSchedules(DEFAULT_SCHEDULES, (res) => {
        print("Default schedules saved to KVS");
      });
    }
    store.getState((res) => {
      print("Boiler state: " + res);
      checkSchedule(res === "On", activeSchedules);
    });
  });
}

Timer.set(CONFIG.checkInterval, true, checkBoiler, null);
