
# PrivateCounter

> A minimal, production-quality privacy-preserving smart contract for the Midnight Network demonstrating how zero-knowledge proofs enable authenticated state changes without revealing user identity.

![Midnight](https://img.shields.io/badge/Midnight-Compact-blueviolet)
![Compact](https://img.shields.io/badge/Compact-v0.31+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)
![Node](https://img.shields.io/badge/Node.js-22.x-339933)
![License](https://img.shields.io/badge/license-MIT-green)

## Contract Address

| Network  | Address                                                            |
|----------|--------------------------------------------------------------------|
| Preview  | `87b1372fbae16fc4ec5ac3387c904f5b0d8969178dd70c7c8ff003adef373934` |
| Preprod  | aa26324b48117dec15fd40d46b341476b61d5e09268243c834cce2cc31e5ec2b                                                  |

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

# Features

- 🔒 Zero-knowledge authorization
- 👤 Anonymous participants
- 📈 Public verifiable state
- ⚡ Compact smart contract
- 🧪 Comprehensive unit tests
- 🐳 Docker proof server
- 💻 TypeScript deployment tooling
- 🌐 Ready for Preview & Preprod testnets


# Architecture

```
                 Secret Key
                      │
                      ▼
             Private Witness Input
                      │
                      ▼
        ┌──────────────────────────┐
        │   Compact Smart Contract │
        └──────────────────────────┘
             │               │
             │               │
             ▼               ▼
      Public Counter   Hash Commitment
             │               │
             └────── On Chain ──────►
```


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

I wanted my first Midnight contract to teach me the one thing that makes the
platform different from every other chain I'd used: **selective disclosure**. On
a normal blockchain, "who did this and how much" is public by default. On
Midnight it's private by default, and you have to *deliberately* choose what
leaks. I wanted to feel that difference in code, not just read about it.

A counter is the "hello world" of smart contracts, so I started there — but a
plain public counter teaches you nothing about privacy. So I asked: **what is the
smallest possible contract that still has a real secret?** The answer I landed on
was a counter where the *tally* is public, but *who is allowed to bump it* is
proven privately.

That gave me the design:

- Keep the running `count` public — anyone should be able to read the total.
- Require every increment to be authorized by a **secret key** that never leaves
  the caller's machine (a `witness`).
- Record only a one-way **hash commitment** of that key on-chain (`lastActor`),
  so the contract can prove "an authorized party did this" without ever revealing
  *which* party — the classic zero-knowledge "prove without revealing" move.
- Use `disclose()` in exactly two deliberate places, so the compiler forces me to
  acknowledge every single thing that becomes public.

The point wasn't the counter itself — it was building the full muscle memory of a
Midnight dApp end to end: write Compact, compile to zero-knowledge circuits, unit
test the circuits off-chain (including a test that *fails* if the secret ever
leaks), run a proof server, fund a wallet from the faucet, and deploy to a public
testnet.

**Where this could go next:** the same "public tally + private authorization"
pattern is the seed for genuinely useful things — anonymous upvoting/petitions
(one vote per secret, no identity revealed), private membership counters, or
sealed-bid tallies. PrivateCounter is the minimal kernel of all of those.

## Screenshots

### 1. `compact compile` output
Run `npm run compile` and screenshot the terminal output, then save it as
`screenshots/compile-output.png`.

<img width="2240" height="1260" alt="screenshots:compile-output png" src="https://github.com/user-attachments/assets/fe2ee383-39f7-47fc-baba-b29de1f16312" />


### 2. Deployed contract address
Screenshot the deploy log line `Contract Address: …` (from
`npm run deploy -- --network preview`) — or the contract on a
[Preview explorer](https://docs.midnight.network/relnotes/network) — 



<img width="2240" height="1260" alt="screenshots:contract-address" src="https://github.com/user-attachments/assets/3a736918-3bd0-445f-91f2-7e64db05c1f6" />


### 3. Tests passing (optional)
Run `npm test` and screenshot the green result, saved as
`screenshots/tests-passing.png`.



<img width="2240" height="1260" alt="screenshots:tests-passing" src="https://github.com/user-attachments/assets/a8752467-7641-43ce-bc44-91782df08541" />


# Initial Idea

The goal of this project was to explore Midnight's privacy-first architecture through the smallest useful smart contract possible.

Instead of building a conventional counter, the project demonstrates authenticated state updates using zero-knowledge proofs, where authorization is verified without exposing user identity or secret keys.

By combining Compact circuits with the Midnight JavaScript SDK, this repository serves as a practical reference for developers learning private smart contract development.

---

# References

- Midnight Network
- Compact Language
- Midnight JavaScript SDK

---

# License

MIT License

---

Built with ❤️ using **Midnight** and **Compact**.

![Builder](https://img.shields.io/badge/Miii-2026-orange)

