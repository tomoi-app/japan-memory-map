let map;
let geoJsonLayer;
let selectedPref = null;
let memoriesData = [];
let currentPhotos = [];
let slideIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map-container', { zoomControl: false, attributionControl: false }).setView([38.0, 137.0], 5);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 白地図の描画
    fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson')
        .then(res => res.json())
        .then(data => {
            geoJsonLayer = L.geoJson(data, {
                style: { fillColor: '#ffffff', weight: 1.5, color: '#333333', fillOpacity: 1 },
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
        
        html += `<label>日付（例: 2026/03/02）</label>`;
        html += `<input type="text" id="input-date" value="${data.date}">`;
        
        html += `<label>写真を追加（最大10枚）</label>`;
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