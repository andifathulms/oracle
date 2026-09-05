import { buildTarget, recoverMessage } from '../engine';

// Placeholder shell — replaced by the full interrogation UI in later steps.
export function App() {
  const target = buildTarget({ seed: 'oracle', cipher: 'aes', mac: false });
  const result = recoverMessage(target);
  return (
    <main>
      <h1>Oracle</h1>
      <p>recover a message from a single bit of feedback</p>
      <p>calls: {result.totalCalls}</p>
    </main>
  );
}
