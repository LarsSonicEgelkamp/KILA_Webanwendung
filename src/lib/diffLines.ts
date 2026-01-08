export type DiffLine = {
  type: 'add' | 'remove' | 'same';
  text: string;
};

const buildLcsTable = (a: string[], b: string[]) => {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }
  return table;
};

export const diffLines = (before: string, after: string): DiffLine[] => {
  const a = before.split('\n');
  const b = after.split('\n');
  const table = buildLcsTable(a, b);
  const result: DiffLine[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'same', text: a[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      result.unshift({ type: 'add', text: b[j - 1] });
      j -= 1;
    } else if (i > 0) {
      result.unshift({ type: 'remove', text: a[i - 1] });
      i -= 1;
    }
  }
  return result;
};
