'use strict'
// RouteFlow — zero-build route planner (RouteXL-style layout). Plain JS + Leaflet from CDN.

// ---------- utils ----------
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d
const MILE = 1609.344
const hav = (a, b) => {
  const t = Math.PI / 180, dLa = (b.lat - a.lat) * t, dLo = (b.lng - a.lng) * t
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLo / 2) ** 2
  return 12742000 * Math.asin(Math.sqrt(h))
}
const toHM = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`
const fromHM = (s) => { const t = (s || '').split(':'); return t.length > 1 ? +t[0] * 60 + +t[1] : 0 }

const ICONS = {
  search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  pin: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  gear: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  car: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
  print: 'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
  down: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  mail: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  flag: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  ext: 'M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
  image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
  save: 'M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z',
  flip: 'M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z',
  play: 'M8 5v14l11-7z',
  skip: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
  phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
}
const ic = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`
// button html: data-act + optional data-id
const btn = (text, icon, act, id, extra = '') =>
  `<button class="ui-button${icon ? '' : ' plain'}" data-act="${act}"${id != null ? ` data-id="${id}"` : ''} title="${esc(text)}" ${extra}>${icon ? ic(icon) : ''}<span class="t">${esc(text)}</span></button>`

// ---------- settings & state ----------
const STYLES = {
  'OpenStreetMap.Grey': { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', max: 19, cls: 'grey-tiles' },
  'OpenStreetMap.Default': { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', max: 19 },
  'Esri.WorldStreetMap': { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', max: 19 },
  'Esri.WorldImagery': { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', max: 18 },
  OpenTopoMap: { url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', max: 17 },
}
const DEFAULTS = {
  optimize: true, departureTime: 480, servicetime: 5, navigation: '', geocoder: 'Photon', apikey: '', city: '',
  replaceTabs: true, locationWarning: true, mapStyle: 'OpenStreetMap.Grey', showLabels: true, mapLabels: false,
  printDetails: false, printHeight: '400px', printWidth: '800px', timeformat: '24', seperator: 'comma',
  unitLength: 'mi', unitVolume: 'gal', currency: '$', milage: 25, costs: 3.5, emissions: 8.9, speed: 100,
}
const KEY = 'routeflow-xl'
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } })()
const S = {
  locs: saved.locs || [], nextId: saved.nextId || 1, start: saved.start ?? null, finish: saved.finish ?? null,
  route: saved.route || null, departure: saved.departure ?? 480, cfg: { ...DEFAULTS, ...saved.cfg },
  popupId: null, importing: 0, optimizing: false, cancel: false, details: false, skipped: new Set(), fulfilledIds: [], importText: '',
}
const cfg = () => S.cfg
const loc = (id) => S.locs.find((l) => l.id === id)
let saveT
const save = () => {
  clearTimeout(saveT)
  saveT = setTimeout(() => {
    const d = { locs: S.locs, nextId: S.nextId, start: S.start, finish: S.finish, departure: S.departure, cfg: S.cfg }
    try { localStorage.setItem(KEY, JSON.stringify({ ...d, route: S.route })) } catch { try { localStorage.setItem(KEY, JSON.stringify(d)) } catch {} }
  }, 400)
}
function ensureSF() {
  if (!loc(S.start)) S.start = S.locs[0]?.id ?? null
  if (!loc(S.finish)) S.finish = S.start
}
const clearRoute = () => { S.route = null }
const touch = () => { clearRoute(); ensureSF(); render() }

// ---------- formatting ----------
function showTime(min) {
  if (min == null || isNaN(min)) return ''
  min = Math.round(min)
  const d = Math.floor(min / 1440)
  let h = Math.floor((min - d * 1440) / 60)
  const m = String(min - d * 1440 - h * 60).padStart(2, '0')
  let ap = ''
  if (cfg().timeformat == 12) { ap = h > 11 ? 'PM' : 'AM'; if (h > 12) h -= 12 }
  return (d > 0 ? d + 'd ' : '') + String(h).padStart(2, '0') + ':' + m + ap
}
const dur = (min) => { min = Math.round(min); return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}` }
function showDistance(m) {
  const mi = cfg().unitLength === 'mi'
  const v = mi ? m / MILE : m / 1000
  return (v >= 100 ? Math.floor(v) : Math.floor(v * 10) / 10) + (mi ? ' mi' : ' km')
}
const nameOf = (l, i) => {
  let n = l.name
  if (l.address && l.address !== l.name) n = n ? n + ' − ' + l.address : l.address
  return n || 'Stop ' + i + '.'
}
function twString(l) {
  let t = ''
  if (l.service > 0 && l.service != cfg().servicetime) t += `(${l.service} min)`
  if (l.ready > 0 || l.due > 0) {
    if (t) t += ' '
    if (l.ready > 0 && l.due > 0 && l.ready > l.due) t += showTime(l.due) + '≠' + showTime(l.ready)
    else t += (l.ready > 0 ? showTime(l.ready) : '') + (l.ready > 0 && l.due > 0 ? '⇌' : '⇨') + (l.due > 0 ? showTime(l.due) : '')
  }
  return t
}
function tags(l) {
  const tw = twString(l)
  const lab = (id) => { const o = loc(id); return o ? esc(nameOf(o).slice(0, 40)) : '' }
  let h = ''
  if (tw) h += ` <span class="tw">${tw}</span>`
  if (l.before != null || l.after != null) h += ` <span class="ord">${l.before != null ? '⇨' + lab(l.before) : ''}${l.after != null ? lab(l.after) + '⇨' : ''}</span>`
  if (l.fulfilled) h += ` <span class="ful">☑ ${esc(l.fulfilled.slice(0, 10) === new Date().toISOString().slice(0, 10) ? l.fulfilled.slice(11, 16) : l.fulfilled)}</span>`
  return h
}
const kindOf = (l) =>
  l.id === S.start && l.id === S.finish ? 'both' : l.id === S.start ? 'home' : l.id === S.finish ? 'finish'
  : l.ready || l.due ? 'timer' : l.before != null || l.after != null ? 'order' : 'stop'
const PIN = { stop: ['#555', ''], home: ['#2e8b57', '⌂'], finish: ['#c0392b', '⚑'], both: ['#2e8b57', '⌂⚑'], timer: ['#e68a3b', '⌚'], order: ['#5ec8bd', '⇨'] }
const pinSvg = (k, cls = 'marker-pin') =>
  `<svg class="${cls}" viewBox="0 0 32 37"><path d="M16 36S3 22 3 13a13 13 0 0126 0c0 9-13 23-13 23z" fill="${PIN[k][0]}" stroke="#fff" stroke-width="1.5"/><text x="16" y="18" text-anchor="middle" font-size="${k === 'both' ? 9 : 12}" fill="#fff" font-family="sans-serif">${PIN[k][1]}</text></svg>`

// ---------- geocoding: Photon / Nominatim (keyless), Mapbox / Google (key); biased + default city ----------
const GAP = { Nominatim: 1100, Photon: 250, Mapbox: 120, Google: 80 }, lastCall = {}
async function throttle(g) {
  const now = Date.now(), at = Math.max(now, (lastCall[g] || 0) + GAP[g])
  lastCall[g] = at
  if (at > now) await sleep(at - now)
}
async function getJSON(u) {
  const r = await fetch(u, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error(r.status)
  return r.json()
}
const join = (...p) => p.filter(Boolean).join(', ')
const bias = () => loc(S.start) || (map ? map.getCenter() : null)
const withCity = (q) => (cfg().city && !q.includes(',') ? `${q}, ${cfg().city}` : q)

async function geocodeWith(g, q, limit = 1) {
  await throttle(g)
  const e = encodeURIComponent(q), b = bias(), c = cfg()
  if (g === 'Google') {
    const r = await getJSON(`https://maps.googleapis.com/maps/api/geocode/json?address=${e}&key=${c.apikey}`)
    return (r.results || []).slice(0, limit).map((x) => ({ label: x.formatted_address, lat: x.geometry.location.lat, lng: x.geometry.location.lng, house: x.address_components.find((k) => k.types.includes('street_number'))?.short_name }))
  }
  if (g === 'Mapbox') {
    const r = await getJSON(`https://api.mapbox.com/geocoding/v5/mapbox.places/${e}.json?limit=${limit}${b ? `&proximity=${b.lng},${b.lat}` : ''}&access_token=${c.apikey}`)
    return (r.features || []).map((f) => ({ label: f.place_name, lat: f.center[1], lng: f.center[0], house: f.address }))
  }
  if (g === 'Photon') {
    const r = await getJSON(`https://photon.komoot.io/api/?q=${e}&limit=${limit}${b ? `&lat=${b.lat}&lon=${b.lng}` : ''}`)
    return (r.features || []).map((f) => {
      const a = f.properties
      const street = a.street ? [a.housenumber, a.street].filter(Boolean).join(' ') : a.name
      return { label: join(street, a.city || a.town || a.district, [a.state, a.postcode].filter(Boolean).join(' ')), lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], house: a.housenumber }
    })
  }
  const vb = b ? `&viewbox=${b.lng - 0.7},${b.lat + 0.7},${b.lng + 0.7},${b.lat - 0.7}` : ''
  const r = await getJSON(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}${vb}&q=${e}`)
  return r.map((x) => {
    const a = x.address || {}
    const street = a.road ? [a.house_number, a.road].filter(Boolean).join(' ') : x.name
    return { label: join(street, a.city || a.town || a.village || a.hamlet, [a.state, a.postcode].filter(Boolean).join(' ')) || x.display_name, lat: +x.lat, lng: +x.lon, house: a.house_number }
  })
}
const geocoderOrder = () => {
  const c = cfg(), keyed = c.apikey && ['Google', 'Mapbox'].includes(c.geocoder)
  return [...new Set([c.geocoder, 'Photon', 'Nominatim'])].filter((g) => keyed || !['Google', 'Mapbox'].includes(g))
}
async function resolve(q) {
  const qq = withCity(q)
  for (const g of geocoderOrder()) {
    try {
      const [r] = await geocodeWith(g, qq)
      if (r && r.label && r.lat && r.lng) return { ...r, precise: !!r.house || !/\d/.test(q) }
    } catch {}
  }
  return null
}
async function reverseGeo(lat, lng) {
  try {
    await throttle('Nominatim')
    const r = await getJSON(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
    const a = r.address || {}
    return join([a.house_number, a.road].filter(Boolean).join(' '), a.city || a.town || a.village, a.state) || r.display_name
  } catch {}
}

// ---------- import parsing (@name@, {note}, 08:00>>17:00, (10) service min) ----------
function parseFields(input) {
  const o = {}
  let m = /@([^@]*)@/.exec(input)
  if (m && m[1]) { o.name = m[1]; input = input.replace(/(\s*@[^@]*@\s*)/, '') }
  m = /{(.*)}/.exec(input)
  if (m && m[1]) { o.comments = m[1].slice(0, 200); input = input.replace(/(\s*{.*}\s*)/, '') }
  if (/>>/.test(input)) {
    const rd = /(\d+):(\d+)>>/.exec(input), du = />>(\d+):(\d+)/.exec(input)
    if (rd && +rd[1] > 0) o.ready = 60 * rd[1] + +rd[2]
    if (du && +du[1] > 0) o.due = 60 * du[1] + +du[2]
    input = input.replace(/(\d+:\d+>>\d+:\d+)/, '').replace(/(\d+:\d+>>)/, '').replace(/(>>\d+:\d+)/, '')
  }
  m = /\((\d+)\)/.exec(input)
  if (m && +m[1] > 0) { o.service = Math.min(1440, +m[1]); input = input.replace(/(\(\d+\))/, '') }
  o.text = input.replace(/\s\s+/g, ' ').trim()
  return o
}
function parseImport(text) {
  let lines
  try { const j = JSON.parse(text); lines = j.features || (Array.isArray(j) ? j : [j]) } catch {
    if (/google.*maps\/dir/i.test(text)) lines = text.split('/').map((p) => decodeURIComponent(p.replace(/\+/g, ' '))).filter((p) => !/http|www\.google|data=|[@!]/.test(p) && p.length >= 6)
    else lines = text.split('\n')
  }
  const out = { coords: [], addresses: [], problems: [] }, seen = new Set()
  for (const l of lines) {
    if (l && typeof l === 'object') {
      if (l.lat != null && l.lng != null) out.coords.push({ name: l.name, label: l.address || `${l.lat} , ${l.lng}`, lat: +l.lat, lng: +l.lng, comments: l.comments || '' })
      else if (l.geometry?.coordinates?.length === 2) out.coords.push({ name: l.properties?.name, label: l.properties?.address || l.properties?.name || '', lat: l.geometry.coordinates[1], lng: l.geometry.coordinates[0] })
      continue
    }
    const raw = String(l).trim().replace(/"/g, '').replace(/(\t|\v)/g, cfg().replaceTabs ? ', ' : ' ').replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
    if (!raw) continue
    if (raw.length < 4) { out.problems.push('Too short: ' + raw); continue }
    let m = /(-?\d{1,3}[.,]\d{4,})[^\d-]+(-?\d{1,3}[.,]\d{4,})/.exec(raw)
    if (m) { out.coords.push({ label: raw, lat: +m[1].replace(',', '.'), lng: +m[2].replace(',', '.') }); continue }
    if (!seen.has(raw)) { seen.add(raw); out.addresses.push(raw) }
  }
  return out
}

// ---------- routing: OSRM public server + local solver ----------
const OSRM = 'https://router.project-osrm.org'
const cs = (pts) => pts.map((p) => `${p.lng},${p.lat}`).join(';')

async function getMatrix(nodes) {
  const n = nodes.length, T = new Float64Array(n * n), D = new Float64Array(n * n)
  try {
    if (n > 100) throw 0
    const j = await getJSON(`${OSRM}/table/v1/driving/${cs(nodes)}?annotations=duration,distance`)
    if (j.code !== 'Ok') throw 0
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) { T[a * n + b] = j.durations[a][b] ?? 1e6; D[a * n + b] = j.distances[a][b] ?? 1e6 }
    return { T, D, approx: false }
  } catch {
    // ponytail: >100 stops → straight-line*1.3 @ ~30mph for ordering; real legs come from route call → self-host OSRM for true matrices
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) { const d = hav(nodes[a], nodes[b]) * 1.3; D[a * n + b] = d; T[a * n + b] = d / 13.4 }
    return { T, D, approx: true }
  }
}

// nearest neighbour + 2-opt + or-opt; time windows / visit-before/after as penalties. tour from start to end (end===start = round trip)
async function solve({ n, T, start, end, cons, depMin, onProgress, budget }) {
  const Sm = new Float64Array(n * n)
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) Sm[a * n + b] = (T[a * n + b] + T[b * n + a]) / 2
  const mid = []
  for (let i = 0; i < n; i++) if (i !== start && i !== end) mid.push(i)
  const constrained = cons.some((c) => c.ready || c.due || c.before >= 0 || c.after >= 0)
  const cost = (tour) => {
    let t = depMin * 60, pen = 0, prev = tour[0]
    const pos = new Int32Array(n).fill(-1)
    for (let k = 0; k < tour.length; k++) {
      const v = tour[k], c = cons[v]
      if (k > 0) t += T[prev * n + v]
      if (c.ready * 60 > t) t = c.ready * 60
      if (c.due && t > c.due * 60) pen += (t - c.due * 60) * 10
      if (pos[v] < 0) pos[v] = k
      t += c.service * 60
      prev = v
    }
    for (let v = 0; v < n; v++) {
      const c = cons[v]
      if (c.before >= 0 && pos[v] > pos[c.before]) pen += 7200
      if (c.after >= 0 && pos[v] < pos[c.after]) pen += 7200
    }
    return t - depMin * 60 + pen
  }
  let tour = [start]
  const left = [...mid]
  while (left.length) {
    const cur = tour[tour.length - 1]
    let bi = 0
    for (let k = 1; k < left.length; k++) if (Sm[cur * n + left[k]] < Sm[cur * n + left[bi]]) bi = k
    tour.push(left.splice(bi, 1)[0])
  }
  tour.push(end)
  if (constrained) {
    const byTime = [start, ...[...mid].sort((a, b) => (cons[a].due || cons[a].ready || 1e9) - (cons[b].due || cons[b].ready || 1e9)), end]
    if (cost(byTime) < cost(tour)) tour = byTime
  }
  const t0 = performance.now(), deadline = t0 + budget, L = tour.length
  const pass = () => {
    let improved = false
    for (let i = 1; i < L - 1; i++) {
      if (performance.now() > deadline) return improved
      for (let j = i + 1; j < L - 1; j++) {
        const a = tour[i - 1], b = tour[i], c = tour[j], d = tour[j + 1]
        if (constrained) {
          const cand = [...tour.slice(0, i), ...tour.slice(i, j + 1).reverse(), ...tour.slice(j + 1)]
          if (cost(cand) < cost(tour) - 1e-6) { tour = cand; improved = true }
        } else if (Sm[a * n + c] + Sm[b * n + d] < Sm[a * n + b] + Sm[c * n + d] - 1e-6) {
          tour.splice(i, j - i + 1, ...tour.slice(i, j + 1).reverse()); improved = true
        }
      }
    }
    for (let len = 1; len <= 3; len++)
      for (let i = 1; i + len < L - 1; i++) {
        if (performance.now() > deadline) return improved
        const seg = tour.slice(i, i + len), rest = [...tour.slice(0, i), ...tour.slice(i + len)]
        const p0 = tour[i - 1], nx = tour[i + len]
        const rem = Sm[p0 * n + seg[0]] + Sm[seg[len - 1] * n + nx] - Sm[p0 * n + nx]
        let best = { gain: 1e-6, at: -1, rev: false }
        const cur = constrained ? cost(tour) : 0
        for (let at = 0; at < rest.length - 1; at++) {
          const x = rest[at], y = rest[at + 1]
          if (x === p0 && y === nx) continue
          for (const rev of [false, true]) {
            const s = rev ? [...seg].reverse() : seg
            const gain = constrained
              ? cur - cost([...rest.slice(0, at + 1), ...s, ...rest.slice(at + 1)])
              : rem - (Sm[x * n + s[0]] + Sm[s[len - 1] * n + y] - Sm[x * n + y])
            if (gain > best.gain) best = { gain, at, rev }
          }
        }
        if (best.at >= 0) {
          const s = best.rev ? [...seg].reverse() : seg
          tour = [...rest.slice(0, best.at + 1), ...s, ...rest.slice(best.at + 1)]
          improved = true
        }
      }
    return improved
  }
  for (let it = 0; it < 200 && L > 3; it++) {
    onProgress((performance.now() - t0) / budget)
    await sleep(0)
    if (!pass() || performance.now() > deadline) break
  }
  return tour
}

// legs between consecutive points, 100 points per request so any stop count works
async function getLegs(pts, onProgress) {
  const legs = []
  for (let s = 0; s < pts.length - 1; s += 99) {
    const chunk = pts.slice(s, s + 100)
    try {
      const j = await getJSON(`${OSRM}/route/v1/driving/${cs(chunk)}?overview=false&geometries=geojson&steps=true`)
      if (j.code !== 'Ok') throw 0
      for (const l of j.routes[0].legs)
        legs.push({ d: l.distance, t: l.duration, geom: l.steps.flatMap((st) => st.geometry.coordinates.map(([x, y]) => [round(y, 5), round(x, 5)])), steps: l.steps.map(stepText).filter(Boolean) })
    } catch {
      for (let i = 0; i < chunk.length - 1; i++) { const d = hav(chunk[i], chunk[i + 1]) * 1.3; legs.push({ d, t: d / 13.4, geom: [[chunk[i].lat, chunk[i].lng], [chunk[i + 1].lat, chunk[i + 1].lng]], steps: [], approx: true }) }
    }
    onProgress(Math.min(1, (s + 99) / (pts.length - 1)))
  }
  return legs
}
function stepText(s) {
  const m = s.maneuver, n = s.name ? ' ' + s.name : '', mod = m.modifier || ''
  if (s.duration <= 0 && m.type !== 'arrive') return ''
  switch (m.type) {
    case 'depart': return `Head ${mod || 'out'}${n ? ' on' + n : ''}`
    case 'arrive': return 'Arrive at destination'
    case 'turn': return `Turn ${mod}${n ? ' onto' + n : ''}`
    case 'end of road': return `At the end of the road turn ${mod}${n ? ' onto' + n : ''}`
    case 'merge': return `Merge ${mod}${n ? ' onto' + n : ''}`
    case 'fork': return `Keep ${mod}${n ? ' onto' + n : ''}`
    case 'on ramp': case 'off ramp': return `Take the ramp ${mod}${n ? ' onto' + n : ''}`
    case 'roundabout': case 'rotary': return `At the roundabout take exit ${m.exit || ''}${n ? ' onto' + n : ''}`
    default: return `Continue${n ? ' on' + n : ''}`
  }
}

// ---------- dialogs ----------
const dlgs = {}
function openDialog(key, { title = 'RouteFlow', body = '', buttons, modal = true, width = 360, pos, full, skipClose, onClose } = {}) {
  closeDialog(key)
  const close = onClose || (() => closeDialog(key))
  if (!buttons) buttons = skipClose ? [] : [{ text: 'Close', icon: 'close', fn: close }]
  const wrap = document.createElement('div')
  wrap.innerHTML = `${modal ? '<div class="overlay"></div>' : ''}<div class="ui-dialog" role="dialog"><div class="bar"><span>${esc(title)}</span>${skipClose ? '' : `<button class="x" title="Close">${ic('close')}</button>`}</div><div class="content"></div>${buttons.length ? '<div class="pane"></div>' : ''}</div>`
  const d = $('.ui-dialog', wrap), content = $('.content', d)
  if (full) Object.assign(d.style, { left: '10px', top: '10px', width: 'calc(100vw - 20px)', height: 'calc(100vh - 20px)' })
  else {
    d.style.width = Math.min(width, innerWidth - 20) + 'px'
    if (pos) Object.assign(d.style, { right: pos.right + 'px', top: pos.top + 'px' })
    else Object.assign(d.style, { left: '50%', top: '50%', transform: 'translate(-50%,-50%)' })
  }
  if (typeof body === 'string') content.innerHTML = body
  else content.append(body)
  buttons.forEach((b) => {
    const el = document.createElement('div')
    el.innerHTML = btn(b.text, b.icon, '')
    const be = el.firstChild
    be.removeAttribute('data-act')
    be.onclick = b.fn
    $('.pane', d).append(be)
  })
  $('.x', d)?.addEventListener('click', close)
  // drag by title bar
  const bar = $('.bar', d)
  bar.onpointerdown = (e) => {
    if (e.target.closest('button')) return
    const r = d.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top
    bar.setPointerCapture(e.pointerId)
    bar.onpointermove = (m) => Object.assign(d.style, { transform: 'none', right: 'auto', left: Math.max(0, m.clientX - dx) + 'px', top: Math.max(0, m.clientY - dy) + 'px' })
    bar.onpointerup = () => (bar.onpointermove = null)
  }
  document.body.append(wrap)
  dlgs[key] = { wrap, content }
  applyLabels()
  $('.pane .ui-button', d)?.focus()
  return content
}
function closeDialog(key = 'main') { dlgs[key]?.wrap.remove(); delete dlgs[key] }
const showDialog = (html, o = {}) => openDialog('main', { body: html, ...o })
const busy = (msg) => showDialog(`<p>${msg}</p><div class="ui-progressbar"><div id="pbar"></div></div><p id="pcount" style="padding-top:1em"></p>`, { skipClose: true })
function progress(v, text) {
  const b = $('#pbar')
  if (b) b.style.width = Math.max(0, Math.min(100, v)) + '%'
  if (text != null && $('#pcount')) $('#pcount').textContent = text
}

// ---------- map ----------
let map, tileLayer, lines = [], popup
const markers = new Map()
let clickT
function initMap() {
  const v = (() => { try { return JSON.parse(localStorage.getItem(KEY + '-view')) } catch {} })()
  map = L.map('map-canvas', { zoomControl: false, center: v?.c || [39.5, -98.35], zoom: v?.z || 4 })
  new L.Control.Zoom({ position: 'bottomleft' }).addTo(map)
  popup = L.popup({ autoPan: false, offset: [0, -32], maxWidth: 360 })
  map.on('click', (e) => { clearTimeout(clickT); clickT = setTimeout(() => mapClick(e.latlng.lat, e.latlng.lng), 300) })
  map.on('dblclick', (e) => { clearTimeout(clickT); map.setView(e.latlng, map.getZoom() + 1) })
  map.on('moveend', () => { try { localStorage.setItem(KEY + '-view', JSON.stringify({ c: map.getCenter(), z: map.getZoom() })) } catch {} })
  map.on('popupclose', () => { if (!ignoreClose) { S.popupId = null; renderLocList() } })
  if (!v && navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => { if (!S.locs.length) map.setView([p.coords.latitude, p.coords.longitude], 11) }, () => {})
  setStyle()
}
function setStyle() {
  const st = STYLES[cfg().mapStyle] || STYLES['OpenStreetMap.Grey']
  tileLayer?.remove()
  tileLayer = L.tileLayer(st.url, { maxZoom: st.max, subdomains: 'abc', className: st.cls || '', attribution: '© OpenStreetMap contributors' }).addTo(map)
  map.setMaxZoom(st.max)
}
const fixMap = () => requestAnimationFrame(() => map.invalidateSize())
function toBounds() {
  map.invalidateSize()
  const pts = S.locs.map((l) => [l.lat, l.lng])
  if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30] })
  else if (pts.length) map.setView(pts[0], Math.max(map.getZoom(), 15))
}
function markerIcon(l) {
  let k = kindOf(l)
  if (k === 'stop' && S.route) {
    const num = S.route.order.indexOf(l.id)
    return { sig: 'n' + num + !!l.fulfilled, icon: L.divIcon({ className: l.fulfilled ? 'mk-done' : '', html: `<div class="mk-num">${num}</div><div class="mk-arrow"></div>`, iconSize: [32, 37], iconAnchor: [16, 37] }) }
  }
  return { sig: k + !!l.fulfilled, icon: L.divIcon({ className: l.fulfilled ? 'mk-done' : '', html: pinSvg(k), iconSize: [32, 37], iconAnchor: [16, 37] }) }
}
function drawMap() {
  const ids = new Set(S.locs.map((l) => l.id))
  for (const [id, o] of markers) if (!ids.has(id)) { o.m.remove(); markers.delete(id) }
  for (const l of S.locs) {
    const { sig, icon } = markerIcon(l)
    const title = l.name || l.address
    const full = [sig, title, !S.route, cfg().mapLabels, l.lat, l.lng].join('|')
    const o = markers.get(l.id)
    if (o && o.sig === full) continue
    o?.m.remove()
    const m = L.marker([l.lat, l.lng], { icon, draggable: !S.route })
      .bindTooltip(esc(title), { offset: [18, -22], direction: 'right', opacity: 1, permanent: !!cfg().mapLabels })
      .addTo(map)
    m.on('click', () => openPopup(l.id))
    m.on('dragend', () => dragged(l.id, m.getLatLng()))
    markers.set(l.id, { m, sig: full })
  }
  lines.forEach((x) => x.remove())
  lines = []
  if (S.route)
    S.route.legs.forEach((leg, i) => {
      const a = loc(S.route.order[i]), b = loc(S.route.order[i + 1])
      const line = L.polyline(leg.geom, { color: a?.fulfilled && b?.fulfilled ? '#e6a3a3' : '#CC0000', weight: 12, opacity: 0.5, lineCap: 'round', lineJoin: 'round' }).addTo(map)
      lines.push(line)
      if (leg.geom.length > 2 && L.polylineDecorator)
        lines.push(L.polylineDecorator(line, { patterns: [{ offset: 50, endOffset: 50, repeat: 200, symbol: L.Symbol.arrowHead({ pixelSize: 5, polygon: false, pathOptions: { stroke: true, color: '#fff', weight: 2, opacity: 0.7 } }) }] }).addTo(map))
    })
}

let ignoreClose = false
function popupHTML(l) {
  const i = S.locs.indexOf(l)
  let title = esc(nameOf(l, i))
  const timed = l.ready || l.due, ordered = l.before != null || l.after != null
  if (!timed && !ordered && title.length > 40 && (title.match(/,/g) || []).length < 3 && !l.comments) title = title.replace(/,/g, '<br/>')
  return `<div class="popupContents"><p>${title}${l.name && l.address && l.address !== l.name ? `<br/><span class="smaller">${esc(l.address)}</span>` : ''}${timed || ordered ? '<br/>' + tags(l) : ''}</p>
    <div>${btn('Start here', 'home', 'setStart', l.id)}${btn('Finish here', 'flag', 'setFinish', l.id)}${btn('Zoom in', 'search', 'zoomLoc', l.id)}${btn('Navigate', 'ext', 'navLoc', l.id)}${btn('Streetview', 'image', 'streetLoc', l.id)}${btn('Edit', 'edit', 'editLoc', l.id)}${btn('Delete', 'trash', 'delLoc', l.id)}</div>
    ${l.comments ? `<div class="comments">${esc(l.comments).replace(/\n/g, '<br/>')}</div>` : ''}</div>`
}
function openPopup(id) {
  const l = loc(id), mk = markers.get(id)
  if (!l || !mk) return
  S.popupId = id
  ignoreClose = true
  map.setView(mk.m.getLatLng(), map.getZoom())
  popup.setLatLng(mk.m.getLatLng()).setContent(popupHTML(l)).openOn(map)
  ignoreClose = false
  applyLabels()
  renderLocList()
}
function closePopup() { ignoreClose = true; map.closePopup(); ignoreClose = false; S.popupId = null }

// ---------- adding ----------
function mkLoc(p) {
  const l = { id: S.nextId++, name: '', address: '', original: '', comments: '', ready: 0, due: 0, service: S.locs.length ? cfg().servicetime : 0, before: null, after: null, fulfilled: 0, lat: 0, lng: 0 }
  for (const k in p) if (p[k] !== undefined) l[k] = p[k]
  return l
}
const fieldsLoc = (f, g) => mkLoc({ name: f.name || '', address: g.label, original: f.text, lat: g.lat, lng: g.lng, comments: f.comments || '', ready: f.ready || 0, due: f.due || 0, service: f.service })
function addLocs(items) { S.locs.push(...items); ensureSF() }

async function addByAddress(input) {
  const f = parseFields(input)
  clearRoute()
  closePopup()
  showDialog('Adding a new location, please wait.', { skipClose: true })
  const g = await resolve(f.text)
  if (!g) return showDialog(`"${esc(f.name || f.text)}" not found`)
  const l = fieldsLoc(f, g)
  addLocs([l])
  closeDialog()
  render()
  map.setView([l.lat, l.lng], Math.max(map.getZoom(), 14))
  openPopup(l.id)
  if (!g.precise && cfg().locationWarning) setTimeout(() => showDialog(`${esc(l.name || l.address)}: not a precise street address`, { modal: false }), 1500)
}
async function addByLatLng(lat, lng) {
  clearRoute()
  showDialog('Adding a new location, please wait.', { skipClose: true })
  const a = await reverseGeo(lat, lng)
  const l = mkLoc({ address: a || `${round(lat, 6)} , ${round(lng, 6)}`, lat, lng })
  addLocs([l])
  closeDialog()
  render()
  openPopup(l.id)
}
function mapClick(lat, lng) {
  closePopup()
  if (S.route) return render()
  if (S.importing) return showDialog('Addresses are being located. Please wait while we are importing your data.')
  if (S.optimizing) return showDialog('Finding route, please wait.')
  const min = Math.min(map.getMaxZoom(), 17)
  if (map.getZoom() < min) {
    showDialog('You need to zoom in to add locations by clicking.')
    setTimeout(() => closeDialog(), 2000)
    return map.setView([lat, lng], min)
  }
  addByLatLng(lat, lng)
}
async function dragged(id, ll) {
  const l = loc(id)
  if (S.route || !l) return render()
  Object.assign(l, { lat: ll.lat, lng: ll.lng })
  clearRoute()
  render()
  l.address = (await reverseGeo(ll.lat, ll.lng)) || `${round(ll.lat, 6)} , ${round(ll.lng, 6)}`
  render()
}

async function runImport(text) {
  const p = parseImport(text)
  if (!p.coords.length && !p.addresses.length)
    return showDialog(p.problems.length ? '<p>There were errors during import: </p>' + p.problems.map((x) => '&bull;&nbsp;' + esc(x)).join('<br/>') : 'No addresses found.')
  clearRoute()
  closeDialog('loc')
  S.cancel = false
  const total = p.addresses.length
  S.importing = total
  showDialog(`<p>Addresses are being located. Please wait while we are importing your data.</p><div class="ui-progressbar"><div id="pbar"></div></div><p id="pcount" style="padding-top:1em">0 / ${total}</p>`, { buttons: [{ text: 'Cancel', icon: 'close', fn: () => (S.cancel = true) }] })
  addLocs(p.coords.map((x) => mkLoc({ name: x.name || '', address: x.label, original: x.label, lat: x.lat, lng: x.lng, comments: x.comments || '' })))
  render()
  toBounds()
  const problems = p.problems.map(esc)
  let n = 0
  for (const line of p.addresses) {
    if (S.cancel) break
    const f = parseFields(line), g = await resolve(f.text)
    if (g) {
      addLocs([fieldsLoc(f, g)])
      if (!g.precise && cfg().locationWarning) problems.push(`${esc(f.name || g.label)}: not a precise street address`)
    } else problems.push(`${esc(f.name || f.text)}: not found`)
    S.importing = total - ++n
    progress((100 * n) / total, `${n} / ${total}`)
    if (n % 5 === 0 || n === total) render()
  }
  S.importing = 0
  render()
  toBounds()
  if (problems.length) showDialog('<p>There were errors during import: </p>' + problems.map((x) => '&bull;&nbsp;' + x).join('<br/>'), { modal: false })
  else { closeDialog(); locationsDialog() }
}

// ---------- planning ----------
const defaultTour = (si, fi, n) => [si, ...[...Array(n).keys()].filter((i) => i !== si && i !== fi), fi]
const pathCost = (tour, m, n) => tour.slice(1).reduce((a, v, i) => ({ t: a.t + m.T[tour[i] * n + v], d: a.d + m.D[tour[i] * n + v] }), { t: 0, d: 0 })

function planClick() {
  if (!S.locs.length) return locationsDialog()
  if (S.importing) return showDialog('Addresses are being located. Please wait while we are importing your data.')
  if (S.optimizing) return
  if (S.locs.length < 2) return showDialog('We need at least 2 addresses.')
  if (S.locs.some((l) => l.ready > 0 || l.due > 0)) {
    return showDialog(`<p>You added time windows!<br/><br/>Check your departure time:</p><input type="time" id="depTime" value="${toHM(S.departure || cfg().departureTime)}" /> (hh:mm)`, {
      title: 'Find route',
      buttons: [{ text: 'Start', icon: 'play', fn: () => { S.departure = fromHM($('#depTime').value); closeDialog(); closeDialog('loc'); runPlan() } }, { text: 'Cancel', icon: 'close', fn: () => closeDialog() }],
    })
  }
  S.departure = cfg().departureTime
  closeDialog('loc')
  runPlan()
}

async function runPlan(order) {
  S.optimizing = true
  S.route = null
  closePopup()
  render()
  busy('Finding route, please wait.')
  try {
    ensureSF()
    const c = cfg(), locs = S.locs, n = locs.length
    const idx = new Map(locs.map((l, i) => [l.id, i]))
    const si = idx.get(S.start), fi = idx.get(S.finish)
    let perf = '', approx = false
    if (!order) {
      const m = await getMatrix(locs)
      approx = m.approx
      for (let i = 0; i < m.T.length; i++) m.T[i] *= 100 / c.speed
      progress(10)
      const base = defaultTour(si, fi, n)
      let tour = base
      if (c.optimize) {
        const cons = locs.map((l) => ({ ready: l.ready, due: l.due, service: l.service, before: l.before != null ? idx.get(l.before) ?? -1 : -1, after: l.after != null ? idx.get(l.after) ?? -1 : -1 }))
        tour = await solve({ n, T: m.T, start: si, end: fi, cons, depMin: S.departure, budget: Math.min(8000, 1500 + n * 20), onProgress: (p) => progress(10 + p * 40) })
        const o = pathCost(base, m, n), p = pathCost(tour, m, n), sv = o.d - p.d
        if (sv > 100 && !approx) {
          const pct = (a, b) => Math.round((100 * a) / (b || 1))
          const co2 = round((sv / MILE / c.milage) * c.emissions, 1)
          perf = `Original travel time ${dur(o.t / 60)} h distance ${showDistance(o.d)}, optimal travel time ${dur(p.t / 60)} h distance ${showDistance(p.d)}. You save ${dur((o.t - p.t) / 60)} h (${pct(o.t - p.t, o.t)}%), ${showDistance(sv)} (${pct(sv, o.d)}%) and ${co2} lb CO₂.`
        }
      }
      order = tour.map((i) => locs[i].id)
    }
    const pts = order.map(loc)
    const legs = await getLegs(pts, (p) => progress(50 + p * 49))
    legs.forEach((l) => (l.t *= 100 / c.speed))
    let t = S.departure
    const arr = [t], dep = [t + (pts[0].service || 0)]
    for (let i = 1; i < pts.length; i++) {
      t = dep[i - 1] + legs[i - 1].t / 60
      arr[i] = t
      dep[i] = Math.max(t, pts[i].ready || 0) + (i < pts.length - 1 ? pts[i].service || 0 : 0)
    }
    S.route = { order, legs, arr, dep, dist: legs.reduce((a, l) => a + l.d, 0), dur: arr[arr.length - 1] - S.departure, perf, approx: approx || legs.some((l) => l.approx) }
    S.optimizing = false
    S.skipped = new Set()
    closeDialog()
    render()
    setTimeout(toBounds, 50)
  } catch (e) {
    S.optimizing = false
    render()
    showDialog('Something went wrong. Please try again.<br/><br/>' + esc(e?.message || e))
  }
}
const confirmChange = (fn) => showDialog('The route is adjusted. It will not be optimal. Are you sure?', { buttons: [{ text: 'Ok', fn: () => { closeDialog(); fn() } }, { text: 'Cancel', fn: () => { closeDialog(); renderLocList() } }] })
function flip() { const o = S.route.order; runPlan([o[0], ...o.slice(1, -1).reverse(), o[o.length - 1]]) }

// ---------- addresses dialog ----------
const listIds = () => {
  if (!S.route) return S.locs.map((l) => l.id)
  const o = S.route.order
  return o.length > 1 && o[o.length - 1] === o[0] ? o.slice(0, -1) : o
}
function locListHTML() {
  if (!S.locs.length) return 'There are no addresses yet.<br/><br/>There are three ways to add destinations:<br/><br/>- Type the address in the search bar<br/>- Click the location on the map<br/>- Import multiple addresses at once<br/><br/>'
  return '<ul id="locations-list">' + listIds().map((id, i) => {
    const l = loc(id)
    if (!l) return ''
    const sf = id === S.start || id === S.finish
    return `<li data-i="${i}" draggable="${!!S.route && !sf}" class="${S.popupId === id ? 'active' : ''} ${l.fulfilled ? 'done' : ''}">
      <a href="#" data-act="showLoc" data-id="${id}">${!sf && S.route ? `<span class="stopnum">${i}</span>` : pinSvg(kindOf(l), 'pin')}${esc(nameOf(l, S.locs.indexOf(l)))}</a>${tags(l)}</li>`
  }).join('') + '</ul>'
}
function renderLocList() { if (dlgs.loc) dlgs.loc.content.innerHTML = locListHTML() }
function locationsDialog() {
  const b = []
  if (S.route) {
    b.push({ text: 'Print', icon: 'print', fn: printLocations }, { text: 'Copy', icon: 'copy', fn: copyDialog }, { text: 'Flip', icon: 'flip', fn: () => confirmChange(flip) })
  } else if (navigator.geolocation) b.push({ text: 'Current', icon: 'pin', fn: addCurrent })
  b.push({ text: 'Close', icon: 'close', fn: () => closeDialog('loc') })
  const top = Math.max(10, $('#map-canvas').getBoundingClientRect().top + 10)
  openDialog('loc', { title: 'Addresses', body: locListHTML(), modal: false, width: 360, pos: { right: 10, top }, buttons: b })
}
let dragFrom = null
document.addEventListener('dragstart', (e) => { const li = e.target.closest?.('#locations-list li'); if (li) dragFrom = +li.dataset.i })
document.addEventListener('dragover', (e) => { const li = e.target.closest?.('#locations-list li'); if (li && dragFrom != null) { e.preventDefault(); $$('#locations-list li.over').forEach((x) => x.classList.remove('over')); li.classList.add('over') } })
document.addEventListener('drop', (e) => {
  const li = e.target.closest?.('#locations-list li')
  if (!li || dragFrom == null) return
  e.preventDefault()
  const to = +li.dataset.i, from = dragFrom
  dragFrom = null
  if (from === to) return renderLocList()
  const o = S.route.order, rt = o[0] === o[o.length - 1], core = rt ? o.slice(0, -1) : [...o]
  const [m] = core.splice(from, 1)
  core.splice(Math.max(1, Math.min(to, rt ? core.length : core.length - 1)), 0, m)
  confirmChange(() => runPlan(rt ? [...core, core[0]] : core))
})
function addCurrent() {
  navigator.geolocation.getCurrentPosition(async (p) => {
    const { latitude: lat, longitude: lng } = p.coords
    const l = mkLoc({ name: 'Current', address: (await reverseGeo(lat, lng)) || 'Current', lat, lng })
    clearRoute()
    addLocs([l])
    S.start = S.finish = l.id
    render()
    openPopup(l.id)
  }, (e) => showDialog('GPS: ' + esc(e.message)), { enableHighAccuracy: true, timeout: 15000 })
}
function copyDialog() {
  showDialog(`<textarea id="copyTa" style="width:100%;min-height:220px" readonly>${esc(S.route.order.map((id) => loc(id).original || loc(id).address).join('\n'))}</textarea>`)
  $('#copyTa').select()
}
function printLocations() {
  const r = S.route
  const rows = r.order.map((id, i) => { const l = loc(id); return `<tr style="vertical-align:top;border-bottom:1px solid #000"><td>${i}.</td><td>${showTime(r.arr[i])}</td><td>${esc(l.name)}</td><td><b>${esc(l.original || l.address)}</b></td><td><i>${showTime(l.service)}</i></td><td>${l.ready ? showTime(l.ready) : ''}</td><td>${l.due ? showTime(l.due) : ''}</td><td>${esc(l.comments)}</td></tr>` }).join('')
  const w = window.open('', 'Print')
  w.document.write(`<html><body style="font-family:sans-serif"><table style="border-collapse:collapse">${rows}</table></body></html>`)
  w.document.close(); w.focus(); w.print()
}

// ---------- location edit / delete ----------
function editDialog(id) {
  const l = loc(id), special = id === S.start || id === S.finish
  const others = S.locs.filter((x) => x.id !== id && x.id !== S.start && x.id !== S.finish)
  const sel = (k) => `<select id="e_${k}" style="max-width:240px"><option value=""></option>${others.map((o) => `<option value="${o.id}" ${l[k] === o.id ? 'selected' : ''}>${esc(nameOf(o).slice(0, 40))}</option>`).join('')}</select>`
  const time = (k) => `<input type="time" id="e_${k}" value="${l[k] > 0 ? toHM(l[k]) : ''}" />`
  showDialog(`<table style="width:100%"><tr><td colspan="2"><input id="e_name" maxlength="40" placeholder="Name" style="width:100%" value="${esc(l.name)}" /></td></tr>
    <tr><td colspan="2"><textarea id="e_comments" maxlength="200" placeholder="Note" style="width:100%;min-height:80px">${esc(l.comments)}</textarea></td></tr>
    ${special ? '' : `<tr><td>Ready time:</td><td>${time('ready')} (hh:mm)</td></tr><tr><td>Due time:</td><td>${time('due')} (hh:mm)</td></tr>
    <tr><td>Service time:</td><td><input type="time" id="e_service" value="${toHM(l.service)}" /> (hh:mm)</td></tr>
    <tr><td>Visit before:</td><td>${sel('before')}</td></tr><tr><td>Visit after:</td><td>${sel('after')}</td></tr>`}</table>`, {
    width: 460,
    buttons: [{ text: 'Ok', fn: () => {
      l.name = $('#e_name').value.trim()
      l.comments = $('#e_comments').value
      if (!special) {
        l.ready = $('#e_ready').value ? fromHM($('#e_ready').value) : 0
        l.due = $('#e_due').value ? fromHM($('#e_due').value) : 0
        l.service = fromHM($('#e_service').value)
        l.before = $('#e_before').value ? +$('#e_before').value : null
        l.after = $('#e_after').value ? +$('#e_after').value : null
      }
      closeDialog(); touch(); openPopup(id)
    } }, { text: 'Cancel', fn: () => closeDialog() }],
  })
  $('#e_name').focus()
}
function deleteDialog(id) {
  showDialog('Do you want to remove this location?', { buttons: [{ text: 'Delete', fn: () => {
    S.locs = S.locs.filter((l) => l.id !== id)
    S.locs.forEach((l) => { if (l.before === id) l.before = null; if (l.after === id) l.after = null })
    closePopup(); closeDialog(); touch()
  } }, { text: 'Cancel', fn: () => closeDialog() }] })
}

// ---------- download / share / fulfill ----------
function navUrl(lat, lng) {
  let app = cfg().navigation
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent), android = /Android/.test(navigator.userAgent)
  if (!app && ios) app = 'Apple Maps'
  if (/Apple/.test(app)) return `https://maps.apple.com/?daddr=${lat},${lng}`
  if (/Waze/.test(app)) return `https://waze.com/ul?ll=${lat}%2C${lng}&navigate=yes`
  if (/Google Nav/.test(app)) return ios ? `comgooglemaps://?daddr=${lat},${lng}` : android ? `google.navigation:q=${lat},${lng}` : `https://www.google.com/maps/dir/Current+Location/${lat},${lng}`
  if (/Geo/.test(app)) return ios ? `maps:${lat},${lng}` : `geo:${lat},${lng}`
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
}
const exportStops = () => S.route.order.map((id, i) => { const l = loc(id); return { n: i, name: nameOf(l, i), address: l.address, lat: l.lat, lng: l.lng, comments: l.comments, arr: S.route.arr[i], service: l.service, ready: l.ready, due: l.due } })
function download(file, mime, text) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: mime + ';charset=utf-8' }))
  a.download = file
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}
const sep = () => ({ semicolon: ';', comma: ',', tab: '\t' })[cfg().seperator] || ','
function exportFile(k) {
  const s = exportStops(), x = (v) => esc(v), q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  if (k === 'gpx') return download('route.gpx', 'application/gpx+xml', `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="RouteFlow" xmlns="http://www.topografix.com/GPX/1/1">${s.map((p) => `<wpt lat="${p.lat}" lon="${p.lng}"><name>${x(p.n + '. ' + p.name)}</name></wpt>`).join('')}<rte><name>RouteFlow</name>${s.map((p) => `<rtept lat="${p.lat}" lon="${p.lng}"><name>${x(p.n + '. ' + p.name)}</name></rtept>`).join('')}</rte></gpx>`)
  if (k === 'kml') return download('route.kml', 'application/vnd.google-earth.kml+xml', `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>RouteFlow</name>${s.map((p) => `<Placemark><name>${x(p.n + '. ' + p.name)}</name><description>${x(p.comments)}</description><Point><coordinates>${p.lng},${p.lat}</coordinates></Point></Placemark>`).join('')}<Placemark><name>Route</name><LineString><coordinates>${s.map((p) => p.lng + ',' + p.lat).join(' ')}</coordinates></LineString></Placemark></Document></kml>`)
  if (k === 'txt') return download('route.txt', 'text/plain', s.map((p) => `${p.n}. ${p.address || p.name}`).join('\r\n'))
  const rows = [['#', 'Address', 'Name', 'Lat', 'Lng', 'Arrival', 'Service time', 'Ready time', 'Due time', 'Note'], ...s.map((p) => [p.n, p.address, p.name, p.lat, p.lng, showTime(p.arr), showTime(p.service), p.ready ? showTime(p.ready) : '', p.due ? showTime(p.due) : '', p.comments])]
  download('route.csv', 'text/csv', rows.map((r) => r.map(q).join(sep())).join('\r\n'))
}
function downloadDialog() {
  if (!S.route) return showDialog('You need to find a route first, after which you can save your route.')
  const o = S.route.order.map(loc)
  const links = {
    gmaps: 'https://www.google.com/maps/dir/' + o.map((l) => `${l.lat},${l.lng}`).join('/') + '/',
    gh: 'https://graphhopper.com/maps/?' + o.map((l) => `point=${l.lat}%2C${l.lng}`).join('&'),
    geo: 'geo:' + o.slice(1).map((l) => `${l.lat},${l.lng}`).join('&'),
    abrp: 'https://abetterrouteplanner.com/?destinations=' + encodeURIComponent(JSON.stringify(o.map((l) => ({ address: nameOf(l), lat: l.lat, lon: l.lng })))),
  }
  showDialog(`<p>Download route for navigation (GPX), Google Earth (KML) or Excel™ (CSV).</p>
    ${['gpx', 'kml', 'csv', 'txt'].map((k) => btn(k.toUpperCase(), '', 'exp', null, `data-k="${k}"`)).join(' ')}
    <p style="padding-top:1em">Or open in</p>
    ${btn('Google Maps', '', 'open', null, `data-u="${esc(links.gmaps)}"`)} ${btn('Graphhopper', '', 'open', null, `data-u="${esc(links.gh)}"`)} ${btn('Geo:App', '', 'open', null, `data-u="${esc(links.geo)}"`)} ${btn('EV planner', '', 'open', null, `data-u="${esc(links.abrp)}"`)} ${btn('Fulfill', '', 'fulfill')} ${btn('Clipboard', '', 'clipboard')}`, { width: 420 })
}
function clipboardDialog() {
  const f = { n: '#', address: 'Address', name: 'Name', coords: 'Coordinates', service: 'Service time', tw: 'Timewindow', note: 'Note' }
  showDialog(`${Object.entries(f).map(([k, l]) => `<label><input type="checkbox" data-cb="${k}" checked> ${l}</label> `).join('')}<br/><br/><textarea id="cbTa" style="width:95%;height:16em" readonly></textarea><br/><br/><label><input type="checkbox" data-cb="head"> Add headers</label>`, { width: 560 })
  const upd = () => {
    const on = (k) => $(`[data-cb="${k}"]`).checked, s = sep()
    let t = ''
    if (on('head')) t += [on('n') && '"#"', on('address') && '"Address"', on('name') && '"Name"', on('coords') && '"Lat"' + s + '"Lng"', on('service') && '"Service time"', on('tw') && '"Ready time"' + s + '"Due time"', on('note') && '"Note"'].filter(Boolean).join(s) + '\r\n'
    t += exportStops().map((p) => [on('n') && p.n, on('address') && `"${p.address}"`, on('name') && `"${p.name}"`, on('coords') && p.lat + s + p.lng, on('service') && `"${showTime(p.service)}"`, on('tw') && `"${p.ready ? showTime(p.ready) : ''}"` + s + `"${p.due ? showTime(p.due) : ''}"`, on('note') && `"${p.comments}"`].filter((x) => x !== false).join(s)).join('\r\n')
    $('#cbTa').value = t
  }
  $$('[data-cb]').forEach((c) => (c.onchange = upd))
  upd()
}
// share = whole plan in the URL hash (no server)
const enc = (d) => btoa(unescape(encodeURIComponent(JSON.stringify(d)))).replace(/\+/g, '-').replace(/\//g, '_')
const dec = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))))
function shareDialog() {
  if (!S.route) return showDialog('There is no route. Enter locations and find the optimal route. Then share it with others.')
  const url = location.origin + location.pathname + '#r=' + enc({ l: S.locs.map((l) => [l.id, l.lat, l.lng, l.name, l.address, l.comments, l.ready, l.due, l.service, l.before, l.after]), s: S.start, f: S.finish, o: S.route.order, d: S.departure })
  showDialog(`The route has been found. Save the link or share it with others:<br/><br/><input id="shareLink" style="width:95%;color:#00f" readonly value="${esc(url)}"><br/><br/>
    ${btn('Copy link', 'copy', 'copyLink')} ${btn('Email', 'mail', 'open', null, `data-u="${esc('mailto:?subject=RouteFlow&body=' + encodeURIComponent(url))}"`)} ${btn('WhatsApp', '', 'open', null, `data-u="${esc('whatsapp://send?text=' + encodeURIComponent('I found the fastest route with multiple stops: ' + url))}"`)}
    ${url.length > 60000 ? '<p class="smaller" style="padding-top:1em">This link is very long; some apps may cut it off.</p>' : ''}`, { width: 440 })
  $('#shareLink').select()
}
function fulfillHTML() {
  const r = S.route
  return r.order.map((id, i) => {
    const l = loc(id)
    if (!l || l.fulfilled || S.skipped.has(i)) return ''
    const tel = l.comments && (/\+?[\d/()\- ]{10,18}/.exec(l.comments) || [])[0]
    const head = id === S.start && i === 0 ? '⌂' : id === S.finish && i === r.order.length - 1 ? '⚑' : '#' + i
    return `<div class="ff"><div class="head">${head}${r.arr[i] > 0 ? ' − ⌚ ' + showTime(r.arr[i]) : ''}</div>
      <div class="body">${esc(nameOf(l, i))}${l.name && l.address && l.address !== l.name ? `<br/><span class="smaller">${esc(l.address)}</span>` : ''}${tags(l)}</div>
      ${l.comments ? `<div class="comments">${esc(l.comments)}</div>` : ''}
      <div class="btns">${btn('Navigate', 'play', 'navLoc', id)}${btn('Skip', 'skip', 'ffSkip', i)}${tel ? btn(tel, 'phone', 'open', null, `data-u="tel:${esc(tel)}"`) : ''}<span class="r">${btn('Check off', 'check', 'ffDone', i)}</span></div></div>`
  }).join('') || '<p>All stops done.</p>'
}
function fulfillDialog() {
  if (!S.route) return
  openDialog('main', { title: 'Fulfill', full: true, body: fulfillHTML(), buttons: [{ text: 'Replan', icon: 'skip', fn: replan }, { text: 'Close', icon: 'close', fn: () => { closeDialog(); render() } }] })
}
function replan() {
  const cur = S.fulfilledIds[S.fulfilledIds.length - 1]
  if (cur == null) return showDialog('Check off at least one stop first. Replan starts the new route from the last stop you checked off.')
  S.locs = S.locs.filter((l) => !(S.fulfilledIds.includes(l.id) && l.id !== cur && l.id !== S.finish))
  S.start = cur
  const d = new Date()
  S.departure = 60 * d.getHours() + d.getMinutes()
  S.fulfilledIds = []
  ensureSF()
  runPlan()
}

