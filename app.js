let map;
let geoJsonLayer;
let selectedPref = null;
let memoriesData = [];
let currentPhotos = [];
let slideIndex = 0;
let autoSaveTimer = null;
let panelOpen = false;
let minZoom;

const PREF_COLORS = {
    '北海道':'#f08080','青森県':'#f0956a','岩手県':'#f0b060','宮城県':'#f0cc50',
    '秋田県':'#d4e060','山形県':'#a0d870','福島県':'#70d880','茨城県':'#50d4c0',
    '栃木県':'#50c8b8','群馬県':'#60b8f0','埼玉県':'#7090e0','千葉県':'#9070d8',
    '東京都':'#b860d8','神奈川県':'#e060a0','新潟県':'#e85050','富山県':'#e87040',
    '石川県':'#e89030','福井県':'#c8c030','山梨県':'#60b060','長野県':'#30a898',
    '岐阜県':'#30b0d0','静岡県':'#3090d8','愛知県':'#5070c8','三重県':'#8040b8',
    '滋賀県':'#c03080','京都府':'#d83030','大阪府':'#e04818','兵庫県':'#e87010',
    '奈良県':'#d89010','和歌山県':'#787010','鳥取県':'#507828','島根県':'#108060',
    '岡山県':'#107888','広島県':'#104888','山口県':'#202878','徳島県':'#3818a0',
    '香川県':'#680898','愛媛県':'#a01060','高知県':'#a01010','福岡県':'#a02808',
    '佐賀県':'#d04800','長崎県':'#d07000','熊本県':'#888010','大分県':'#285010',
    '宮崎県':'#104010','鹿児島県':'#005048','沖縄県':'#003478'
};

