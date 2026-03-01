let map;
let geoJsonLayer;
let selectedPref = null;
let memoriesData = [];
let homePrefectures = []; 
let currentSlidePhotos = [];
let currentSlideIndex = 0;

const allPrefectures = ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"];

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map-container', { zoomControl: false }).setView([38.0, 137.0], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson')
        .then(res => res.json())
        .then(data => {
            geoJsonLayer = L.geoJson(data, {
                style: function (feature) {
                    return {
                        fillColor: getPastelColor(feature.properties.nam_ja, 0.8),
                        weight: 1, color: 'black', fillOpacity: 0.7
                    };
                },
                onEachFeature: function (feature, layer) {
                    layer.on('click', function () {
                        selectedPref = feature.properties.nam_ja;
                        renderRightPanel();
                    });
                }
            }).addTo(map);
        });

    fetchMemories();

    document.getElementById('btn-prev').onclick = () => { if(currentSlideIndex > 0) { currentSlideIndex--; updateSlider(); } };
    document.getElementById('btn-next').onclick = () => { if(currentSlideIndex < currentSlidePhotos.length - 1) { currentSlideIndex++; updateSlider(); } };
});

function renderRightPanel() {
    const panel = document.getElementById('right-panel');

    if (!selectedPref) {
        panel.style.backgroundColor = 'white';
        const visitedList = memoriesData.filter(m => m.photo_urls && JSON.parse(m.photo_urls).length > 0).map(m => m.prefecture);
        const totalCount = new Set([...homePrefectures, ...visitedList]).size;
        
        let html = `<h2 style='font-size:2.5rem;margin-bottom:30px;'>一緒に行った都道府県<span style='font-size:2rem;margin-left:20px;'>${totalCount}/47</span></h2>`;
        
        const showList = memoriesData.filter(m => m.photo_urls && JSON.parse(m.photo_urls).length > 0 && !homePrefectures.includes(m.prefecture));
        
        if (showList.length > 0) {
            showList.forEach(m => {
                html += `<button class="tertiary-btn" onclick="selectedPref='${m.prefecture}'; renderRightPanel();">${m.prefecture}（${m.date || "日付未設定"}）</button>`;
            });
        } else {
            html += `<div style='font-size:1.5rem;padding:20px;'>まだ写真がありません。<br>地図から都道府県を選んで追加しましょう！</div>`;
        }
        
        html += `<hr style='margin-top:40px;'><button class="primary-btn" onclick="openHomeModal()">家を追加・変更する</button>`;
        panel.innerHTML = html;

    } else {
        const isHome = homePrefectures.includes(selectedPref);
        panel.style.backgroundColor = getPastelColor(selectedPref, 0.96);
        
        let html = `<button onclick="selectedPref=null; renderRightPanel();" style="margin-bottom:15px; padding:10px 20px; font-size:1.2rem;">一覧に戻る</button>`;
        html += `<h1 style='text-align:center;background:white;padding:15px;border-radius:10px;margin-bottom:20px;font-size:2.5rem;box-shadow:0 2px 5px rgba(0,0,0,.1);'>${selectedPref}</h1>`;

        if (isHome) {
            html += `<div style='font-size:2rem;text-align:center;margin:40px 0;font-weight:bold;color:#1f77b4;'>家に登録されています。</div>`;
        } else {
            const existingData = memoriesData.find(m => m.prefecture === selectedPref) || { date: '', photo_urls: '[]' };
            let photos = [];
            try { photos = JSON.parse(existingData.photo_urls); } catch(e){}

            html += `<input type="text" placeholder="YYYY/MM/DD～YYYY/MM/DD" value="${existingData.date}" onchange="saveDate(this.value)" style="width:100%; font-size:1.5rem; padding:10px; text-align:center; margin-bottom:15px; box-sizing:border-box;">`;
            
            const rem = 10 - photos.length;
            html += `<div style='font-size:1.5rem;margin:10px 0;font-weight:bold;text-align:center;'>あと ${rem}枚追加できます</div>`;

            if (rem > 0) {
                html += `<input type="file" multiple accept="image/*" onchange="handleFileUpload(event)" style="display:block; margin: 0 auto 20px; font-size:1.2rem;">`;
                html += `<div id="uploading-msg" style="display:none; text-align:center; font-weight:bold; color:blue;">保存中...</div>`;
            } else {
                html += `<div style='font-size:1.2rem;color:#ff4b4b;text-align:center;margin-bottom:20px;'>※写真は最大10枚に達しています。</div>`;
            }

            if (photos.length > 0) {
                html += `<button class="primary-btn" onclick='openSlider(${JSON.stringify(photos)})'>写真を見る</button>`;
                html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:20px;">`;
                photos.forEach(p => {
                    html += `<div><img src="${p}" style="width:100%; height:120px; object-fit:cover; border-radius:8px; margin-bottom:5px;">
                             <button style="width:100%; color:white; background:#ff4b4b; border:none; padding:8px; border-radius:5px;" onclick="deletePhoto('${p}')">削除</button></div>`;
                });
                html += `</div>`;
            }
        }
        panel.innerHTML = html;
    }
}

