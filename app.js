let map;
let geoJsonLayer;
let selectedPref = null;
let memoriesData = [];
let currentPhotos = [];
let slideIndex = 0;
let autoSaveTimer = null;
let panelOpen = false;
let initialBounds;

// ローカルストレージから家のリストを読み込む
let homePrefectures = JSON.parse(localStorage.getItem('homePrefectures')) || [];

const PREF_COLORS = {
    '北海道':'#9fb9c4','青森県':'#a2c4c3','岩手県':'#a1bda6','宮城県':'#b6c6a7',
    '秋田県':'#c1cda2','山形県':'#cdd3a1','福島県':'#d9d8a3','茨城県':'#e3d8a6',
    '栃木県':'#ead2a8','群馬県':'#ebc8a5','埼玉県':'#e8bba1','千葉県':'#e3afa2',
    '東京都':'#dda2a5','神奈川県':'#d698a9','新潟県':'#c59eb1','富山県':'#b2a1b7',
    '石川県':'#a2a5bb','福井県':'#96a7bc','山梨県':'#8eb0c2','長野県':'#85b9c4',
    '岐阜県':'#8bc1c0','静岡県':'#91c6b8','愛知県':'#9bcbb0','三重県':'#a9ceaa',
    '滋賀県':'#b7cfa6','京都府':'#c7d1a3','大阪府':'#d7d1a2','兵庫県':'#e4d0a2',
    '奈良県':'#eed0a4','和歌山県':'#f3cda8','鳥取県':'#f4c7ad','島根県':'#f1bfb2',
    '岡山県':'#ecb8b7','広島県':'#e4b1bd','山口県':'#d9abc2','徳島県':'#cda6c5',
    '香川県':'#bea1c6','愛媛県':'#afa0c5','高知県':'#a19fc1','福岡県':'#93a0bb',
    '佐賀県':'#88a2b5','長崎県':'#81a6ae','熊本県':'#7eaba5','大分県':'#7eb09a',
    '宮崎県':'#83b48e','鹿児島県':'#8ab784','沖縄県':'#96b87b'
};

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map-container', {
        zoomControl: false,
        attributionControl: false,
        doubleClickZoom: false
    }).setView([38.0, 137.0], 5);

    fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson')
        .then(res => res.json())
        .then(data => {
            geoJsonLayer = L.geoJson(data, {
                style: { fillColor: '#f4f7f6', weight: 0.5, color: '#000000', fillOpacity: 1 },
                onEachFeature: function (feature, layer) {
                    const prefName = feature.properties.nam_ja;
                    layer.bindTooltip(prefName, { sticky: true, direction: 'top' });
                    layer.on('click', () => {
                        selectedPref = prefName;
                        openPanel();
                        renderRightPanel();
                    });
                }
            }).addTo(map);

            const bounds = geoJsonLayer.getBounds();
            map.fitBounds(bounds, { padding: [0, 0] });

            setTimeout(() => {
                initialBounds = map.getBounds();
                const minZoom = map.getZoom();
                map.setMinZoom(minZoom);
                map.setMaxBounds(initialBounds.pad(0.05));
            }, 100);

            updateMapColors();
        });

    map.on('dblclick', function(e) {
        if (initialBounds) {
            map.flyToBounds(initialBounds, { duration: 0.6 });
        }
        if (panelOpen) {
            closePanel();
        }
    });

    let lastTouchTime = 0;
    let isPinching = false;

    document.getElementById('map-container').addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            isPinching = true;
        }
    });

    document.getElementById('map-container').addEventListener('touchend', function(e) {
        if (isPinching) {
            if (e.touches.length === 0) {
                isPinching = false;
            }
            return;
        }

        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTouchTime;
        if (tapLength > 0 && tapLength < 400) {
            if (initialBounds) {
                map.flyToBounds(initialBounds, { duration: 0.6 });
            }
            if (panelOpen) {
                closePanel();
            }
        }
        lastTouchTime = currentTime;
    });

    fetchMemories();

    document.getElementById('menu-btn').addEventListener('click', () => {
        if (panelOpen && selectedPref === null) {
            closePanel();
        } else {
            selectedPref = null;
            openPanel();
            renderRightPanel();
        }
    });

    document.getElementById('btn-close-slider').addEventListener('click', () => {
        document.getElementById('slider-modal').classList.add('hidden');
    });
    document.getElementById('btn-prev').addEventListener('click', () => {
        if (slideIndex > 0) { slideIndex--; updateSlider(); }
    });
    document.getElementById('btn-next').addEventListener('click', () => {
        if (slideIndex < currentPhotos.length - 1) { slideIndex++; updateSlider(); }
    });

    if (!document.getElementById('settings-btn')) {
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'settings-btn';
        settingsBtn.className = 'settings-btn';
        settingsBtn.innerHTML = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>`;
        settingsBtn.onclick = openSettings;
        document.querySelector('.main-layout').appendChild(settingsBtn);
    }
});

function openPanel() {
    panelOpen = true;
    document.getElementById('right-panel').classList.add('open');
    updateUIVisibility();
}

function closePanel() {
    panelOpen = false;
    selectedPref = null;
    document.getElementById('right-panel').classList.remove('open');
    updateUIVisibility();
}

function openSettings() {
    let modal = document.getElementById('settings-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'settings-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    const prefs = Object.keys(PREF_COLORS);
    let options = prefs.map(p => `<option value="${p}">${p}</option>`).join('');

    let html = `
    <div class="modal-content" style="background: white; padding: 25px; border-radius: 12px; text-align: left; max-width: 400px; width: 90%;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <h2 style="margin:0; font-size: 1.4rem; color: #444;">設定</h2>
            <button onclick="document.getElementById('settings-modal').classList.add('hidden')" style="background:none; border:none; font-size:24px; color:#aaa; cursor:pointer; padding:0;">✕</button>
        </div>
        <div style="margin-bottom: 25px;">
            <label style="font-weight: bold; color: #555; display:block; margin-bottom: 10px;">家（拠点）を登録</label>
            <div style="display:flex; gap: 8px; margin-bottom: 15px;">
                <select id="home-select" style="flex:1; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-family:inherit; font-size:14px; background:white;">
                    ${options}
                </select>
                <button onclick="addHomePrefecture()" style="background:#6c8ca3; color:white; border:none; padding:10px 15px; border-radius:6px; cursor:pointer; font-family:inherit; font-weight:bold;">追加</button>
            </div>
            <div id="home-list" style="display:flex; flex-direction:column; gap:8px;"></div>
        </div>
    </div>`;

    modal.innerHTML = html;
    modal.classList.remove('hidden');
    renderHomeList();
}

function addHomePrefecture() {
    const select = document.getElementById('home-select');
    const pref = select.value;
    if (!homePrefectures.includes(pref)) {
        homePrefectures.push(pref);
        saveHomePrefectures();
        renderHomeList();
        updateMapColors();
        updateCounter();
        if (panelOpen) renderRightPanel();
    }
}

function removeHomePrefecture(pref) {
    homePrefectures = homePrefectures.filter(p => p !== pref);
    saveHomePrefectures();
    renderHomeList();
    updateMapColors();
    updateCounter();
    if (panelOpen) renderRightPanel();
}

function saveHomePrefectures() {
    localStorage.setItem('homePrefectures', JSON.stringify(homePrefectures));
}

function renderHomeList() {
    const list = document.getElementById('home-list');
    if (!list) return;
    if (homePrefectures.length === 0) {
        list.innerHTML = `<span style="color:#aaa; font-size:13px;">登録されていません</span>`;
        return;
    }
    list.innerHTML = homePrefectures.map(pref => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f4f7f6; padding:10px 15px; border-radius:6px;">
            <span style="font-weight:bold; color:#444; display:flex; align-items:center; gap:6px;">
                🏠 ${pref}
            </span>
            <button onclick="removeHomePrefecture('${pref}')" style="background:rgba(0,0,0,0.1); border:none; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#555; cursor:pointer; font-size:12px;">✕</button>
        </div>
    `).join('');
}

