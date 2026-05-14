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

export function runCapture(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const spawnCommand = resolveSpawnCommand(command, args)
    const child = spawn(spawnCommand.command, spawnCommand.args, {
      env: options.env ?? process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    })
    const stdout = []
    const stderr = []

    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)))
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)))
    child.on("error", reject)
    child.on("exit", (code) => {
      const output = {
        stderr: Buffer.concat(stderr).toString("utf8"),
        stdout: Buffer.concat(stdout).toString("utf8"),
      }

      if (code === 0) {
        resolve(output)
        return
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} exited with status ${
            code ?? "null"
          }\n${output.stderr || output.stdout}`
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

export async function waitForDockerComposeServices(services, options = {}) {
  const timeoutMs = options.timeoutMs ?? 120_000
  const startedAt = Date.now()
  let lastStatus = "no docker compose status yet"

  while (Date.now() - startedAt < timeoutMs) {
    const output = await runCapture(
      "docker",
      ["compose", "ps", "--format", "json"],
      {
        env: options.env,
      }
    )
    const rows = parseComposePsJson(output.stdout)
    const byService = new Map(rows.map((row) => [row.Service, row]))
    const pending = services.filter((service) => {
      const row = byService.get(service)

      return !row || !isComposeServiceReady(row)
    })

    if (pending.length === 0) {
      return
    }

    lastStatus = services
      .map((service) => {
        const row = byService.get(service)
        const state = row?.State ?? "missing"
        const health = row?.Health ? `/${row.Health}` : ""

        return `${service}:${state}${health}`
      })
      .join(", ")

    await delay(1_000)
  }

  throw new Error(
    `Timed out waiting for Docker services to become healthy: ${lastStatus}.`
  )
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

function parseComposePsJson(output) {
  const trimmed = output.trim()

  if (!trimmed) {
    return []
  }

  if (trimmed.startsWith("[")) {
    return JSON.parse(trimmed)
  }

  return trimmed.split(/\r?\n/).map((line) => JSON.parse(line))
}

function isComposeServiceReady(row) {
  const state = String(row.State ?? "").toLowerCase()
  const health = String(row.Health ?? "").toLowerCase()

  return state === "running" && (health === "" || health === "healthy")
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
