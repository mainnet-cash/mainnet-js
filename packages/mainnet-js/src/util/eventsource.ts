import { getRuntimePlatform } from "./getRuntimePlatform";

import {default as ES} from "eventsource"

let EventSource;
if (getRuntimePlatform() != "node") {
  EventSource = globalThis.EventSource;
} else {
  EventSource = ES;
}

export default EventSource;