function updateUIVisibility() {
    const counter = document.getElementById('pref-counter');
    const menuBtn = document.getElementById('menu-btn');
    const settingsBtn = document.getElementById('settings-btn');
    if (panelOpen) {
        counter.classList.add('hidden-ui');
        if (settingsBtn) settingsBtn.style.display = 'none';
        if (selectedPref) {
            menuBtn.classList.add('hidden-ui');
        } else {
            menuBtn.classList.remove('hidden-ui');
        }
    } else {
        counter.classList.remove('hidden-ui');
        menuBtn.classList.remove('hidden-ui');
        if (settingsBtn) settingsBtn.style.display = 'flex';
    }
}

function updateCounter() {
    const activeMemories = memoriesData.filter(m => {
        if (homePrefectures.includes(m.prefecture)) return false;
        const photos = JSON.parse(m.photo_urls || "[]");
        return m.date || photos.length > 0;
    });
    const totalVisited = activeMemories.length + homePrefectures.length;
    document.getElementById('pref-counter').innerText = `${totalVisited} / 47`;

    const hasWarning = activeMemories.some(m => {
        const photos = JSON.parse(m.photo_urls || "[]");
        return !m.date || photos.length === 0;
    });
    const menuBtn = document.getElementById('menu-btn');
    if (hasWarning) {
        menuBtn.classList.add('warning');
    } else {
        menuBtn.classList.remove('warning');
    }
}

