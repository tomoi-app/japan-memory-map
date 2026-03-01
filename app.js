let map;

document.addEventListener('DOMContentLoaded', () => {
    // 地図の初期設定（日本中心の座標とズームレベル）
    map = L.map('map-container').setView([38.0, 137.0], 5);

    // OpenStreetMapの画像データを読み込んで地図を表示
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    fetchMemories();
});

async function fetchMemories() {
    try {
        const response = await fetch('/api');
        const memories = await response.json();

        const listElement = document.getElementById('memories-list');
        listElement.innerHTML = ''; // リストを一旦空にする

        memories.forEach(memory => {
            // 1. リストに文字を追加
            const li = document.createElement('li');
            li.textContent = `【${memory.prefecture}】${memory.title} (${memory.date})`;
            listElement.appendChild(li);

            // 2. 地図上にピン（マーカー）を立てる
            if (memory.lat && memory.lng) {
                const marker = L.marker([memory.lat, memory.lng]).addTo(map);
                // ピンをタップした時の吹き出しを設定
                marker.bindPopup(`<b>${memory.title}</b><br>${memory.date}`);
            }
        });
    } catch (error) {
        console.log('データの取得に失敗しました');
    }
}