async function fetchMemories() {
    try {
        const response = await fetch('/api');
        const data = await response.json();
        
        const homeRow = data.find(m => m.prefecture === "homes_data");
        if (homeRow && homeRow.title) {
            try { homePrefectures = JSON.parse(homeRow.title); } catch(e){}
        }
        memoriesData = data.filter(m => m.prefecture !== "homes_data");
        renderRightPanel();
    } catch (e) { console.error(e); }
}

async function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    
    document.getElementById('uploading-msg').style.display = 'block';
    event.target.style.display = 'none';

    let base64Photos = [];
    for (let file of files) {
        const b64 = await compressImage(file);
        base64Photos.push(b64);
    }

    const payload = {
        action: "save_memory",
        prefecture: selectedPref,
        photos: base64Photos
    };

    await fetch('/api', { method: 'POST', body: JSON.stringify(payload) });
    await fetchMemories();
}

async function saveDate(newDate) {
    const payload = { action: "save_memory", prefecture: selectedPref, date: newDate, photos: [] };
    await fetch('/api', { method: 'POST', body: JSON.stringify(payload) });
    await fetchMemories();
}

async function deletePhoto(url) {
    const payload = { action: "delete_photo", prefecture: selectedPref, photo_url: url };
    await fetch('/api', { method: 'POST', body: JSON.stringify(payload) });
    await fetchMemories();
}

function openHomeModal() {
    const modalBox = document.querySelector('#home-modal .modal-box');
    let html = `<h2 style="margin-top:0;">家を登録する</h2>
                <div style="max-height: 40vh; overflow-y: auto; text-align: left; margin-bottom: 20px;">`;
    
    allPrefectures.forEach(p => {
        const checked = homePrefectures.includes(p) ? 'checked' : '';
        html += `<label style="display:block; padding:8px; font-size:1.2rem;"><input type="checkbox" value="${p}" class="home-checkbox" ${checked}> ${p}</label>`;
    });

    html += `</div>
             <button class="primary-btn" onclick="saveHomes()">保存</button>
             <button onclick="document.getElementById('home-modal').classList.remove('show')" style="width:100%; margin-top:10px; padding:15px; font-size:1.2rem;">キャンセル</button>`;
    
    modalBox.innerHTML = html;
    document.getElementById('home-modal').classList.add('show');
}

async function saveHomes() {
    const checkboxes = document.querySelectorAll('.home-checkbox:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);
    
    const payload = { action: "save_homes", homes: selected };
    await fetch('/api', { method: 'POST', body: JSON.stringify(payload) });
    document.getElementById('home-modal').classList.remove('show');
    await fetchMemories();
}

// ユーティリティ群
function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 800;
                let w = img.width, h = img.height;
                if (w > MAX) { h = h * (MAX / w); w = MAX; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
}

function openSlider(photos) { currentSlidePhotos = photos; currentSlideIndex = 0; updateSlider(); document.getElementById('slider-modal').classList.add('show'); }
function updateSlider() { document.getElementById('slide-image').src = currentSlidePhotos[currentSlideIndex]; document.getElementById('slide-counter').innerText = `${currentSlideIndex + 1} / ${currentSlidePhotos.length}`; document.getElementById('btn-prev').disabled = currentSlideIndex === 0; document.getElementById('btn-next').disabled = currentSlideIndex === currentSlidePhotos.length - 1; }
function getPastelColor(str, lightness) { if (!str) return '#ffffff'; let hash = 0; for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash); return `hsl(${Math.abs(hash) % 360}, 70%, ${lightness * 100}%)`; }