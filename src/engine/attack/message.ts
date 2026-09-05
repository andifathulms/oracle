// Recover the whole message across every block, assemble the plaintext, and
// strip the final block's padding (CLAUDE.md §4). Each block is recovered using
// its predecessor (IV for the first block) as the crafted-block base.
import { BLOCK_SIZE, splitBlocks, concatBytes } from '../bytes';
import { isValidPadding, strip } from '../pkcs7';
import type { AttackTarget } from '../secret';
import { recoverBlock } from './block';
import type { MessageRecovery, BlockRecovery } from './trace';

export function recoverMessage(target: AttackTarget): MessageRecovery {
  const blocks = splitBlocks(target.ciphertext);
  const recoveries: BlockRecovery[] = [];
  const intermediateParts: Uint8Array[] = [];
  const plaintextParts: Uint8Array[] = [];

  let starved = false;

  for (let i = 0; i < blocks.length; i++) {
    const realPrevious = i === 0 ? target.iv : blocks[i - 1];
    const rec = recoverBlock({
      blockIndex: i,
      targetBlock: blocks[i],
      realPrevious,
      oracle: target.oracle,
    });
    recoveries.push(rec);

    // If a block recovered nothing, the oracle is starved (MAC on).
    if (rec.bytes.length < BLOCK_SIZE) {
      starved = true;
      break;
    }

    const interBlock = new Uint8Array(BLOCK_SIZE);
    const plainBlock = new Uint8Array(BLOCK_SIZE);
    for (const b of rec.bytes) {
      interBlock[b.index] = b.intermediate;
      plainBlock[b.index] = b.plaintext;
    }
    intermediateParts.push(interBlock);
    plaintextParts.push(plainBlock);
  }

  const intermediate = concatBytes(...intermediateParts);
  const plaintextPadded = concatBytes(...plaintextParts);
  let plaintext = plaintextPadded;
  if (!starved && plaintextPadded.length > 0 && isValidPadding(plaintextPadded)) {
    plaintext = strip(plaintextPadded);
  }

  const totalCalls = target.callCount();

  return {
    blocks: recoveries,
    plaintext,
    intermediate,
    plaintextPadded,
    totalCalls,
    starved,
    blockSize: BLOCK_SIZE,
  };
}
