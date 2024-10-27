import { spawn } from "node:child_process";
import {
  BuilderError,
  BuilderLocateError,
  BuilderTimeoutError,
} from "@/builder/errors";
import { z } from "zod";

const BuildOutputSchema = z.object({
  drvPath: z.string(),
  outputs: z.record(z.string(), z.string()),
});

const baseBuildOptions = [
  "--no-link", // Do not create symlinks to the build
  "--json", // Get json output
];

export interface BuilderOptions {
  nixCmd: string;
  nixArgs: string[];
  timeout?: number;
}

export default class Builder {
  #logs: string[] = [];
  private options: BuilderOptions = { nixCmd: "nix", nixArgs: [] };

  constructor(
    private target: string,
    private output: string,
    private callback: (output: string) => void,
    options: Partial<BuilderOptions> = {},
  ) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get the logs of the build process.
   * @returns {string} The logs of the build process
   * @public
   * @memberof Builder
   **/
  public logs = (): string => this.#logs.join("");

  /**
   * Spawns a nix build process and returns a promise that resolves with the
   * output of the build.
   * @returns {Promise<string>} A promise that resolves with the output of the build
   * @private
   * @memberof Builder
   **/
  private spawn = (): Promise<string> =>
    new Promise((resolve, reject) => {
      const errBuffer: string[] = [];

      // Construct the full command as an array
      const commandArray = [
        "build",
        `${this.target}#${this.output}`,
        ...baseBuildOptions,
        ...this.options.nixArgs,
      ];

      // Spawn the nix build process
      console.log(
        "Executing command:",
        [this.options.nixCmd, ...commandArray].join(" "),
      );
      const builder = spawn(this.options.nixCmd, commandArray, {
        timeout: this.options.timeout,
      });

      // Pipe the output of the build process to the logs
      builder.stdout.on("data", (data) => {
        console.log(data.toString());
        this.#logs.push(data);
      });

      // If the build process fails, accumulate the error
      builder.stderr.on("data", (data) => {
        errBuffer.push(data);
      });

      builder.on("close", (code) => {
        console.log("Nix build process exited with code", code);

        switch (code) {
          case null:
            reject(new BuilderTimeoutError("Spawned process timed out"));
            return;
          case 0:
            try {
              const output = BuildOutputSchema.safeParse(
                JSON.parse(this.logs())[0],
              );
              resolve(output.data!.outputs.out);
            } catch (e) {
              if (e instanceof SyntaxError) {
                reject(new BuilderError("Invalid JSON output"));
              }
              if (e instanceof z.ZodError) {
                reject(
                  new BuilderError(
                    e.errors.map((err) => err.message).join("\n"),
                  ),
                );
              }
            }
            break;
          default:
            if (/interrupted by the user/.test(errBuffer.join("\n"))) {
              reject(
                new BuilderTimeoutError("Build was interrupted by the user"),
              );
              return;
            }
            reject(
              new BuilderError(
                `Nix build failed with code ${code}. ${errBuffer.join("\n")}`,
              ),
            );
            return;
        }
      });
    });

  /**
   * Runs the nix build process and calls the callback with the output of the build.
   * @returns {Promise<void>} A promise that resolves when the build is complete
   * @public
   * @memberof Builder
   **/
  public build = async (): Promise<void> => {
    const output = await this.spawn();
    this.callback(output);
  };
}
