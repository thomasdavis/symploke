export interface ParsedDependency {
  name: string
  versionRange: string
  type: 'prod' | 'dev' | 'peer'
}

export function parseDependencies(pkg: {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
}): ParsedDependency[] {
  const deps: ParsedDependency[] = []

  for (const [name, version] of Object.entries(pkg.dependencies)) {
    deps.push({ name, versionRange: version, type: 'prod' })
  }
  for (const [name, version] of Object.entries(pkg.devDependencies)) {
    if (!pkg.dependencies[name]) {
      deps.push({ name, versionRange: version, type: 'dev' })
    }
  }
  for (const [name, version] of Object.entries(pkg.peerDependencies)) {
    if (!pkg.dependencies[name] && !pkg.devDependencies[name]) {
      deps.push({ name, versionRange: version, type: 'peer' })
    }
  }

  return deps
}
