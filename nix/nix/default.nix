# Credit: https://github.com/nix-community/docker-nixpkgs/blob/master/images/nix/
{pkgs}: let
  image = pkgs.dockerTools.buildImageWithNixDb {
    inherit (pkgs.nix) name;

    copyToRoot = [
      (pkgs.buildEnv {
        name = "root";
        paths = with pkgs; [
          # Nix itself
          ./root
          nix

          # Runtime dependencies of nix
          cacert
          coreutils
          bash
          gitMinimal
          gnutar
          gzip
          openssh
          xz
        ];
        pathsToLink = ["/bin" "/etc"];
      })
      (pkgs.writeTextDir "etc/nix/nix.conf" "experimental-features = nix-command flakes")
    ];

    extraCommands = ''
      # for /usr/bin/env
      mkdir usr
      ln -s ../bin usr/bin

      # make sure /tmp exists
      mkdir -m 1777 tmp

      # need a HOME
      mkdir -vp root
    '';

    config = {
      Env = [
        "ENV=/etc/profile.d/nix.sh"
        "BASH_ENV=/etc/profile.d/nix.sh"
        "NIX_BUILD_SHELL=/bin/bash"
        # "NIX_PATH=nixpkgs=${./fake_nixpkgs}"
        "PAGER=cat"
        "PATH=/usr/bin:/bin"
        "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
        "USER=root"
      ];
    };
  };
in
  image // {meta = pkgs.nix.meta // image.meta;}
