// Resolve tools without platform-specific installation paths. Never invoke a shell.
const fs = require('node:fs')
const path = require('node:path')

function resolveTool(name, variable) {
  const configured = process.env[variable]
  const command = configured || name
  const candidates = command.includes(path.sep)
    ? [path.resolve(command)]
    : (process.env.PATH || '').split(path.delimiter).filter(Boolean).map(dir => path.join(dir, command))
  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK)
      if (fs.statSync(candidate).isFile()) return candidate
    } catch { /* Try the next PATH entry. */ }
  }
  throw new Error(`${name} executable not found. Install ${name} on PATH or set ${variable} to its executable path.`)
}

function requireTool(name, variable) {
  try { return resolveTool(name, variable) }
  catch (error) { console.error(`FAIL: ${error.message}`); process.exit(1) }
}

module.exports = { resolveTool, requireTool }
