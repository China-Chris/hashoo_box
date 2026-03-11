/**
 * Box record — salt never leaves server after open (Q6 A).
 * 3C: optional chainCommitmentRegisteredAt for indexer alignment.
 */
export type BoxRecord = {
  boxId: bigint;
  commitment: bigint;
  /** Private — only used to build witness inside prover */
  saltHex: `0x${string}`;
  /** Optional: amount/tier for witness; shape depends on your circuit */
  amount?: bigint;
  tier?: number;
  opened: boolean;
  /** Optional 3C: set when chain register event seen */
  chainCommitmentRegisteredAt?: number;
};

export interface BoxStore {
  get(boxId: bigint): BoxRecord | undefined;
  /** Mint/listing: register box before any open */
  register(record: BoxRecord): void;
  markOpened(boxId: bigint): void;
  /** Nonce per user for EIP-712 replay */
  getNonce(user: `0x${string}`): bigint;
  bumpNonce(user: `0x${string}`): void;
}

class MemoryBoxStore implements BoxStore {
  private boxes = new Map<string, BoxRecord>();
  private nonces = new Map<string, bigint>();

  get(boxId: bigint): BoxRecord | undefined {
    return this.boxes.get(boxId.toString());
  }

  register(record: BoxRecord): void {
    if (this.boxes.has(record.boxId.toString())) {
      throw new Error("Box already registered");
    }
    this.boxes.set(record.boxId.toString(), { ...record, opened: false });
  }

  markOpened(boxId: bigint): void {
    const b = this.boxes.get(boxId.toString());
    if (!b) throw new Error("Box not found");
    b.opened = true;
  }

  getNonce(user: `0x${string}`): bigint {
    return this.nonces.get(user.toLowerCase()) ?? 0n;
  }

  bumpNonce(user: `0x${string}`): void {
    const k = user.toLowerCase();
    this.nonces.set(k, (this.nonces.get(k) ?? 0n) + 1n);
  }
}

export const boxStore: BoxStore = new MemoryBoxStore();
