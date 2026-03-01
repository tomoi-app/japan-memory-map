document.addEventListener('DOMContentLoaded', () => {
    fetchMemories();
});

async function fetchMemories() {
    try {
        // Vercel上のPython API（/api）からデータを取得
        const response = await fetch('/api');
        const memories = await response.json();

        const listElement = document.getElementById('memories-list');
        memories.forEach(memory => {
            const li = document.createElement('li');
            li.textContent = `【${memory.prefecture}】${memory.title} (${memory.date})`;
            listElement.appendChild(li);
        });
    } catch (error) {
        console.log('ローカル環境ではまだ裏側のデータは表示されません');
    }
}