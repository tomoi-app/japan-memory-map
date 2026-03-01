let map;
let selectedLatlng;
let geoJsonLayer;
let selectedPhotos = []; // 選んだ写真を保存する配列

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map-container', { zoomControl: false }).setView([38.0, 137.0], 5);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson')
        .then(response => response.json())
        .then(data => {
            geoJsonLayer = L.geoJson(data, {
                style: function (feature) {
                    return {
                        fillColor: getPastelColor(feature.properties.nam_ja),
                        weight: 1.5,
                        opacity: 1,
                        color: 'white',
                        fillOpacity: 0.65
                    };
                },
                onEachFeature: function (feature, layer) {
                    layer.on('click', function (e) {
                        selectedLatlng = e.latlng;
                        document.getElementById('input-pref').value = feature.properties.nam_ja;
                        openModal('input-modal');
                    });
                }
            }).addTo(map);
        })
        .catch(err => console.log("地図データの読み込みをスキップしました"));

    map.on('click', (e) => {
        selectedLatlng = e.latlng;
        document.getElementById('input-pref').value = '';
        openModal('input-modal');
    });

    document.getElementById('btn-cancel').addEventListener('click', () => closeModal('input-modal'));
    document.getElementById('btn-close-settings').addEventListener('click', () => closeModal('settings-modal'));
    document.getElementById('btn-home-settings').addEventListener('click', () => openModal('settings-modal'));
    document.getElementById('btn-save').addEventListener('click', saveMemory);

    // ▼▼ 写真の選択と圧縮処理 ▼▼
    document.getElementById('input-photos').addEventListener('change', async (e) => {
        const files = e.target.files;
        if (files.length === 0) return;

        const previewContainer = document.getElementById('photo-preview-container');

        for (const file of files) {
            const compressedBase64 = await compressImage(file);
            selectedPhotos.push(compressedBase64);

            const wrapper = document.createElement('div');
            wrapper.className = 'preview-wrapper';
            
            const img = document.createElement('img');
            img.src = compressedBase64;
            img.className = 'preview-image';

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-preview-btn';
            delBtn.innerText = '×';
            // 確認なしでサクッと消す処理
            delBtn.onclick = () => {
                wrapper.remove();
                selectedPhotos = selectedPhotos.filter(p => p !== compressedBase64);
            };

            wrapper.appendChild(img);
            wrapper.appendChild(delBtn);
            previewContainer.appendChild(wrapper);
        }
        e.target.value = '';
    });
    // ▲▲ 写真の選択と圧縮処理 ▲▲

    fetchMemories();
});

function openModal(modalId) {
    if(modalId === 'input-modal') {
        document.getElementById('input-date').value = new Date().toISOString().split('T')[0];
    }
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    // 閉じる時に写真もリセット
    if(modalId === 'input-modal') {
        selectedPhotos = [];
        document.getElementById('photo-preview-container').innerHTML = '';
    }
}

function formatPrefecture(pref) {
    if (!pref) return '';
    if (pref === '北海道') return pref;
    if (pref.endsWith('都') || pref.endsWith('道') || pref.endsWith('府') || pref.endsWith('県')) return pref;
    if (pref === '東京') return '東京都';
    if (pref === '京都' || pref === '大阪') return pref + '府';
    return pref + '県';
}

// 画像圧縮関数
function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                let width = img.width;
                let height = img.height;
                if (scaleSize < 1) {
                    width = MAX_WIDTH;
                    height = img.height * scaleSize;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
}

async function saveMemory() {
    const title = document.getElementById('input-title').value;
    let pref = document.getElementById('input-pref').value;
    const date = document.getElementById('input-date').value;

    if (!title || !pref) {
        alert("タイトルと都道府県を入力してください");
        return;
    }

    // 保存中はボタンを押せなくする（連打防止）
    const saveBtn = document.getElementById('btn-save');
    saveBtn.innerText = '保存中...';
    saveBtn.disabled = true;

    pref = formatPrefecture(pref);

    const newMemory = {
        prefecture: pref,
        title: title,
        date: date,
        lat: selectedLatlng.lat,
        lng: selectedLatlng.lng,
        photos: selectedPhotos // ★写真をセット！
    };

    const response = await fetch('/api', {
        method: 'POST',
        body: JSON.stringify(newMemory)
    });

    if (response.ok) {
        closeModal('input-modal');
        document.getElementById('input-title').value = '';
        fetchMemories();
    } else {
        alert("エラーが発生しました。");
    }

    // ボタンを元に戻す
    saveBtn.innerText = '保存する';
    saveBtn.disabled = false;
}

async function fetchMemories() {
    try {
        const response = await fetch('/api');
        const memories = await response.json();
        const list = document.getElementById('memories-list');
        list.innerHTML = '';
        
        map.eachLayer((layer) => {
            if (layer instanceof L.CircleMarker || layer instanceof L.Marker) map.removeLayer(layer);
        });

        const visitedPrefectures = new Set();

        memories.forEach(m => {
            if (!m || !m.prefecture) return;
            
            const normalizedPref = formatPrefecture(m.prefecture);
            visitedPrefectures.add(normalizedPref);
            const bgColor = getPastelColor(normalizedPref);

            if (m.lat && m.lng) {
                const marker = L.circleMarker([m.lat, m.lng], {
                    radius: 10,
                    fillColor: bgColor,
                    color: '#ffffff',
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(map);

                marker.bindPopup(`
                    <div style="background-color: ${bgColor}; padding: 12px 20px; border-radius: 12px; text-align: center; color: #2c3e50;">
                        <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 5px;">${m.title}</div>
                        <div style="font-size: 0.85rem; opacity: 0.8;">${m.date}</div>
                    </div>
                `);
            }

            // ▼▼ 写真の表示処理 ▼▼
            let photosHtml = '';
            if (m.photo_urls) {
                try {
                    const urls = JSON.parse(m.photo_urls);
                    if (urls.length > 0) {
                        photosHtml = '<div style="display:flex; gap:8px; margin-top:12px; overflow-x:auto; padding-bottom:5px;">';
                        urls.forEach(url => {
                            photosHtml += `<img src="${url}" style="width:80px; height:80px; object-fit:cover; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">`;
                        });
                        photosHtml += '</div>';
                    }
                } catch(e) {}
            }
            // ▲▲ 写真の表示処理 ▲▲

            const li = document.createElement('li');
            li.style.borderLeft = `8px solid ${bgColor}`;
            li.innerHTML = `
                <div class="memory-title">${normalizedPref}：${m.title}</div>
                <div class="memory-meta">${m.date}</div>
                ${photosHtml}
            `;
            list.appendChild(li);
        });

        const count = visitedPrefectures.size;
        document.getElementById('visited-count').innerText = count;
        document.getElementById('progress-bar-fill').style.width = `${(count / 47) * 100}%`;
    } catch (error) {
        console.error('エラー:', error);
    }
}

function getPastelColor(str) {
    if (!str) return '#cccccc';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 85%)`;
}