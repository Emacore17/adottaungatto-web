export function createWorkerStatus(environment: string) {
  return {
    service: "worker",
    status: "ok",
    environment,
    startedAt: new Date().toISOString(),
  }
}
