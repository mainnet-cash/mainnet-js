import config from './config.js';
import cluster from 'cluster';
import app from "./index.js";


if (cluster.isMaster) {
    console.log("main process");
    // Fork workers.
    const numWorkers = config.WORKERS;
    for (var i = 0; i < numWorkers; i++) {
        cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died, ${code} ${signal}`);
        cluster.fork();
    });
}
else {
    console.log(`Worker ${process.pid} started`);
    app.startServer()
}
