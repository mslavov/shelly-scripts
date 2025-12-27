#!/usr/bin/env npx ts-node

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// Schedule interface matching the Shelly script
interface ScheduleConfig {
  id: number;
  name: string;
  weekDays: boolean[];
  startTime: number;
  endTime: number;
  temperature: number;
}

// Compact format for KVS storage (to fit within 255 char limit)
interface CompactSchedule {
  i: number;
  n: string;
  d: number; // weekDays bitmask
  s: number;
  e: number;
  t: number;
}

function weekDaysToBitmask(weekDays: boolean[]): number {
  let mask = 0;
  for (let i = 0; i < 7; i++) {
    if (weekDays[i]) mask |= 1 << i;
  }
  return mask;
}

function bitmaskToWeekDays(mask: number): boolean[] {
  const weekDays: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push((mask & (1 << i)) !== 0);
  }
  return weekDays;
}

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

const DEVICE_HOST = process.env.BOILER_HOSTNAME;
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEFAULT_EXPORT_FILE = "schedules.json";

// Default schedules (same as in thermostat.ts)
const DEFAULT_SCHEDULES: ScheduleConfig[] = [
  {
    id: 1,
    name: "Morning",
    weekDays: [false, true, true, true, true, true, false],
    startTime: 6,
    endTime: 9,
    temperature: 39,
  },
  {
    id: 2,
    name: "Evening",
    weekDays: [false, true, true, true, true, true, false],
    startTime: 14,
    endTime: 20,
    temperature: 39,
  },
  {
    id: 3,
    name: "Weekend",
    weekDays: [true, false, false, false, false, false, true],
    startTime: 7,
    endTime: 20,
    temperature: 39,
  },
];

