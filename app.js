let map;
let selectedLatlng;

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map-container').setView([38.0, 137.0], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // 日本の地図データを読み込んでパステルカラーで塗りつぶす
    fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson')
        .then(response => response.json())
        .then(data => {
            L.geoJson(data, {
                style: function (feature) {
                    return {
                        fillColor: getPastelColor(feature.properties.nam_ja),
                        weight: 1,
                        opacity: 1,
                        color: 'white',
                        fillOpacity: 0.6
                    };
                },
                onEachFeature: function (feature, layer) {
                    layer.on('click', function (e) {
                        selectedLatlng = e.latlng;
                        // タップした都道府県名を自動入力
                        document.getElementById('input-pref').value = feature.properties.nam_ja;
                        openModal();
                    });
                }
            }).addTo(map);
        })
        .catch(err => console.log("地図データの読み込みをスキップしました"));

    // 海などの空白部分をタップした場合
    map.on('click', (e) => {
        selectedLatlng = e.latlng;
        document.getElementById('input-pref').value = '';
        openModal();
    });

    document.getElementById('btn-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-save').addEventListener('click', saveMemory);
    document.getElementById('btn-home-settings').addEventListener('click', () => {
        alert("設定画面は今後実装予定です。");
    });

    fetchMemories();
});

function openModal() {
    document.getElementById('input-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('input-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('input-modal').classList.remove('show');
}

async function saveMemory() {
    const title = document.getElementById('input-title').value;
    const pref = document.getElementById('input-pref').value;
    const date = document.getElementById('input-date').value;

    if (!title || !pref) {
        alert("タイトルと都道府県を入力してください");
        return;
    }

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
        closeModal();
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
        
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) map.removeLayer(layer);
        });

        const visitedPrefectures = new Set();

        memories.forEach(m => {
            visitedPrefectures.add(m.prefecture);
            const bgColor = getPastelColor(m.prefecture);

            // 地図上のピンと詳細ビュー（吹き出しの色を合わせる）
            const marker = L.marker([m.lat, m.lng]).addTo(map);
            marker.bindPopup(`<div style="background-color: ${bgColor}; padding: 10px; border-radius: 8px; margin: -14px; text-align: center;"><b>${m.title}</b><br>${m.date}</div>`);

            // 右側のリスト
            const li = document.createElement('li');
            li.style.borderLeft = `6px solid ${bgColor}`;
            li.innerHTML = `<div class="memory-title">${m.prefecture}：${m.title}</div><div class="memory-meta">${m.date}</div>`;
            list.appendChild(li);
        });

        // プログレスバーの更新
        const count = visitedPrefectures.size;
        document.getElementById('visited-count').innerText = count;
        document.getElementById('progress-bar-fill').style.width = `${(count / 47) * 100}%`;
    } catch (error) {
        console.error('エラー発生:', error);
    }
}

// 文字列から固有のパステルカラーを生成する関数
function getPastelColor(str) {
    if (!str) return '#cccccc';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 85%)`;
}