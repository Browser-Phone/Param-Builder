import express from "express";
import { StatusCodes } from "http-status-codes";
import * as fs from "fs";

const app = express();

app.post("/upload", (req, res) => {
  console.log("Received file upload request");
  const fileName = "uploaded.bin";
  const writeStream = fs.createWriteStream(fileName);

  req.pipe(writeStream);

  req.on("end", () => {
    res.send("File uploaded successfully");
  });

  writeStream.on("error", (err: string) => {
    console.error(err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Error saving file");
  });
});

const host = process.env.DOCKER === "true" ? "0.0.0.0" : "localhost";

app.listen(3000, host, () => {
  console.log("Server is running on http://localhost:3000");
});
