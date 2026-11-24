'use strict';
/* FitWalk - PWA de actividad física. JavaScript puro, sin dependencias. */
const $ = s => document.querySelector(s);
const el = (tag, txt, cls) => { const e = document.createElement(tag); if (txt != null) e.textContent = txt; if (cls) e.className = cls; return e; }; // textContent = sin XSS
const kmF = m => (m / 1000).toFixed(2);
const timeF = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60, p = n => String(n).padStart(2, '0'); return (h ? h + ':' : '') + p(m) + ':' + p(x); };
const paceF = (s, m) => m >= 10 ? (s / 60 / (m / 1000)).toFixed(1) : '--';
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.i); toast.i = setTimeout(() => t.classList.remove('show'), 3500); }

/* ---------- IndexedDB (stores: walks y settings) ---------- */
let db;
const openDB = () => new Promise((ok, ko) => {
  const r = indexedDB.open('fitwalk', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('walks', { keyPath: 'id', autoIncrement: true }); r.result.createObjectStore('settings', { keyPath: 'key' }); };
  r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
});
const tx = (st, mode, fn) => new Promise((ok, ko) => {
  const t = db.transaction(st, mode), rq = fn(t.objectStore(st));
  t.oncomplete = () => ok(rq && rq.result); t.onerror = () => ko(t.error);
});
const addWalk = w => tx('walks', 'readwrite', s => s.add(w));      // Create
const allWalks = () => tx('walks', 'readonly', s => s.getAll());   // Read
const putWalk = w => tx('walks', 'readwrite', s => s.put(w));      // Update
const delWalk = id => tx('walks', 'readwrite', s => s.delete(id)); // Delete
const getGoal = async () => { const g = await tx('settings', 'readonly', s => s.get('goal')); return g ? g.value : 10; };
const setGoal = v => tx('settings', 'readwrite', s => s.put({ key: 'goal', value: v }));

/* ---------- Mapas interactivos con Leaflet + OpenStreetMap ---------- */
const mkMap = (id) => {
  const m = L.map(id).setView([20, 0], 2);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, crossOrigin: true,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(m);
  return m;
};
const dot = (ll, color) => L.circleMarker(ll, { radius: 8, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 });
let liveMap, liveLine, liveDot, histMap, histLayer;
function initLiveMap() {
  liveMap = mkMap('liveMap');
  liveLine = L.polyline([], { color: '#16a34a', weight: 5 }).addTo(liveMap);
}
function resetLiveMap() { liveLine.setLatLngs([]); if (liveDot) { liveMap.removeLayer(liveDot); liveDot = null; } }
function liveUpdate(pt) { // agrega el punto a la ruta y centra el mapa
  const ll = [pt.lat, pt.lon]; liveLine.addLatLng(ll);
  if (liveDot) liveDot.setLatLng(ll); else liveDot = dot(ll, '#2563eb').addTo(liveMap);
  liveMap.setView(ll, Math.max(liveMap.getZoom(), 17));
}
function showRoute(w) { // ruta guardada en el historial
  $('#mapTitle').textContent = w.name; $('#dMap').showModal();
  if (!histMap) { histMap = mkMap('mapBox'); histLayer = L.layerGroup().addTo(histMap); }
  histLayer.clearLayers();
  const ll = w.points.map(p => [p.lat, p.lon]);
  const line = L.polyline(ll, { color: '#16a34a', weight: 5 }).addTo(histLayer);
  dot(ll[0], '#2563eb').addTo(histLayer); dot(ll[ll.length - 1], '#dc2626').addTo(histLayer);
  setTimeout(() => { histMap.invalidateSize(); histMap.fitBounds(line.getBounds(), { padding: [20, 20], maxZoom: 18 }); }, 50);
}

