import { config } from '/js/config.js';

export async function fetchData(endpoint) {
  const resp = await fetch(`${config.basePath}${endpoint}`);
  if (!resp.ok) {
    throw new Error(`Error HTTP: ${resp.status}`);
  }
  return await resp.json();
}
