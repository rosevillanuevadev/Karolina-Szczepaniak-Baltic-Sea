// ======= CONFIG =======
const GPX_URL =
  "https://raw.githubusercontent.com/rosevillanuevadev/Karolina-Szczepaniak-Baltic-Sea/refs/heads/main/Morze%20Emocji%202025%20track%20(2).gpx";
const TRACK_COLOR = "blue";
const FILENAME = "Morze Emocji 2025 track (2).gpx";

// ======= MAP =======
const map = L.map("map", { center: [55.0, 18.0], zoom: 6, zoomControl: true });
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

let layer = null;   // omnivore layer
let meta  = null;   // start/end info for popup

// ======= Helpers =======
function escapeHtml(s){
  return String(s||"")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function buildPopup(){
  const sTime = meta?.startTime || "";
  const eTime = meta?.endTime   || "";
  const sC = (meta && isFinite(meta.startLat) && isFinite(meta.startLon))
    ? `${meta.startLat.toFixed(6)}, ${meta.startLon.toFixed(6)}` : "";
  const eC = (meta && isFinite(meta.endLat) && isFinite(meta.endLon))
    ? `${meta.endLat.toFixed(6)}, ${meta.endLon.toFixed(6)}` : "";
  return `
    <div class="small">
      <strong>${escapeHtml(FILENAME)}</strong><br/>
      <b>Source:</b> Raw GPX<br/>
      <b>Start:</b> ${escapeHtml(sTime)} ${sC ? `| ${sC}` : ""}<br/>
      <b>End:</b> ${escapeHtml(eTime)} ${eC ? `| ${eC}` : ""}
    </div>
  `;
}
async function parseMeta(){
  try{
    const txt = await fetch(GPX_URL, {cache:"no-cache"}).then(r=>r.text());
    const xml = new DOMParser().parseFromString(txt, "application/xml");
    const pts = Array.from(xml.getElementsByTagName("trkpt"));
    if(!pts.length) return null;
    const first = pts[0], last = pts[pts.length-1];
    return {
      startLat: Number(first.getAttribute("lat")),
      startLon: Number(first.getAttribute("lon")),
      endLat:   Number(last.getAttribute("lat")),
      endLon:   Number(last.getAttribute("lon")),
      startTime: first.getElementsByTagName("time")[0]?.textContent?.trim() || "",
      endTime:   last.getElementsByTagName("time")[0]?.textContent?.trim() || "",
    };
  } catch { return null; }
}

// ======= UI actions =======
async function showTrack(){
  if(layer){
    map.addLayer(layer);
    if(layer.getBounds) map.fitBounds(layer.getBounds().pad(0.05));
    return;
  }

  document.getElementById("status").textContent = "Loading…";

  // Pre-parse metadata for popup
  meta = await parseMeta();

  // Load GPX through omnivore (draws full zig-zag track)
  layer = omnivore.gpx(GPX_URL, null, L.geoJSON(null, {
    style: { color: TRACK_COLOR, weight: 3, opacity: 0.9 }
  }))
  .on("ready", function(){
    this.addTo(map);
    if(this.getBounds) map.fitBounds(this.getBounds().pad(0.05));
    const html = buildPopup();
    this.bindTooltip(FILENAME);
    this.bindPopup(html);
    document.getElementById("status").textContent = "Loaded.";
  })
  .on("error", function(e){
    console.error("GPX load error:", e);
    document.getElementById("status").textContent = "Error loading GPX.";
  });
}

function clearTrack(){
  if(layer) map.removeLayer(layer);
}

// expose to buttons
window.showTrack = showTrack;
window.clearTrack = clearTrack;
