
# PrivateCounter

> A privacy-preserving counter on the Midnight Network: anyone can see the tally, while the private witness behind each caller commitment is never revealed on-chain.

![Midnight](https://img.shields.io/badge/Midnight-Compact-blueviolet)
![Compact](https://img.shields.io/badge/Compact-v0.31+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)
![Node](https://img.shields.io/badge/Node.js-22.x-339933)
![License](https://img.shields.io/badge/license-MIT-green)

## Judge Verification (Mandatory Steps 1 and 2)

The files needed for both mandatory checks are tracked at the repository root so
they are included in the judged submission and can be inspected without running
the project.

If the submission platform uses a separate judged-files picker, follow
[`SUBMISSION_FILES.md`](SUBMISSION_FILES.md) and run `npm run submission:verify`
before submitting. The repository cannot automatically control which files an
external form includes in its judged subset.

### Step 1 — Compact circuit and ledger declarations

- [`counter.compact`](counter.compact) is the Compact source file.
- `export ledger count: Counter;` declares the public tally.
- `export ledger lastActor: Bytes<32>;` declares the public caller commitment.
- `export circuit increment(...)` and `export circuit get()` are circuit
  definitions.

### Step 2 — private witness, public state, and deliberate disclosure

| Classification | Exact declaration/use | Why |
|---|---|---|
| Private witness | `witness localSecretKey(): Bytes<32>;` | Supplied from local private state and never written to the ledger. |
| Public state | `export ledger count: Counter;` | Public on-chain counter. |
| Public state | `export ledger lastActor: Bytes<32>;` | Public hash commitment, not the raw witness. |
| Deliberate disclosure | `disclose(actorCommitment(_sk))` | Only the one-way commitment derived from the witness becomes public. |
| Deliberate disclosure | `disclose(amount)` | The amount is intentionally made public before updating the public counter. |

The raw `_sk` value is never passed to `disclose()` and is never assigned to a
ledger field. Test 4 in [`tests/counter.test.ts`](tests/counter.test.ts) also
checks that the raw witness bytes do not appear in serialized public state.

> Scope: this contract demonstrates private/public separation and selective
> disclosure. It does not implement membership or owner-only access control;
> any caller may increment the counter.

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
  the caller's **secret key**. The circuit proves that this public commitment was
  derived consistently from the private witness, **without revealing who** or
  leaking the key.
- Anyone can call `get()` to read the current count.

It is a deliberately small contract whose purpose is to demonstrate Midnight's
"private by default" model end-to-end: writing private witnesses, deliberately
disclosing only what is safe, compiling to zero-knowledge circuits, testing the
logic off-chain, and deploying to a public testnet.

# Features

- 🔒 Zero-knowledge witness privacy
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
  - That the recorded commitment was correctly derived from the private witness
    used by the circuit, while the witness itself remains hidden. The secret is
    only ever disclosed in *hashed* (committed) form via
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
was a counter where the *tally* is public, but the private value behind the
caller's commitment remains hidden.

That gave me the design:

- Keep the running `count` public — anyone should be able to read the total.
- Bind every increment to a **secret key** that never leaves the caller's
  machine (a `witness`). This is a privacy demonstration, not an access-control
  check; any caller may supply a witness and increment.
- Record only a one-way **hash commitment** of that key on-chain (`lastActor`),
  so the contract can prove that the commitment matches the private witness
  without revealing the witness — the classic zero-knowledge "prove without
  revealing" move.
- Use `disclose()` in exactly two deliberate places, so the compiler forces me to
  acknowledge every single thing that becomes public.

The point wasn't the counter itself — it was building the full muscle memory of a
Midnight dApp end to end: write Compact, compile to zero-knowledge circuits, unit
test the circuits off-chain (including a test that *fails* if the secret ever
leaks), run a proof server, fund a wallet from the faucet, and deploy to a public
testnet.

**Where this could go next:** this "public tally + private commitment" pattern
could be extended with real authorization to support anonymous upvoting/petitions
(one vote per secret, no identity revealed), private membership counters, or
sealed-bid tallies. PrivateCounter is the minimal kernel of all of those.

## Screenshots

### 1. `compact compile` output


<img width="2240" height="1260" alt="screenshots:compile-output png" src="https://github.com/user-attachments/assets/fe2ee383-39f7-47fc-baba-b29de1f16312" />


### 2. Deployed contract address

[Preview explorer](https://docs.midnight.network/relnotes/network) 



<img width="2240" height="1260" alt="screenshots:contract-address" src="https://github.com/user-attachments/assets/3a736918-3bd0-445f-91f2-7e64db05c1f6" />


### 3. Tests passing



<img width="2240" height="1260" alt="screenshots:tests-passing" src="https://github.com/user-attachments/assets/a8752467-7641-43ce-bc44-91782df08541" />


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
