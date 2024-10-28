{pkgs, ...}: let
  name = "cliquet";
  version = "1.0.0";

  bundle = pkgs.stdenvNoCC.mkDerivation {
    inherit version;
    name = "${name}-bundle";
    src = ../.;
    buildInputs = with pkgs; [bun];
    buildPhase = ''
      cp ${../dist/main.js} dist/main.js
    '';
    installPhase = ''
      cp dist/main.js $out
    '';
  };
in
  pkgs.writeShellScriptBin "cliquet" ''
    ${pkgs.lib.getExe pkgs.bun} ${bundle} "$@"
  ''