/* ---------- Rastreo con Geolocation API ---------- */
const R = 6371000, rad = x => x * Math.PI / 180;
const hav = (a, b) => { const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const geoErr = e => ({ 1: 'Permiso de ubicación denegado. Actívalo en el navegador.', 2: 'Ubicación no disponible.', 3: 'Se agotó el tiempo esperando el GPS.' })[e.code] || 'Error de geolocalización.';
let watchId = null, pts = [], dist = 0, t0 = 0, tick = null;

function startWalk() {
  if (!('geolocation' in navigator)) return toast('Tu dispositivo no soporta geolocalización. Usa el registro manual.');
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); // se pide con gesto del usuario
  pts = []; dist = 0; t0 = Date.now(); resetLiveMap();
  watchId = navigator.geolocation.watchPosition(p => {
    if (p.coords.accuracy > 50) return $('#gpsMsg').textContent = 'Señal GPS débil, esperando mejor precisión…';
    const pt = { lat: p.coords.latitude, lon: p.coords.longitude, t: p.timestamp }, last = pts[pts.length - 1];
    if (last) { const d = hav(last, pt); if (d < 3) return; dist += d; } // ignora ruido menor a 3 m
    pts.push(pt); $('#gpsMsg').textContent = 'GPS activo ✔'; liveUpdate(pt); updLive();
  }, e => { $('#gpsMsg').textContent = geoErr(e); }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
  tick = setInterval(updLive, 1000);
  $('#btnStart').disabled = true; $('#btnStop').disabled = false; $('#gpsMsg').textContent = 'Buscando señal GPS…';
}
function updLive() { const s = Math.floor((Date.now() - t0) / 1000); $('#lDist').textContent = kmF(dist); $('#lTime').textContent = timeF(s); $('#lPace').textContent = paceF(s, dist); }
async function stopWalk() {
  navigator.geolocation.clearWatch(watchId); clearInterval(tick);
  $('#btnStart').disabled = false; $('#btnStop').disabled = true;
  const sec = Math.floor((Date.now() - t0) / 1000);
  if (dist < 10) { $('#gpsMsg').textContent = 'Caminata muy corta, no se guardó.'; return; }
  await saveWalk({ name: 'Caminata ' + new Date().toLocaleDateString('es-MX'), date: Date.now(), duration: sec, distance: dist, points: pts, note: '' });
  $('#gpsMsg').textContent = 'Caminata guardada ✔';
}
async function saveWalk(w) {
  const before = weekMeters(await allWalks());
  await addWalk(w); const goal = await getGoal(), now = weekMeters(await allWalks());
  if (before < goal * 1000 && now >= goal * 1000) notify('¡Meta semanal cumplida! 🎉', `Llegaste a ${kmF(now)} km esta semana.`);
  await refresh();
}
async function notify(title, body) { // Notifications API
  toast(title);
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { const reg = await navigator.serviceWorker.ready; reg.showNotification(title, { body, icon: 'icons/icon-192.png' }); }
  catch { try { new Notification(title, { body }); } catch { } }
}

/* ---------- Estadísticas y vista ---------- */
const weekStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
const weekMeters = ws => ws.filter(w => w.date >= weekStart()).reduce((a, w) => a + w.distance, 0);
async function refresh() {
  const ws = (await allWalks()).sort((a, b) => b.date - a.date), goal = await getGoal();
  const tot = ws.reduce((a, w) => a + w.distance, 0), sec = ws.reduce((a, w) => a + w.duration, 0), wk = weekMeters(ws);
  $('#sTotal').textContent = kmF(tot); $('#sWeek').textContent = kmF(wk); $('#sCount').textContent = ws.length; $('#sPace').textContent = paceF(sec, tot);
  $('#goal').value = goal; const pct = Math.min(100, wk / (goal * 10)); $('#goalBar').value = pct;
  $('#goalTxt').textContent = `${kmF(wk)} de ${goal} km (${pct.toFixed(0)}%)`;
  // gráfica 7 días
  const ch = $('#chart'); ch.replaceChildren(); const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push(d); }
  const vals = days.map(d => ws.filter(w => w.date >= d.getTime() && w.date < d.getTime() + 864e5).reduce((a, w) => a + w.distance, 0)), mx = Math.max(...vals, 1);
  days.forEach((d, i) => { const col = el('div', null, 'col'), b = el('div', null, 'bar'); b.style.height = (vals[i] / mx * 80) + '%'; b.title = kmF(vals[i]) + ' km'; col.append(b, el('span', d.toLocaleDateString('es-MX', { weekday: 'narrow' }))); ch.append(col); });
  // historial
  const ul = $('#list'); ul.replaceChildren(); $('#empty').hidden = ws.length > 0;
  ws.forEach(w => {
    const li = el('li'); li.append(el('b', w.name), el('small', `${new Date(w.date).toLocaleString('es-MX')} · ${kmF(w.distance)} km · ${timeF(w.duration)} · ${paceF(w.duration, w.distance)} min/km`));
    if (w.note) li.append(el('small', '📝 ' + w.note));
    const row = el('div', null, 'row');
    const btn = (t, fn) => { const b = el('button', t); b.onclick = fn; row.append(b); };
    if (w.points && w.points.length > 1) btn('Ver ruta', () => showRoute(w));
    btn('Editar', () => { editId = w.id; $('#eName').value = w.name; $('#eNote').value = w.note || ''; $('#dEdit').showModal(); });
    btn('Compartir', () => share(w));
    btn('Borrar', async () => { if (confirm('¿Borrar esta caminata?')) { await delWalk(w.id); toast('Caminata borrada'); refresh(); } });
    li.append(row); ul.append(li);
  });
}
async function share(w) { // Web Share API con respaldo al portapapeles
  const text = `Caminé ${kmF(w.distance)} km en ${timeF(w.duration)} con FitWalk 🚶`;
  try { if (navigator.share) await navigator.share({ title: 'FitWalk', text }); else { await navigator.clipboard.writeText(text); toast('Texto copiado'); } }
  catch (e) { if (e.name !== 'AbortError') toast('No se pudo compartir'); }
}

