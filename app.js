let map;
let selectedLatlng;

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map-container').setView([38.0, 137.0], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    map.on('click', (e) => {
        selectedLatlng = e.latlng;
        // 今日の日付を初期値としてセット
        document.getElementById('input-date').value = new Date().toISOString().split('T')[0];
        // フォームを表示
        document.getElementById('input-modal').classList.remove('hidden');
    });

    // キャンセルボタン
    document.getElementById('btn-cancel').addEventListener('click', () => {
        document.getElementById('input-modal').classList.add('hidden');
    });

    // 保存ボタン
    document.getElementById('btn-save').addEventListener('click', saveMemory);

    fetchMemories();
});

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
        document.getElementById('input-modal').classList.add('hidden');
        document.getElementById('input-title').value = '';
        document.getElementById('input-pref').value = '';
        fetchMemories();
    }
}

async function fetchMemories() {
    const response = await fetch('/api');
    const memories = await response.json();
    const list = document.getElementById('memories-list');
    list.innerHTML = '';
    
    // 全てのピンを一旦消去する簡易的な仕組み
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    memories.forEach(m => {
        L.marker([m.lat, m.lng]).addTo(map).bindPopup(`<b>${m.title}</b><br>${m.date}`);
        const li = document.createElement('li');
        li.innerHTML = `<strong>${m.prefecture}</strong>: ${m.title}<br><small>${m.date}</small>`;
        list.appendChild(li);
    });
}