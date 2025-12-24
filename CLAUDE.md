# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Shelly Forge project containing smart home automation scripts for Shelly IoT devices. Scripts are written in TypeScript and compiled to mJS (a JavaScript subset) that runs directly on Shelly device firmware.

## Common Commands

```bash
npm run build          # Build all solutions
npm run dev            # Development mode with live reload and logs
npm run deploy         # Deploy built script to device
npm run watch:logs     # Stream device logs

# Shelly Forge CLI (via npx or npm scripts)
shelly-forge discover  # Find Shelly devices on network
shelly-forge create    # Create new script template
shelly-forge build     # Compile TypeScript to mJS
shelly-forge deploy    # Upload script to device
shelly-forge debug on/off <script>  # Toggle debug mode
shelly-forge logs <script>          # Stream logs
```

## Architecture

### Solution Configuration

`solutions.config.json` maps solution names to their source files and target devices. Device hostnames use environment variable placeholders (e.g., `${BOILER_HOSTNAME}`). Set actual IPs in `.env`.

### Directory Structure

- `src/<solution>/` - Each solution has its own directory
- `src/shared/` - Shared utilities (e.g., BTHomeDecoder for BLE parsing)
- `dist/` - Compiled output

### Shared Components

- **BTHomeDecoder** (`src/shared/BTHomeDecoder.ts`): Decodes BLE advertisements from BTHome-compatible sensors (door, window, motion, temperature, etc.)
- **RemoteShelly** (`src/alarm/RemoteShelly.ts`): HTTP RPC client for calling APIs on other Shelly devices

## Shelly Script Constraints

Scripts run on mJS with these limitations:

1. **No deep callback nesting** - Device will crash. Extract callbacks to named functions.
2. **Non-blocking only** - No loops, blocking operations. Use `Timer.set()` for periodic tasks.
3. **Limited resources** - Keep operations minimal and efficient.
4. **Use KVS for state** - Persist state via `Shelly.call("KVS.Get/Set", ...)`.

## Development Workflow

1. Create design doc in `docs/<solution-name>.md` before implementation
2. Configure device hostname in `.env`
3. Set `SCRIPT_NAME` in `.env` for the target script
4. Run `npm run dev` for live development
5. Scripts auto-reload on file changes

## TypeScript

- Use types from `node_modules/shelly-forge/types/**/*`
- Define interfaces for all data structures
- Strict mode is disabled in tsconfig
