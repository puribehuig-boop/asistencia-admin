export function getOrCreateDeviceId() {
if (typeof window === 'undefined') return 'server';
const KEY = 'device_id';
let id = localStorage.getItem(KEY);
if (!id) {
id = crypto.randomUUID();
localStorage.setItem(KEY, id);
}
return id;
}
