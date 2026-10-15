/**
 * Lamport Clock utilities for distributed causal ordering and tie-breaking.
 * Clock structure: { counter: number, userId: string }
 */

/**
 * Compare two Lamport clocks deterministically.
 * Returns:
 *   1 if clockA > clockB
 *  -1 if clockA < clockB
 *   0 if clockA === clockB
 *
 * Rule:
 * 1. Higher counter wins.
 * 2. If counters are equal, tie-breaker is userId compared lexicographically.
 */
export function compareClocks(clockA, clockB) {
  if (!clockA && !clockB) return 0;
  if (!clockA) return -1;
  if (!clockB) return 1;

  const counterA = Number(clockA.counter || 0);
  const counterB = Number(clockB.counter || 0);

  if (counterA > counterB) return 1;
  if (counterA < counterB) return -1;

  // Counters are identical: deterministic tie-breaker via userId
  const userA = String(clockA.userId || '');
  const userB = String(clockB.userId || '');

  if (userA > userB) return 1;
  if (userA < userB) return -1;

  return 0;
}

/**
 * Advance local Lamport clock upon receiving or sending an event
 * @param {object} currentClock - { counter, userId }
 * @param {object} incomingClock - { counter, userId }
 * @returns {object} new Lamport clock with counter bumped
 */
export function advanceClock(currentClock, incomingClock, userId) {
  const currentCounter = Number(currentClock?.counter || 0);
  const incomingCounter = Number(incomingClock?.counter || 0);
  const nextCounter = Math.max(currentCounter, incomingCounter) + 1;

  return {
    counter: nextCounter,
    userId: userId || currentClock?.userId || ''
  };
}
