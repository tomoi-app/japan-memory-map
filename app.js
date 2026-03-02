let map;
let geoJsonLayer;
let selectedPref = null;
let memoriesData = [];
let currentPhotos = [];
let slideIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    // 地図の初期化（不要なロゴ等を消す）
    map = L.map('map-container', { 
        zoomControl: false,
        attributionControl: false 
    }).setView([38.0, 137.0], 5);
    
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 注意：L.tileLayer(...) は削除しました（世界地図を出さないため）

    // 白地図の描画
    fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson')
        .then(res => res.json())
        .then(data => {
            geoJsonLayer = L.geoJson(data, {
                style: { fillColor: '#ffffff', weight: 1.5, color: '#333333', fillOpacity: 1 },
                onEachFeature: function (feature, layer) {
                    layer.on('click', () => {
                        selectedPref = feature.properties.nam_ja;
                        renderRightPanel();
                    });
                }
            }).addTo(map);
            
            // 日本地図が画面の真ん中にぴったり収まるように自動調整
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

// 右パネルの描画
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
        
        // 日付入力
        html += `<label>日付（例: 2026/03/24）</label>`;
        html += `<input type="text" id="input-date" value="${data.date}" onchange="saveDate(this.value)">`;
        
        // 写真アップロード
        html += `<label>写真を追加（最大10枚）</label>`;
        html += `<input type="file" id="input-photos" multiple accept="image/*" onchange="uploadPhotos(event)">`;
        html += `<p id="upload-status" style="color:blue; display:none;">写真を保存中...</p>`;

        // 写真ギャラリー
        if (photos.length > 0) {
            html += `<button class="btn-full" onclick='openSlider(${JSON.stringify(photos)})'>写真を拡大して見る</button>`;
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
    }
}

// 通信とデータ処理
async function fetchMemories() {
    try {
        const res = await fetch('/api');
        memoriesData = await res.json();
        renderRightPanel();
    } catch (e) {
        console.error("データ取得エラー", e);
    }
}

async function saveDate(dateValue) {
    const payload = { action: "save_memory", prefecture: selectedPref, date: dateValue, photos: [] };
    await fetch('/api', { method: 'POST', body: JSON.stringify(payload) });
    await fetchMemories();
}

async function uploadPhotos(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    document.getElementById('upload-status').style.display = 'block';
    
    let base64Photos = [];
    for (let file of files) {
        const b64 = await compressImage(file);
        base64Photos.push(b64);
    }

    const payload = { action: "save_memory", prefecture: selectedPref, date: document.getElementById('input-date').value, photos: base64Photos };
    const res = await fetch('/api', { method: 'POST', body: JSON.stringify(payload) });
    
    if (res.ok) {
        await fetchMemories();
    } else {
        const errorText = await res.text();
        alert("保存に失敗しました: " + errorText);
        document.getElementById('upload-status').style.display = 'none';
    }
}

async function deletePhoto(url) {
    const payload = { action: "delete_photo", prefecture: selectedPref, photo_url: url };
    await fetch('/api', { method: 'POST', body: JSON.stringify(payload) });
    await fetchMemories();
}

function updateMapColors() {
    if (!geoJsonLayer) return;
    geoJsonLayer.eachLayer(layer => {
        const pref = layer.feature.properties.nam_ja;
        const isVisited = memoriesData.some(m => m.prefecture === pref && m.photo_urls && m.photo_urls.length > 4); // 写真配列が[]でないか簡易チェック
        layer.setStyle({
            fillColor: isVisited ? '#a2d9ce' : '#ffffff',
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
                // 800px → 600px に縮小して送信を爆速化
                if (w > 600) { h = h * (600 / w); w = 600; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                // 画質を少し落としてデータ量を激減させる
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
}