import { config } from '../config.js'

// Binary file extensions
const BINARY_EXTENSIONS = new Set([
  // Images
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.bmp',
  '.webp',
  '.svg',
  '.avif',
  // Fonts
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  // Audio/Video
  '.mp3',
  '.mp4',
  '.wav',
  '.ogg',
  '.webm',
  '.avi',
  '.mov',
  '.flv',
  // Archives
  '.zip',
  '.tar',
  '.gz',
  '.bz2',
  '.7z',
  '.rar',
  '.xz',
  // Documents
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  // Executables
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  // Other binary
  '.wasm',
  '.pyc',
  '.pyo',
  '.class',
])

// Lock files that should skip content
const LOCK_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'Cargo.lock',
  'Gemfile.lock',
  'poetry.lock',
  'composer.lock',
  'Pipfile.lock',
])

// Generated file patterns
const GENERATED_PATTERNS = [/\.min\.js$/, /\.min\.css$/, /\.map$/, /\.bundle\.js$/, /-bundle\.js$/]

// Directories to ignore
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'vendor',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.output',
  '__pycache__',
  '.cache',
  'coverage',
  '.turbo',
  '.vercel',
])

export type SkipReason =
  | 'too_large'
  | 'binary_extension'
  | 'lock_file'
  | 'generated_file'
  | 'ignored_directory'

export interface FileCheck {
  shouldSkipContent: boolean
  skipReason?: SkipReason
}

/**
 * Check if a file's content should be skipped
 */
export function checkFile(path: string, size: number): FileCheck {
  // Check size
  if (size > config.MAX_FILE_SIZE_BYTES) {
    return { shouldSkipContent: true, skipReason: 'too_large' }
  }

  // Check if in ignored directory
  const parts = path.split('/')
  for (const part of parts) {
    if (IGNORED_DIRS.has(part)) {
      return { shouldSkipContent: true, skipReason: 'ignored_directory' }
    }
  }

  // Check file name for lock files
  const fileName = parts[parts.length - 1] || ''
  if (LOCK_FILES.has(fileName)) {
    return { shouldSkipContent: true, skipReason: 'lock_file' }
  }

  // Check extension for binary files
  const ext = getExtension(fileName)
  if (ext && BINARY_EXTENSIONS.has(ext)) {
    return { shouldSkipContent: true, skipReason: 'binary_extension' }
  }

  // Check for generated files
  for (const pattern of GENERATED_PATTERNS) {
    if (pattern.test(fileName)) {
      return { shouldSkipContent: true, skipReason: 'generated_file' }
    }
  }

  return { shouldSkipContent: false }
}

/**
 * Check if a path should be completely ignored (no metadata either)
 */
export function shouldIgnorePath(path: string): boolean {
  const parts = path.split('/')
  for (const part of parts) {
    if (IGNORED_DIRS.has(part)) {
      return true
    }
  }
  return false
}

/**
 * Get file extension (lowercase, with dot)
 */
function getExtension(fileName: string): string | null {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot === -1 || lastDot === 0) {
    return null
  }
  return fileName.slice(lastDot).toLowerCase()
}

/**
 * Detect language from file extension
 */
export function detectLanguage(path: string): string | null {
  const fileName = path.split('/').pop() || ''
  const ext = getExtension(fileName)

  if (!ext) return null

  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.php': 'php',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.xml': 'xml',
    '.md': 'markdown',
    '.sql': 'sql',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.fish': 'shell',
    '.ps1': 'powershell',
    '.dockerfile': 'dockerfile',
    '.graphql': 'graphql',
    '.gql': 'graphql',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.elm': 'elm',
    '.ex': 'elixir',
    '.exs': 'elixir',
    '.erl': 'erlang',
    '.hs': 'haskell',
    '.ml': 'ocaml',
    '.scala': 'scala',
    '.clj': 'clojure',
    '.r': 'r',
    '.lua': 'lua',
    '.perl': 'perl',
    '.pl': 'perl',
    '.toml': 'toml',
    '.ini': 'ini',
    '.prisma': 'prisma',
  }

  return languageMap[ext] || null
}

/**
 * Count lines of code (simple newline count)
 */
export function countLines(content: string): number {
  if (!content) return 0
  return content.split('\n').length
}
