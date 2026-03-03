const SUPABASE_URL = 'https://uclkhpnpyeirxcvdtjwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbGtocG5weWVpcnhjdmR0andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTYzNzYsImV4cCI6MjA4NzkzMjM3Nn0.fwb79w4zemD6u41X2fIH2IvwAFJzlW__I4w4o7BufI0';
// 名前を supabase から supabaseClient に変更しました
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let map;
let geoJsonLayer;
let selectedPref = null;
let memoriesData = [];
let currentPhotos = [];
let slideIndex = 0;
let autoSaveTimer = null;
let panelOpen = false;
let settingsOpen = false;
let initialBounds;

let homePrefectures = JSON.parse(localStorage.getItem('homePrefectures')) || [];

const PREF_COLORS = {
    '北海道':'#9fb9c4','青森県':'#a2c4c3','岩手県':'#a1bda6','宮城県':'#b6c6a7','秋田県':'#c1cda2','山形県':'#cdd3a1','福島県':'#d9d8a3','茨城県':'#e3d8a6','栃木県':'#ead2a8','群馬県':'#ebc8a5','埼玉県':'#e8bba1','千葉県':'#e3afa2','東京都':'#dda2a5','神奈川県':'#d698a9','新潟県':'#c59eb1','富山県':'#b2a1b7','石川県':'#a2a5bb','福井県':'#96a7bc','山梨県':'#8eb0c2','長野県':'#85b9c4','岐阜県':'#8bc1c0','静岡県':'#91c6b8','愛知県':'#9bcbb0','三重県':'#a9ceaa','滋賀県':'#b7cfa6','京都府':'#c7d1a3','大阪府':'#d7d1a2','兵庫県':'#e4d0a2','奈良県':'#eed0a4','和歌山県':'#f3cda8','鳥取県':'#f4c7ad','島根県':'#f1bfb2','岡山県':'#ecb8b7','広島県':'#e4b1bd','山口県':'#d9abc2','徳島県':'#cda6c5','香川県':'#bea1c6','愛媛県':'#afa0c5','高知県':'#a19fc1','福岡県':'#93a0bb','佐賀県':'#88a2b5','長崎県':'#81a6ae','熊本県':'#7eaba5','大分県':'#7eb09a','宮崎県':'#83b48e','鹿児島県':'#8ab784','沖縄県':'#96b87b'
};

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map-container', { zoomControl: false, attributionControl: false, doubleClickZoom: false, zoomSnap: 0 }).setView([38.0, 137.0], 5);

    fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson')
        .then(res => res.json())
        .then(data => {
            geoJsonLayer = L.geoJson(data, {
                style: { fillColor: '#f4f7f6', weight: 0.3, color: '#000000', fillOpacity: 1 },
                onEachFeature: (feature, layer) => {
                    const prefName = feature.properties.nam_ja;
                    layer.bindTooltip(prefName, { sticky: true, direction: 'top' });
                    layer.on('click', () => { selectedPref = prefName; if (settingsOpen) closeSettings(); openPanel(); renderRightPanel(); });
                }
            }).addTo(map);
            const bounds = geoJsonLayer.getBounds();
            map.fitBounds(bounds, { paddingTopLeft: [0, 80] });
            setTimeout(() => { initialBounds = map.getBounds(); map.setMinZoom(map.getZoom()); map.setMaxBounds(initialBounds.pad(0.05)); map.dragging.disable(); }, 100);
            updateMapColors();
        });

    map.on('zoomend', () => { if (map.getZoom() <= map.getMinZoom()) { map.dragging.disable(); if (initialBounds) map.panTo(initialBounds.getCenter()); } else { map.dragging.enable(); } });
    map.on('dblclick', () => { if (initialBounds) map.flyToBounds(initialBounds); if (panelOpen) closePanel(); if (settingsOpen) closeSettings(); });

    fetchMemories();

    const menuBtn = document.getElementById('menu-btn');
    menuBtn.addEventListener('click', () => { if (panelOpen) closePanel(); else { if (settingsOpen) closeSettings(); selectedPref = null; openPanel(); renderRightPanel(); } });

    document.getElementById('btn-close-slider').onclick = () => document.getElementById('slider-modal').classList.add('hidden');
    document.getElementById('btn-prev').onclick = () => { if (slideIndex > 0) { slideIndex--; updateSlider(); } };
    document.getElementById('btn-next').onclick = () => { if (slideIndex < currentPhotos.length - 1) { slideIndex++; updateSlider(); } };

    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'settings-btn'; settingsBtn.className = 'settings-btn'; settingsBtn.title = "設定";
    settingsBtn.innerHTML = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
    settingsBtn.onclick = () => { if (settingsOpen) closeSettings(); else { if (panelOpen) closePanel(); openSettings(); } };
    document.querySelector('.main-layout').appendChild(settingsBtn);

    const sp = document.createElement('div'); sp.id = 'settings-panel'; sp.className = 'list-section'; document.querySelector('.main-layout').appendChild(sp);
});