function toSlashDate(val) { return val ? val.replace(/-/g, '/') : ''; }
function toDashDate(val) { return val ? val.replace(/\//g, '-') : ''; }
function getDateFrom(dateStr) { return toDashDate((dateStr?.split('~')[0] || '').trim()); }
function getDateTo(dateStr) { return toDashDate((dateStr?.split('~')[1] || '').trim()); }
function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('~');
    const from = toSlashDate(parts[0].trim());
    const to = parts[1] ? toSlashDate(parts[1].trim()) : '';
    return to ? `${from} - ${to}` : from;
}

function renderRightPanel() {
    const panel = document.getElementById('right-panel');
    panel.scrollTop = 0;
    updateUIVisibility();

    if (!selectedPref) {
        panel.style.backgroundColor = '#ffffff';
        let html = `<div style="display:flex; justify-content:flex-end; margin-bottom:24px;">`;
        html += `<button onclick="closePanel()" style="border:none; background:none; font-size:24px; color:#aaa; padding:0;">✕</button>`;
        html += `</div>`;

        homePrefectures.forEach(pref => {
            html += `<button class="pref-btn" onclick="selectedPref='${pref}'; openPanel(); renderRightPanel();"
                style="border-left: 6px solid ${PREF_COLORS[pref]}; background: #fffdf5;">
                <span style="display:flex; align-items:center; gap:6px; font-weight:bold; color:#444;">
                    🏠 ${pref}
                </span>
                <span style="color:#6c8ca3; font-size:0.85em; font-weight:bold;">拠点</span>
            </button>`;
        });

        const activeMemories = memoriesData.filter(m => {
            if (homePrefectures.includes(m.prefecture)) return false;
            const photos = JSON.parse(m.photo_urls || "[]");
            return m.date || photos.length > 0;
        });

        if (activeMemories.length === 0 && homePrefectures.length === 0) {
            html += `<p style="color:#888; text-align:center; margin-top:40px;">地図から都道府県を選んで<br>思い出を追加しましょう</p>`;
        } else {
            activeMemories.forEach(m => {
                const photos = JSON.parse(m.photo_urls || "[]");
                const color = PREF_COLORS[m.prefecture] || '#aaa';
                const needsData = !m.date || photos.length === 0;
                html += `<button class="pref-btn" onclick="selectedPref='${m.prefecture}'; openPanel(); renderRightPanel();"
                    style="border-left: 6px solid ${color};">
                    <span style="display:flex; align-items:center; font-weight:bold; color:#444;">
                        ${m.prefecture}${needsData ? '<span class="status-dot"></span>' : ''}
                    </span>
                    <span style="color:#999; font-size:0.85em;">${formatDate(m.date)}</span>
                </button>`;
            });
        }
        panel.innerHTML = html;
    } else {
        panel.style.backgroundColor = '#ffffff';
        let html = `<div style="display:flex; justify-content:flex-end; margin-bottom:20px;">`;
        html += `<button onclick="closePanel()" style="border:none; background:none; font-size:24px; color:#aaa; padding:0;">✕</button>`;
        html += `</div>`;

        if (homePrefectures.includes(selectedPref)) {
            html += `<h1 style="text-align:center; padding-bottom:15px; border-bottom:3px solid ${PREF_COLORS[selectedPref]}; margin:0 0 15px; font-size:1.6rem; color:#333;">${selectedPref}</h1>`;
            html += `<div style="text-align:center; margin-top: 40px; padding: 20px; background: #fffdf5; border-radius: 10px;">`;
            html += `<div style="font-size:48px; margin-bottom:10px;">🏠</div>`;
            html += `<h3 style="color: #444; margin: 10px 0;">家に登録されています</h3>`;
            html += `<p style="color: #777; font-size: 13px; line-height: 1.6;">拠点として設定されているため、<br>写真や日付の登録は不要です。</p>`;
            html += `</div>`;
            panel.innerHTML = html;
            return;
        }

        const data = memoriesData.find(m => m.prefecture === selectedPref) || { date: '', photo_urls: '[]' };
        let photos = [];
        try { photos = JSON.parse(data.photo_urls); } catch(e){}
        const color = PREF_COLORS[selectedPref] || '#6c8ca3';
        if ((data.date || photos.length > 0) && (!data.date || photos.length === 0)) {
            html += `<div class="warning-banner">${!data.date ? '日付を登録してください' : '写真を追加してください'}</div>`;
        }
        html += `<h1 style="text-align:center; padding-bottom:15px; border-bottom:3px solid ${color}; margin:0 0 15px; font-size:1.6rem; color:#333;">${selectedPref}</h1>`;
        html += `<div style="display:flex; align-items:center; gap:8px; margin-bottom:24px;">`;
        html += `<input type="date" id="input-date-from" value="${getDateFrom(data.date)}" style="flex:1; padding:10px; border-radius:6px; border:1px solid #ddd; font-size:14px; background:#fafafa; color:#555;">`;
        html += `<span style="color:#aaa;">-</span>`;
        html += `<input type="date" id="input-date-to" value="${getDateTo(data.date)}" style="flex:1; padding:10px; border-radius:6px; border:1px solid #ddd; font-size:14px; background:#fafafa; color:#555;">`;
        html += `</div>`;
        html += `<div style="margin-bottom: 20px;"><label for="input-photos" class="btn-full" style="display:block; text-align:center; cursor:pointer; margin:0; background:${color};">写真を追加</label><input type="file" id="input-photos" multiple accept="image/*" style="display:none;"></div>`;
        html += `<p id="autosave-status" style="color:#888; text-align:center; font-size:12px; min-height:18px; margin:0 0 15px;"></p>`;
        if (photos.length > 0) {
            html += `<div class="photo-grid">`;
            photos.forEach(url => {
                const escapedPhotos = JSON.stringify(photos).replace(/"/g, '&quot;');
                html += `<div class="photo-grid-item" onclick="openSliderAt('${url}', ${escapedPhotos})"><img src="${url}"><button class="photo-delete-btn" onclick="event.stopPropagation(); deletePhoto('${url}')">✕</button></div>`;
            });
            html += `</div>`;
        }
        panel.innerHTML = html;
        document.getElementById('input-date-from').addEventListener('change', triggerAutoSave);
        document.getElementById('input-date-to').addEventListener('change', triggerAutoSave);
        document.getElementById('input-photos').addEventListener('change', triggerAutoSave);
    }
}

function triggerAutoSave() {
    const statusEl = document.getElementById('autosave-status');
    if (statusEl) statusEl.innerText = '保存中...';
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => { await saveMemoryData(); }, 800);
}

async function saveMemoryData() {
    const fromEl = document.getElementById('input-date-from');
    const toEl = document.getElementById('input-date-to');
    const files = document.getElementById('input-photos').files;
    if (!fromEl) return;
    const fromVal = toSlashDate(fromEl.value);
    const toVal = toSlashDate(toEl.value);
    const dateValue = fromVal && toVal ? `${fromVal}~${toVal}` : fromVal || toVal || '';
    let base64Photos = [];
    for (let file of files) { base64Photos.push(await compressImage(file)); }
    const payload = { action: "save_memory", prefecture: selectedPref, date: dateValue, photos: base64Photos };
    try {
        const res = await fetch('/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            await fetchMemories(false);
            renderRightPanel();
            updateMapColors();
            updateCounter();
            const statusEl = document.getElementById('autosave-status');
            if (statusEl) statusEl.innerText = '保存完了';
            setTimeout(() => { if (statusEl) statusEl.innerText = ''; }, 2000);
        }
    } catch(e) { console.error("Save Error", e); }
}

async function fetchMemories(redraw = true) {
    try {
        const res = await fetch('/api');
        memoriesData = await res.json();
        if (redraw) renderRightPanel();
        updateMapColors();
        updateCounter();
    } catch (e) { console.error("データ取得エラー", e); }
}

async function deletePhoto(url) {
    const payload = { action: "delete_photo", prefecture: selectedPref, photo_url: url };
    try {
        await fetch('/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        await fetchMemories(false);
        renderRightPanel();
        updateMapColors();
        updateCounter();
    } catch(e) { console.error("削除エラー", e); }
}

function updateMapColors() {
    if (!geoJsonLayer) return;
    geoJsonLayer.eachLayer(layer => {
        const pref = layer.feature.properties.nam_ja;
        const memory = memoriesData.find(m => m.prefecture === pref);
        const isHome = homePrefectures.includes(pref);
        let isVisited = isHome;
        if (!isVisited && memory) {
            const photos = JSON.parse(memory.photo_urls || "[]");
            if (memory.date || photos.length > 0) isVisited = true;
        }
        layer.setStyle({
            fillColor: isVisited ? (PREF_COLORS[pref] || '#8ab4f8') : '#f4f7f6',
            weight: isHome ? 1.5 : 0.5,
            color: '#000000',
            fillOpacity: 1
        });
    });
}

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > 600) { h = h * (600 / w); w = 600; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
}

function openSliderAt(url, photos) {
    currentPhotos = photos;
    slideIndex = photos.indexOf(url);
    if (slideIndex < 0) slideIndex = 0;
    updateSlider();
    document.getElementById('slider-modal').classList.remove('hidden');
}

function updateSlider() {
    document.getElementById('slide-image').src = currentPhotos[slideIndex];
    document.getElementById('slide-counter').innerText = `${slideIndex + 1} / ${currentPhotos.length}`;
}