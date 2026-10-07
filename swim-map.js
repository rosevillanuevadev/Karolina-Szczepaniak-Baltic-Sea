/* ================= CONFIG ================= */
const DATASETS = [
  { name: "Morze Emocji 2025", url: "https://raw.githubusercontent.com/rosevillanuevadev/Karolina-Szczepaniak-Baltic-Sea/refs/heads/main/Morze%20Emocji%202025.csv", color: "red" },
  { name: "USERDATA_GPX", url: "https://raw.githubusercontent.com/rosevillanuevadev/Karolina-Szczepaniak-Baltic-Sea/refs/heads/main/USERDATA_GPX.csv", color: "pink" }
];

/* ============== HELPERS ============== */
function normalizeHeader(h){
  return String(h||"").replace(/^\uFEFF/,"").trim().toLowerCase().replace(/\s+/g,"_");
}
function isLatLonString(s){
  return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(String(s||""));
}
function parseLatLon(pair){
  const [lat, lon] = String(pair).split(",").map(s=>Number(s.trim()));
  return (Number.isFinite(lat)&&Number.isFinite(lon)) ? [lat,lon] : null;
}
function loadCsv(url){
  return fetch(url, { cache:"no-cache" })
    .then(r=>r.text())
    .then(text=>{
      if (/^\s*<!doctype html/i.test(text) || /<html[\s>]/i.test(text)) {
        throw new Error("Got HTML instead of CSV (wrong RAW link?)");
      }
      return new Promise((resolve,reject)=>{
        Papa.parse(text, {
          header:true,
          skipEmptyLines:"greedy",
          transformHeader: normalizeHeader,
          complete: res=>resolve(res.data||[]),
          error: reject
        });
      });
    });
}

/* ============== RENDERING ============== */
function initSwimMap(){
  const map = L.map("map",{ center:[55.0,18.0], zoom:6, zoomControl:true });
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution:"Tiles © Esri — USGS, NOAA", maxZoom:18 }
  ).addTo(map);

  const panel = document.getElementById("checkboxes");
  const globalBounds = L.latLngBounds();
  const allLayers = {};

  DATASETS.forEach((ds, idx)=>{
    // Collapsible section
    const section = document.createElement("div");
    section.className="dataset";
    section.innerHTML = `<h4 data-ds="${idx}">${ds.name} ▼</h4><div class="list" id="list-ds-${idx}"></div>`;
    panel.appendChild(section);

    const listEl = section.querySelector(".list");
    const header = section.querySelector("h4");
    header.addEventListener("click",()=>{
      listEl.style.display = (listEl.style.display==="none"||!listEl.style.display) ? "block" : "none";
    });

    const group = L.layerGroup().addTo(map);

    loadCsv(ds.url).then(rows=>{
      rows.forEach((r,i)=>{
        const start=isLatLonString(r.start_coordinates)?parseLatLon(r.start_coordinates):null;
        const end=isLatLonString(r.end_coordinates)?parseLatLon(r.end_coordinates):null;
        if(!start||!end) return;

        const name=(r.filename||`Leg ${i+1}`).trim();
        const key=`${idx}|${name}`;

        const line=L.polyline([start,end],{color:ds.color,weight:3,opacity:0.9})
          .bindTooltip(name)
          .bindPopup(
            `<div class="popup-small">
               <strong>${name}</strong><br>
               <b>Source:</b> ${ds.name}<br>
               ${r.start_date||""} ${r.start_time||""} → ${r.finish_date||""} ${r.end_time||""}<br>
               Start: ${r.start_coordinates}<br>
               End: ${r.end_coordinates}
             </div>`
          );

        line.addTo(group);
        allLayers[key]=line;
        globalBounds.extend(line.getBounds());

        // checkbox item
        const row=document.createElement("div");
        row.className="filter-item";
        row.innerHTML=`<label><input type="checkbox" data-key="${key}" checked> ${name}</label>`;
        listEl.appendChild(row);
      });

      listEl.addEventListener("change",e=>{
        const cb=e.target.closest('input[type="checkbox"]');
        if(!cb) return;
        const layer=allLayers[cb.dataset.key];
        if(cb.checked) layer.addTo(map); else map.removeLayer(layer);
      });
    });
  });

  // Global show/clear
  window.showAll=()=>{
    Object.values(allLayers).forEach(l=>l.addTo(map));
    panel.querySelectorAll('input[type="checkbox"]').forEach(cb=>cb.checked=true);
  };
  window.clearAll=()=>{
    Object.values(allLayers).forEach(l=>map.removeLayer(l));
    panel.querySelectorAll('input[type="checkbox"]').forEach(cb=>cb.checked=false);
  };

  // Fit to all
  setTimeout(()=>{ if(globalBounds.isValid()) map.fitBounds(globalBounds.pad(0.1)); },3000);
}
