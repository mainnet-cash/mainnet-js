export const arrayRange = (start: number, stop: number) =>
  Array.from({ length: stop - start }, (_, index) => start + index);

export const getNextUnusedIndex = (
  index: number,
  statuses: Array<string | null>
): number => {
  if (index === -1) {
    index = statuses.findIndex((status) => status === null);
    if (index === -1) {
      index = statuses.length;
    }
  }

  return index;
};
