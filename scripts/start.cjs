/**
 * scripts/start.js
 *
 * One-command startup for TRACE-X: launches the FastAPI backend and the
 * Vite frontend together, labels their output, and reports clearly if
 * either one fails. Does not install dependencies -- run `npm install`
 * and set up the backend's Python environment first (see README.md).
 *
 * Backend command resolution, in order:
 *   1. backend/venv/{Scripts,bin}/uvicorn  (a venv created as the README describes)
 *   2. `python -m uvicorn` / `py -m uvicorn` / `python3 -m uvicorn` on PATH,
 *      whichever exists and can actually import uvicorn
 */
const { spawn, spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const root = path.resolve(__dirname, '..')
const backendDir = path.join(root, 'backend')
const isWin = process.platform === 'win32'

function commandExists(cmd) {
  const probe = spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: isWin })
  return !probe.error
}

function resolveBackendCommand() {
  const venvBin = isWin
    ? path.join(backendDir, 'venv', 'Scripts', 'uvicorn.exe')
    : path.join(backendDir, 'venv', 'bin', 'uvicorn')
  if (fs.existsSync(venvBin)) {
    return { cmd: venvBin, args: ['main:app', '--port', '8000'] }
  }

  const pythonCandidates = isWin ? ['py', 'python', 'python3'] : ['python3', 'python']
  for (const py of pythonCandidates) {
    if (commandExists(py)) {
      const check = spawnSync(py, ['-c', 'import uvicorn'], { cwd: backendDir, shell: isWin })
      if (!check.error && check.status === 0) {
        return { cmd: py, args: ['-m', 'uvicorn', 'main:app', '--port', '8000'] }
      }
    }
  }
  return null
}

function resolveFrontendCommand() {
  const bin = path.join(root, 'node_modules', '.bin', isWin ? 'vite.cmd' : 'vite')
  if (fs.existsSync(bin)) return { cmd: bin, args: ['--port', '5173'] }
  return { cmd: isWin ? 'npx.cmd' : 'npx', args: ['vite', '--port', '5173'] }
}

function prefixed(label, color) {
  return (data) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean)
    for (const line of lines) console.log(`${color}[${label}]\x1b[0m ${line}`)
  }
}

function runProcess(name, color, cmd, args, cwd) {
  const child = spawn(cmd, args, { cwd, shell: isWin })
  child.stdout.on('data', prefixed(name, color))
  child.stderr.on('data', prefixed(name, color))
  return child
}

console.log('Starting TRACE-X (frontend + backend)...\n')

const backendCmd = resolveBackendCommand()
if (!backendCmd) {
  console.error(
    '\x1b[31m[BACKEND]\x1b[0m Could not find a Python environment with uvicorn installed.\n' +
      '  Set it up once with:\n' +
      '    cd backend\n' +
      (isWin ? '    py -m venv venv\n    venv\\Scripts\\pip install -r requirements.txt\n'
             : '    python3 -m venv venv\n    venv/bin/pip install -r requirements.txt\n') +
      '  Then run this command again.',
  )
  process.exit(1)
}

const frontendCmd = resolveFrontendCommand()

const backend = runProcess('BACKEND', '\x1b[36m', backendCmd.cmd, backendCmd.args, backendDir)
const frontend = runProcess('FRONTEND', '\x1b[35m', frontendCmd.cmd, frontendCmd.args, root)

let shuttingDown = false
function shutdown(code) {
  if (shuttingDown) return
  shuttingDown = true
  backend.kill()
  frontend.kill()
  process.exit(code)
}

backend.on('exit', (code, signal) => {
  if (shuttingDown) return
  console.error(`\x1b[31m[BACKEND] stopped unexpectedly (${signal ? 'signal ' + signal : 'exit code ' + code}). Stopping frontend too.\x1b[0m`)
  shutdown(code ?? 1)
})
frontend.on('exit', (code, signal) => {
  if (shuttingDown) return
  console.error(`\x1b[31m[FRONTEND] stopped unexpectedly (${signal ? 'signal ' + signal : 'exit code ' + code}). Stopping backend too.\x1b[0m`)
  shutdown(code ?? 1)
})
backend.on('error', (err) => {
  console.error(`\x1b[31m[BACKEND] failed to start: ${err.message}\x1b[0m`)
  shutdown(1)
})
frontend.on('error', (err) => {
  console.error(`\x1b[31m[FRONTEND] failed to start: ${err.message}\x1b[0m`)
  shutdown(1)
})

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

setTimeout(() => {
  console.log('\nBackend:  http://localhost:8000')
  console.log('Frontend: http://localhost:5173\n')
}, 3000)
