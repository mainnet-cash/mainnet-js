// Shared Express server for all REST API test files.
// Module cache ensures the server launches only once across all test files.
import server from "./index.js";

const app = await server.getServer().launch();
export default app;
