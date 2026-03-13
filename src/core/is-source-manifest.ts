export function isSourceManifest(path: string): boolean {
  return (
    path.endsWith("sources.txt") ||
    path.endsWith("sources.json") ||
    path.endsWith(".sources.txt") ||
    path.endsWith(".sources.json")
  );
}
