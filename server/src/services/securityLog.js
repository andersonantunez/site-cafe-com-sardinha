export function securityLog(event, details = {}) {
  const safeDetails = Object.fromEntries(Object.entries(details).filter(([key]) => !/(key|secret|password|token|credential|payload)/i.test(key)))
  console.info(JSON.stringify({ level: 'info', event, at: new Date().toISOString(), ...safeDetails }))
}
