import { spawn } from "node:child_process"
import net from "node:net"

export const pnpmCommand = "pnpm"

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const spawnCommand = resolveSpawnCommand(command, args)
    const child = spawn(spawnCommand.command, spawnCommand.args, {
      env: options.env ?? process.env,
      shell: false,
      stdio: options.stdio ?? "inherit",
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} exited with status ${code ?? "null"}`
        )
      )
    })
  })
}

export function runPersistent(command, args, options = {}) {
  return run(command, args, { ...options, stdio: "inherit" })
}

function resolveSpawnCommand(command, args) {
  if (process.platform === "win32" && command === pnpmCommand) {
    return {
      args: ["/d", "/s", "/c", command, ...args],
      command: process.env.ComSpec ?? "cmd.exe",
    }
  }

  return { args, command }
}

export async function waitForTcpPort(port, options = {}) {
  const host = options.host ?? "127.0.0.1"
  const timeoutMs = options.timeoutMs ?? 60_000
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await canConnect(host, port)) {
      return
    }

    await delay(750)
  }

  throw new Error(`Timed out waiting for ${host}:${port}.`)
}

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })

    socket.setTimeout(1000)
    socket.on("connect", () => {
      socket.end()
      resolve(true)
    })
    socket.on("error", () => resolve(false))
    socket.on("timeout", () => {
      socket.destroy()
      resolve(false)
    })
  })
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
