import { getRuntimePlatform } from "./getRuntimePlatform";

let EventSource;
if (getRuntimePlatform() != "node") {
  EventSource = globalThis.EventSource;
} else {
  EventSource = require("eventsource/");
}

export default EventSource;
