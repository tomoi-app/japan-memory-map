let map;
let selectedLatlng;
let geoJsonLayer;

document.addEventListener('DOMContentLoaded', () => {
    // ズームコントロールの位置を右下に変更してモダンに
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

    // モーダルの開閉イベント
    document.getElementById('btn-cancel').addEventListener('click', () => closeModal('input-modal'));
    document.getElementById('btn-close-settings').addEventListener('click', () => closeModal('settings-modal'));
    document.getElementById('btn-home-settings').addEventListener('click', () => openModal('settings-modal'));
    document.getElementById('btn-save').addEventListener('click', saveMemory);

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
}

// 県名を統一する関数（愛媛 → 愛媛県）
function formatPrefecture(pref) {
    if (!pref) return '';
    if (pref === '北海道') return pref;
    if (pref.endsWith('都') || pref.endsWith('道') || pref.endsWith('府') || pref.endsWith('県')) return pref;
    if (pref === '東京') return '東京都';
    if (pref === '京都' || pref === '大阪') return pref + '府';
    return pref + '県';
}

async function saveMemory() {
    const title = document.getElementById('input-title').value;
    let pref = document.getElementById('input-pref').value;
    const date = document.getElementById('input-date').value;

    if (!title || !pref) {
        alert("タイトルと都道府県を入力してください");
        return;
    }

    pref = formatPrefecture(pref);

    const newMemory = {
        prefecture: pref,
        title: title,
        date: date,
        lat: selectedLatlng.lat,
        lng: selectedLatlng.lng
    };

    const response = await fetch('/api', {
        method: 'POST',
        body: JSON.stringify(newMemory)
    });

    if (response.ok) {
        closeModal('input-modal');
        document.getElementById('input-title').value = '';
        fetchMemories();
    }
}

async function fetchMemories() {
    try {
        const response = await fetch('/api');
        const memories = await response.json();
        const list = document.getElementById('memories-list');
        list.innerHTML = '';
        
        // 既存のピンをすべて削除
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
                // デフォルトのピンではなく、モダンなサークルマーカーに変更
                const marker = L.circleMarker([m.lat, m.lng], {
                    radius: 10,
                    fillColor: bgColor,
                    color: '#ffffff',
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(map);

                // 吹き出しのデザインを洗練
                const popupHtml = `
                    <div style="background-color: ${bgColor}; padding: 12px 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); text-align: center; color: #2c3e50; font-family: sans-serif;">
                        <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 5px;">${m.title}</div>
                        <div style="font-size: 0.85rem; opacity: 0.8;">${m.date}</div>
                    </div>
                `;
                marker.bindPopup(popupHtml);
            }

            const li = document.createElement('li');
            li.style.borderLeft = `8px solid ${bgColor}`;
            li.innerHTML = `<div class="memory-title">${normalizedPref}：${m.title}</div><div class="memory-meta">${m.date}</div>`;
            list.appendChild(li);
        });

        const count = visitedPrefectures.size;
        document.getElementById('visited-count').innerText = count;
        document.getElementById('progress-bar-fill').style.width = `${(count / 47) * 100}%`;
    } catch (error) {
        console.error('データの取得または表示でエラー発生:', error);
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