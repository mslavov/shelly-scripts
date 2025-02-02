import { CONFIG } from "./config";
import { store, ThermostatState, TemperatureUnits } from "./store";

let MQTT_TOPICS = {
  states: {
    currentState: "boiler/heating/states/state/current",
    targetState: "boiler/heating/states/state/target",
    currentTemperature: "boiler/heating/states/temperature/current",
    targetTemperature: "boiler/heating/states/temperature/target",
    temperatureUnits: "boiler/heating/states/temperature/units",
  },
  controls: {
    targetState: "boiler/heating/control/state/target",
    targetTemperature: "boiler/heating/control/temperature/target",
    temperatureUnits: "boiler/heating/control/temperature/units",
  },
};

// Controls
// Target State
MQTT.subscribe(MQTT_TOPICS.controls.targetState, (topic, message) => {
  console.log("MQTT.subscribe", topic, message);
  store.setState(message as ThermostatState, (result: any) => {
    console.log(result);
  });
});
// Temperature Units
MQTT.subscribe(MQTT_TOPICS.controls.temperatureUnits, (topic, message) => {
  console.log("MQTT.subscribe", topic, message);
  store.setTemperatureUnits(message as TemperatureUnits, (result: any) => {
    console.log(result);
  });
});
// Target Temperature
MQTT.subscribe(MQTT_TOPICS.controls.targetTemperature, (topic, message) => {
  console.log("MQTT.subscribe", topic, message);
  store.setTargetTemperature(parseFloat(message), (result: any) => {
    console.log(result);
  });
});

// States
// Current State
// Target State
// Target Temperature
// Temperature Units

Timer.set(CONFIG.checkInterval, true, () => {
  store.getState((res) => {
    MQTT.publish(MQTT_TOPICS.states.currentState, res.toString());
    MQTT.publish(MQTT_TOPICS.states.targetState, res.toString());
  });
  store.getTemperatureUnits((res) => {
    MQTT.publish(MQTT_TOPICS.states.temperatureUnits, res.toString());
  });
  store.getTargetTemperature((res) => {
    MQTT.publish(MQTT_TOPICS.states.targetTemperature, res.toString());
  });
});
// Current Temperature
Shelly.addStatusHandler((status: any) => {
  console.log("Shelly.addStatusHandler", status);
  if (typeof status.delta.tC !== "undefined" && status.component === "temperature:" + CONFIG.sensorId) {
    print("Current temperature: " + status.delta.tC);
    store.getTemperatureUnits((result: any) => {
      MQTT.publish(MQTT_TOPICS.states.currentTemperature, status.delta["t" + result].toString());
    });
  }
});