// ---------- options ----------
const OPT = {
  Routing: [['Optimize routes', 'optimize', 'check'], ['Default departure time', 'departureTime', 'time'], ['Default service time', 'servicetime', 'time'], ['Navigate with', 'navigation', 'select', ['', 'Apple Maps', 'Google Maps', 'Google Navigation', 'Waze', 'Geo:App']]],
  Geocoding: [['Default City, State', 'city', 'text'], ['Preference', 'geocoder', 'select', ['Photon', 'Nominatim', 'Mapbox', 'Google']], ['API key (Mapbox / Google)', 'apikey', 'text'], ['Replace tabs with commas', 'replaceTabs', 'check'], ['Check address precise', 'locationWarning', 'check']],
  Styling: [['Map style', 'mapStyle', 'select', Object.keys(STYLES)], ['Show labels on map', 'mapLabels', 'check'], ['Buttons with text', 'showLabels', 'check'], ['Time format', 'timeformat', 'select', [['24', '24h'], ['12', '12h']]], ['CSV separator', 'seperator', 'select', ['semicolon', 'comma', 'tab']]],
  Print: [['Print all details', 'printDetails', 'check'], ['Page width (pixels)', 'printWidth', 'text'], ['Map height (pixels)', 'printHeight', 'text']],
  Parameters: [['Unit of distance', 'unitLength', 'select', ['mi', 'km']], ['Unit of volume', 'unitVolume', 'select', ['gal', 'l', 'kWh']], ['Currency', 'currency', 'text'], ['Avg fuel economy (per unit volume)', 'milage', 'num'], ['Fuel costs (per unit volume)', 'costs', 'num'], ['Avg carbon emission (lb per unit volume)', 'emissions', 'num'], ['Speed (%)', 'speed', 'num']],
}
function optionsDialog() {
  const c = cfg()
  const field = ([label, k, type, opts]) => {
    const v = c[k]
    const input = type === 'check' ? `<input type="checkbox" data-k="${k}" ${v ? 'checked' : ''}>`
      : type === 'time' ? `<input type="time" data-k="${k}" data-t="time" value="${toHM(v)}">`
      : type === 'num' ? `<input type="number" step="any" data-k="${k}" data-t="num" value="${esc(v)}" style="max-width:6em">`
      : type === 'select' ? `<select data-k="${k}">${opts.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(lab)}</option>` }).join('')}</select>`
      : `<input data-k="${k}" value="${esc(v)}">`
    return `<tr><td align="right">${label}</td><td>${input}</td></tr>`
  }
  const tabs = Object.keys(OPT)
  showDialog(`<ul class="tabs">${tabs.map((t, i) => `<li><a data-act="otab" data-t="${t}" class="${i ? '' : 'on'}">${t}</a></li>`).join('')}</ul>
    ${tabs.map((t, i) => `<div class="tabpanel ${i ? 'hidden' : ''}" data-panel="${t}"><table class="ptable">${OPT[t].map(field).join('')}</table></div>`).join('')}`, {
    title: 'Options', width: 560,
    buttons: [{ text: 'Save', icon: 'save', fn: () => {
      const old = { ...c }
      $$('[data-k]').forEach((e) => { S.cfg[e.dataset.k] = e.type === 'checkbox' ? e.checked : e.dataset.t === 'time' ? fromHM(e.value) : e.dataset.t === 'num' ? +e.value || 0 : e.value.trim() })
      if (['optimize', 'speed', 'unitLength', 'milage', 'costs', 'servicetime'].some((k) => old[k] !== S.cfg[k])) clearRoute()
      if (old.mapStyle !== S.cfg.mapStyle) setStyle()
      markers.forEach((o) => o.m.remove()); markers.clear()
      closeDialog(); render()
    } }, { text: 'Cancel', icon: 'close', fn: () => closeDialog() }],
  })
}

// ---------- misc ----------
function importDialog() {
  if (S.importing || S.optimizing) return
  showDialog(`<br/>Type or paste addresses. One address per line.<br/><br/><textarea id="importTa" style="width:100%;min-height:200px">${esc(S.importText)}</textarea>`, {
    title: 'Import', width: 480,
    buttons: [{ text: 'Import', icon: 'check', fn: () => { const t = $('#importTa').value; S.importText = ''; closeDialog(); runImport(t) } }, { text: 'Cancel', icon: 'close', fn: () => { S.importText = $('#importTa').value; closeDialog() } }],
  })
  $('#importTa').focus()
}
const helpDialog = () => showDialog(`<p><b>Adding stops</b><br/>Search bar, Import (one per line), or click the map when zoomed in. Set <i>Default City, State</i> in Options → Geocoding so "450 Myers St" is enough.</p>
  <p><b>Import extras</b><br/><code>@Name@</code> name, <code>{note}</code> comment, <code>08:00&gt;&gt;17:00</code> time window, <code>(10)</code> service minutes. Coordinates and Google Maps links work too.</p>
  <p><b>Route</b><br/>Find route sorts every stop. Click a marker for Start here / Finish here. Drag stops in Addresses to change order.</p>`, { title: 'Help', modal: false, width: 420 })
const aboutDialog = () => showDialog('<p><b>RouteFlow</b> finds the fastest order for many stops, no address limit, no account.</p><p>Maps © OpenStreetMap contributors. Routing: OSRM public server. Geocoding: Photon / Nominatim (or your Mapbox/Google key).</p><p>All data stays in this browser.</p>', { title: 'About', modal: false })
function resetDialog() {
  showDialog('Start over, all addresses will be removed?', { title: 'Reset', buttons: [{ text: 'Yes', icon: 'check', fn: () => {
    Object.assign(S, { locs: [], start: null, finish: null, route: null, fulfilledIds: [] })
    closePopup(); closeDialog(); closeDialog('loc'); render()
  } }, { text: 'Cancel', icon: 'close', fn: () => closeDialog() }] })
}
function printPage() {
  const c = cfg(), m = $('#map-canvas'), page = $('#page')
  closeDialog(); closeDialog('loc'); closePopup()
  const oh = m.style.height
  page.style.width = c.printWidth || '800px'
  if (/^0(px)?$/.test(c.printHeight)) m.style.display = 'none'
  else m.style.height = c.printHeight
  fixMap(); toBounds()
  setTimeout(() => {
    window.print()
    setTimeout(() => { page.style.width = ''; m.style.height = oh; m.style.display = ''; layout() }, 500)
  }, 1000)
}

// ---------- route instructions panel ----------
function renderRoute() {
  const el = $('#route-canvas'), r = S.route
  el.classList.toggle('hidden', !r)
  if (!r) return (el.innerHTML = '')
  const c = cfg(), o = r.order.map(loc)
  if (o.some((x) => !x)) return
  let cum = 0, rows = ''
  r.legs.forEach((leg, i) => {
    const l = o[i + 1], arr = r.arr[i + 1], dep = r.dep[i + 1]
    cum += leg.d
    if (leg.steps.length) rows += `<tr class="print-detail" style="${S.details || c.printDetails ? '' : 'display:none'}"><td colspan="3"><ul>${leg.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></td></tr>`
    rows += `<tr><td>${c.printDetails ? `⌛ ${dur(leg.t / 60)} h ${showDistance(leg.d)}` : ''}</td>
      <td style="white-space:nowrap">⌚ ${showTime(arr)}${c.printDetails && dep > arr ? ' &gt; ' + showTime(dep) : ' - ' + showDistance(cum)}</td>
      <td><strong>${i + 1}. ${esc(nameOf(l, i + 1))}</strong>${tags(l)}${l.comments ? `<br/><i>${esc(l.comments)}</i>` : ''}</td></tr>`
  })
  const vol = cfg().unitVolume, fuel = (c.unitLength === 'mi' || vol === 'gal' ? r.dist / MILE : r.dist / 1000) / c.milage
  el.innerHTML = `<span class="no-print" style="float:right">${btn('Details', '', 'details')}</span>
    <table><tr><td>&nbsp;</td><td>⌚ ${showTime(S.departure)}</td><td>⌂ ${esc(nameOf(o[0], 0))}${o[0].comments ? `<br/><i>${esc(o[0].comments)}</i>` : ''}</td></tr>${rows}</table>
    <div id="performance"><div style="font-weight:bold;font-size:110%">Total: ${dur(r.dur)} h, ${showDistance(r.dist)}, ${round(fuel, 1)} ${vol}, ${esc(c.currency)} ${round(fuel * c.costs, 2).toFixed(2)}</div>
    ${r.perf ? '<br/>' + r.perf : ''}${r.approx ? '<br/><i>Some distances are estimated (routing server unavailable or very large route).</i>' : ''}</div>`
}

// ---------- layout / render ----------
function applyLabels() {
  const narrow = !cfg().showLabels || innerWidth < 800
  document.body.classList.toggle('icononly', narrow)
  $$('.ui-button[data-i]').forEach((b) => { if (!b.querySelector('svg')) b.insertAdjacentHTML('afterbegin', ic(b.dataset.i)) })
}
function layout() {
  const h = innerHeight - $('#heading').offsetHeight - $('#menu-canvas').offsetHeight - $('#bottom-canvas').offsetHeight - (innerHeight > 1000 ? $('#footer-canvas').offsetHeight : 0)
  $('#map-canvas').style.height = Math.max(150, h) + 'px'
  $('#footer-canvas').style.display = innerHeight < 768 ? 'none' : ''
  applyLabels()
  if (map) fixMap()
}
function render() {
  ensureSF()
  $('#status').innerHTML = S.importing ? `Searching addresses: ${S.importing}<span class="spin"></span>` : S.optimizing ? 'Optimizing route<span class="spin"></span>' : ''
  $('#planBtn').disabled = S.optimizing || S.importing > 0
  $('#fulfillBtn').classList.toggle('hidden', !S.route)
  drawMap()
  renderRoute()
  renderLocList()
  if (S.popupId != null && loc(S.popupId) && map.hasLayer(popup)) { popup.setContent(popupHTML(loc(S.popupId))); applyLabels() }
  save()
}

// ---------- events ----------
const ACT = {
  search: () => doSearch(), import: importDialog, addresses: () => (dlgs.loc ? closeDialog('loc') : locationsDialog()), options: optionsDialog,
  plan: planClick, fulfill: fulfillDialog, print: printPage, download: downloadDialog, share: shareDialog, reset: resetDialog,
  about: aboutDialog, help: helpDialog, clipboard: clipboardDialog,
  setStart: (id) => { S.start = id; touch(); openPopup(id) },
  setFinish: (id) => { S.finish = id; touch(); openPopup(id) },
  zoomLoc: (id) => { const l = loc(id); map.setView([l.lat, l.lng], map.getMaxZoom()) },
  navLoc: (id) => { const l = loc(id); window.open(navUrl(l.lat, l.lng), 'Navigate') },
  streetLoc: (id) => { const l = loc(id); window.open(`https://maps.google.com/maps?q=&layer=c&cbll=${l.lat},${l.lng}&cbp=`, 'streetview') },
  editLoc: editDialog, delLoc: deleteDialog,
  showLoc: (id, t, e) => { e.preventDefault(); openPopup(id) },
  exp: (_, t) => exportFile(t.dataset.k),
  open: (_, t) => window.open(t.dataset.u, '_blank'),
  copyLink: () => { navigator.clipboard?.writeText($('#shareLink').value) },
  details: () => { S.details = !S.details; renderRoute() },
  otab: (_, t) => { $$('.tabs a').forEach((a) => a.classList.toggle('on', a === t)); $$('[data-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== t.dataset.t)) },
  ffSkip: (i) => { S.skipped.add(i); dlgs.main.content.innerHTML = fulfillHTML(); applyLabels() },
  ffDone: (i) => {
    const l = loc(S.route.order[i]), d = new Date(), p = (n) => String(n).padStart(2, '0')
    l.fulfilled = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    S.fulfilledIds.push(l.id)
    render()
    dlgs.main.content.innerHTML = fulfillHTML()
    applyLabels()
  },
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]')
  if (!e.target.closest('#sugg')) $('#sugg').classList.add('hidden')
  if (!t || !ACT[t.dataset.act]) return
  ACT[t.dataset.act](t.dataset.id != null ? +t.dataset.id : undefined, t, e)
})

