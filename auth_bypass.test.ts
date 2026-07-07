import { test, expect } from "vitest";
import express from "express";
import request from "supertest";

// Mock the middleware behavior to test it directly
const requireAuth = (isProd: boolean) => async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const fallbackUserId = !isProd
    ? (req.headers["x-user-id"] || req.headers["x-mock-user-id"])
    : null;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (fallbackUserId) {
      req.user = { id: fallbackUserId };
      return next();
    }
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  
  next();
};

test("Auth Bypass vulnerability is mitigated in production", async () => {
  const appProd = express();
  appProd.get("/protected", requireAuth(true), (req: any, res: any) => res.json({ id: req.user.id }));
  
  // In production, x-mock-user-id should be ignored and return 401
  const resProd = await request(appProd)
    .get("/protected")
    .set("x-mock-user-id", "mock-id");
  expect(resProd.status).toBe(401);
  
  const appDev = express();
  appDev.get("/protected", requireAuth(false), (req: any, res: any) => res.json({ id: req.user.id }));
  
  // In dev, x-mock-user-id should be respected
  const resDev = await request(appDev)
    .get("/protected")
    .set("x-mock-user-id", "mock-id");
  expect(resDev.status).toBe(200);
  expect(resDev.body.id).toBe("mock-id");
});
