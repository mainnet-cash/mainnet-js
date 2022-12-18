import { getRuntimePlatform } from "./getRuntimePlatform.js";

import { default as ES } from "eventsource";

let EventSource;
if (getRuntimePlatform() != "node") {
  EventSource = globalThis.EventSource;
} else {
  EventSource = ES;
}

export default EventSource;
