import { BTHOME_SVC_ID_STR, BTHomeDecoder } from "./BTHomeDecoder";
import { RemoteShelly } from "./RemoteShelly";

const SENSOR_ADDRESSES = {
  [process.env.SHELLY_PUBLIC_KITCHEN_WINDOW_ADDRESS]: false, // Kitchen window
  [process.env.SHELLY_PUBLIC_OFFICE_WINDOW_ADDRESS]: false, // Office window
  [process.env.SHELLY_PUBLIC_DINING_ROOM_RIGHT_DOOR_ADDRESS]: false, // Dining room right door
  [process.env.SHELLY_PUBLIC_DINING_ROOM_LEFT_DOOR_ADDRESS]: false, // Dining room left door
  [process.env.SHELLY_PUBLIC_CHILDREN_ROOM_WINDOW_ADDRESS]: false, // Children room window
  [process.env.SHELLY_PUBLIC_GUEST_ROOM_WINDOW_ADDRESS]: false, // Guest room window
};

const windowsSwitchRemote = RemoteShelly.getInstance(process.env.SHELLY_PUBLIC_WINDOWS_SWITCH_ADDRESS);

// CHANGE HERE
function handleWindowOpenedEvent(addr: string) {
  console.log("Window is opened, will toggle the switch to open");
  SENSOR_ADDRESSES[addr] = true;
  console.log("Device state: ", JSON.stringify(SENSOR_ADDRESSES));

  windowsSwitchRemote.call("switch.set", { id: 0, on: false }, function (result, error_code, message) {
    console.log(JSON.stringify(result));
    console.log(error_code);
    console.log(message);
  });
}

function handleWindowClosedEvent(addr: string) {
  console.log("Window is closed");
  SENSOR_ADDRESSES[addr] = false;
  console.log("Device state: ", JSON.stringify(SENSOR_ADDRESSES));

  // Check if all states are false
  let allFalse = true;

  for (let key in SENSOR_ADDRESSES) {
    if (SENSOR_ADDRESSES[key] !== false) {
      allFalse = false;
      break;
    }
  }
  console.log("All devices are closed: " + allFalse);

  // Toggle the switch only if all are false
  if (allFalse) {
    console.log("Will toggle the switch to closed");
    windowsSwitchRemote.call("switch.set", { id: 0, on: true }, function (result, error_code, message) {
      console.log(JSON.stringify(result));
      console.log(error_code);
      console.log(message);
    });
  }
}

const SCAN_DURATION = BLE.Scanner.INFINITE_SCAN;
const ACTIVE_SCAN = true;
let lastPacketId = 0x100;

function scanCB(ev: number, res: BLE.Scanner.ScanResult) {
  if (ev !== BLE.Scanner.SCAN_RESULT) return;
  if (typeof res.service_data === "undefined" || typeof res.service_data[BTHOME_SVC_ID_STR] === "undefined") return;
  if (SENSOR_ADDRESSES[res.addr] === undefined) return;
  // parse the packet
  let result = BTHomeDecoder.unpack(res.service_data[BTHOME_SVC_ID_STR]);
  // skip, we are deduping results
  if (lastPacketId === result.pid) return;
  lastPacketId = result.pid;

  // check if the window is closed
  if (result.Window === 0) {
    console.log("Window is closed");
    handleWindowClosedEvent(res.addr);
  } else {
    console.log("Window is open");
    handleWindowOpenedEvent(res.addr);
  }
}

if (Object.keys(SENSOR_ADDRESSES).length > 1) {
  BLE.Scanner.Start({ duration_ms: SCAN_DURATION, active: ACTIVE_SCAN }, scanCB);
} else {
  console.log(
    "No sensor addresses found. Make sure to set the SHELLY_PUBLIC_KITCHEN_WINDOW_ADDRESS, SHELLY_PUBLIC_OFFICE_WINDOW_ADDRESS, SHELLY_PUBLIC_DINING_ROOM_RIGHT_DOOR_ADDRESS, SHELLY_PUBLIC_DINING_ROOM_LEFT_DOOR_ADDRESS, SHELLY_PUBLIC_CHILDREN_ROOM_WINDOW_ADDRESS, SHELLY_PUBLIC_GUEST_ROOM_WINDOW_ADDRESS environment variables."
  );
}
