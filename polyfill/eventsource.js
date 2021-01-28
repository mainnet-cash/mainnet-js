if (typeof window === "object") {
  module.exports = window.EventSource;
} else {
  var EventSource = require("eventsource/");
  module.exports = EventSource;
}
