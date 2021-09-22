try {
  const app = require("./index");
  app.startServer();
} catch (error) {
  console.warn(error);
}