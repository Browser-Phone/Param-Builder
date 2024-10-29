{pkgs, ...}: let
  bundle = ../dist/server.js;
in
  pkgs.writeShellScriptBin "cliquet" ''
    ${pkgs.lib.getExe pkgs.bun} ${bundle} "$@"
  ''
