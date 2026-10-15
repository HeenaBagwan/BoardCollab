import { compareClocks } from './lamport.js';

/**
 * Deterministic Last-Writer-Wins CRDT Element Merger
 */

/**
 * Create a new CRDT element representation
 */
export function createCrdtElement({ id, roomId, type, props = {}, authorId, clock }) {
  const propClocks = {};
  for (const key of Object.keys(props)) {
    propClocks[key] = { ...clock };
  }

  return {
    id,
    roomId,
    type,
    props: { ...props },
    propClocks,
    authorId,
    isDeleted: false,
    deleteClock: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Apply an incoming operation to an existing or new element
 * @param {object|null} currentElement - The current authoritative element in memory (or null if not yet present)
 * @param {object} op - { opId, elementId, type: 'add' | 'update' | 'delete', patch, clock, userId, props, elementType, roomId }
 * @returns {{ mergedElement: object, changed: boolean, previousProps: object|null }}
 */
export function applyOperation(currentElement, op) {
  const { elementId, type: opType, clock, userId } = op;

  // 1. OPERATION: ADD
  if (opType === 'add') {
    if (!currentElement) {
      const newElement = createCrdtElement({
        id: elementId,
        roomId: op.roomId,
        type: op.elementType || op.props?.type || 'rect',
        props: op.props || op.patch || {},
        authorId: userId,
        clock
      });
      return { mergedElement: newElement, changed: true, previousProps: null };
    }

    // Idempotent Add: Element already exists. If deleted and add has higher clock, resurrect.
    let changed = false;
    const merged = {
      ...currentElement,
      props: { ...currentElement.props },
      propClocks: { ...currentElement.propClocks }
    };

    if (merged.isDeleted && compareClocks(clock, merged.deleteClock) > 0) {
      merged.isDeleted = false;
      merged.deleteClock = null;
      changed = true;
    }

    // Merge any properties with higher clock
    const incomingProps = op.props || op.patch || {};
    for (const [key, val] of Object.entries(incomingProps)) {
      const existingPropClock = merged.propClocks[key];
      if (compareClocks(clock, existingPropClock) > 0) {
        merged.props[key] = val;
        merged.propClocks[key] = { ...clock };
        changed = true;
      }
    }

    if (changed) {
      merged.updatedAt = new Date().toISOString();
    }
    return { mergedElement: merged, changed, previousProps: null };
  }

  // If element does not exist for an update or delete, create a tombstone or placeholder
  if (!currentElement) {
    if (opType === 'delete') {
      const deletedPlaceholder = {
        id: elementId,
        roomId: op.roomId,
        type: op.elementType || 'rect',
        props: {},
        propClocks: {},
        authorId: userId,
        isDeleted: true,
        deleteClock: { ...clock },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return { mergedElement: deletedPlaceholder, changed: true, previousProps: null };
    }
    // Update arrived before Add: instantiate placeholder with patch
    currentElement = createCrdtElement({
      id: elementId,
      roomId: op.roomId,
      type: op.elementType || 'rect',
      props: op.patch || {},
      authorId: userId,
      clock
    });
    return { mergedElement: currentElement, changed: true, previousProps: null };
  }

  // 2. OPERATION: DELETE (Tombstone)
  if (opType === 'delete') {
    // Delete wins against any lower or equal clock
    if (!currentElement.isDeleted || compareClocks(clock, currentElement.deleteClock) > 0) {
      const previousProps = { ...currentElement.props };
      const merged = {
        ...currentElement,
        isDeleted: true,
        deleteClock: { ...clock },
        updatedAt: new Date().toISOString()
      };
      return { mergedElement: merged, changed: true, previousProps };
    }
    // Delete clock is older than current delete clock
    return { mergedElement: currentElement, changed: false, previousProps: null };
  }

  // 3. OPERATION: UPDATE (Property-level Last-Writer-Wins)
  if (opType === 'update') {
    // If element is deleted, an update only takes effect if its clock exceeds the delete clock
    if (currentElement.isDeleted) {
      if (compareClocks(clock, currentElement.deleteClock) <= 0) {
        // Stale update on deleted element -> ignore
        return { mergedElement: currentElement, changed: false, previousProps: null };
      }
      // Clock is higher than delete clock -> un-delete
      currentElement = {
        ...currentElement,
        isDeleted: false,
        deleteClock: null
      };
    }

    let changed = false;
    const patch = op.patch || {};
    const previousProps = {};
    const updatedProps = { ...currentElement.props };
    const updatedPropClocks = { ...currentElement.propClocks };

    for (const [key, value] of Object.entries(patch)) {
      const currentPropClock = updatedPropClocks[key];
      // Compare clocks: higher counter wins, userId tie-breaks
      if (compareClocks(clock, currentPropClock) > 0) {
        previousProps[key] = currentElement.props[key];
        updatedProps[key] = value;
        updatedPropClocks[key] = { ...clock };
        changed = true;
      }
    }

    if (!changed) {
      return { mergedElement: currentElement, changed: false, previousProps: null };
    }

    const merged = {
      ...currentElement,
      props: updatedProps,
      propClocks: updatedPropClocks,
      updatedAt: new Date().toISOString()
    };

    return { mergedElement: merged, changed: true, previousProps };
  }

  return { mergedElement: currentElement, changed: false, previousProps: null };
}
