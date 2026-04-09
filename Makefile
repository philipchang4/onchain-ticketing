.PHONY: install build test deploy dev lint clean

install:
	npm install
	cd contracts && forge install

build:
	cd contracts && forge build
	npm run build

test:
	cd contracts && forge test -vvv

deploy-sepolia:
	cd contracts && forge script script/Deploy.s.sol:Deploy \
		--rpc-url $(BASE_SEPOLIA_RPC_URL) \
		--broadcast \
		--verify

dev:
	npm run dev

lint:
	npm run lint

clean:
	cd contracts && forge clean
	rm -rf .next node_modules
