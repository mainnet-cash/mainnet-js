var request = require("supertest");
const { spawn } = require("child_process");
var readline = require('readline');

describe("Test express server", () => {
  it("Should spawn a server and get a ready response", async () => {
    const proc = spawn(`node`, ['serve.js'], {
      shell: false,
      cwd: process.cwd(),
    });

    try {
      let stack = "";
      readline.createInterface({
        input: proc.stdout,
        terminal: false
      }).on('line', line => {
        stack += line + "\n";
        if (line.indexOf('MODULE_NOT_FOUND') >= 0) {
          throw new Error("Failed to start up server\n" + stack);
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 5000));
      let resp;
      resp = await request("http://localhost:3000")
        .get("/ready");
      expect(resp.body).toStrictEqual({status:"okay"});

      resp = await request("http://localhost:3000")
        .post("/util/convert").send({
          "value": 1,
          "from": "bch",
          "to": "bch"
        });
      expect(resp.text).toStrictEqual("1");
    } finally {
      process.kill(proc.pid);
    }
  });

  it("Should spawn a cluster and get a ready response", async () => {
    const proc = spawn(`node`, ['cluster.js'], {
      shell: false,
      cwd: process.cwd(),
      env: { ...process.env, WORKERS: '2' }
    });

    try {
      let stack = "";
      readline.createInterface({
        input: proc.stdout,
        terminal: false
      }).on('line', line => {
        stack += line + "\n";
        if (line.indexOf('MODULE_NOT_FOUND') >= 0) {
          throw new Error("Failed to start up cluster\n" + stack);
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 5000));
      let resp;
      resp = await request("http://localhost:3000")
        .get("/ready");
      expect(resp.body).toStrictEqual({status:"okay"});

      resp = await request("http://localhost:3000")
        .post("/util/convert").send({
          "value": 1,
          "from": "bch",
          "to": "bch"
        });
      expect(resp.text).toStrictEqual("1");
    } finally {
      process.kill(proc.pid);
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