export function removed(files: string[]): string[] {
  function isRemoved(file: string): boolean {
    return false;
  }

  return files.filter(isRemoved);
}
