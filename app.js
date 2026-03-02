let map;
let geoJsonLayer;
let selectedPref = null;
let memoriesData = [];
let homePrefectures = [];
let currentSlidePhotos = [];
let currentSlideIndex = 0;
let datePicker = null;

const allPrefectures = ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"];

document.addEventListener('DOMContentLoaded', () => {
    // ズームコントロール右下、白地図を初期表示
    map = L.map('map-container', { zoomControl: false }).setView([38.0, 137.0], 5);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // 日本の地図データを読み込んでパステルカラーで塗りつぶす（家、訪問、未訪問の区別）
    fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson')
        .then(res => res.json())
        .then(data => {
            geoJsonLayer = L.geoJson(data, {
                style: function (feature) {
                    return getPrefectureStyle(feature.properties.nam_ja);
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

    // モーダルの開閉イベント
    document.getElementById('btn-home-settings').addEventListener('click', openHomeModal);
    document.getElementById('btn-save-home').addEventListener('click', saveHomes);
    document.getElementById('btn-back-to-list').addEventListener('click', () => { selectedPref = null; renderRightPanel(); });
    document.getElementById('btn-show-photos').addEventListener('click', () => openSlider(currentSlidePhotos));

    // スライダーのボタン設定
    document.getElementById('btn-prev').onclick = () => { if(currentSlideIndex > 0) { currentSlideIndex--; updateSlider(); } };
    document.getElementById('btn-next').onclick = () => { if(currentSlideIndex < currentSlidePhotos.length - 1) { currentSlideIndex++; updateSlider(); } };

    // 写真の選択・圧縮処理
    document.getElementById('input-photos').addEventListener('change', handleFileUpload);
});

// パステルカラーのスタイルを取得する関数（家、訪問、未訪問）
function getPrefectureStyle(pref) {
    let color = 'white'; // デフォルトは未訪問（白）
    let fillOpacity = 0.6;
    let colorH = 0; // 色相（ランダム）

    if (homePrefectures.includes(pref)) {
        // 家は特別な訪問カラー（濃い青系）
        colorH = 210;
        color = getPastelColor(colorH, 0.75, 0.8);
        fillOpacity = 0.8;
    } else {
        // 既存データの検索
        const existingData = memoriesData.find(m => m.prefecture === pref);
        let photos = [];
        try { if(existingData) photos = JSON.parse(existingData.photo_urls); } catch(e){}

        if (photos.length > 0) {
            // 訪問済みはランダムな訪問カラー（濃いパステル）
            colorH = MemoriesColorH(pref);
            color = getPastelColor(colorH, 0.75, 0.8);
            fillOpacity = 0.8;
        } else {
            // 未訪問は白地図のまま（ランダムな薄いパステル）
            colorH = MemoriesColorH(pref);
            color = getPastelColor(colorH, 0.96, 0.8);
            fillOpacity = 0.6;
        }
    }

    return {
        fillColor: color,
        weight: 1.5,
        opacity: 1,
        color: 'white',
        fillOpacity: fillOpacity
    };
}

// 右側パネルの描画（Streamlitの画面切り替えに相当）
function renderRightPanel() {
    const listArea = document.getElementById('visited-list-area');
    const detailsArea = document.getElementById('visited-details');
    const panel = document.getElementById('right-panel');

    // 地図の色を再描画（訪問済みなどの反映）
    if(geoJsonLayer) geoJsonLayer.eachLayer(layer => layer.setStyle(getPrefectureStyle(layer.feature.properties.nam_ja)));

    if (!selectedPref) {
        // --- 一覧画面（未選択時） ---
        listArea.classList.remove('hidden');
        detailsArea.classList.add('hidden');
        panel.style.backgroundColor = 'white';
        
        const visitedList = memoriesData.filter(m => m.photo_urls && JSON.parse(m.photo_urls).length > 0).map(m => m.prefecture);
        const totalCount = new Set([...homePrefectures, ...visitedList]).size;
        
        document.getElementById('visited-count').innerText = totalCount;
        document.getElementById('progress-bar-fill').style.width = `${(totalCount / 47) * 100}%`;
        
        const showList = memoriesData.filter(m => m.photo_urls && JSON.parse(m.photo_urls).length > 0 && !homePrefectures.includes(m.prefecture));
        const listElement = document.getElementById('memories-list');
        listElement.innerHTML = '';

        if (showList.length > 0) {
            showList.forEach(m => {
                const li = document.createElement('li');
                li.style.borderLeft = `8px solid ${getPastelColor(MemoriesColorH(m.prefecture), 0.75, 0.8)}`;
                li.innerHTML = `<button class="tertiary-btn" onclick="selectedPref='${m.prefecture}'; renderRightPanel();">${m.prefecture}（${m.date || "日付未設定"}）</button>`;
                listElement.appendChild(li);
            });
        } else {
            listElement.innerHTML = `<div style='font-size:1.5rem;padding:20px;'>まだ写真がありません。<br>地図から都道府県を選んで追加しましょう！</div>`;
        }

    } else {
        // --- 都道府県選択時の画面 ---
        listArea.classList.add('hidden');
        detailsArea.classList.remove('hidden');
        panel.style.backgroundColor = getPastelColor(MemoriesColorH(selectedPref), 0.96, 0.8); // 背景を薄い色に
        
        document.getElementById('details-pref-name').innerText = selectedPref;

        const isHome = homePrefectures.includes(selectedPref);
        if (isHome) {
            document.getElementById('input-date').parentElement.innerHTML = `<div style='font-size:2rem;text-align:center;margin:40px 0;font-weight:bold;color:#1f77b4;'>家に登録されています。</div>`;
        } else {
            const existingData = memoriesData.find(m => m.prefecture === selectedPref) || { date: '', photo_urls: '[]' };
            let photos = [];
            try { photos = JSON.parse(existingData.photo_urls); } catch(e){}
            currentSlidePhotos = photos;

            // 日付カレンダー入力の初期化（Flatpickr）
            if(datePicker) datePicker.destroy();
            datePicker = flatpickr("#input-date", {
                mode: "range",
                dateFormat: "Y/m/d",
                locale: "ja",
                defaultDate: existingData.date.split('～').map(d => d.trim()),
                onChange: (selectedDates, dateStr) => {
                    const nds = selectedDates.length === 2 ? `${selectedDates[0].strftime('%Y/%m/%d')}～${selectedDates[1].strftime('%Y/%m/%d')}` : '';
                    if (nds !== existingData.date) saveDate(nds);
                }
            });
            
            // 写真枚数制限のロジック
            const rem = 10 - photos.length;
            const uploadLabel = document.getElementById('photo-upload-label');
            const showBtn = document.getElementById('btn-show-photos');
            const previewContainer = document.getElementById('photo-preview-container');

            uploadLabel.innerText = `📷 写真を追加（あと${rem}枚）`;
            previewContainer.innerHTML = '';
            
            if (rem > 0) {
                uploadLabel.parentElement.classList.remove('hidden');
            } else {
                uploadLabel.parentElement.innerHTML = `<div style='font-size:1.2rem;color:#ff4b4b;text-align:center;margin-bottom:20px;'>※写真は最大10枚に達しています。</div>`;
            }

            if (photos.length > 0) {
                showBtn.classList.remove('hidden');
                photos.forEach(p => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'preview-wrapper';
                    wrapper.innerHTML = `<img src="${p}" class="preview-image"><button class="delete-preview-btn" onclick="deletePhoto('${p}')">×</button>`;
                    previewContainer.appendChild(wrapper);
                });
            } else {
                showBtn.classList.add('hidden');
            }
        }
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
    
    document.getElementById('photo-upload-msg').classList.remove('hidden');
    document.getElementById('photo-upload-label').parentElement.classList.add('hidden');

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

    const response = await fetch('/api', { method: 'POST', body: JSON.stringify(payload) });
    if(response.ok) {
        await fetchMemories();
    } else {
        const errorText = await response.text();
        alert("エラーが発生しました: " + errorText);
    }
}

async function saveDate(newDate) {
    const payload = { action: "save_memory", prefecture: selectedPref, date: newDate, photos: [] };
    await fetch('/api', { method: 'POST', body: JSON.stringify(payload) });
    await fetchMemories();
}

async function deletePhoto(url) {
    // 確認なしでサクッと消す
    const payload = { action: "delete_photo", prefecture: selectedPref, photo_url: url };
    const response = await fetch('/api', { method: 'POST', body: JSON.stringify(payload) });
    if(response.ok) {
        await fetchMemories();
    } else {
        alert("写真の削除に失敗しました。");
    }
}

function openHomeModal() {
    const prefList = document.getElementById('home-pref-list');
    prefList.innerHTML = '';
    
    allPrefectures.forEach(p => {
        const checked = homePrefectures.includes(p) ? 'checked' : '';
        const label = document.createElement('label');
        label.style.display = 'block'; label.style.padding = '8px'; label.style.fontSize = '1.2rem';
        label.innerHTML = `<input type="checkbox" value="${p}" class="home-checkbox" ${checked}> ${p}`;
        prefList.appendChild(label);
    });

    document.getElementById('home-modal').classList.add('show');
}

async function saveHomes() {
    const checkboxes = document.querySelectorAll('.home-checkbox:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);
    
    const payload = { action: "save_homes", homes: selected };
    const response = await fetch('/api', { method: 'POST', body: JSON.stringify(payload) });
    if(response.ok) {
        document.getElementById('home-modal').classList.remove('show');
        await fetchMemories();
    } else {
        alert("家の登録に失敗しました。");
    }
}

// HSLからパステルカラーを生成する関数（家、訪問済、未訪問）
function getPastelColor(h, lightness, opacity) {
    return `hsl(${h}, 70%, ${lightness * 100}%, ${opacity})`;
}

// 都道府県名から固有の色相(H)を生成する関数
function MemoriesColorH(str) {
    if (!str) return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash) % 360;
}

// ユーティリティ群（圧縮、スライダー）
function compressImage(file) { return new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (e) => { const img = new Image(); img.src = e.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 800; let w = img.width, h = img.height; if (w > MAX) { h = h * (MAX / w); w = MAX; } canvas.width = w; canvas.height = h; canvas.getContext('2d').drawImage(img, 0, 0, w, h); resolve(canvas.toDataURL('image/jpeg', 0.7)); }; }; }); }
function openSlider(photos) { currentSlidePhotos = photos; currentSlideIndex = 0; updateSlider(); document.getElementById('slider-modal').classList.add('show'); }
function updateSlider() { document.getElementById('slide-image').src = currentSlidePhotos[currentSlideIndex]; document.getElementById('slide-counter').innerText = `${currentSlideIndex + 1} / ${currentSlidePhotos.length}`; document.getElementById('btn-prev').disabled = currentSlideIndex === 0; document.getElementById('btn-next').disabled = currentSlideIndex === currentSlidePhotos.length - 1; }
// Date オブジェクトに書式フォーマット関数を追加
Date.prototype.strftime = function(format) { var self = this; var dates = { 'Y': self.getFullYear(), 'm': self.getMonth() + 1, 'd': self.getDate() }; return format.replace(/[Ymd]/g, function(d) { return (dates[d] < 10 ? '0' : '') + dates[d]; }); }