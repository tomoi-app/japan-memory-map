let map;
let geoJsonLayer;
let selectedPref = null;
let memoriesData = [];
let currentPhotos = [];
let slideIndex = 0;
let autoSaveTimer = null;

const PREF_COLORS = {
    '北海道':'#e8a0a0','青森県':'#e8b8a0','岩手県':'#e8cba0','宮城県':'#e8dda0',
    '秋田県':'#d8e8a0','山形県':'#c0e8a0','福島県':'#a0e8a8','茨城県':'#a0e8c8',
    '栃木県':'#a0e8e0','群馬県':'#a0d8e8','埼玉県':'#a0c0e8','千葉県':'#a0a8e8',
    '東京都':'#b0a0e8','神奈川県':'#c8a0e8','新潟県':'#e0a0e8','富山県':'#e8a0d8',
    '石川県':'#e8a0c0','福井県':'#e8a0a8','山梨県':'#f0b0b0','長野県':'#f0c4b0',
    '岐阜県':'#f0d4b0','静岡県':'#f0e4b0','愛知県':'#e4f0b0','三重県':'#cef0b0',
    '滋賀県':'#b0f0b8','京都府':'#b0f0d0','大阪府':'#b0f0e8','兵庫県':'#b0e4f0',
    '奈良県':'#b0cef0','和歌山県':'#b0b8f0','鳥取県':'#c4b0f0','島根県':'#dab0f0',
    '岡山県':'#f0b0e4','広島県':'#f0b0ce','山口県':'#f0b0b8','徳島県':'#f4c0c0',
    '香川県':'#f4cfc0','愛媛県':'#f4dcc0','高知県':'#f4eac0','福岡県':'#e8f4c0',
    '佐賀県':'#d0f4c0','長崎県':'#c0f4c8','熊本県':'#c0f4dc','大分県':'#c0f4f0',
    '宮崎県':'#c0e8f4','鹿児島県':'#c0d0f4','沖縄県':'#d0c0f4'
};

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map-container', { zoomControl: false, attributionControl: false }).setView([38.0, 137.0], 5);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson')
        .then(res => res.json())
        .then(data => {
            geoJsonLayer = L.geoJson(data, {
                style: { fillColor: '#ffffff', weight: 0.8, color: '#333333', fillOpacity: 1 },
                onEachFeature: function (feature, layer) {
                    const prefName = feature.properties.nam_ja;
                    layer.bindTooltip(prefName, { sticky: true, direction: 'top' });
                    layer.on('click', () => {
                        selectedPref = prefName;
                        renderRightPanel();
                    });
                }
            }).addTo(map);
            map.fitBounds(geoJsonLayer.getBounds());
            updateMapColors();
        });

    fetchMemories();

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

function renderRightPanel() {
    const panel = document.getElementById('right-panel');

    if (!selectedPref) {
        panel.style.backgroundColor = 'white';
        let html = `<h2>記録された思い出</h2>`;
        if (memoriesData.length === 0) {
            html += `<p>地図から都道府県を選んで思い出を追加しましょう。</p>`;
        } else {
            memoriesData.forEach(m => {
                html += `<button class="pref-btn" onclick="selectedPref='${m.prefecture}'; renderRightPanel();">${m.prefecture}（${m.date || "日付未設定"}）</button>`;
            });
        }
        panel.innerHTML = html;
        updateMapColors();
    } else {
        const data = memoriesData.find(m => m.prefecture === selectedPref) || { date: '', photo_urls: '[]' };
        let photos = [];
        try { photos = JSON.parse(data.photo_urls); } catch(e){}

        // 期間の開始日・終了日を分割
        const dateParts = (data.date || '').split('~');
        const dateFrom = (dateParts[0] || '').trim();
        const dateTo = (dateParts[1] || '').trim();

        panel.style.backgroundColor = '#e8f4f8';

        let html = `<button onclick="selectedPref=null; renderRightPanel();">← 一覧に戻る</button>`;
        html += `<h1 style="text-align:center; background:white; padding:15px; border-radius:8px; margin:15px 0;">${selectedPref}</h1>`;
        html += `<p id="autosave-status" style="color:green; text-align:center; font-size:13px; min-height:20px;"></p>`;

        html += `<label>訪問期間</label>`;
        html += `<div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">`;
        html += `<input type="date" id="input-date-from" value="${dateFrom}" style="flex:1; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:15px;">`;
        html += `<span>〜</span>`;
        html += `<input type="date" id="input-date-to" value="${dateTo}" style="flex:1; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:15px;">`;
        html += `</div>`;

        html += `<label>写真を追加（最大10枚）</label>`;
        html += `<input type="file" id="input-photos" multiple accept="image/*">`;

        if (photos.length > 0) {
            html += `<button class="btn-full" onclick='openSlider(${JSON.stringify(photos)})' style="margin-top:20px;">写真を拡大して見る</button>`;
            html += `<div class="photo-grid">`;
            photos.forEach(url => {
                html += `<div>
                            <img src="${url}">
                            <button style="width:100%; color:red; margin-top:5px;" onclick="deletePhoto('${url}')">削除</button>
                         </div>`;
            });
            html += `</div>`;
        }

        panel.innerHTML = html;

        // 日付変更で自動保存
        document.getElementById('input-date-from').addEventListener('change', triggerAutoSave);
        document.getElementById('input-date-to').addEventListener('change', triggerAutoSave);

        // 写真追加で自動保存
        document.getElementById('input-photos').addEventListener('change', triggerAutoSave);
    }
}

function triggerAutoSave() {
    const statusEl = document.getElementById('autosave-status');
    if (statusEl) statusEl.innerText = '入力中...';

    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
        await saveMemoryData();
    }, 800);
}

async function saveMemoryData() {
    const fromEl = document.getElementById('input-date-from');
    const toEl = document.getElementById('input-date-to');
    const files = document.getElementById('input-photos').files;

    if (!fromEl) return;

    const dateFrom = fromEl.value;
    const dateTo = toEl.value;
    const dateValue = dateFrom && dateTo ? `${dateFrom}~${dateTo}` : dateFrom || dateTo || '';

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
            await fetchMemories(false); // パネルを再描画しない
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
            fillColor: isVisited ? (PREF_COLORS[pref] || '#a2d9ce') : '#ffffff',
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