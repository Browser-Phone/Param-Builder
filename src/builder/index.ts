import { spawn } from "node:child_process";
import { BuilderError, BuilderTimeoutError } from "@/builder/errors";
import { z } from "zod";

const BuildOutputSchema = z.object({
  drvPath: z.string(),
  outputs: z.record(z.string(), z.string()),
});

export type BuildOutput = z.infer<typeof BuildOutputSchema>;

export type BuildInputs = {
  [key: string]: string | number | boolean | BuildInputs;
};

export interface BuilderOptions {
  nixCmd: string;
  nixArgs: string[];
  timeout?: number;
}

interface BuilderConstructorParams {
  target: string;
  output?: string;
  inputs?: BuildInputs;
  callback: (output: string) => void;
  system?: string;
  namespace?: string;
  options?: Partial<BuilderOptions>;
}

export default class Builder {
  private options: BuilderOptions = { nixCmd: "nix", nixArgs: [] };
  private target: string;
  private output: string;
  private inputs: BuildInputs;
  private callback: (output: string) => void;
  private system: string;
  private namespace: string;
  private derivationOutput: string | null = null;
  #logs: string[] = [];

  constructor({
    target,
    output = "default",
    inputs = {},
    callback,
    system = process.env.NIX_SYSTEM || "x86_64-linux",
    namespace = "cliquers",
    options = {},
  }: BuilderConstructorParams) {
    this.options = { ...this.options, ...options };
    this.target = target;
    this.output = output;
    this.inputs = inputs;
    this.callback = callback;
    this.system = system;
    this.namespace = namespace;
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
      const expression =
        `(builtins.getFlake "${this.target}")` +
        `.outputs.${this.namespace}.${this.system}.${this.output} ` +
        `(builtins.fromJSON ''${JSON.stringify(this.inputs)}'')`;
      const commandArray = [
        "build",
        "--no-link",
        "--impure",
        "--json",
        ...this.options.nixArgs,
        "--expr",
        expression,
      ];
      console.log("Command array:", commandArray);

      // Spawn the nix build process
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

      // Handle the exit code of the build process
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
              this.derivationOutput = output.data!.outputs.out;
              resolve(this.derivationOutput);
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

  /**
   * Runs the nix garbage collection process.
   * @returns {Promise<void>} A promise that resolves when the garbage
   * collection
   * @public
   * @memberof Builder
   **/
  public cleanup = (): Promise<void> =>
    new Promise((reject, resolve) => {
      if (!this.derivationOutput) {
        return Promise.resolve();
      } else {
        const proc = spawn(this.options.nixCmd, [
          "store",
          "--delete",
          this.derivationOutput,
        ]);

        proc.stderr.on("data", console.error);

        proc.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject();
          }
        });
      }
    });
}
