let map;

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map-container').setView([38.0, 137.0], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // 地図をタップした時のイベント
    map.on('click', onMapClick);
    fetchMemories();
});

async function onMapClick(e) {
    const title = prompt("思い出のタイトルを入力してください（例：温泉旅行）");
    if (!title) return;

    const pref = prompt("都道府県名を入力してください（例：群馬）");
    const date = new Date().toISOString().split('T')[0]; // 今日を 2026-03-01 形式で

    const newMemory = {
        prefecture: pref,
        title: title,
        date: date,
        lat: e.latlng.lat,
        lng: e.latlng.lng
    };

    // Python経由でSupabaseに保存
    const response = await fetch('/api', {
        method: 'POST',
        body: JSON.stringify(newMemory)
    });

    if (response.ok) {
        alert("保存しました！");
        fetchMemories(); // 画面を更新
    }
}

async function fetchMemories() {
    const response = await fetch('/api');
    const memories = await response.json();
    const list = document.getElementById('memories-list');
    list.innerHTML = '';
    
    // 既存のピンを消すための処理（簡易版：全リロードでもOK）
    memories.forEach(m => {
        L.marker([m.lat, m.lng]).addTo(map).bindPopup(`<b>${m.title}</b><br>${m.date}`);
        const li = document.createElement('li');
        li.textContent = `【${m.prefecture}】${m.title} (${m.date})`;
        list.appendChild(li);
    });
}