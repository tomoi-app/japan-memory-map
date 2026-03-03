let map;
let geoJsonLayer;
let selectedPref = null;
let memoriesData = [];
let currentPhotos = [];
let slideIndex = 0;
let autoSaveTimer = null;
let panelOpen = false;

const PREF_COLORS = {
    '北海道':'#f4b8b8','青森県':'#f4c4b0','岩手県':'#f4d0a8','宮城県':'#f4dca0',
    '秋田県':'#f4e8a0','山形県':'#e8f4a0','福島県':'#d4f4a8','茨城県':'#b8f4b8',
    '栃木県':'#a8f4cc','群馬県':'#a0f4e0','埼玉県':'#a0ecf4','千葉県':'#a0d8f4',
    '東京都':'#a8c8f4','神奈川県':'#b4b8f4','新潟県':'#c8b0f4','富山県':'#dcb0f4',
    '石川県':'#f0b0e8','福井県':'#f4b0d4','山梨県':'#f4b0bc','長野県':'#f9cec0',
    '岐阜県':'#f9d8c0','静岡県':'#f9e4c0','愛知県':'#f0f4b8','三重県':'#d8f4b8',
    '滋賀県':'#bcf4c4','京都府':'#b0f4d8','大阪府':'#b0f0f4','兵庫県':'#b0dcf4',
    '奈良県':'#b8c8f4','和歌山県':'#ccb8f4','鳥取県':'#e4b8f4','島根県':'#f4b8e8',
    '岡山県':'#f4b8cc','広島県':'#f4c0c0','山口県':'#fad0b8','徳島県':'#fae0b8',
    '香川県':'#faecb8','愛媛県':'#e8fab8','高知県':'#ccfab8','福岡県':'#b8fac8',
    '佐賀県':'#b8fadc','長崎県':'#b8f4fa','熊本県':'#b8e0fa','大分県':'#c4c8fa',
    '宮崎県':'#dcc0fa','鹿児島県':'#fac0f0','沖縄県':'#fac0d4'
};

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map-container', { zoomControl: false, attributionControl: false }).setView([38.0, 137.0], 5);

    fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson')
        .then(res => res.json())
        .then(data => {
            geoJsonLayer = L.geoJson(data, {
                style: { fillColor: '#ffffff', weight: 0.8, color: '#aaaaaa', fillOpacity: 1 },
                onEachFeature: function (feature, layer) {
                    const prefName = feature.properties.nam_ja;
                    layer.bindTooltip(prefName, { sticky: true, direction: 'top' });
                    layer.on('click', () => {
                        selectedPref = prefName;
                        if (!panelOpen) openPanel();
                        renderRightPanel();
                    });
                }
            }).addTo(map);
            map.fitBounds(geoJsonLayer.getBounds());
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
    document.getElementById('right-panel').classList.add('open');
}

function closePanel() {
    panelOpen = false;
    selectedPref = null;
    document.getElementById('right-panel').classList.remove('open');
}

function updateCounter() {
    document.getElementById('pref-counter').innerText = `${memoriesData.length} / 47`;
}

function renderRightPanel() {
    const panel = document.getElementById('right-panel');

    if (!selectedPref) {
        panel.style.backgroundColor = '#eeeeee';
        let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">`;
        html += `<h2 style="margin:0;">記録された思い出</h2>`;
        html += `<button onclick="closePanel()" style="border:none; background:none; font-size:22px;">✕</button>`;
        html += `</div>`;

        if (memoriesData.length === 0) {
            html += `<p>地図から都道府県を選んで思い出を追加しましょう。</p>`;
        } else {
            memoriesData.forEach(m => {
                const color = PREF_COLORS[m.prefecture] || '#eee';
                html += `<button class="pref-btn" onclick="selectedPref='${m.prefecture}'; renderRightPanel();"
                    style="border-left: 5px solid ${color};">
                    ${m.prefecture}　<span style="color:#888; font-size:0.9em;">${m.date || "日付未設定"}</span>
                </button>`;
            });
        }
        panel.innerHTML = html;

    } else {
        const color = PREF_COLORS[selectedPref] || '#e0f0ff';
        panel.style.backgroundColor = color;

        const data = memoriesData.find(m => m.prefecture === selectedPref) || { date: '', photo_urls: '[]' };
        let photos = [];
        try { photos = JSON.parse(data.photo_urls); } catch(e){}

        const dateParts = (data.date || '').split('~');
        const dateFrom = (dateParts[0] || '').trim();
        const dateTo = (dateParts[1] || '').trim();

        let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">`;
        html += `<button onclick="selectedPref=null; renderRightPanel();">← 戻る</button>`;
        html += `<button onclick="closePanel()" style="border:none; background:none; font-size:22px;">✕</button>`;
        html += `</div>`;
        html += `<h1 style="text-align:center; background:white; padding:15px; border-radius:8px; margin:0 0 10px;">${selectedPref}</h1>`;
        html += `<p id="autosave-status" style="color:#555; text-align:center; font-size:13px; min-height:20px;"></p>`;

        html += `<label>訪問期間</label>`;
        html += `<div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">`;
        html += `<input type="date" id="input-date-from" value="${dateFrom}" style="flex:1; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:15px; background:white;">`;
        html += `<span>〜</span>`;
        html += `<input type="date" id="input-date-to" value="${dateTo}" style="flex:1; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:15px; background:white;">`;
        html += `</div>`;

        html += `<label>写真を追加（最大10枚）</label>`;
        html += `<input type="file" id="input-photos" multiple accept="image/*" style="background:white;">`;

        if (photos.length > 0) {
            html += `<button class="btn-full" onclick='openSlider(${JSON.stringify(photos)})' style="margin-top:20px;">写真を拡大して見る</button>`;
            html += `<div class="photo-grid">`;
            photos.forEach(url => {
                html += `<div>
                            <img src="${url}">
                            <button style="width:100%; color:red; margin-top:5px; background:white;" onclick="deletePhoto('${url}')">削除</button>
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

    const dateValue = fromEl.value && toEl.value ? `${fromEl.value}~${toEl.value}` : fromEl.value || toEl.value || '';
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
    if(!confirm("この写真を削除しますか？")) return;
    const payload = { action: "delete_photo", prefecture: selectedPref, photo_url: url };
    await fetch('/api', { method: 'POST', body: JSON.stringify(payload) });
    await fetchMemories();
}

function updateMapColors() {
    if (!geoJsonLayer) return;
    geoJsonLayer.eachLayer(layer => {
        const pref = layer.feature.properties.nam_ja;
        const isVisited = memoriesData.some(m => m.prefecture === pref);
        layer.setStyle({
            fillColor: isVisited ? (PREF_COLORS[pref] || '#c8e6c9') : '#ffffff',
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