function openPanel() { panelOpen = true; document.getElementById('right-panel').classList.add('open'); updateUIVisibility(); }
function closePanel() { clearTimeout(autoSaveTimer); cleanupEmptyDate(); panelOpen = false; selectedPref = null; document.getElementById('right-panel').classList.remove('open'); updateUIVisibility(); updateMapColors(); updateCounter(); }
function backToList() { clearTimeout(autoSaveTimer); cleanupEmptyDate(); selectedPref = null; renderRightPanel(); updateMapColors(); updateCounter(); }
function openSettings() { settingsOpen = true; document.getElementById('settings-panel').classList.add('open'); updateUIVisibility(); renderSettingsMenu(); }
function closeSettings() { settingsOpen = false; document.getElementById('settings-panel').classList.remove('open'); updateUIVisibility(); }

function cleanupEmptyDate() {
    if (selectedPref && !homePrefectures.includes(selectedPref)) {
        const fromEl = document.getElementById('input-date-from'), toEl = document.getElementById('input-date-to');
        const hasDate = (fromEl && fromEl.value) || (toEl && toEl.value);
        const data = memoriesData.find(m => m.prefecture === selectedPref);
        let photoCount = 0; if (data) photoCount = JSON.parse(data.photo_urls || "[]").length;
        if (hasDate && photoCount === 0) { if (data) data.date = ""; fetch('/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "save_memory", prefecture: selectedPref, date: "", photos: [] }) }).then(() => fetchMemories(false)); }
    }
}

function renderSettingsMenu() {
    const panel = document.getElementById('settings-panel');
    panel.innerHTML = `<div class="panel-header"><div class="panel-header-title-row"><div style="flex:1;"></div><h2 style="margin: 0; font-size: 1.6rem; color: #333; position:absolute; left:50%; transform:translateX(-50%);">設定</h2><button class="panel-close-btn" onclick="closeSettings()">✕</button></div></div><div class="panel-content"><div style="display:flex; flex-direction:column; gap:15px; margin-top:20px;"><button onclick="renderHomeSettings()" style="text-align:center; padding:20px; background:#eef2f5; border:none; border-radius:12px; font-size:1.2rem; color:#444; cursor:pointer; font-weight:bold; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">家を登録</button></div></div>`;
}

function renderHomeSettings() {
    const panel = document.getElementById('settings-panel');
    panel.innerHTML = `<div class="panel-header"><div class="panel-header-title-row"><button onclick="renderSettingsMenu()" style="background:none; border:none; font-size:24px; color:#6c8ca3; cursor:pointer; font-weight:bold;">←</button><h2 style="margin: 0; font-size: 1.6rem; color: #333; position:absolute; left:50%; transform:translateX(-50%);">家を登録</h2><button class="panel-close-btn" onclick="closeSettings()">✕</button></div></div><div class="panel-content"><div style="margin-top: 20px; text-align: left;"><div style="display:flex; gap: 8px; margin-bottom: 20px;"><select id="home-select" style="flex:1; padding: 12px; border: 1px solid #ccc; border-radius: 8px;">${Object.keys(PREF_COLORS).map(p => `<option value="${p}">${p}</option>`).join('')}</select><button onclick="addHomePrefecture()" style="background:#6c8ca3; color:white; border:none; padding:12px 20px; border-radius:8px; font-weight:bold;">追加</button></div><div id="home-list" style="display:flex; flex-direction:column; gap:8px;"></div></div></div>`;
    renderHomeList();
}

function addHomePrefecture() { const pref = document.getElementById('home-select').value; if (!homePrefectures.includes(pref)) { homePrefectures.push(pref); localStorage.setItem('homePrefectures', JSON.stringify(homePrefectures)); renderHomeList(); updateMapColors(); updateCounter(); } }
function removeHomePrefecture(pref) { homePrefectures = homePrefectures.filter(p => p !== pref); localStorage.setItem('homePrefectures', JSON.stringify(homePrefectures)); renderHomeList(); updateMapColors(); updateCounter(); }
function renderHomeList() {
    const list = document.getElementById('home-list'); if (!list) return;
    if (homePrefectures.length === 0) { list.innerHTML = `<span style="color:#aaa;">登録されていません</span>`; return; }
    list.innerHTML = homePrefectures.sort((a, b) => Object.keys(PREF_COLORS).indexOf(a) - Object.keys(PREF_COLORS).indexOf(b)).map(pref => `<div style="display:flex; justify-content:space-between; align-items:center; background:#f4f7f6; padding:12px 15px; border-radius:8px;"><span style="font-weight:bold; color:#444;">${pref}</span><button onclick="removeHomePrefecture('${pref}')" style="background:rgba(0,0,0,0.1); border:none; width:30px; height:30px; border-radius:50%; cursor:pointer;">✕</button></div>`).join('');
}

function updateUIVisibility() {
    const counter = document.getElementById('pref-counter'), menuBtn = document.getElementById('menu-btn'), settingsBtn = document.getElementById('settings-btn');
    if (panelOpen || settingsOpen) counter.classList.add('hidden-ui'); else counter.classList.remove('hidden-ui');
    if (panelOpen && selectedPref !== null) { menuBtn.classList.add('hidden-ui'); if (settingsBtn) settingsBtn.classList.add('hidden-ui'); }
    else if (panelOpen && selectedPref === null) { menuBtn.classList.remove('hidden-ui'); if (settingsBtn) settingsBtn.classList.add('hidden-ui'); }
    else if (settingsOpen) { menuBtn.classList.add('hidden-ui'); if (settingsBtn) settingsBtn.classList.remove('hidden-ui'); }
    else { menuBtn.classList.remove('hidden-ui'); if (settingsBtn) settingsBtn.classList.remove('hidden-ui'); }
}

function updateCounter() {
    const active = memoriesData.filter(m => !homePrefectures.includes(m.prefecture) && (m.date || JSON.parse(m.photo_urls || "[]").length > 0));
    document.getElementById('pref-counter').innerText = `${active.length + homePrefectures.length} / 47`;
    const hasWarning = active.some(m => !m.date || JSON.parse(m.photo_urls || "[]").length === 0);
    if (hasWarning) document.getElementById('menu-btn').classList.add('warning'); else document.getElementById('menu-btn').classList.remove('warning');
}

function renderRightPanel() {
    const panel = document.getElementById('right-panel');
    if (!selectedPref) {
        panel.innerHTML = `<div class="panel-header"><div class="panel-header-title-row"><div style="flex:1;"></div><h2 style="margin: 0; font-size: 1.6rem; color: #333; position:absolute; left:50%; transform:translateX(-50%);">一覧</h2><button class="panel-close-btn" onclick="closePanel()">✕</button></div></div><div class="panel-content">${homePrefectures.sort((a,b)=>Object.keys(PREF_COLORS).indexOf(a)-Object.keys(PREF_COLORS).indexOf(b)).map(p=>`<button class="pref-btn" onclick="selectedPref='${p}'; renderRightPanel();" style="border-left: 6px solid ${PREF_COLORS[p]}; background:#fffdf5;"><span style="font-weight:bold;">${p}</span></button>`).join('')}${memoriesData.filter(m=>!homePrefectures.includes(m.prefecture) && (m.date || JSON.parse(m.photo_urls).length>0)).sort((a,b)=>Object.keys(PREF_COLORS).indexOf(a.prefecture)-Object.keys(PREF_COLORS).indexOf(b.prefecture)).map(m=>`<button class="pref-btn" onclick="selectedPref='${m.prefecture}'; renderRightPanel();" style="border-left: 6px solid ${PREF_COLORS[m.prefecture]};"><span style="display:flex; align-items:center; font-weight:bold;">${m.prefecture}${(!m.date || JSON.parse(m.photo_urls).length===0)?'<span class="status-dot"></span>':''}</span><span style="color:#999; font-size:0.85em;">${m.date.replace(/-/g,'/')}</span></button>`).join('')}</div>`;
    } else {
        const color = PREF_COLORS[selectedPref];
        const data = memoriesData.find(m => m.prefecture === selectedPref) || { date: '', photo_urls: '[]' };
        let photos = JSON.parse(data.photo_urls);
        let header = `<div class="panel-header" style="border-bottom: 3px solid ${color}; padding-bottom: 15px;"><div class="panel-header-title-row"><button onclick="backToList();" style="background:none; border:none; font-size:24px; color:#6c8ca3; cursor:pointer; font-weight:bold;">←</button><div style="display:flex; align-items:center; gap: 15px;"><h2 style="margin:0; font-size:1.8rem; color:#333;">${selectedPref}</h2>${homePrefectures.includes(selectedPref)?'':`<label for="input-photos" class="add-photo-fab" style="background:${color}; position:static; width:40px; height:40px;"><svg viewBox="0 0 24 24" width="22" height="22" stroke="white" stroke-width="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></label>`}<input type="file" id="input-photos" multiple accept="image/*" style="display:none;"></div><button class="panel-close-btn" onclick="closePanel()">✕</button></div></div>`;
        let content = `<div class="panel-content">${homePrefectures.includes(selectedPref)?'<div style="text-align:center; margin-top:20px; padding:20px; background:#fffdf5; border-radius:10px;"><h3 style="color:#444;">家に登録されています</h3><p style="color:#777;">写真や日付の登録はできません。</p></div>':`<div style="display:flex; align-items:center; gap:8px; margin-top:20px;"><input type="date" id="input-date-from" value="${data.date.split('~')[0]||''}" style="flex:1; padding:10px; border-radius:6px; border:1px solid #ddd;"><span style="color:#aaa;">-</span><input type="date" id="input-date-to" value="${data.date.split('~')[1]||''}" style="flex:1; padding:10px; border-radius:6px; border:1px solid #ddd;"></div><p id="autosave-status" style="color:#888; text-align:center; font-size:12px; min-height:18px; margin-top:8px;"></p><div class="photo-grid" style="margin-top:10px;">${photos.map(url=>`<div class="photo-grid-item" onclick="openSliderAt('${url}', ${data.photo_urls.replace(/"/g, '&quot;')})"><img src="${url}"><button class="photo-delete-btn" onclick="event.stopPropagation(); deletePhoto('${url}')">✕</button></div>`).join('')}</div>`}</div>`;
        panel.innerHTML = header + content;
        if (!homePrefectures.includes(selectedPref)) {
            const f = document.getElementById('input-date-from'), t = document.getElementById('input-date-to'), p = document.getElementById('input-photos');
            const save = () => { if (f.value && t.value && new Date(f.value) > new Date(t.value)) { [f.value, t.value] = [t.value, f.value]; } triggerAutoSave(); };
            f.onchange = save; t.onchange = save; p.onchange = triggerAutoSave;
        }
    }
}

async function compressImageToBlob(file) {
    return new Promise(resolve => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = e => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas'); let w = img.width, h = img.height;
                if (w > 600) { h *= (600 / w); w = 600; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(b => resolve(b), 'image/jpeg', 0.6);
            };
        };
    });
}

function triggerAutoSave() { const s = document.getElementById('autosave-status'); if (s) s.innerText = '保存中...'; clearTimeout(autoSaveTimer); autoSaveTimer = setTimeout(saveMemoryData, 800); }

async function saveMemoryData() {
    const f = document.getElementById('input-date-from'), t = document.getElementById('input-date-to'), ph = document.getElementById('input-photos');
    if (!f) return;
    const date = f.value && t.value ? `${f.value}~${t.value}` : (f.value || t.value || '');
    const s = document.getElementById('autosave-status');
    try {
        let urls = memoriesData.find(m => m.prefecture === selectedPref)?.photo_urls ? JSON.parse(memoriesData.find(m => m.prefecture === selectedPref).photo_urls) : [];
        if (ph.files.length > 0) {
            if (s) s.innerText = 'アップロード中...';
            const newUrls = await Promise.all(Array.from(ph.files).map(async file => {
                const blob = await compressImageToBlob(file);
                const name = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                // supabaseClient に変更
                const { error } = await supabaseClient.storage.from('photos2').upload(name, blob, { contentType: 'image/jpeg' });
                if (error) throw error;
                // supabaseClient に変更
                return supabaseClient.storage.from('photos2').getPublicUrl(name).data.publicUrl;
            }));
            urls = [...urls, ...newUrls];
        }
        await fetch('/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "save_memory", prefecture: selectedPref, date: date, photos: urls }) });
        await fetchMemories(false); renderRightPanel(); updateMapColors(); updateCounter();
        if (s) { s.innerText = '保存完了'; setTimeout(() => s.innerText = '', 2000); }
    } catch(e) { console.error(e); if (s) s.innerText = 'エラー発生'; }
}

async function fetchMemories(redraw = true) { try { const res = await fetch('/api'); memoriesData = await res.json(); if (redraw) renderRightPanel(); updateMapColors(); updateCounter(); } catch (e) { console.error(e); } }
async function deletePhoto(url) { await fetch('/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: "delete_photo", prefecture: selectedPref, photo_url: url }) }); await fetchMemories(false); renderRightPanel(); updateMapColors(); updateCounter(); }
function updateMapColors() { if (!geoJsonLayer) return; geoJsonLayer.eachLayer(l => { const p = l.feature.properties.nam_ja; const m = memoriesData.find(x => x.prefecture === p); const isH = homePrefectures.includes(p); let v = isH || (m && (m.date || JSON.parse(m.photo_urls).length > 0)); l.setStyle({ fillColor: v ? PREF_COLORS[p] : '#f4f7f6', weight: 0.3, color: '#000000', fillOpacity: 1 }); }); }
function openSliderAt(u, p) { currentPhotos = p; slideIndex = p.indexOf(u); if (slideIndex < 0) slideIndex = 0; updateSlider(); document.getElementById('slider-modal').classList.remove('hidden'); }
function updateSlider() { document.getElementById('slide-image').src = currentPhotos[slideIndex]; document.getElementById('slide-counter').innerText = `${slideIndex + 1} / ${currentPhotos.length}`; }