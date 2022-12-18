import app from "./index.js";
try {
  app.startServer();
} catch (error) {
  console.trace(error);
}
