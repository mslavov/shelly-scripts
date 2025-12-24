# Smart Home Solutions with Shelly

A collection of smart home automation solutions built with Shelly devices. This
repository contains various scripts and configurations I use to automate my
home.

## Current Solutions

### Boiler Control System

An intelligent heating control system that includes:

- **Thermostat Script**: Controls the boiler based on temperature readings and
  configurable parameters
- **MQTT Integration**: Exposes the thermostat through MQTT, compatible with
  HomeBridge's MQTTThing plugin for HomeKit control

### Alarm System Extension

A sophisticated extension for Paradox security systems using Shelly devices and
BLE sensors:

- **Front Door Monitor**: Single-sensor solution running directly on a Shelly
  device
- **Window Monitor**: Multi-sensor solution running on a Shelly BLU Gateway
- **BTHome Integration**: Decodes BLE advertisements from various sensors
- **Remote Control**: Manages Shelly devices through RPC calls

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy the .env.example file to .env and set the appropriate values:

```bash
cp .env.example .env
```

3. Start development:

```bash
npm run dev
```

## Project Structure

```
├── src/             # Source code directory
│   ├── boiler/      # Boiler control solution
│   │   ├── thermostat.ts    # Thermostat logic
│   │   ├── mqtt.ts          # MQTT integration
│   │   ├── config.ts        # Configuration
│   │   └── store.ts         # State management
│   ├── alarm/       # Alarm system extension
│   │   ├── frontDoor.ts     # Single sensor monitor
│   │   ├── windows.ts       # Multi-sensor monitor
│   │   └── RemoteShelly.ts  # RPC utility
│   └── shared/      # Shared utilities
│       └── BTHomeDecoder.ts # BLE packet decoder
├── dist/            # Compiled output
├── solutions.config.json # Configuration for solutions
└── node_modules/    # Dependencies
```

## Solutions

### Boiler Control System

The boiler control system consists of two main components:

#### 1. Thermostat Script

A smart thermostat implementation that:

- Controls boiler based on temperature readings
- Supports configurable temperature thresholds
- Implements hysteresis to prevent rapid cycling
- Manages different heating modes (auto, manual, off)

Example configuration:

```typescript
{
  targetTemperature: 21,
  hysteresis: 0.5,
  mode: "auto"
}
```

#### 2. MQTT Integration

Enables HomeKit integration through HomeBridge:

- Exposes thermostat controls via MQTT
- Compatible with MQTTThing HomeBridge plugin
- Supports temperature reading/setting
- Enables mode switching through HomeKit

### Alarm System Extension

The alarm system extension integrates Shelly devices with a Paradox security
system:

#### 1. Front Door Monitor (Single Sensor)

A dedicated script running on a Shelly device that:

- Monitors a single BLE door sensor
- Controls a local switch connected to the alarm circuit
- Implements packet deduplication
- Provides real-time door state monitoring

#### 2. Window Monitor (Multi-Sensor)

A comprehensive solution running on a Shelly BLU Gateway that:

- Monitors multiple window/door sensors simultaneously
- Maintains a state map of all configured sensors
- Controls a single remote switch based on collective state
- Only closes circuit when all monitored points are secure

#### 3. Supporting Components

- **BTHomeDecoder**: Decodes BLE advertisements in BTHome format
- **RemoteShelly**: Utility class for making RPC calls to Shelly devices

## This repository is a Shelly Forge project

For more detailed information about Shelly Forge, please visit:
[Shelly Forge Documentation](https://github.com/mslavov/shelly-forge)

## Contributing

Feel free to submit issues and enhancement requests!
