{pkgs, ...}: let
  name = "cliquet";
  version = "1.0.0";

  node-modules = pkgs.stdenvNoCC.mkDerivation {
    inherit version;
    name = "${name}-node-modules";
    src = ../.;
    dontFixup = true;
    buildInputs = [pkgs.bun];
    buildPhase = "bun i";
    installPhase = "cp -r node_modules $out";
    outputHashAlgo = "sha256";
    outputHashMode = "recursive";
    outputHash = "sha256-SM2cahtyTX+xwvzoq+cf2r0KcPls5IvHCvu+aSt1lY4=";
  };

  bundle = pkgs.stdenvNoCC.mkDerivation {
    inherit version;
    name = "${name}-bundle";
    src = ../.;
    buildInputs = with pkgs; [bun];
    buildPhase = ''
      cp -r ${node-modules} node_modules
      bun run build
    '';
    installPhase = ''
      cp dist/main.js $out
    '';
  };
in
  pkgs.writeShellScriptBin "cliquet" ''
    ${pkgs.lib.getExe pkgs.bun} ${bundle} "$@"
  ''
