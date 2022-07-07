import { parse as parseDate } from "https://deno.land/std@0.147.0/datetime/mod.ts";

function stripTimezone(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds()
    )
  );
}

function parse(file: string): null | { timestamp: Date } {
  const dateRegex = /[0-9][0-9T:Z-]+/;
  const dateMatch = file.match(dateRegex);
  if (!(dateMatch && dateMatch[0])) return null;
  try {
    const date = parseDate(dateMatch[0], "yyyy-MM-ddTHH:mm-SSSZ");
    return { timestamp: stripTimezone(date) };
  } catch (e) {
    return null;
  }
}

function maxBy<T>(xs: T[], f: (x: T) => number): T | null {
  if (xs.length === 0) return null;
  return xs
    .map<any>((x) => [x, f(x)])
    .sort((a, b) => a[1] - b[1])
    .reverse()[0][0];
}

function minBy<T>(xs: T[], f: (x: T) => number): T | null {
  return maxBy(xs, (x) => -f(x));
}

function sameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

function dateEq(d1: Date, d2: Date): boolean {
  return d1.toJSON() === d2.toJSON();
}

export function removed(files: string[]): string[] {
  const valid = files.map(parse).filter(Boolean) as { timestamp: Date }[];
  const latest = maxBy(valid, (p) => p.timestamp.getTime());

  if (!latest) return [];

  function earliestOnSameDay(p: { timestamp: Date }) {
    return (
      minBy(
        valid.filter((v) => sameDay(v.timestamp, p.timestamp)),
        (v) => v.timestamp.getTime()
      ) ?? p
    );
  }

  function isRemoved(file: string): boolean {
    const parsed = parse(file);
    if (!parsed) return false;

    if (sameDay(parsed.timestamp, latest!.timestamp)) return false;

    if (dateEq(parsed.timestamp, earliestOnSameDay(parsed).timestamp))
      return false;

    return true;
  }

  return files.filter(isRemoved);
}