/* ---------- Formularios (validación) ---------- */
let editId = null;
$('#fGoal').onsubmit = async e => { e.preventDefault(); const v = parseFloat($('#goal').value); if (!(v >= 1 && v <= 500)) return toast('La meta debe estar entre 1 y 500 km'); await setGoal(v); toast('Meta guardada'); refresh(); };
$('#fManual').onsubmit = async e => {
  e.preventDefault(); const name = $('#mName').value.trim(), km = parseFloat($('#mKm').value), min = parseInt($('#mMin').value, 10);
  if (!name || !(km >= 0.1 && km <= 100) || !(min >= 1 && min <= 600)) return toast('Revisa los datos del formulario');
  await saveWalk({ name, date: Date.now(), duration: min * 60, distance: km * 1000, points: [], note: '' }); e.target.reset(); toast('Caminata agregada');
};
$('#fEdit').onsubmit = async e => {
  e.preventDefault(); const name = $('#eName').value.trim(); if (!name) return toast('El nombre es obligatorio');
  const w = (await allWalks()).find(x => x.id === editId); if (!w) return;
  w.name = name; w.note = $('#eNote').value.trim(); await putWalk(w); $('#dEdit').close(); toast('Cambios guardados'); refresh();
};
$('#eCancel').onclick = () => $('#dEdit').close(); $('#mapClose').onclick = () => $('#dMap').close();
$('#btnStart').onclick = startWalk; $('#btnStop').onclick = () => stopWalk().catch(() => toast('Error al guardar'));

/* ---------- API REST: clima (Open-Meteo, sin API key) ---------- */
const WX = c => c === 0 ? 'Despejado ☀️' : c <= 3 ? 'Parcialmente nublado ⛅' : c <= 48 ? 'Niebla 🌫️' : c <= 67 ? 'Lluvia 🌧️' : c <= 77 ? 'Nieve ❄️' : c <= 82 ? 'Chubascos 🌦️' : 'Tormenta ⛈️';
$('#btnWeather').onclick = () => {
  if (!('geolocation' in navigator)) return toast('Geolocalización no disponible');
  $('#wx').textContent = 'Consultando…';
  navigator.geolocation.getCurrentPosition(async p => {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.coords.latitude.toFixed(3)}&longitude=${p.coords.longitude.toFixed(3)}&current=temperature_2m,weather_code,wind_speed_10m`);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const c = (await r.json()).current;
      $('#wx').textContent = `${WX(c.weather_code)} · ${c.temperature_2m} °C · viento ${c.wind_speed_10m} km/h`;
      $('#wxTip').textContent = c.temperature_2m >= 35 ? 'Mucho calor: camina temprano e hidrátate.' : c.weather_code >= 51 ? 'Posible lluvia: considera caminar bajo techo.' : 'Buen momento para caminar.';
    } catch { $('#wx').textContent = 'No se pudo obtener el clima (¿sin Internet?).'; $('#wxTip').textContent = ''; }
  }, e => { $('#wx').textContent = geoErr(e); }, { timeout: 10000 });
};

/* ---------- Estado de red, instalación y arranque ---------- */
const net = () => { const n = $('#net'); n.textContent = navigator.onLine ? 'En línea' : 'Sin conexión'; n.classList.toggle('off', !navigator.onLine); };
addEventListener('online', net); addEventListener('offline', net); net();
let ip; addEventListener('beforeinstallprompt', e => { e.preventDefault(); ip = e; $('#btnInstall').hidden = false; });
$('#btnInstall').onclick = async () => { if (!ip) return; ip.prompt(); await ip.userChoice; ip = null; $('#btnInstall').hidden = true; };
addEventListener('appinstalled', () => toast('FitWalk instalada ✔'));
(async () => {
  try { initLiveMap(); db = await openDB(); await refresh(); } catch { toast('No se pudo abrir el almacenamiento local (IndexedDB)'); }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => toast('No se pudo activar el modo offline'));
})();
