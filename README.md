# Smart Home Solutions with Shelly

A collection of smart home automation solutions built with Shelly devices. This repository contains various scripts and configurations I use to automate my home.

## Current Solutions

### Boiler Control System

An intelligent heating control system that includes:

- **Thermostat Script**: Controls the boiler based on temperature readings and configurable parameters
- **MQTT Integration**: Exposes the thermostat through MQTT, compatible with HomeBridge's MQTTThing plugin for HomeKit control

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

## This repository is a Shelly Forge project

For more detailed information about Shelly Forge, please visit:
[Shelly Forge Documentation](https://github.com/mslavov/shelly-forge)

## Contributing

Feel free to submit issues and enhancement requests!
