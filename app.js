let map;

document.addEventListener('DOMContentLoaded', () => {
    // 地図の初期設定
    map = L.map('map-container').setView([38.0, 137.0], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    fetchMemories();
});

async function fetchMemories() {
    try {
        const response = await fetch('/api');
        const memories = await response.json();
        console.log("取得データ:", memories); // デバッグ用

        const listElement = document.getElementById('memories-list');
        listElement.innerHTML = ''; 

        memories.forEach(memory => {
            // 1. リストに文字を追加
            const li = document.createElement('li');
            li.textContent = `【${memory.prefecture}】${memory.title} (${memory.date})`;
            listElement.appendChild(li);

            // 2. 地図上にピンを立てる (数字として正しく認識させる)
            const lat = parseFloat(memory.lat);
            const lng = parseFloat(memory.lng);

            if (!isNaN(lat) && !isNaN(lng)) {
                const marker = L.marker([lat, lng]).addTo(map);
                marker.bindPopup(`<b>${memory.title}</b><br>${memory.date}`);
            }
        });
    } catch (error) {
        console.error('エラー発生:', error);
    }
}