// search bar + autocomplete
const sInput = $('#searchAddressInput')
let sugg = [], suggN = 0, suggT
function doSearch() {
  const v = sInput.value.trim()
  ++suggN
  $('#sugg').classList.add('hidden')
  if (v.length < 4 || !/[a-z]{2,}/i.test(v)) {
    if (/-?\d{1,3}[.,]\d{4,}[^\d-]+-?\d{1,3}[.,]\d{4,}/.test(v)) return runImport(v)
    return showDialog('An address needs to be at least 4 characters and 2 alphabetic.')
  }
  addByAddress(v).then(() => sInput.select())
}
sInput.addEventListener('keydown', (e) => e.key === 'Enter' && doSearch())
sInput.addEventListener('input', () => {
  clearTimeout(suggT)
  const q = sInput.value.trim(), my = ++suggN
  if (q.length < 4) return $('#sugg').classList.add('hidden')
  suggT = setTimeout(async () => {
    for (const g of geocoderOrder()) {
      try {
        const r = (await geocodeWith(g, withCity(q), 5)).filter((x) => x.label.length > 6)
        if (my !== suggN) return
        sugg = r
        const rect = sInput.getBoundingClientRect(), ul = $('#sugg')
        Object.assign(ul.style, { left: rect.left + 'px', top: rect.bottom + 'px', width: Math.max(rect.width, 260) + 'px' })
        ul.innerHTML = r.map((x, i) => `<li data-pick="${i}">${esc(x.label)}</li>`).join('')
        ul.classList.toggle('hidden', !r.length)
        return
      } catch {}
    }
  }, 700)
})
$('#sugg').addEventListener('click', (e) => {
  const li = e.target.closest('[data-pick]')
  if (!li) return
  const r = sugg[+li.dataset.pick]
  $('#sugg').classList.add('hidden')
  sInput.value = r.label
  ++suggN
  clearRoute()
  const l = mkLoc({ address: r.label, original: r.label, lat: r.lat, lng: r.lng })
  addLocs([l])
  render()
  map.setView([l.lat, l.lng], Math.max(map.getZoom(), 14))
  openPopup(l.id)
})

window.addEventListener('resize', layout)

// ---------- boot ----------
layout()
initMap()
if (/^#r=/.test(location.hash)) {
  try {
    const d = dec(location.hash.slice(3))
    S.locs = d.l.map(([id, lat, lng, name, address, comments, ready, due, service, before, after]) => ({ id, lat, lng, name, address, original: address, comments, ready, due, service, before, after, fulfilled: 0 }))
    S.nextId = Math.max(0, ...S.locs.map((l) => l.id)) + 1
    S.start = d.s; S.finish = d.f; S.departure = d.d
    history.replaceState(null, '', location.pathname)
    setTimeout(() => runPlan(d.o), 300)
  } catch {}
}
render()
if (S.locs.length) setTimeout(toBounds, 100)
if (!localStorage.getItem(KEY + '-welcome')) {
  localStorage.setItem(KEY + '-welcome', '1')
  showDialog("The best route with multiple stops <br/>in three easy steps:<br/><br/>1. Enter all addresses<br/>2. Click 'Find route' button<br/>3. The route is optimized", { width: 320, buttons: [{ text: 'Get started', icon: 'play', fn: () => closeDialog() }] })
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {})
