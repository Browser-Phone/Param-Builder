{
  description = "Parameterized HTTP Nix build server";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {inherit system;};
    in {
      packages = rec {
        default = docker;
        server = import ./nix/server.nix {inherit pkgs;};
        docker = import ./nix/docker.nix {inherit pkgs server;};
      };
      devShells.default = pkgs.mkShell {
        packages = with pkgs; [
          deno
          podman-compose
        ];
      };
      apps.default = flake-utils.lib.mkApp {
        name = "cliquer-run";
        drv = pkgs.writeShellScriptBin "cliquer-run" "make run";
      };
    });
}