const PREF_COLORS_LIGHT = {
    '北海道':'#fde8e8','青森県':'#fdeee6','岩手県':'#fdf3e0','宮城県':'#fdf8da',
    '秋田県':'#f5fada','山形県':'#e8fada','福島県':'#d8fae0','茨城県':'#d0faf4',
    '栃木県':'#d0f8f2','群馬県':'#d8f0fc','埼玉県':'#dce8fc','千葉県':'#e6dcfc',
    '東京都':'#f2dcfc','神奈川県':'#fcdcee','新潟県':'#fcdcdc','富山県':'#fde4da',
    '石川県':'#fdeeda','福井県':'#fdfada','山梨県':'#e0f4e0','長野県':'#d0f4f0',
    '岐阜県':'#d0f0f8','静岡県':'#d8ecfc','愛知県':'#dce4fc','三重県':'#ecd8fc',
    '滋賀県':'#fcd8ec','京都府':'#fcd8d8','大阪府':'#fde0d8','兵庫県':'#fdecd8',
    '奈良県':'#fdf6d8','和歌山県':'#f4f2d0','鳥取県':'#e0f0d0','島根県':'#d0f0e8',
    '岡山県':'#d0f0f4','広島県':'#d0e4f8','山口県':'#d4d8f8','徳島県':'#dcd0f8',
    '香川県':'#ecd0f8','愛媛県':'#f8d0e8','高知県':'#f8d0d0','福岡県':'#f8dcd0',
    '佐賀県':'#fcecd0','長崎県':'#fcf4d0','熊本県':'#f0f4d0','大分県':'#d8f0d0',
    '宮崎県':'#d0f0d8','鹿児島県':'#d0f0ee','沖縄県':'#d0e4f8'
};

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map-container', { zoomControl: false, attributionControl: false }).setView([38.0, 137.0], 5);

    fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson')
        .then(res => res.json())
        .then(data => {
            geoJsonLayer = L.geoJson(data, {
                style: { fillColor: '#ffffff', weight: 1.2, color: '#000000', fillOpacity: 1 },
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
            map.fitBounds(bounds);

            // fitBounds後のzoomを最小値として固定
            setTimeout(() => {
                minZoom = map.getZoom();
                map.setMinZoom(minZoom);
            }, 100);

            updateMapColors();
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
});

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

function updateUIVisibility() {
    const counter = document.getElementById('pref-counter');
    const menuBtn = document.getElementById('menu-btn');

    if (panelOpen) {
        counter.classList.add('hidden-ui');
        if (selectedPref) {
            // 都道府県を開いているときはメニューボタンも非表示
            menuBtn.classList.add('hidden-ui');
        } else {
            menuBtn.classList.remove('hidden-ui');
        }
    } else {
        counter.classList.remove('hidden-ui');
        menuBtn.classList.remove('hidden-ui');
    }
}

function updateCounter() {
    document.getElementById('pref-counter').innerText = `${memoriesData.length} / 47`;
}

function renderRightPanel() {
    const panel = document.getElementById('right-panel');
    panel.scrollTop = 0;
    updateUIVisibility();

    if (!selectedPref) {
        panel.style.backgroundColor = '#e0e0e0';

        let html = `<div style="display:flex; justify-content:flex-end; margin-bottom:20px;">`;
        html += `<button onclick="closePanel()" style="border:none; background:none; font-size:24px; padding:0;">✕</button>`;
        html += `</div>`;

        if (memoriesData.length === 0) {
            html += `<p style="color:#666;">地図から都道府県を選んで思い出を追加しましょう。</p>`;
        } else {
            memoriesData.forEach(m => {
                const color = PREF_COLORS[m.prefecture] || '#aaa';
                html += `<button class="pref-btn" onclick="selectedPref='${m.prefecture}'; openPanel(); renderRightPanel();"
                    style="border-left: 5px solid ${color};">
                    <span style="font-weight:bold;">${m.prefecture}</span>
                    <span style="color:#888; font-size:0.85em; margin-left:8px;">${formatDate(m.date)}</span>
                </button>`;
            });
        }
        panel.innerHTML = html;

    } else {
        const lightColor = PREF_COLORS_LIGHT[selectedPref] || '#f0f0f0';
        panel.style.backgroundColor = lightColor;

        const data = memoriesData.find(m => m.prefecture === selectedPref) || { date: '', photo_urls: '[]' };
        let photos = [];
        try { photos = JSON.parse(data.photo_urls); } catch(e){}

        const color = PREF_COLORS[selectedPref] || '#3498db';

        let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">`;
        html += `<button onclick="selectedPref=null; updateUIVisibility(); renderRightPanel();" style="background:white;">← 戻る</button>`;
        html += `<button onclick="closePanel()" style="border:none; background:none; font-size:24px; padding:0;">✕</button>`;
        html += `</div>`;
        html += `<h1 style="text-align:center; background:white; padding:15px; border-radius:10px; margin:0 0 8px; border-top:5px solid ${color}; font-size:1.4rem;">${selectedPref}</h1>`;
        html += `<p id="autosave-status" style="color:#555; text-align:center; font-size:13px; min-height:20px; margin:0 0 12px;"></p>`;

        // 訪問期間（ラベルなし）
        html += `<div style="display:flex; align-items:center; gap:8px; margin-bottom:16px;">`;
        html += `<input type="date" id="input-date-from" value="${getDateFrom(data.date)}" style="flex:1; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:15px; background:white;">`;
        html += `<span style="color:#666;">〜</span>`;
        html += `<input type="date" id="input-date-to" value="${getDateTo(data.date)}" style="flex:1; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:15px; background:white;">`;
        html += `</div>`;

        html += `<label style="font-weight:bold; display:block; margin-bottom:6px;">写真を追加（最大10枚）</label>`;
        html += `<input type="file" id="input-photos" multiple accept="image/*">`;

        if (photos.length > 0) {
            html += `<button class="btn-full" onclick='openSlider(${JSON.stringify(photos)})' style="margin-top:12px;">写真を拡大して見る</button>`;
            html += `<div class="photo-grid">`;
            photos.forEach(url => {
                html += `<div class="photo-grid-item">
                            <img src="${url}">
                            <button class="photo-delete-btn" onclick="deletePhoto('${url}')">✕</button>
                         </div>`;
            });
            html += `</div>`;
        }

        panel.innerHTML = html;

        document.getElementById('input-date-from').addEventListener('change', triggerAutoSave);
        document.getElementById('input-date-to').addEventListener('change', triggerAutoSave);
        document.getElementById('input-photos').addEventListener('change', triggerAutoSave);
    }
}

function getDateFrom(dateStr) {
    if (!dateStr) return '';
    return (dateStr.split('~')[0] || '').trim();
}

function getDateTo(dateStr) {
    if (!dateStr) return '';
    return (dateStr.split('~')[1] || '').trim();
}

function formatDate(dateStr) {
    if (!dateStr) return '日付未設定';
    const parts = dateStr.split('~');
    if (parts.length === 2 && parts[1].trim()) {
        return `${parts[0].trim()} 〜 ${parts[1].trim()}`;
    }
    return parts[0].trim();
}

function triggerAutoSave() {
    const statusEl = document.getElementById('autosave-status');
    if (statusEl) statusEl.innerText = '入力中...';
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => { await saveMemoryData(); }, 800);
}

async function saveMemoryData() {
    const fromEl = document.getElementById('input-date-from');
    const toEl = document.getElementById('input-date-to');
    const files = document.getElementById('input-photos').files;
    if (!fromEl) return;

    const dateValue = fromEl.value && toEl.value
        ? `${fromEl.value}~${toEl.value}`
        : fromEl.value || toEl.value || '';

    const statusEl = document.getElementById('autosave-status');
    if (statusEl) statusEl.innerText = '保存中...';

    let base64Photos = [];
    for (let file of files) {
        const b64 = await compressImage(file);
        base64Photos.push(b64);
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
            if (statusEl) statusEl.innerText = '✓ 保存しました';
            setTimeout(() => { if (statusEl) statusEl.innerText = ''; }, 2000);
        } else {
            const errData = await res.json().catch(() => ({}));
            if (statusEl) statusEl.innerText = '保存失敗: ' + (errData.error || '不明なエラー');
        }
    } catch(e) {
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
    } catch(e) {
        console.error("削除エラー", e);
    }
}

function updateMapColors() {
    if (!geoJsonLayer) return;
    geoJsonLayer.eachLayer(layer => {
        const pref = layer.feature.properties.nam_ja;
        const isVisited = memoriesData.some(m => m.prefecture === pref);
        layer.setStyle({
            fillColor: isVisited ? (PREF_COLORS[pref] || '#a0c0ff') : '#ffffff',
            weight: 1.2,
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

function openSlider(photos) {
    currentPhotos = photos;
    slideIndex = 0;
    updateSlider();
    document.getElementById('slider-modal').classList.remove('hidden');
}

function updateSlider() {
    document.getElementById('slide-image').src = currentPhotos[slideIndex];
    document.getElementById('slide-counter').innerText = `${slideIndex + 1} / ${currentPhotos.length}`;
}