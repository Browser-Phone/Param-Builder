import { describe, it } from "@jest/globals";
import supertest from "supertest";
import app from "../src/api/app";

const randomPort = () => Math.floor(Math.random() * 1000) + 8000;

describe("POST /build", () => {
  it("should begin build", async () => {
    const port = randomPort();

    await supertest(app)
      .post("/build")
      .query({
        target: "github:browser-phone/text-file-build",
        output: "default",
      })
      .send({ callback: `http://localhost:${port}` })
      .expect(201);
  });
});
