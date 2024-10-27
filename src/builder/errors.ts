export class BuilderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildError";
  }
}

export class BuilderLocateError extends BuilderError {
  constructor(message: string) {
    super(message);
    this.name = "BuildLocateError";
  }
}

export class BuilderTimeoutError extends BuilderError {
  constructor(message: string) {
    super(message);
    this.name = "BuildTimeoutError";
  }
}
