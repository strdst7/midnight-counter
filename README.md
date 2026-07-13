# PrivateCounter

> A privacy-preserving counter on the Midnight Network: anyone can see the tally, but each increment is authorized by a secret key that is never revealed on-chain.

## Contract Address

| Network  | Address                                                            |
|----------|--------------------------------------------------------------------|
| Preview  | `87b1372fbae16fc4ec5ac3387c904f5b0d8969178dd70c7c8ff003adef373934` |
| Preprod  | _not deployed_                                                     |

Deployed on 2026-07-13 to the Midnight **Preview** testnet.
Deployer address: `mn_addr_preview170v075ylfmgraertdzzzu3c3wendmx5gra87j2fw3rh5xcw2plrs7h7xyf`

<!-- The address is printed by `npm run deploy -- --network preview` as
     "Contract Address: ..." and saved to .midnight-state.json. -->

## What This Does

`PrivateCounter` is a smart contract written in [Compact](https://docs.midnight.network/compact),
Midnight's language for zero-knowledge smart contracts. It keeps a public running
count together with an *anonymous commitment* to whoever last changed it.

- Anyone can call `increment(amount)` to add to the public count.
- Each call records a one-way cryptographic commitment (`lastActor`) derived from
  the caller's **secret key**. This proves an authorized party performed the
  increment, **without revealing who** or leaking the key.
- Anyone can call `get()` to read the current count.

It is a deliberately small contract whose purpose is to demonstrate Midnight's
"private by default" model end-to-end: writing private witnesses, deliberately
disclosing only what is safe, compiling to zero-knowledge circuits, testing the
logic off-chain, and deploying to a public testnet.

## Privacy Model

- **PUBLIC (on-chain, visible to anyone via the indexer/explorer):**
  - `count` — total number of increments (a `Counter`).
  - `lastActor` — a 32-byte hash commitment to the last incrementer's identity.
    Being a one-way hash, it cannot be reversed to recover the secret key.
  - The `amount` passed to `increment` (deliberately disclosed so it can update
    public state).

- **PRIVATE (never on-chain, never in the zero-knowledge proof, never leaves your machine):**
  - `localSecretKey()` — the caller's 32-byte secret key, supplied by the witness
    (the TypeScript host) at runtime. It is the private circuit input.

- **What the user PROVES without revealing:**
  - That they know a secret key whose commitment equals the value recorded on
    chain — i.e. that they legitimately participated — while remaining anonymous.
    The secret is only ever disclosed in *hashed* (committed) form via
    `disclose(actorCommitment(_sk))`, never in the clear.

## Tech Stack

- **Midnight Network** — privacy-preserving blockchain (Preview / Preprod testnets)
- **Compact** — smart-contract language (`pragma language_version 0.23`, compiler 0.31.1)
- **Node.js v22**
- **Docker** — runs the Midnight proof server (generates zero-knowledge proofs)
- **TypeScript + tsx** — deploy tooling and CLI
- **Vitest** — off-chain circuit unit tests
- **Midnight JS SDK** (`@midnight-ntwrk/midnight-js-*`, `@midnight-ntwrk/compact-js`, `@midnight-ntwrk/compact-runtime`)

## Prerequisites

- **Node.js v22+** (`node --version`)
- **Docker** installed and running (`docker info`)
- **Compact toolchain** on your `PATH` (`compact --version` → compiler 0.31.x via `compact update`)
- A Midnight testnet wallet seed (auto-generated on first `setup` for public networks)
- tNIGHT from the faucet to fund the wallet (see Setup)

> Note: this repo ships a project-local `.npmrc` that points the `@midnight-ntwrk`
> scope at the public npm registry, in case your global npm config points it at a
> registry host that no longer resolves.

## Setup

```bash
# 1. Clone and enter the project
git clone <your-repo-url> midnight-counter
cd midnight-counter

# 2. Install dependencies
npm install

# 3. Compile the Compact contract -> managed/counter
npm run compile

# 4. Start the proof server (Docker)
npm run proof-server:start

# 5. Deploy. Local devnet is the default; for a public testnet pass --network:
npm run setup -- --network preview
#   On first run this generates a wallet and prints its address + a faucet URL.
#   Fund the address at the faucet, then the script continues automatically and
#   prints:  Contract Address: <address>
#   Paste that address into the "Contract Address" table above.

# 6. Interact with the deployed contract
npm run cli
```

Faucets: [Preview](https://midnight-tmnight-preview.nethermind.dev/) ·
[Preprod](https://midnight-tmnight-preprod.nethermind.dev/)

## Run Tests

Off-chain unit tests exercise the compiled circuit logic (no node or proof
server required):

```bash
npm test
```

The suite (`tests/counter.test.ts`) covers circuit logic, state transitions,
and verifies that the private secret key is never exposed in public state.

## Initial Idea

<!-- LEAVE PLACEHOLDER — fill this in manually with your original idea / motivation. -->
_TODO: describe your initial idea here._

## Screenshots

<!-- LEAVE PLACEHOLDER — add screenshots of the `compact compile` output and the
     deployed contract address here. -->
_TODO: add screenshots of the compile output and the deployed contract address._
