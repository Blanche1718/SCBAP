export const ALL_PAGE_SIZE = 100000;

export function getPageSizeOptions(values: number[]) {
  return Array.from(new Set([...values, ALL_PAGE_SIZE]));
}

export function getPageSizeOptionLabel(value: number) {
  return value === ALL_PAGE_SIZE ? "Tous" : String(value);
}
