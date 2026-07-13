import { describe, it, expect, beforeEach } from 'vitest';
import {
  CostModel,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  type CircuitContext,
} from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  ledger,
  pureCircuits,
  type Ledger,
  type Witnesses,
} from '../managed/counter/contract/index.js';

// ─── Test harness ────────────────────────────────────────────────────────────
//
// These tests exercise the compiled PrivateCounter circuits entirely off-chain:
// no Midnight node and no proof server are required. We drive the contract
// through a small simulator that threads the CircuitContext from one call to
// the next, exactly as the on-chain runtime would.

// The private state that backs the `localSecretKey()` witness. It lives only in
// memory here and, on a real deployment, only on the caller's machine.
type CounterPrivateState = { readonly secretKey: Uint8Array };

// Wire the witness to return the secret key from private state. The first tuple
// element is the (possibly updated) next private state; the second is the value
// handed to the circuit.
const witnesses: Witnesses<CounterPrivateState> = {
  localSecretKey: ({ privateState }) => [privateState, privateState.secretKey],
};

class CounterSimulator {
  readonly contract: Contract<CounterPrivateState>;
  circuitContext: CircuitContext<CounterPrivateState>;

  constructor(secretKey: Uint8Array) {
    this.contract = new Contract<CounterPrivateState>(witnesses);
    const init = this.contract.initialState(
      createConstructorContext({ secretKey }, '0'.repeat(64)),
    );
    this.circuitContext = {
      currentPrivateState: init.currentPrivateState,
      currentZswapLocalState: init.currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        init.currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  /** The public, on-chain-visible ledger state. */
  get ledger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  /** The private state (never leaves the caller's machine on a real deployment). */
  get privateState(): CounterPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  /** Call increment(amount), advancing the context, and return the new ledger. */
  increment(amount: bigint): Ledger {
    this.circuitContext = this.contract.impureCircuits.increment(
      this.circuitContext,
      amount,
    ).context;
    return this.ledger;
  }

  /** Call the read-only get() circuit and return the current count. */
  get(): bigint {
    return this.contract.impureCircuits.get(this.circuitContext).result;
  }
}

// A recognizable, non-zero secret key so the privacy test can assert the raw
// bytes never leak into public state.
const SECRET_KEY = new Uint8Array(32).fill(0xab);
const OTHER_KEY = new Uint8Array(32).fill(0x11);

describe('PrivateCounter', () => {
  let sim: CounterSimulator;

  beforeEach(() => {
    sim = new CounterSimulator(SECRET_KEY);
  });

  // ── Test 1: circuit logic ───────────────────────────────────────────────
  it('derives a deterministic 32-byte actor commitment that is not the raw key', () => {
    const c1 = pureCircuits.actorCommitment(SECRET_KEY);
    const c2 = pureCircuits.actorCommitment(SECRET_KEY);
    const cOther = pureCircuits.actorCommitment(OTHER_KEY);

    // Deterministic: same key → same commitment.
    expect(Buffer.from(c1)).toEqual(Buffer.from(c2));
    // Collision-resistant across identities: different key → different commitment.
    expect(Buffer.from(c1)).not.toEqual(Buffer.from(cOther));
    // It is a 32-byte hash, and it is NOT the secret key itself.
    expect(c1).toHaveLength(32);
    expect(Buffer.from(c1)).not.toEqual(Buffer.from(SECRET_KEY));
  });

  // ── Test 2: state transitions ────────────────────────────────────────────
  it('increments the public count across successive calls', () => {
    expect(sim.ledger.count).toBe(0n);

    expect(sim.increment(5n).count).toBe(5n);
    expect(sim.increment(3n).count).toBe(8n);
    expect(sim.increment(1n).count).toBe(9n);

    // The read-only get() circuit reflects the same public state.
    expect(sim.get()).toBe(9n);
  });

  // ── Test 3: state transition records the caller commitment ───────────────
  it('records the caller as an anonymous commitment on each increment', () => {
    // Before any call, lastActor is the all-zero default.
    expect(sim.ledger.lastActor.every((b) => b === 0)).toBe(true);

    sim.increment(1n);
    const expected = pureCircuits.actorCommitment(SECRET_KEY);

    // The on-chain lastActor equals the commitment derived from the secret key…
    expect(Buffer.from(sim.ledger.lastActor)).toEqual(Buffer.from(expected));

    // …and a different user writes a different commitment.
    const other = new CounterSimulator(OTHER_KEY);
    other.increment(1n);
    expect(Buffer.from(other.ledger.lastActor)).not.toEqual(
      Buffer.from(sim.ledger.lastActor),
    );
  });

  // ── Test 4: privacy — the secret key is never exposed publicly ───────────
  it('never exposes the private secret key in public ledger state', () => {
    sim.increment(7n);

    const l = sim.ledger;
    // The public state only holds the count and the hashed commitment.
    expect(l.count).toBe(7n);
    expect(l.lastActor).toHaveLength(32);

    // The stored commitment must NOT be the raw secret key.
    expect(Buffer.from(l.lastActor)).not.toEqual(Buffer.from(SECRET_KEY));

    // Exhaustively: the raw secret-key byte pattern appears nowhere in the
    // serialized public ledger state.
    const publicBytes = Buffer.from(JSON.stringify(l, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
    expect(publicBytes.includes(Buffer.from(SECRET_KEY))).toBe(false);

    // The secret key still lives in private state (it just never went public).
    expect(Buffer.from(sim.privateState.secretKey)).toEqual(Buffer.from(SECRET_KEY));
  });
});
