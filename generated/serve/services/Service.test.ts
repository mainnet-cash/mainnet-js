import { getServer } from "../generated/serve/index";
var request = require("supertest");

var app;

describe("Post Endpoints", () => {
  beforeAll(async function () {
    app = await getServer().launch();
  });
  afterEach(function () {
    app.close();
  });

  /**
   * ready
   */
  it("Should return true from the readiness indicator", async () => {
    const resp = await request(app).get("/ready").send();
    expect(resp.statusCode).toEqual(200);
    expect(resp.body.status).toEqual("okay");
  });

  /**
   * redirect to docs
   */
  it("Should redirect on get at root", async () => {
    const resp = await request(app).get("/").send();
    expect(resp.statusCode).toEqual(301);
  });

  /**
   * redirect to docs
   */
  it("Should timeout", async () => {
    const resp = await request(app).get("/timeout").send();
    expect(resp.statusCode).toEqual(503);
  });

  /**
   * serve docs
   */
  it("Should return swagger doc UI from root url", async () => {
    const resp = await request(app).get("/api-docs/").send();
    expect(resp.statusCode).toEqual(200);
    expect(resp.text.slice(0, 391)).toEqual(
      `\n<!-- HTML for static distribution bundle build -->\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Swagger UI</title>\n  <link rel="stylesheet" type="text/css" href="./swagger-ui.css" >\n  <link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32" /><link rel="icon" type="image/png" href="./favicon-16x16.png" sizes="16x16" />\n  \n  <style>\n    html\n`
    );
  });
});
