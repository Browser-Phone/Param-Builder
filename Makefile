all: image load

run: image
	podman image rm -f localhost/cliquer:latest
	podman load -i ./image
	podman-compose up --force-recreate

load: image
	podman load -i ./image

image:
	nix build '.#docker' -o image

test:
	bun run test

clean:
	rm -rf result
	rm -rf image

.PHONY: all run clean load

