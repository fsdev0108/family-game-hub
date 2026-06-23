const BASE = import.meta.env.VITE_API_URL;
console.log("API URL =", import.meta.env.VITE_API_URL);
async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export const api = {
  getSession: () => request('GET', '/session'),
  clearSession: () => request('DELETE', '/session'),

  createRoom: (body) => request('POST', '/rooms', body),
  joinRoom: (body) => request('POST', '/rooms/join', body),
  getRoom: (code) => request('GET', `/rooms/${code}`),
  deleteRoom: (code) => request('DELETE', `/rooms/${code}`),

  setPlayerName: (code, playerName) => request('POST', `/rooms/${code}/player`, { playerName }),
  getPlayers: (code) => request('GET', `/rooms/${code}/players`),

  updateConfig: (code, config) => request('PUT', `/rooms/${code}/config`, config),
  startGame: (code) => request('POST', `/rooms/${code}/start`),
};
