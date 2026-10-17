// Memastikan setiap teks yang dibungkus t() / translate() / tk() punya padanan Inggris di
// src/i18n/en.ts, dan placeholder {param}-nya sama. Usage: npm run i18n:check
import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'

const WRAPPERS = new Set(['t', 'translate', 'tk'])

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(full)
  }
  return out
}

const used = new Map() // key -> first location
for (const file of walk('src')) {
  // Modul i18n itu sendiri (definisi t/translate/tk dan kamus) tidak dipindai; registeredLabels.ts dipindai.
  if (/^src\/i18n\/(i18n|useI18n|en)\.ts$/.test(file.replace(/\\/g, '/'))) continue
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && WRAPPERS.has(node.expression.text) && node.arguments.length > 0) {
      const arg = node.arguments[0]
      if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
        if (!used.has(arg.text)) used.set(arg.text, `${file.replace(/\\/g, '/')}:${sf.getLineAndCharacterOfPosition(arg.getStart()).line + 1}`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
}

// Kamus: properti objek literal di en.ts (kunci string -> nilai string).
const dictSf = ts.createSourceFile('en.ts', fs.readFileSync('src/i18n/en.ts', 'utf8'), ts.ScriptTarget.Latest, true)
const dict = new Map()
const collect = (node) => {
  if (ts.isPropertyAssignment(node) && (ts.isStringLiteral(node.name) || ts.isNoSubstitutionTemplateLiteral(node.name))) {
    const value = node.initializer
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) dict.set(node.name.text, value.text)
  }
  ts.forEachChild(node, collect)
}
collect(dictSf)

const params = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
const missing = []
const badParams = []
const empty = []
for (const [key, where] of used) {
  if (!dict.has(key)) {
    missing.push(`${where}  ${key}`)
    continue
  }
  const value = dict.get(key)
  if (!value.trim()) empty.push(`${where}  ${key}`)
  else if (params(key) !== params(value)) badParams.push(`${where}  ${key}  =>  ${value}`)
}
const unused = [...dict.keys()].filter((key) => !used.has(key))

console.log(`teks di kode: ${used.size} · entri kamus Inggris: ${dict.size}`)
if (unused.length) console.log(`\n[info] ${unused.length} entri kamus tidak dipakai di kode:\n  ${unused.slice(0, 20).join('\n  ')}${unused.length > 20 ? '\n  ...' : ''}`)
if (empty.length) console.log(`\n[ERROR] ${empty.length} terjemahan kosong:\n  ${empty.join('\n  ')}`)
if (badParams.length) console.log(`\n[ERROR] ${badParams.length} terjemahan dengan placeholder {param} berbeda:\n  ${badParams.join('\n  ')}`)
if (missing.length) console.log(`\n[ERROR] ${missing.length} teks belum punya terjemahan Inggris:\n  ${missing.join('\n  ')}`)
if (missing.length || badParams.length || empty.length) process.exit(1)
console.log('OK — semua teks punya terjemahan Inggris.')
