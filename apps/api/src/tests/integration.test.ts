import request from "supertest";
import app from "../server";
describe("TAPZEN API baseline", () => {
  it("health endpoint responds", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
  it("protects organization APIs without a bearer token", async () => {
    const response = await request(app).get("/api/devices");
    expect(response.status).toBe(401);
  });
  it("protects analytics without a bearer token", async () => {
    const response = await request(app).get("/api/analytics/summary");
    expect(response.status).toBe(401);
  });
  it("protects AI chat without a bearer token", async () => {
    const response = await request(app).post("/api/ai/chat").send({ messages: [{ role: "user", content: "Привет" }] });
    expect(response.status).toBe(401);
  });
  it("protects AI business insights without a bearer token", async () => {
    const response = await request(app).post("/api/ai/business-insights").send({ period: "week" });
    expect(response.status).toBe(401);
  });
  it("rejects invalid registration payloads", async () => {
    const response = await request(app).post("/api/auth/register").send({ email: "bad", password: "x" });
    expect(response.status).toBe(400);
  });
});
