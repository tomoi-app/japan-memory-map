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

const PREF_COLORS = {
    '北海道':'#7aab8a','青森県':'#7eab8f','岩手県':'#83ac94','宮城県':'#88ac99',
    '秋田県':'#8dac9e','山形県':'#92aca3','福島県':'#97aca8','茨城県':'#9cacac',
    '栃木県':'#9eaaaa','群馬県':'#a0a8a8','埼玉県':'#a3a6a8','千葉県':'#a6a4a8',
    '東京都':'#a9a2a8','神奈川県':'#ac9fa6','新潟県':'#ae9da4','富山県':'#b09aa2',
    '石川県':'#b298a0','福井県':'#b4969e','山梨県':'#b6949a','長野県':'#b89298',
    '岐阜県':'#b99096','静岡県':'#ba8e94','愛知県':'#bb8c92','三重県':'#bc8a8e',
    '滋賀県':'#bd888a','京都府':'#be8686','大阪府':'#c08484','兵庫県':'#c08680',
    '奈良県':'#c0887c','和歌山県':'#c08a78','鳥取県':'#c08c74','島根県':'#be8e72',
    '岡山県':'#bc9070','広島県':'#ba9270','山口県':'#b89470','徳島県':'#b49670',
    '香川県':'#b09872','愛媛県':'#ac9a74','高知県':'#a89c76','福岡県':'#a49e78',
    '佐賀県':'#9fa07a','長崎県':'#9aa27c','熊本県':'#95a47e','大分県':'#90a680',
    '宮崎県':'#8ba882','鹿児島県':'#86aa84','沖縄県':'#7fac86'
};

