let map;
let geoJsonLayer;
let selectedPref = null;
let memoriesData = [];
let currentPhotos = [];
let slideIndex = 0;

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
                style: function(feature) {
                    const pref = feature.properties.nam_ja;
                    return {
                        fillColor: PREF_COLORS[pref] || '#ffffff',
                        weight: 0.8,
                        color: '#333333',
                        fillOpacity: 1
                    };
                },
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

        panel.style.backgroundColor = '#e8f4f8';
        
        let html = `<button onclick="selectedPref=null; renderRightPanel();">← 一覧に戻る</button>`;
        html += `<h1 style="text-align:center; background:white; padding:15px; border-radius:8px; margin: 15px 0;">${selectedPref}</h1>`;
        
        html += `<label>日付</label>`;
        html += `<input type="date" id="input-date" value="${data.date}" style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc; font-size:16px;">`;
        
        html += `<label style="margin-top:12px; display:block;">写真を追加（最大10枚）</label>`;
        html += `<input type="file" id="input-photos" multiple accept="image/*">`;
        
        html += `<button id="btn-save-memory" class="btn-full" style="background-color: #2ecc71; margin-top: 15px;">保存する</button>`;
        html += `<p id="upload-status" style="color:blue; display:none; text-align:center; margin-top:10px; font-weight:bold;">保存中...</p>`;

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
        document.getElementById('btn-save-memory').addEventListener('click', saveMemoryData);
    }
}

async function saveMemoryData() {
    const dateValue = document.getElementById('input-date').value;
    const files = document.getElementById('input-photos').files;

    document.getElementById('upload-status').style.display = 'block';
    document.getElementById('btn-save-memory').disabled = true;

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
        
        const responseText = await res.text();

        if (res.ok) {
            await fetchMemories();
            alert("保存しました！");
        } else {
            try {
                const errData = JSON.parse(responseText);
                alert("データベースの拒否エラー: " + (errData.error || "詳細不明"));
            } catch(e) {
                alert(`サーバーの致命的エラー (Status ${res.status}):\n${responseText.substring(0, 150)}...`);
            }
        }
    } catch(e) {
        alert(`ネットワーク遮断エラーの詳細:\n${e.message}`);
    } finally {
        if(document.getElementById('upload-status')) document.getElementById('upload-status').style.display = 'none';
        if(document.getElementById('btn-save-memory')) document.getElementById('btn-save-memory').disabled = false;
    }
}

async function fetchMemories() {
    try {
        const res = await fetch('/api');
        memoriesData = await res.json();
        renderRightPanel();
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
        const baseColor = PREF_COLORS[pref] || '#ffffff';
        layer.setStyle({
            fillColor: isVisited ? '#a2d9ce' : baseColor,
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