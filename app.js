let map;
let geoJsonLayer;
let selectedPref = null;
let memoriesData = [];
let currentPhotos = [];
let slideIndex = 0;
let autoSaveTimer = null;

const PREF_COLORS = {
    '北海道':'#ff6b6b','青森県':'#ff8c42','岩手県':'#ffa726','宮城県':'#ffcc02',
    '秋田県':'#d4e157','山形県':'#9ccc65','福島県':'#66bb6a','茨城県':'#26c6da',
    '栃木県':'#26a69a','群馬県':'#42a5f5','埼玉県':'#5c6bc0','千葉県':'#7e57c2',
    '東京都':'#ab47bc','神奈川県':'#ec407a','新潟県':'#ef5350','富山県':'#ff7043',
    '石川県':'#ffa000','福井県':'#c0ca33','山梨県':'#43a047','長野県':'#00897b',
    '岐阜県':'#00acc1','静岡県':'#039be5','愛知県':'#3949ab','三重県':'#8e24aa',
    '滋賀県':'#d81b60','京都府':'#e53935','大阪府':'#f4511e','兵庫県':'#fb8c00',
    '奈良県':'#f9a825','和歌山県':'#827717','鳥取県':'#558b2f','島根県':'#00695c',
    '岡山県':'#00838f','広島県':'#1565c0','山口県':'#283593','徳島県':'#4527a0',
    '香川県':'#6a1b9a','愛媛県':'#ad1457','高知県':'#b71c1c','福岡県':'#bf360c',
    '佐賀県':'#e65100','長崎県':'#f57f17','熊本県':'#9e9d24','大分県':'#33691e',
    '宮崎県':'#1b5e20','鹿児島県':'#006064','沖縄県':'#0d47a1'
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
                        openPanel();
                        renderRightPanel();
                    });
                }
            }).addTo(map);
            map.fitBounds(geoJsonLayer.getBounds());
            updateMapColors();
        });

    fetchMemories();

    // メニューボタン
    document.getElementById('menu-btn').addEventListener('click', () => {
        selectedPref = null;
        openPanel();
        renderRightPanel();
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
    document.getElementById('right-panel').classList.add('open');
}

function closePanel() {
    document.getElementById('right-panel').classList.remove('open');
    selectedPref = null;
}

function updateCounter() {
    const count = memoriesData.length;
    document.getElementById('pref-counter').innerText = `${count} / 47`;
}

function renderRightPanel() {
    const panel = document.getElementById('right-panel');

    if (!selectedPref) {
        panel.style.backgroundColor = 'white';
        let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">`;
        html += `<h2 style="margin:0;">記録された思い出</h2>`;
        html += `<button onclick="closePanel()" style="border:none; background:none; font-size:22px; cursor:pointer;">✕</button>`;
        html += `</div>`;

        if (memoriesData.length === 0) {
            html += `<p>地図から都道府県を選んで思い出を追加しましょう。</p>`;
        } else {
            memoriesData.forEach(m => {
                const color = PREF_COLORS[m.prefecture] || '#ccc';
                html += `<button class="pref-btn" onclick="selectedPref='${m.prefecture}'; renderRightPanel();" 
                    style="border-left: 5px solid ${color};">
                    ${m.prefecture}　<span style="color:#888; font-size:0.9em;">${m.date || "日付未設定"}</span>
                </button>`;
            });
        }
        panel.innerHTML = html;
    } else {
        const data = memoriesData.find(m => m.prefecture === selectedPref) || { date: '', photo_urls: '[]' };
        let photos = [];
        try { photos = JSON.parse(data.photo_urls); } catch(e){}

        const dateParts = (data.date || '').split('~');
        const dateFrom = (dateParts[0] || '').trim();
        const dateTo = (dateParts[1] || '').trim();

        const color = PREF_COLORS[selectedPref] || '#3498db';
        panel.style.backgroundColor = '#fafafa';

        let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">`;
        html += `<button onclick="selectedPref=null; renderRightPanel();">← 戻る</button>`;
        html += `<button onclick="closePanel()" style="border:none; background:none; font-size:22px;">✕</button>`;
        html += `</div>`;
        html += `<h1 style="text-align:center; background:white; padding:15px; border-radius:8px; margin:0 0 10px; border-top: 5px solid ${color};">${selectedPref}</h1>`;
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

        document.getElementById('input-date-from').addEventListener('change', triggerAutoSave);
        document.getElementById('input-date-to').addEventListener('change', triggerAutoSave);
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