const PREF_COLORS_LIGHT = {
    '北海道':'#eef6f1','青森県':'#eef6f1','岩手県':'#eef6f1','宮城県':'#eef6f1',
    '秋田県':'#eef6f1','山形県':'#eef6f1','福島県':'#eef6f1','茨城県':'#eef6f1',
    '栃木県':'#f3f3f3','群馬県':'#f3f3f3','埼玉県':'#f3f3f3','千葉県':'#f3f3f3',
    '東京都':'#f3f0f3','神奈川県':'#f3f0f3','新潟県':'#f3f0f3','富山県':'#f3f0f3',
    '石川県':'#f5eef2','福井県':'#f5eef2','山梨県':'#f5eef2','長野県':'#f5eef2',
    '岐阜県':'#f5ecef','静岡県':'#f5ecef','愛知県':'#f5ecef','三重県':'#f5ecef',
    '滋賀県':'#f5eaed','京都府':'#f5eaed','大阪府':'#f5eaed','兵庫県':'#f5eaed',
    '奈良県':'#f5ece8','和歌山県':'#f5ece8','鳥取県':'#f5ece8','島根県':'#f5ece8',
    '岡山県':'#f5eee6','広島県':'#f5eee6','山口県':'#f5eee6','徳島県':'#f5eee6',
    '香川県':'#f5f0e6','愛媛県':'#f5f0e6','高知県':'#f5f0e6','福岡県':'#f5f0e6',
    '佐賀県':'#f2f2e8','長崎県':'#f2f2e8','熊本県':'#f2f2e8','大分県':'#f2f2e8',
    '宮崎県':'#eff4e8','鹿児島県':'#eff4e8','沖縄県':'#eff4e8'
};

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map-container', {
        zoomControl: false,
        attributionControl: false,
        doubleClickZoom: false,
        zoomSnap: 0.1
    }).setView([38.0, 137.0], 5);

    fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson')
        .then(res => res.json())
        .then(data => {
            geoJsonLayer = L.geoJson(data, {
                style: { fillColor: '#f4f7f4', weight: 0.15, color: '#000000', fillOpacity: 1 },
                onEachFeature: function (feature, layer) {
                    const prefName = feature.properties.nam_ja;
                    layer.bindTooltip(prefName, { sticky: true, direction: 'top' });
                    layer.on('click', () => {
                        selectedPref = prefName;
                        if (settingsOpen) closeSettings();
                        openPanel();
                        renderRightPanel();
                    });
                    // 都道府県上でもダブルクリックでリセット
                    layer.on('dblclick', (e) => {
                        L.DomEvent.stopPropagation(e);
                        resetMapView();
                    });
                }
            }).addTo(map);

            const bounds = geoJsonLayer.getBounds();
            map.fitBounds(bounds, { padding: [20, 20] });

            setTimeout(() => {
                initialBounds = map.getBounds();
                const minZoom = map.getZoom();
                map.setMinZoom(minZoom);
                // パディングなしでぴったり固定
                map.setMaxBounds(initialBounds);
            }, 300);

            updateMapColors();
        });

    // ズーム後に範囲外に出ないよう制御
    map.on('zoomend', () => {
        if (initialBounds && map.getZoom() <= map.getMinZoom()) {
            map.setMaxBounds(initialBounds);
            map.panInsideBounds(initialBounds, { animate: false });
        }
    });

    // 地図の空白部分ダブルクリックでリセット
    map.on('dblclick', () => { resetMapView(); });

    fetchMemories();

    document.getElementById('menu-btn').addEventListener('click', () => {
        if (panelOpen) {
            closePanel();
        } else {
            if (settingsOpen) closeSettings();
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

    // 設定ボタン
    if (!document.getElementById('settings-btn')) {
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'settings-btn';
        settingsBtn.className = 'settings-btn';
        settingsBtn.innerHTML = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
        settingsBtn.onclick = () => {
            if (settingsOpen) { closeSettings(); }
            else { if (panelOpen) closePanel(); openSettings(); }
        };
        document.querySelector('.main-layout').appendChild(settingsBtn);
    }

    if (!document.getElementById('settings-panel')) {
        const sp = document.createElement('div');
        sp.id = 'settings-panel';
        sp.className = 'list-section';
        document.querySelector('.main-layout').appendChild(sp);
    }
});

function resetMapView() {
    if (initialBounds) {
        map.fitBounds(initialBounds, { animate: true, duration: 0.5 });
    }
}

function openPanel() {
    panelOpen = true;
    const panel = document.getElementById('right-panel');
    panel.classList.add('open');
    panel.scrollTop = 0;
    updateUIVisibility();
}

function closePanel() {
    panelOpen = false;
    selectedPref = null;
    document.getElementById('right-panel').classList.remove('open');
    updateUIVisibility();
}

function openSettings() {
    settingsOpen = true;
    document.getElementById('settings-panel').classList.add('open');
    updateUIVisibility();
    renderSettingsPanel();
}

function closeSettings() {
    settingsOpen = false;
    document.getElementById('settings-panel').classList.remove('open');
    updateUIVisibility();
}

function backToList() {
    selectedPref = null;
    renderRightPanel();
    updateUIVisibility();
}

function updateUIVisibility() {
    const counter = document.getElementById('pref-counter');
    const menuBtn = document.getElementById('menu-btn');
    const settingsBtn = document.getElementById('settings-btn');

    if (panelOpen || settingsOpen) {
        counter.classList.add('hidden-ui');
    } else {
        counter.classList.remove('hidden-ui');
    }

    if (panelOpen && selectedPref !== null) {
        menuBtn.classList.add('hidden-ui');
        if (settingsBtn) settingsBtn.classList.add('hidden-ui');
    } else if (panelOpen && selectedPref === null) {
        menuBtn.classList.remove('hidden-ui');
        if (settingsBtn) settingsBtn.classList.add('hidden-ui');
    } else if (settingsOpen) {
        menuBtn.classList.add('hidden-ui');
        if (settingsBtn) settingsBtn.classList.remove('hidden-ui');
    } else {
        menuBtn.classList.remove('hidden-ui');
        if (settingsBtn) settingsBtn.classList.remove('hidden-ui');
    }
}

function updateCounter() {
    const count = memoriesData.filter(m => {
        const photos = JSON.parse(m.photo_urls || '[]');
        return m.date || photos.length > 0;
    }).length;
    document.getElementById('pref-counter').innerText = `${count} / 47`;
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
    return to ? `${from} 〜 ${to}` : from;
}

function renderRightPanel() {
    const panel = document.getElementById('right-panel');
    const prefOrder = Object.keys(PREF_COLORS);
    panel.scrollTop = 0;
    updateUIVisibility();

    if (!selectedPref) {
        panel.style.backgroundColor = '#f5f5f3';

        let html = `
        <div class="panel-header">
            <div class="panel-header-title-row">
                <div style="flex:1;"></div>
                <h2 style="margin:0; font-size:1.4rem; color:#444; position:absolute; left:50%; transform:translateX(-50%);">あしあと</h2>
                <button class="panel-close-btn" onclick="closePanel()">✕</button>
            </div>
        </div>
        <div class="panel-content" style="padding-top:20px;">`;

        if (memoriesData.length === 0) {
            html += `<p style="color:#aaa; text-align:center; margin-top:40px;">地図から都道府県を選んで<br>思い出を追加しましょう</p>`;
        } else {
            const sorted = [...memoriesData]
                .filter(m => {
                    const photos = JSON.parse(m.photo_urls || '[]');
                    return m.date || photos.length > 0;
                })
                .sort((a, b) => prefOrder.indexOf(a.prefecture) - prefOrder.indexOf(b.prefecture));

            sorted.forEach(m => {
                const color = PREF_COLORS[m.prefecture] || '#aaa';
                html += `<button class="pref-btn" onclick="selectedPref='${m.prefecture}'; openPanel(); renderRightPanel();"
                    style="border-left: 5px solid ${color};">
                    <span style="font-weight:bold; color:#444;">${m.prefecture}</span>
                    <span style="color:#aaa; font-size:0.85em;">${formatDate(m.date)}</span>
                </button>`;
            });
        }
        html += `</div>`;
        panel.innerHTML = html;

    } else {
        const lightColor = PREF_COLORS_LIGHT[selectedPref] || '#f5f5f3';
        const color = PREF_COLORS[selectedPref] || '#8aab8a';
        panel.style.backgroundColor = lightColor;

        const data = memoriesData.find(m => m.prefecture === selectedPref) || { date: '', photo_urls: '[]' };
        let photos = [];
        try { photos = JSON.parse(data.photo_urls); } catch(e){}

        let html = `
        <div class="panel-header" style="border-bottom: 3px solid ${color};">
            <div class="panel-header-title-row">
                <button onclick="backToList()" style="background:none; border:none; font-size:22px; color:#888; cursor:pointer; padding:0; line-height:1;">←</button>
                <h2 style="margin:0; font-size:1.6rem; color:#333; position:absolute; left:50%; transform:translateX(-50%);">${selectedPref}</h2>
                <button class="panel-close-btn" onclick="closePanel()">✕</button>
            </div>
        </div>
        <div class="panel-content" style="padding-top:20px;">
            <p id="autosave-status" style="color:#aaa; text-align:center; font-size:12px; min-height:18px; margin:0 0 12px;"></p>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px;">
                <input type="date" id="input-date-from" value="${getDateFrom(data.date)}"
                    style="flex:1; padding:10px; border-radius:6px; border:1px solid #ddd; font-size:14px; background:white; color:#555;">
                <span style="color:#bbb;">〜</span>
                <input type="date" id="input-date-to" value="${getDateTo(data.date)}"
                    style="flex:1; padding:10px; border-radius:6px; border:1px solid #ddd; font-size:14px; background:white; color:#555;">
            </div>`;

        if (photos.length > 0) {
            html += `<div class="photo-grid">`;
            photos.forEach(url => {
                const photosJson = JSON.stringify(photos).replace(/"/g, '&quot;');
                html += `<div class="photo-grid-item" onclick="openSliderAt('${url}', ${photosJson})">
                            <img src="${url}">
                            <button class="photo-delete-btn" onclick="event.stopPropagation(); deletePhoto('${url}')">✕</button>
                         </div>`;
            });
            html += `</div>`;
        } else {
            html += `<p style="text-align:center; color:#ccc; font-size:13px; margin-top:40px;">右下の＋から写真を追加</p>`;
        }

        html += `
            <label for="input-photos" class="add-photo-fab" style="background:${color};" title="写真を追加">
                <svg viewBox="0 0 24 24" width="28" height="28" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </label>
            <input type="file" id="input-photos" multiple accept="image/*" style="display:none;">
        </div>`;

        panel.innerHTML = html;

        const fromInput = document.getElementById('input-date-from');
        const toInput = document.getElementById('input-date-to');
        const photoInput = document.getElementById('input-photos');

        if (fromInput) fromInput.addEventListener('change', triggerAutoSave);
        if (toInput) toInput.addEventListener('change', triggerAutoSave);
        if (photoInput) photoInput.addEventListener('change', triggerAutoSave);
    }
}

function renderSettingsPanel() {
    const panel = document.getElementById('settings-panel');
    panel.style.backgroundColor = '#ffffff';
    panel.innerHTML = `
    <div class="panel-header">
        <div class="panel-header-title-row">
            <div style="flex:1;"></div>
            <h2 style="margin:0; font-size:1.4rem; color:#444; position:absolute; left:50%; transform:translateX(-50%);">設定</h2>
            <button class="panel-close-btn" onclick="closeSettings()">✕</button>
        </div>
    </div>
    <div class="panel-content" style="padding-top:20px;">
        <p style="color:#aaa; text-align:center; margin-top:40px; font-size:14px;">設定項目はありません</p>
    </div>`;
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
    const files = document.getElementById('input-photos')?.files;
    if (!fromEl) return;

    const fromVal = toSlashDate(fromEl.value);
    const toVal = toSlashDate(toEl.value);
    const dateValue = fromVal && toVal ? `${fromVal}~${toVal}` : fromVal || toVal || '';

    let base64Photos = [];
    if (files) {
        for (let file of files) { base64Photos.push(await compressImage(file)); }
    }

    const payload = { action: "save_memory", prefecture: selectedPref, date: dateValue, photos: base64Photos };

    try {
        const res = await fetch('/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            await fetchMemories(false);
            renderRightPanel();
            const statusEl = document.getElementById('autosave-status');
            if (statusEl) { statusEl.innerText = '✓ 保存しました'; setTimeout(() => { if(statusEl) statusEl.innerText = ''; }, 2000); }
        } else {
            const err = await res.json().catch(() => ({}));
            const statusEl = document.getElementById('autosave-status');
            if (statusEl) statusEl.innerText = '保存失敗: ' + (err.error || '不明');
        }
    } catch(e) {
        const statusEl = document.getElementById('autosave-status');
        if (statusEl) statusEl.innerText = 'ネットワークエラー';
    }
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
        await fetch('/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        await fetchMemories(false);
        renderRightPanel();
    } catch(e) { console.error("削除エラー", e); }
}

function updateMapColors() {
    if (!geoJsonLayer) return;
    geoJsonLayer.eachLayer(layer => {
        const pref = layer.feature.properties.nam_ja;
        const memory = memoriesData.find(m => m.prefecture === pref);
        let isVisited = false;
        if (memory) {
            const photos = JSON.parse(memory.photo_urls || '[]');
            if (memory.date || photos.length > 0) isVisited = true;
        }
        layer.setStyle({
            fillColor: isVisited ? (PREF_COLORS[pref] || '#8aab8a') : '#f4f7f4',
            weight: 0.15,
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
    if (typeof photos === 'string') {
        try { photos = JSON.parse(photos); } catch(e) { photos = [url]; }
    }
    currentPhotos = photos;
    slideIndex = photos.findIndex(p => p === url);
    if (slideIndex < 0) slideIndex = 0;
    updateSlider();
    document.getElementById('slider-modal').classList.remove('hidden');
}

function updateSlider() {
    document.getElementById('slide-image').src = currentPhotos[slideIndex];
    document.getElementById('slide-counter').innerText = `${slideIndex + 1} / ${currentPhotos.length}`;
}