if (!DEVICE_HOST) {
  console.error("Error: BOILER_HOSTNAME not set in .env file");
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function rpcCall(method: string, params?: object): Promise<any> {
  const url = `http://${DEVICE_HOST}/rpc`;
  const body = {
    id: 1,
    method,
    params: params || {},
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.result;
  } catch (error) {
    throw error;
  }
}

async function getSchedules(): Promise<ScheduleConfig[]> {
  try {
    const result = await rpcCall("KVS.Get", { key: "thermostat.schedules" });
    if (result && result.value && Array.isArray(result.value)) {
      // Convert from compact format
      return result.value.map((c: CompactSchedule) => fromCompact(c));
    }
    return [];
  } catch {
    return [];
  }
}

async function setSchedules(schedules: ScheduleConfig[]): Promise<void> {
  // Convert to compact format for KVS storage (255 char limit)
  const compact = schedules.map((s) => toCompact(s));
  await rpcCall("KVS.Set", { key: "thermostat.schedules", value: compact });
}

function formatWeekDays(weekDays: boolean[]): string {
  return weekDays.map((active, i) => (active ? WEEK_DAYS[i] : "-")).join(" ");
}

function formatTime(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function printSchedule(schedule: ScheduleConfig, index: number): void {
  console.log(
    `  ${index + 1}. [${schedule.id}] ${schedule.name.padEnd(12)} | ${formatWeekDays(schedule.weekDays)} | ${formatTime(schedule.startTime)}-${formatTime(schedule.endTime)} | ${schedule.temperature}°C`
  );
}

async function listSchedules(): Promise<ScheduleConfig[]> {
  const schedules = await getSchedules();
  console.log("\n=== Current Schedules ===");
  if (schedules.length === 0) {
    console.log("  No schedules configured.");
  } else {
    console.log("     ID   Name          | Days                  | Time        | Temp");
    console.log("  " + "-".repeat(70));
    schedules.forEach((s, i) => printSchedule(s, i));
  }
  console.log("");
  return schedules;
}

async function promptWeekDays(): Promise<boolean[]> {
  console.log("\nSelect days (enter numbers separated by space):");
  console.log("  1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat");
  console.log("  Example: '2 3 4 5 6' for Mon-Fri");
  const input = await question("Days: ");
  const days = input.split(" ").map((n) => parseInt(n.trim()) - 1);
  const weekDays = [false, false, false, false, false, false, false];
  days.forEach((d) => {
    if (d >= 0 && d <= 6) weekDays[d] = true;
  });
  return weekDays;
}

async function addSchedule(): Promise<void> {
  const schedules = await getSchedules();
  const nextId = schedules.length > 0 ? Math.max(...schedules.map((s) => s.id)) + 1 : 1;

  console.log("\n=== Add New Schedule ===");
  const name = await question("Name: ");
  const weekDays = await promptWeekDays();
  const startTime = parseInt(await question("Start hour (0-23): "));
  const endTime = parseInt(await question("End hour (0-23): "));
  const temperature = parseFloat(await question("Target temperature (°C): "));

  if (isNaN(startTime) || isNaN(endTime) || isNaN(temperature)) {
    console.log("Invalid input. Schedule not added.");
    return;
  }

  const newSchedule: ScheduleConfig = {
    id: nextId,
    name,
    weekDays,
    startTime,
    endTime,
    temperature,
  };

  schedules.push(newSchedule);
  await setSchedules(schedules);
  console.log(`\nSchedule "${name}" added successfully!`);
}

async function editSchedule(): Promise<void> {
  const schedules = await listSchedules();
  if (schedules.length === 0) return;

  const indexStr = await question("Enter schedule number to edit (or 0 to cancel): ");
  const index = parseInt(indexStr) - 1;

  if (index < 0 || index >= schedules.length) {
    console.log("Cancelled.");
    return;
  }

  const schedule = schedules[index];
  console.log(`\nEditing: ${schedule.name}`);
  console.log("Press Enter to keep current value.\n");

  const name = await question(`Name [${schedule.name}]: `);
  if (name) schedule.name = name;

  const changeDays = await question("Change days? (y/n) [n]: ");
  if (changeDays.toLowerCase() === "y") {
    schedule.weekDays = await promptWeekDays();
  }

  const startStr = await question(`Start hour [${schedule.startTime}]: `);
  if (startStr) schedule.startTime = parseInt(startStr);

  const endStr = await question(`End hour [${schedule.endTime}]: `);
  if (endStr) schedule.endTime = parseInt(endStr);

  const tempStr = await question(`Temperature [${schedule.temperature}]: `);
  if (tempStr) schedule.temperature = parseFloat(tempStr);

  await setSchedules(schedules);
  console.log(`\nSchedule "${schedule.name}" updated successfully!`);
}

async function removeSchedule(): Promise<void> {
  const schedules = await listSchedules();
  if (schedules.length === 0) return;

  const indexStr = await question("Enter schedule number to remove (or 0 to cancel): ");
  const index = parseInt(indexStr) - 1;

  if (index < 0 || index >= schedules.length) {
    console.log("Cancelled.");
    return;
  }

  const removed = schedules.splice(index, 1)[0];
  await setSchedules(schedules);
  console.log(`\nSchedule "${removed.name}" removed successfully!`);
}

async function resetToDefaults(): Promise<void> {
  const confirm = await question("Reset all schedules to defaults? (y/n): ");
  if (confirm.toLowerCase() !== "y") {
    console.log("Cancelled.");
    return;
  }

  // Delete the KVS key - the Shelly script will recreate defaults on next run
  try {
    await rpcCall("KVS.Delete", { key: "thermostat.schedules" });
    console.log("\nSchedules reset. Defaults will be applied on next check cycle.");
  } catch {
    console.log("Failed to reset schedules.");
  }
}

async function exportSchedules(filePath?: string): Promise<void> {
  const schedules = await getSchedules();
  if (schedules.length === 0) {
    console.log("No schedules to export.");
    return;
  }

  const outputPath = filePath || (await question(`Export file [${DEFAULT_EXPORT_FILE}]: `)) || DEFAULT_EXPORT_FILE;
  const resolvedPath = path.resolve(outputPath);

  try {
    fs.writeFileSync(resolvedPath, JSON.stringify(schedules, null, 2));
    console.log(`\nSchedules exported to: ${resolvedPath}`);
  } catch (error) {
    console.error("Failed to export schedules:", error);
  }
}

async function importSchedules(filePath?: string): Promise<void> {
  let inputPath = filePath;

  if (!inputPath) {
    console.log("\nImport options:");
    console.log("  1. Import from file");
    console.log("  2. Import defaults");
    const choice = await question("Choice [1]: ");

    if (choice === "2") {
      const confirm = await question("Import default schedules? This will replace current schedules. (y/n): ");
      if (confirm.toLowerCase() !== "y") {
        console.log("Cancelled.");
        return;
      }
      await setSchedules(DEFAULT_SCHEDULES);
      console.log("\nDefault schedules imported successfully!");
      return;
    }

    inputPath = (await question(`Import file [${DEFAULT_EXPORT_FILE}]: `)) || DEFAULT_EXPORT_FILE;
  }

  const resolvedPath = path.resolve(inputPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    return;
  }

  try {
    const content = fs.readFileSync(resolvedPath, "utf-8");
    const schedules: ScheduleConfig[] = JSON.parse(content);

    if (!Array.isArray(schedules)) {
      console.error("Invalid file format: expected an array of schedules.");
      return;
    }

    // Validate schedule structure
    for (const s of schedules) {
      if (typeof s.id !== "number" || typeof s.name !== "string" || !Array.isArray(s.weekDays)) {
        console.error("Invalid schedule format in file.");
        return;
      }
    }

    const confirm = await question(`Import ${schedules.length} schedule(s)? This will replace current schedules. (y/n): `);
    if (confirm.toLowerCase() !== "y") {
      console.log("Cancelled.");
      return;
    }

    await setSchedules(schedules);
    console.log(`\n${schedules.length} schedule(s) imported successfully!`);
  } catch (error) {
    console.error("Failed to import schedules:", error);
  }
}

async function mainMenu(): Promise<void> {
  console.log("\n=== Thermostat Schedule Manager ===");
  console.log(`Device: ${DEVICE_HOST}\n`);
  console.log("1. List schedules");
  console.log("2. Add schedule");
  console.log("3. Edit schedule");
  console.log("4. Remove schedule");
  console.log("5. Export schedules");
  console.log("6. Import schedules");
  console.log("7. Reset to defaults");
  console.log("0. Exit\n");

  const choice = await question("Choice: ");

  switch (choice) {
    case "1":
      await listSchedules();
      break;
    case "2":
      await addSchedule();
      break;
    case "3":
      await editSchedule();
      break;
    case "4":
      await removeSchedule();
      break;
    case "5":
      await exportSchedules();
      break;
    case "6":
      await importSchedules();
      break;
    case "7":
      await resetToDefaults();
      break;
    case "0":
      console.log("Goodbye!");
      rl.close();
      return;
    default:
      console.log("Invalid choice.");
  }

  await mainMenu();
}

// Handle command line arguments for non-interactive mode
async function handleArgs(): Promise<boolean> {
  const args = process.argv.slice(2);
  if (args.length === 0) return false;

  const command = args[0];
  const arg = args[1]; // Optional file path for export/import

  switch (command) {
    case "list":
      await listSchedules();
      return true;
    case "add":
      await addSchedule();
      return true;
    case "edit":
      await editSchedule();
      return true;
    case "remove":
      await removeSchedule();
      return true;
    case "export":
      await exportSchedules(arg);
      return true;
    case "import":
      await importSchedules(arg);
      return true;
    case "import-defaults":
      await setSchedules(DEFAULT_SCHEDULES);
      console.log("Default schedules imported successfully!");
      return true;
    case "reset":
      await resetToDefaults();
      return true;
    default:
      console.log(`Unknown command: ${command}`);
      console.log("Available commands: list, add, edit, remove, export [file], import [file], import-defaults, reset");
      return true;
  }
}

async function main(): Promise<void> {
  try {
    const handled = await handleArgs();
    if (handled) {
      rl.close();
      return;
    }
    await mainMenu();
  } catch (error) {
    console.error("Error:", error);
    rl.close();
    process.exit(1);
  }
}

main();
