var request = require("supertest");
const { spawn } = require("child_process");
var readline = require('readline');

async function healthCheck() {
  let timeout, interval;

  return await Promise.race([
    new Promise((resolve) => {
      interval = setInterval(async () => {
        try {
          let resp;
          resp = await request("http://localhost:3000")
            .get("/ready");
          const check1 = resp.status === 200 && resp.body.status === "okay";

          resp = await request("http://localhost:3000")
            .post("/util/convert").send({
              "value": 1,
              "from": "bch",
              "to": "bch"
            });
          const check2 = resp.text === "1";

          if (check1 && check2) {
            clearInterval(interval);
            clearTimeout(timeout);
            resolve();
          }
        } catch {}
      }, 1000);
    }),
    new Promise((_resolve, reject) => {
      timeout = setTimeout(() => {
        clearInterval(interval);
        clearTimeout(timeout);
        reject();
      }, 30000);
    })
  ]);
}

describe("Test express server", () => {
  it("Should spawn a server and get a ready response", async () => {
    const proc = spawn(`node`, ['serve.js'], {
      shell: false,
      cwd: process.cwd(),
    });

    let interface;

    try {
      let stack = "";
      interface = readline.createInterface({
        input: proc.stdout,
        terminal: false
      }).on('line', line => {
        stack += line + "\n";
        if (line.indexOf('MODULE_NOT_FOUND') >= 0) {
          throw new Error("Failed to start up server\n" + stack);
        }
      });

      await healthCheck();

    } finally {
      interface.close();
      process.kill(proc.pid);
    }
  });

  it("Should spawn a cluster and get a ready response", async () => {
    const proc = spawn(`node`, ['cluster.js'], {
      shell: false,
      cwd: process.cwd(),
      env: { ...process.env, WORKERS: '2' }
    });

    let interface;

    try {
      let stack = "";
      interface = readline.createInterface({
        input: proc.stdout,
        terminal: false
      }).on('line', line => {
        stack += line + "\n";
        if (line.indexOf('MODULE_NOT_FOUND') >= 0) {
          throw new Error("Failed to start up cluster\n" + stack);
        }
      });

      await healthCheck();

    } finally {
      interface.close();
      proc.kill();
    }
  });

  it("Should return 401 and require authorization header if API_KEY env var is set", async () => {
    process.env['API_KEY'] = "test";
    const config = require("./config");

    const server = require("./").getServer();
    const app = await server.launch();

    const resp = await request(app)
      .post("/util/convert")
      .send({
        value: 1,
        from: "bch",
        to: "usd"
      });

    expect(resp.statusCode).toEqual(401);
    expect(resp.body.message).toEqual("Authorization header required");

    await server.close();
  });

  it("Should return 403 if wrong token is supplied", async () => {
    process.env['API_KEY'] = "test";
    const config = require("./config");

    const server = require("./").getServer();
    const app = await server.launch();

    const resp = await request(app)
      .post("/util/convert")
      .set("Authorization", "bearer " + "wrong")
      .send({
        value: 1,
        from: "bch",
        to: "usd"
      });

    expect(resp.statusCode).toEqual(403);
    expect(resp.body.message).toEqual("forbidden");

    await server.close();
  });

  it("Should process request if correct token is supplied", async () => {
    process.env['API_KEY'] = "test";
    const config = require("./config");

    const server = require("./").getServer();
    const app = await server.launch();

    const resp = await request(app)
      .post("/util/convert")
      .set("Authorization", "bearer " + "test")
      .send({
        value: 1,
        from: "bch",
        to: "usd"
      });

    expect(resp.statusCode).toEqual(200);
    expect(Number(resp.text)).toBeGreaterThan(1);

    await server.close();
  });

  it("Should not require authorization without API_KEY env var", async () => {
    const config = require("./config");
    config.API_KEY = undefined;

    const server = require("./").getServer();
    const app = await server.launch();

    const resp = await request(app)
      .post("/util/convert")
      .send({
        value: 1,
        from: "bch",
        to: "usd"
      });
    expect(resp.statusCode).toEqual(200);
    expect(Number(resp.text)).toBeGreaterThan(1);

    await server.close();
  });
});