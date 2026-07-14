export interface ChangeHunk {
  id: string;
  before: string;
  after: string;
  changed: boolean;
}

const tokens = (value: string) => value.match(/\s+|[^\s]+/g) ?? [];

export function buildChangeHunks(before: string, after: string): ChangeHunk[] {
  const left = tokens(before);
  const right = tokens(after);
  const table = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) table[i][j] = left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const operations: Array<{ kind: "same" | "remove" | "add"; text: string }> = [];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      operations.push({ kind: "same", text: left[i++] }); j += 1;
    } else if (j < right.length && (i === left.length || table[i][j + 1] >= table[i + 1][j])) {
      operations.push({ kind: "add", text: right[j++] });
    } else {
      operations.push({ kind: "remove", text: left[i++] });
    }
  }
  const hunks: ChangeHunk[] = [];
  let current: ChangeHunk | undefined;
  for (const operation of operations) {
    const changed = operation.kind !== "same";
    if (!current || current.changed !== changed) {
      current = { id: `change-${hunks.length}`, before: "", after: "", changed };
      hunks.push(current);
    }
    if (operation.kind !== "add") current.before += operation.text;
    if (operation.kind !== "remove") current.after += operation.text;
  }
  return hunks;
}

export function composeTrackedText(hunks: ChangeHunk[], accepted: Set<string>) {
  return hunks.map((hunk) => !hunk.changed || accepted.has(hunk.id) ? hunk.after : hunk.before).join("");
}
