# NDJSON Monitor Interface

This document describes the machine-readable interface for the X4 Savegame Monitor. 
This interface is designed for "Launcher" applications that wrap the monitor process and need to display its status in a UI.

## Invocation

To enable the machine-readable output, pass the `--json` flag to the monitor script. A typical invocation execution flow:

```bash
php bin/php/run-monitor.php --json
```

## Protocol

The output stream is **NDJSON** (Newline Delimited JSON).
- Each line printed to `STDOUT` is a valid, self-contained JSON object.
- Lines are separated by the system's `PHP_EOL` (usually `\n` or `\r\n`).
- The stream remains open as long as the monitor is running.

## Message Schema

Every message has a common structure. The `type` field determines how to handle the rest of the object.

```json
{
  "type": "event|tick|log|error",
  "name": "EVENT_NAME",    // Only for type="event"
  "payload": {},           // Only for type="event", optional
  "message": "Some text",  // Only for type="log" or "error"
  "counter": 123           // Only for type="tick"
}
```

## Message Types

### 1. Heartbeat (`tick`)

Sent periodically (configured by tick interval) to indicate the process is alive.

```json
{ "type": "tick", "counter": 42 }
```

> **Recommendation**: These should be filtered out by the UI unless visualizing a "heartbeat" indicator.

### 2. Events (`event`)

Structured notifications of state changes. These are the most important messages for updating the UI state.

#### `MONITOR_STARTED`
Emitted immediately when the monitor initializes.

```json
{ "type": "event", "name": "MONITOR_STARTED", "payload": [] }
```

#### `SAVE_DETECTED`
Emitted when the monitor finds the most recent savegame file.

```json
{ 
  "type": "event", 
  "name": "SAVE_DETECTED", 
  "payload": {
    "name": "quicksave",
    "path": "/path/to/quicksave.xml.gz"
  } 
}
```

#### `SAVE_PARSING_STARTED`
Emitted when the monitor decides to process a save (it hasn't been parsed before).

```json
{ 
  "type": "event", 
  "name": "SAVE_PARSING_STARTED", 
  "payload": {
    "name": "quicksave"
  } 
}
```

#### `SAVE_UNZIPPING`
Emitted just before the unzipping process begins.

```json
{ "type": "event", "name": "SAVE_UNZIPPING", "payload": [] }
```

#### `SAVE_EXTRACTING`
Emitted when unzipping is done and XML extraction begins.

```json
{ "type": "event", "name": "SAVE_EXTRACTING", "payload": [] }
```

#### `SAVE_PARSING_COMPLETE`
Emitted when the entire process is finished for the current save.

```json
{ "type": "event", "name": "SAVE_PARSING_COMPLETE", "payload": [] }
```

### 3. Logging (`log`)

Detailed text logs. Only emitted if `X4_MONITOR_LOGGING` (or `--logging`) is enabled in the configuration.

```json
{ 
  "type": "log", 
  "message": "Updates are run every [5s].",
  "header": false // Optional, true if it's a section header
}
```

### 4. Errors (`error`)

Emitted when a fatal exception occurs. The process will likely terminate after this.

```json
{
  "type": "error",
  "message": "Something went wrong",
  "code": 123,
  "trace": "#0 /path/to/file.php(10): ..."
}
```

## Example Stream

Here is an example of what the stream looks like when a new savegame is detected and processed:

```json
{"type":"event","name":"MONITOR_STARTED","payload":[]}
{"type":"log","message":"--------------------------------------------","header":true}
{"type":"log","message":"X4 Savegame unpacker","header":true}
{"type":"log","message":"--------------------------------------------","header":true}
{"type":"tick","counter":1}
{"type":"log","message":"--------------------------------------------","header":true}
{"type":"log","message":"Handling tick [1]","header":true}
{"type":"log","message":"--------------------------------------------","header":true}
{"type":"log","message":"Latest savegame is [save_001]."}
{"type":"event","name":"SAVE_DETECTED","payload":{"name":"save_001","path":"..."}}
{"type":"log","message":"> Parsing."}
{"type":"event","name":"SAVE_PARSING_STARTED","payload":{"name":"save_001"}}
{"type":"log","message":"...Unzipping."}
{"type":"event","name":"SAVE_UNZIPPING","payload":[]}
{"type":"log","message":"...Extracting and writing files."}
{"type":"event","name":"SAVE_EXTRACTING","payload":[]}
{"type":"log","message":"...Done."}
{"type":"event","name":"SAVE_PARSING_COMPLETE","payload":[]}
{"type":"tick","counter":2}
```
