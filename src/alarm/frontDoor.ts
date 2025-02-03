import { BTHomeDecoder, BTHOME_SVC_ID_STR } from "./BTHomeDecoder";

const SCAN_DURATION = BLE.Scanner.INFINITE_SCAN;
const ACTIVE_SCAN = false;
const SENSOR_ADDRESS = process.env.SHELLY_PUBLIC_FRONT_DOOR_ADDRESS;

let lastPacketId = 0x100;

function scanCB(ev: number, res: BLE.Scanner.ScanResult) {
  if (ev !== BLE.Scanner.SCAN_RESULT) return;
  if (typeof res.service_data === "undefined" || typeof res.service_data[BTHOME_SVC_ID_STR] === "undefined") return;
  if (SENSOR_ADDRESS !== res.addr) return;
  // parse the packet
  let result = BTHomeDecoder.unpack(res.service_data[BTHOME_SVC_ID_STR]);
  // skip, we are deduping results
  if (lastPacketId === result.pid) return;
  lastPacketId = result.pid;

  // check if the window is closed
  let isClosed = result.Window === 0;
  console.log("Sensor is " + (isClosed ? "closed" : "open"));
  Shelly.call("Switch.Set", { id: 0, on: isClosed });
}

if (SENSOR_ADDRESS) {
  BLE.Scanner.Start({ duration_ms: SCAN_DURATION, active: ACTIVE_SCAN }, scanCB);
} else {
  console.log("No sensor address found. Make sure to set the SHELLY_PUBLIC_FRONT_DOOR_ADDRESS environment variable.");
}
