/**
 * The door for a later premium level. Every stamp made reports one receipt here. Today nothing is
 * listening: the receipt goes nowhere, nothing is recorded, and nothing leaves the phone.
 *
 * The proof layer in the brief is a proposal awaiting the owner's ruling, so it is not built. If it is
 * approved, it plugs in with setReceiptSink and hashes the source and stamped files from these
 * addresses, without any change to how stamping works.
 */
import type { StyleId } from './design';

export interface StampReceipt {
  photoId: string;
  /** Milliseconds since 1970. */
  stampedAt: number;
  designId: string;
  style: StyleId;
  width: number;
  height: number;
  sourceUri: string;
  outputUri: string;
}

export type ReceiptSink = (receipt: StampReceipt) => void | Promise<void>;

let sink: ReceiptSink | null = null;

export const setReceiptSink = (next: ReceiptSink | null): void => {
  sink = next;
};

/** Reports a receipt. A sink that fails can never break stamping. */
export async function emitReceipt(receipt: StampReceipt): Promise<void> {
  if (!sink) return;
  try {
    await sink(receipt);
  } catch {
    // Stamping goes on whatever the sink does.
  }
}
