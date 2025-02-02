import { CONFIG } from "./config";
import { store } from "./store";

let SCHEDULES = [
  {
    // Morning
    weekDays: [false, true, true, true, true, true, false], // 0 = sunday, 6 = saturday
    startTime: 6,
    endTime: 9,
    temperature: 39,
  },
  {
    // Evening
    weekDays: [false, true, true, true, true, true, false], // 0 = sunday, 6 = saturday
    startTime: 17,
    endTime: 20,
    temperature: 39,
  },
  {
    // Weekend 2
    weekDays: [true, false, false, false, false, false, true], // 0 = sunday, 6 = saturday
    startTime: 9,
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
 * Find the current schedule
 */
function findCurrentSchedule() {
  const now = new Date();
  let currentSchedule = null;
  for (let i = 0; i < SCHEDULES.length; i++) {
    let schedule = SCHEDULES[i];
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
function checkSchedule(isBoilerOn: boolean) {
  store.getSchedule((previousSchedule) => {
    print("Previous schedule: " + previousSchedule);
    const currentSchedule = findCurrentSchedule();
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
  store.getState((res) => {
    print("Boiler state: " + res);
    checkSchedule(res === "On");
  });
}

Timer.set(CONFIG.checkInterval, true, checkBoiler, null);
