import { spawn } from "child_process";

export function getNixSystem(
  nixCmd: string = "nix-instantiate",
): Promise<string> {
  return new Promise((resolve, reject) => {
    const nixProcess = spawn(nixCmd, [
      "--eval",
      "-E",
      "builtins.currentSystem",
    ]);

    let output = "";
    nixProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    nixProcess.on("close", (code) => {
      if (code === 0) {
        const result = /"(.*)"/.exec(output)?.[1]!;
        console.log("Detected Nix system:", result);
        resolve(result);
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    nixProcess.on("error", (err) => {
      reject(err);
    });
  });
}
