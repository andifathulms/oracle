// One byte, carried end to end, with real numbers, before any control is
// touched.
//
// The app used to open awaiting input: an all-void stack, an idle candidate
// field, "Run the sweep" where the resolution goes, and a lamp showing nothing.
// A newcomer's first screen taught two sentences and then waited. There was no
// worked example anywhere in the app.
//
// The numbers here are not illustrative. They are the first byte of the trace
// the app has already computed for this seed, so what the reader follows here
// is exactly what the sweep will replay when they press play, and every value
// is one the attack derived rather than one the view was handed.
import { useStore } from '../state/store';
import { hex, printable, isPrintable } from './format';
import './workedexample.css';

export function WorkedExample() {
  const { recovery, target } = useStore();

  // The first byte the attack recovers: block 0, byte 15.
  const first = recovery.blocks[0]?.bytes[0];
  if (!first) return null;

  const size = recovery.blockSize;
  const padTarget = first.paddingTarget;
  const craftedByte = first.intermediate ^ padTarget;
  const prevByte = target.iv[first.index];
  const disamb = recovery.blocks[0]?.disambiguations[0];
  const sweepCount = recovery.blocks[0]?.bytes[0]?.oracleCalls ?? 0;

  return (
    <section className="worked" aria-labelledby="worked-h">
      <h3 id="worked-h" className="worked-title">One byte, start to finish</h3>
      <p className="worked-intro">
        This is the first byte of the recovery below, already computed for this message. Read it
        before pressing anything; the sweep replays exactly these numbers.
      </p>

      <ol className="worked-steps">
        <Step n="1" head={`Attack the last byte of the block: byte ${first.index}.`}>
          It is the <em>1st</em> byte from the end, so the round aims for a pad of length 1. The
          attacker wants the oracle to see a final byte of <code>01</code>.
        </Step>

        <Step n="2" head="Try each of the 256 values that byte could take.">
          Each try is one whole ciphertext sent to the oracle, and one bit back. Here the oracle
          said yes at <code>{hex(craftedByte)}</code>, after{' '}
          <strong>{sweepCount.toLocaleString()}</strong> questions.
        </Step>

        {disamb ? (
          <Step n="3" head="Check that the yes meant what it looks like.">
            A final byte of <code>01</code> is valid padding, but so is <code>02 02</code>, and{' '}
            <code>03 03 03</code>. So byte 14 is changed and the same question asked again. If the
            padding still holds, the pad really was length 1.{' '}
            {disamb.stillValid
              ? 'It held, so the guess stands.'
              : 'It broke here: the first hit was a longer pad in disguise, and the sweep carried on.'}
          </Step>
        ) : null}

        <Step n={disamb ? '4' : '3'} head="Undo the XOR to get the intermediate byte.">
          The oracle only accepts when the decrypted byte under the crafted one equals the pad
          value. So <code>{hex(craftedByte)}</code> ⊕ <code>{hex(padTarget)}</code> ={' '}
          <code className="gold">{hex(first.intermediate)}</code>. That is D<sub>k</sub>(C) at byte{' '}
          {first.index}, and the key was never involved.
        </Step>

        <Step n={disamb ? '5' : '4'} head="Undo the XOR again to get the plaintext.">
          CBC says plaintext = intermediate ⊕ the real previous block, which the attacker already
          holds. For the first block that previous block is the IV, which travels in the clear.
          So <code className="gold">{hex(first.intermediate)}</code> ⊕ <code>{hex(prevByte)}</code>{' '}
          = <code className="gold">{hex(first.plaintext)}</code>
          {isPrintable(first.plaintext) ? <>, the character &lsquo;{printable(first.plaintext)}&rsquo;</> : null}.
        </Step>
      </ol>

      <p className="worked-close">
        That is one byte of {size}. The next byte works the same way, aiming for a pad of length 2
        with this byte held at <code>02</code>, and so on leftwards through the block.
      </p>
    </section>
  );
}

function Step({ n, head, children }: { n: string; head: string; children: React.ReactNode }) {
  return (
    <li className="worked-step">
      <span className="worked-n label" aria-hidden="true">{n}</span>
      <div className="worked-body">
        <p className="worked-head">{head}</p>
        <p className="worked-text">{children}</p>
      </div>
    </li>
  );
}
