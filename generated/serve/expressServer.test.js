var request = require("supertest");

describe("Test express server", () => {
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