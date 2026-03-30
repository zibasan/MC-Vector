export type StateUpdater<T> = T | ((previous: T) => T);

function isUpdaterFunction<T>(value: StateUpdater<T>): value is (previous: T) => T {
  return typeof value === 'function';
}

export function resolveStateUpdater<T>(previous: T, value: StateUpdater<T>): T {
  return isUpdaterFunction(value) ? value(previous) : value;
}
