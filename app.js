// =============================================
// CSS Keyframes Injection (アニメーション用)
// =============================================
if (!document.getElementById('ashiato-dynamic-styles')) {
    const style = document.createElement('style');
    style.id = 'ashiato-dynamic-styles';
    style.innerHTML = `
        @keyframes date-btn-pulse {
            0% { transform: scale(1); box-shadow: 0 4px 12px rgba(108,140,163,0.4); }
            50% { transform: scale(1.03); box-shadow: 0 6px 16px rgba(108,140,163,0.6); }
            100% { transform: scale(1); box-shadow: 0 4px 12px rgba(108,140,163,0.4); }
        }
    `;
    document.head.appendChild(style);
}

// =============================================
// セキュリティ対策（XSS防止用のエスケープ関数）
// =============================================
function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function(match) {
        const escape = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escape[match];
    });
}

// =============================================
// Supabase Auth 設定
// ※ご自身のSupabase URL と anon key に書き換えてください
// =============================================
const SUPABASE_URL = 'https://uclkhpnpyeirxcvdtjwp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbGtocG5weWVpcnhjdmR0andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTYzNzYsImV4cCI6MjA4NzkzMjM3Nn0.fwb79w4zemD6u41X2fIH2IvwAFJzlW__I4w4o7BufI0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentToken = null;
let currentAuthTab = 'login';

// =============================================
// IndexedDB 設定
// =============================================
const IDB_NAME = 'AshiatoDB';
const IDB_STORE = 'photos';
const IDB_VERSION = 1;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_NAME, IDB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function savePhotoToIDB(id, base64Data) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put({ id, data: base64Data });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getPhotoFromIDB(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const request = tx.objectStore(IDB_STORE).get(id);
        request.onsuccess = () => resolve(request.result ? request.result.data : null);
        request.onerror = () => reject(tx.error);
    });
}

async function deletePhotoFromIDB(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getAllPhotosFromIDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const request = tx.objectStore(IDB_STORE).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(tx.error);
    });
}

// =============================================
// お知らせ（メール）設定
// =============================================
const ADMIN_MESSAGES = [
  {
        id: 'v2.2.0',
        date: '2026.03.07',
        title: 'version_2.2.0アップデート',
        content: '・同じ都道府県に複数の思い出を追加できるようになりました。\n・削除ボタンのバグを解消しました。'
    }, 
    {
        id: 'v2.1.3',
        date: '2026.03.06',
        title: 'version_2.1.3 アップデート',
        content: '・写真を端末に保存できるようになりました。\n・写真の削除処理ました。\n・写真の選択方法を改善し、スワイプでなぞるだけで連続して選択・解除できるようにしました。'
    },
    {
        id: 'v2.0.0',
        date: '2026.03.06',
        title: 'version_2.0.0 アップデート',
        content: '・写真の保存先を端末に変更し、プライバシーと表示速度を大幅に向上させました。\n・1都道府県につき100枚までとしていた写真の保存上限を解除しました。\n・設定画面から「データの引き継ぎ」ができるようになりました。機種変更時などにご利用ください。\n・共有機能を向上しました。'
    },
    {
        id: 'v1.1.0',
        date: '2026.03.06',
        title: 'version_1.1.0 アップデート',
        content: '・写真の操作感を向上しました。\n・✓ボタンから写真を選択して一括削除できるようになりました。\n・アプリの維持・向上のため広告を導入しました。'
    },
    {
        id: 'v1.0.0',
        date: '2026.03.05',
        title: 'version_1.0.0 アップデート',
        content: '・カレンダー機能を向上しました。\n・ドメインtomoi-app.comを入手しセキュリティが強化されました。\n・お問い合わせ機能を向上しました。'
    },
    {
        id: 'welcome',
        date: '2026.03.05',
        title: 'あしあとへようこそ！',
        content: 'あしあとをご利用いただきありがとうございます。\nこの画面では運営からのアップデート情報やお知らせをお届けします。\n旅行の思い出を地図に残していきましょう！'
    }
];

function getReadMessages() {
    try {
        return JSON.parse(localStorage.getItem('readAdminMessages') || '[]');
    } catch(e) { return []; }
}

function getUnreadCount() {
    const readIds = getReadMessages();
    return ADMIN_MESSAGES.filter(m => !readIds.includes(m.id)).length;
}

function markAsRead(id) {
    const readIds = getReadMessages();
    if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem('readAdminMessages', JSON.stringify(readIds));
    }
}

function markAllAsRead() {
    const allIds = ADMIN_MESSAGES.map(m => m.id);
    localStorage.setItem('readAdminMessages', JSON.stringify(allIds));
    if (window.isAdminMsgOpen) renderAdminMessages(); 
}

// お知らせ画面の開閉トグル用フラグ
window.isAdminMsgOpen = false;

function toggleAdminMessages() {
    window.isAdminMsgOpen = !window.isAdminMsgOpen;
    if (window.isAdminMsgOpen) {
        renderAdminMessages();
    } else {
        renderSettingsMenu();
    }
}

// =============================================
// 地図カラーテーマ設定
// =============================================
const MAP_THEMES = {
    default: {
        name: 'デフォルト',
        preview: ['#9fb9c4','#b6c6a7','#dda2a5','#c59eb1','#8bc1c0','#d7d1a2','#93a0bb'],
        colors: {
            '北海道':'#9fb9c4','青森県':'#a2c4c3','岩手県':'#a1bda6','宮城県':'#b6c6a7',
            '秋田県':'#c1cda2','山形県':'#cdd3a1','福島県':'#d9d8a3','茨城県':'#e3d8a6',
            '栃木県':'#ead2a8','群馬県':'#ebc8a5','埼玉県':'#e8bba1','千葉県':'#e3afa2',
            '東京都':'#dda2a5','神奈川県':'#d698a9','新潟県':'#c59eb1','富山県':'#b2a1b7',
            '石川県':'#a2a5bb','福井県':'#96a7bc','山梨県':'#8eb0c2','長野県':'#85b9c4',
            '岐阜県':'#8bc1c0','静岡県':'#91c6b8','愛知県':'#9bcbb0','三重県':'#a9ceaa',
            '滋賀県':'#b7cfa6','京都府':'#c7d1a3','大阪府':'#d7d1a2','兵庫県':'#e4d0a2',
            '奈良県':'#eed0a4','和歌山県':'#f3cda8','鳥取県':'#f4c7ad','島根県':'#f1bfb2',
            '岡山県':'#ecb8b7','広島県':'#e4b1bd','山口県':'#d9abc2','徳島県':'#cda6c5',
            '香川県':'#bea1c6','愛媛県':'#afa0c5','高知県':'#a19fc1','福岡県':'#93a0bb',
            '佐賀県':'#88a2b5','長崎県':'#81a6ae','熊本県':'#7eaba5','大分県':'#7eb09a',
            '宮崎県':'#83b48e','鹿児島県':'#8ab784','沖縄県':'#96b87b'
        }
    },
    warm: {
        name: 'ウォーム',
        preview: ['#e8a87c','#e8b87c','#e8c87c','#d4956a','#c98060','#e0b090','#d4a070'],
        colors: {
            '北海道':'#e8a87c','青森県':'#e8ac7a','岩手県':'#e8b07a','宮城県':'#e8b47c',
            '秋田県':'#e8b87c','山形県':'#e8bc7e','福島県':'#e8c07e','茨城県':'#e8c480',
            '栃木県':'#e8c882','群馬県':'#e8c882','埼玉県':'#e4c080','千葉県':'#e0b87e',
            '東京都':'#ddb07c','神奈川県':'#d9a87a','新潟県':'#d4a078','富山県':'#ce9876',
            '石川県':'#c89074','福井県':'#c28872','山梨県':'#c08070','長野県':'#be7870',
            '岐阜県':'#c07870','静岡県':'#c27c70','愛知県':'#c48072','三重県':'#c88474',
            '滋賀県':'#cc8876','京都府':'#d08c78','大阪府':'#d4907a','兵庫県':'#d8947c',
            '奈良県':'#dc987e','和歌山県':'#e09c80','鳥取県':'#e09c80','島根県':'#de9880',
            '岡山県':'#dc947e','広島県':'#da907c','山口県':'#d88c7a','徳島県':'#d88a7a',
            '香川県':'#d68878','愛媛県':'#d48676','高知県':'#d28474','福岡県':'#d08272',
            '佐賀県':'#ce8070','長崎県':'#cc7e6e','熊本県':'#ca7c6c','大分県':'#c87a6a',
            '宮崎県':'#c87c6c','鹿児島県':'#ca7e6e','沖縄県':'#cc8070'
        }
    },
    cool: {
        name: 'クール',
        preview: ['#7ab0d4','#7abcd4','#7ac8d4','#6a9ec4','#6090b8','#80b4d8','#70a0c8'],
        colors: {
            '北海道':'#7ab0d4','青森県':'#7ab4d4','岩手県':'#7ab8d4','宮城県':'#7abcd4',
            '秋田県':'#7ac0d4','山形県':'#7ac4d4','福島県':'#7ac8d4','茨城県':'#7cccd4',
            '栃木県':'#7eccd0','群馬県':'#80cccc','埼玉県':'#80c8c8','千葉県':'#7ec4c4',
            '東京都':'#7cc0c0','神奈川県':'#7abcbc','新潟県':'#7ab8b8','富山県':'#78b4b4',
            '石川県':'#76b0b0','福井県':'#74acac','山梨県':'#72a8a8','長野県':'#70a4a4',
            '岐阜県':'#6ea0a0','静岡県':'#6c9c9c','愛知県':'#6a9898','三重県':'#6c9ca4',
            '滋賀県':'#6ea0a8','京都府':'#70a4ac','大阪府':'#72a8b0','兵庫県':'#74acb4',
            '奈良県':'#76b0b8','和歌山県':'#78b4bc','鳥取県':'#78b4bc','島根県':'#76b0b8',
            '岡山県':'#74acb4','広島県':'#72a8b0','山口県':'#70a4ac','徳島県':'#6ea0a8',
            '香川県':'#6c9ca4','愛媛県':'#6a98a0','高知県':'#68949c','福岡県':'#6690a0',
            '佐賀県':'#648ca0','長崎県':'#6288a0','熊本県':'#6084a0','大分県':'#5e80a0',
            '宮崎県':'#6082a0','鹿児島県':'#6284a0','沖縄県':'#6486a0'
        }
    },
    forest: {
        name: 'フォレスト',
        preview: ['#7ab87a','#8abc7a','#9ac07a','#6aac6a','#5a9c5a','#80b880','#70ac70'],
        colors: {
            '北海道':'#7ab87a','青森県':'#7ebc7a','岩手県':'#82be7a','宮城県':'#86c07a',
            '秋田県':'#8ac27c','山形県':'#8ec47c','福島県':'#92c67e','茨城県':'#96c880',
            '栃木県':'#9aca80','群馬県':'#9ecc82','埼玉県':'#9cca82','千葉県':'#98c880',
            '東京都':'#94c67e','神奈川県':'#90c47c','新潟県':'#8cc27c','富山県':'#88c07a',
            '石川県':'#84be7a','福井県':'#80bc7a','山梨県':'#7cba78','長野県':'#78b878',
            '岐阜県':'#76b678','静岡県':'#78b878','愛知県':'#7aba78','三重県':'#7cbc7a',
            '滋賀県':'#7eba7a','京都府':'#80bc7a','大阪府':'#82be7c','兵庫県':'#84c07c',
            '奈良県':'#86c27e','和去山県':'#88c47e','鳥取県':'#88c47e','島根県':'#86c27c',
            '岡山県':'#84c07c','広島県':'#82be7a','山口県':'#80bc7a','徳島県':'#7eba7a',
            '香川県':'#7cb878','愛媛県':'#7ab678','高知県':'#78b478','福岡県':'#76b276',
            '佐賀県':'#74b076','長崎県':'#72ae76','熊本県':'#70ac74','大分県':'#6eaa74',
            '宮崎県':'#70ac74','鹿児島県':'#72ae76','沖縄県':'#74b076'
        }
    },
    mono: {
        name: 'モノクロ',
        preview: ['#a0a0a0','#b0b0b0','#c0c0c0','#909090','#888888','#aaaaaa','#989898'],
        colors: {
            '北海道':'#a8a8a8','青森県':'#ababab','岩手県':'#aeaeae','宮城県':'#b1b1b1',
            '秋田県':'#b4b4b4','山形県':'#b7b7b7','福島県':'#bababa','茨城県':'#bdbdbd',
            '栃木県':'#c0c0c0','群馬県':'#c3c3c3','埼玉県':'#c0c0c0','千葉県':'#bdbdbd',
            '東京都':'#bababa','神奈川県':'#b7b7b7','新潟県':'#b4b4b4','富山県':'#b1b1b1',
            '石川県':'#aeaeae','福井県':'#ababab','山梨県':'#a8a8a8','長野県':'#a5a5a5',
            '岐阜県':'#a2a2a2','静岡県':'#a5a5a5','愛知県':'#a8a8a8','三重県':'#ababab',
            '滋賀県':'#aeaeae','京都府':'#b1b1b1','大阪府':'#b4b4b4','兵庫県':'#b7b7b7',
            '奈良県':'#bababa','和歌山県':'#bdbdbd','鳥取県':'#bdbdbd','島根県':'#bababa',
            '岡山県':'#b7b7b7','広島県':'#b4b4b4','山口県':'#b1b1b1','徳島県':'#aeaeae',
            '香川県':'#ababab','愛媛県':'#a8a8a8','高知県':'#a5a5a5','福岡県':'#a2a2a2',
            '佐賀県':'#9f9f9f','長崎県':'#9c9c9c','熊本県':'#999999','大分県':'#969696',
            '宮崎県':'#999999','鹿児島県':'#9c9c9c','沖縄県':'#9f9f9f'
        }
    },
};

let currentTheme = localStorage.getItem('mapTheme') || 'default';

function applyTheme(themeKey) {
    currentTheme = themeKey;
    localStorage.setItem('mapTheme', themeKey);
    updateMapColors();
}

function getCurrentColors() {
    return (MAP_THEMES[currentTheme] || MAP_THEMES.default).colors;
}
let isPasswordRecoveryMode = false;

// 機能ON/OFF設定
let featureShowDate = localStorage.getItem('featureShowDate') !== 'false';
let featureShowMemo = localStorage.getItem('featureShowMemo') === 'true';
let featureShowThumbnail = localStorage.getItem('featureShowThumbnail') !== 'false'; // デフォルトON
let dateEditingMode = false; // 日付編集モードフラグ

// 長押し選択モード管理
let bulkSelectMode = false;
let bulkSelectedUrls = new Set();
let longPressTimer = null;
window._isSwipeSelecting = false;

function handlePhotoClick(event, idOrUrl, photos) {
    // 選択モード中は touchend にて判定するため、クリックイベントは何もしない
    if (bulkSelectMode) return;
    openSliderAt(idOrUrl, photos);
}

function updateDownloadBtn() {
    const addBtn = document.getElementById('add-photo-btn');
    const dlBtn = document.getElementById('download-photo-btn');
    if (!addBtn || !dlBtn) return;
    
    if (bulkSelectMode) {
        if (bulkSelectedUrls.size > 0) {
            addBtn.style.display = 'none';
            dlBtn.style.display = 'flex';
        } else {
            addBtn.style.display = 'flex';
            dlBtn.style.display = 'none';
        }
    } else {
        addBtn.style.display = 'flex';
        dlBtn.style.display = 'none';
    }
}

function initPhotoDragSort() {
    // ── ドラッグ＆ドロップ（選択モード外のみ）──
    let dragSrc = null, dragGhost = null;
    let ghostOffsetX = 0, ghostOffsetY = 0;

    document.querySelectorAll('.photo-grid-item, #thumb-wrap').forEach(el => {
        const url = el.getAttribute('data-url');
        if (!url) return;
        let pressTimer = null, isDragging = false, startX = 0, startY = 0;

        el.addEventListener('touchstart', (e) => {
            if (bulkSelectMode) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            pressTimer = setTimeout(() => {
                isDragging = true;
                dragSrc = el;
                // iPhoneライクな浮き上がりアニメーション
                el.style.opacity = '0.3';
                el.style.transform = 'scale(0.95)';
                el.style.transition = 'transform 0.2s, opacity 0.2s';
                
                const rect = el.getBoundingClientRect();
                ghostOffsetX = e.touches[0].clientX - rect.left;
                ghostOffsetY = e.touches[0].clientY - rect.top;
                dragGhost = el.cloneNode(true);
                dragGhost.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;opacity:0.9;pointer-events:none;z-index:9999;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,0.4);transform:scale(1.08);transition:transform 0.15s ease-out;`;
                document.body.appendChild(dragGhost);
                navigator.vibrate && navigator.vibrate(30);
            }, 300); // 長押しで浮き上がり
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (bulkSelectMode) return;
            const dx = Math.abs(e.touches[0].clientX - startX);
            const dy = Math.abs(e.touches[0].clientY - startY);
            if (!isDragging && (dx > 8 || dy > 8)) clearTimeout(pressTimer);
            if (!isDragging || !dragGhost) return;
            e.preventDefault(); // ドラッグ中のみスクロールを止める
            const touch = e.touches[0];
            dragGhost.style.left = (touch.clientX - ghostOffsetX) + 'px';
            dragGhost.style.top  = (touch.clientY - ghostOffsetY) + 'px';
            
            document.querySelectorAll('.photo-grid-item, #thumb-wrap').forEach(t => {
                if (t !== dragSrc) {
                    t.style.transform = '';
                    t.style.opacity = '1';
                }
            });
            const target = getDropTarget(touch.clientX, touch.clientY, dragSrc);
            if (target) {
                target.style.transform = 'scale(0.92)';
                target.style.opacity = '0.8';
                target.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
            }
        }, { passive: false });

        el.addEventListener('touchend', async (e) => {
            if (bulkSelectMode) return;
            clearTimeout(pressTimer);
            if (!isDragging) return;
            isDragging = false;
            
            el.style.opacity = '1';
            el.style.transform = '';
            if (dragGhost) { dragGhost.remove(); dragGhost = null; }
            document.querySelectorAll('.photo-grid-item, #thumb-wrap').forEach(t => {
                t.style.transform = '';
                t.style.opacity = '1';
            });
            
            const touch = e.changedTouches[0];
            const target = getDropTarget(touch.clientX, touch.clientY, dragSrc);
            if (target && target !== dragSrc) {
                await reorderPhotos(dragSrc.getAttribute('data-url'), target.getAttribute('data-url'));
            }
            dragSrc = null;
        }, { passive: true });

        el.addEventListener('touchcancel', () => {
            if (bulkSelectMode) return;
            clearTimeout(pressTimer);
            isDragging = false;
            el.style.opacity = '1';
            el.style.transform = '';
            if (dragGhost) { dragGhost.remove(); dragGhost = null; }
            document.querySelectorAll('.photo-grid-item, #thumb-wrap').forEach(t => {
                t.style.transform = '';
                t.style.opacity = '1';
            });
            dragSrc = null;
        }, { passive: true });
    });

    // ── iPhoneライクなスワイプ選択操作（panel-contentレベルで管理）──
    const panelContent = document.querySelector('#right-panel .panel-content');
    if (!panelContent || panelContent._selectReady) return;
    panelContent._selectReady = true;

    let selectDirection = null; // true=選択, false=解除
    let slideTouched = new Set();
    let selectStarted = false;
    let initialTouchUrl = null;
    let startX = 0;
    let startY = 0;

    panelContent.addEventListener('touchstart', (e) => {
        if (!bulkSelectMode) return;
        const item = e.target.closest('.photo-grid-item, #thumb-wrap');
        if (!item) return;
        const u = item.getAttribute('data-url');
        if (!u) return;
        
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        initialTouchUrl = u;
        selectDirection = !bulkSelectedUrls.has(u);
        slideTouched = new Set();
        selectStarted = true;
        window._isSwipeSelecting = false;
    }, { passive: true });

    panelContent.addEventListener('touchmove', (e) => {
        if (!bulkSelectMode || !selectStarted) return;
        const touch = e.touches[0];
        
        if (!window._isSwipeSelecting) {
            const dx = Math.abs(touch.clientX - startX);
            const dy = Math.abs(touch.clientY - startY);
            if (dx > 5 || dy > 5) {
                window._isSwipeSelecting = true;
                if (initialTouchUrl && !slideTouched.has(initialTouchUrl)) {
                    slideTouched.add(initialTouchUrl);
                    togglePhotoSelect(initialTouchUrl, selectDirection);
                }
            }
        }

        if (window._isSwipeSelecting) {
            e.preventDefault(); // スワイプ選択中はスクロールを止める
            const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);
            const item = elUnder ? elUnder.closest('.photo-grid-item, #thumb-wrap') : null;

            if (item) {
                const u = item.getAttribute('data-url');
                if (u && !slideTouched.has(u)) {
                    slideTouched.add(u);
                    togglePhotoSelect(u, selectDirection);
                }
            }
        }
    }, { passive: false });

    panelContent.addEventListener('touchend', () => {
        if (selectStarted && !window._isSwipeSelecting && initialTouchUrl) {
            // スワイプされなかった場合は単発タップとみなしてトグル
            togglePhotoSelect(initialTouchUrl);
        }
        selectStarted = false;
        initialTouchUrl = null;
        slideTouched.clear();
        setTimeout(() => { window._isSwipeSelecting = false; }, 50);
    }, { passive: true });

    panelContent.addEventListener('touchcancel', () => {
        selectStarted = false;
        initialTouchUrl = null;
        slideTouched.clear();
        window._isSwipeSelecting = false;
    }, { passive: true });
}

function getDropTarget(clientX, clientY, exclude) {
    const items = [...document.querySelectorAll('.photo-grid-item, #thumb-wrap')];
    for (const item of items) {
        if (item === exclude) continue;
        const rect = item.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
            return item;
        }
    }
    return null;
}

async function reorderPhotos(srcId, targetId) {
    const data = memoriesData.find(m => m.id === selectedEntryId) || memoriesData.find(m => m.prefecture === selectedPref);
    if (!data) return;
    let photos = JSON.parse(data.photo_urls || '[]');
    
    const srcIdx = photos.findIndex(p => (typeof p === 'string' ? p : p.id) === srcId);
    const tgtIdx = photos.findIndex(p => (typeof p === 'string' ? p : p.id) === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;

    const [removed] = photos.splice(srcIdx, 1);
    photos.splice(tgtIdx, 0, removed);
    data.photo_urls = JSON.stringify(photos);

    // UIを即座に更新（バックグラウンドで保存）
    renderRightPanel();

    globalSaveQueue = globalSaveQueue.then(async () => {
        await apiFetch({ method: 'POST', body: JSON.stringify({
            action: 'save_memory',
            prefecture: selectedPref,
            date: data.date || '',
            memo: data.memo || '',
            existing_urls: photos,
            entry_id: selectedEntryId || undefined
        })});
        await fetchMemories(false);
    }).catch(e => console.error('reorder error', e));
}

function toggleSelectOrDelete() {
    if (bulkSelectMode) {
        if (bulkSelectedUrls.size > 0) {
            deleteBulkSelected();
        } else {
            cancelBulkSelect();
        }
    } else {
        enterBulkSelectMode();
    }
}

function selectAllPhotos() {
    const data = memoriesData.find(m => m.id === selectedEntryId) || memoriesData.find(m => m.prefecture === selectedPref);
    if (!data) return;
    let photos = JSON.parse(data.photo_urls || '[]');
    
    const isAllSelected = bulkSelectedUrls.size === photos.length && photos.length > 0;
    
    bulkSelectedUrls.clear();
    
    if (!isAllSelected) {
        photos.forEach(p => {
            const idOrUrl = typeof p === 'string' ? p : p.id;
            bulkSelectedUrls.add(idOrUrl);
        });
    }
    
    // UIをまとめて更新
    document.querySelectorAll('#right-panel [data-url]').forEach(el => {
        const elUrl = el.getAttribute('data-url');
        const isSelected = bulkSelectedUrls.has(elUrl);
        
        const check = el.id === 'thumb-wrap' ? document.getElementById('thumb-check') : el.querySelector('.photo-check');
        if (check) check.style.display = isSelected ? 'flex' : 'none';
        el.style.outline = isSelected ? '3px solid #d32f2f' : '';
    });
    
    const countEl = document.getElementById('bulk-select-count');
    if (countEl) countEl.textContent = `${bulkSelectedUrls.size}枚選択中`;
    
    const icon = document.getElementById('select-btn-icon');
    if (icon) {
        if (bulkSelectedUrls.size > 0) {
            icon.innerHTML = '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>';
        } else {
            icon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
        }
    }
    
    const selectAllBtn = document.getElementById('select-all-btn');
    if (selectAllBtn) {
        const data = memoriesData.find(m => m.id === selectedEntryId) || memoriesData.find(m => m.prefecture === selectedPref);
        const photosCount = data ? JSON.parse(data.photo_urls || '[]').length : 0;
        selectAllBtn.textContent = (photosCount > 0 && bulkSelectedUrls.size === photosCount) ? 'すべて解除' : 'すべて選択';
    }

    updateDownloadBtn();
}

function enterBulkSelectMode() {
    bulkSelectMode = true;
    bulkSelectedUrls = new Set();
    const bar = document.getElementById('bulk-delete-bar');
    if (bar) bar.style.display = 'flex';
    
    updateDownloadBtn();

    const grid = document.querySelector('.photo-grid');
    if (grid) {
        grid.style.transition = 'all 0.25s ease';
        grid.style.gridTemplateColumns = '1fr 1fr 1fr';
        grid.style.gap = '6px';
        grid.style.marginRight = '75px';
    }
    document.querySelectorAll('.photo-grid-item img').forEach(img => {
        img.style.transition = 'height 0.25s ease';
        img.style.height = '80px';
    });
    const thumb = document.querySelector('#thumb-wrap img');
    if (thumb) {
        thumb.style.transition = 'height 0.25s ease';
        thumb.style.height = '120px';
    }
    const thumbWrap = document.getElementById('thumb-wrap');
    if (thumbWrap) {
        thumbWrap.style.transition = 'all 0.25s ease';
        thumbWrap.style.marginRight = '75px';
    }
}

function cancelBulkSelect() {
    bulkSelectMode = false;
    bulkSelectedUrls = new Set();
    const bar = document.getElementById('bulk-delete-bar');
    if (bar) bar.style.display = 'none';
    
    // ダウンロードボタンを＋ボタンに戻す
    updateDownloadBtn();

    document.querySelectorAll('.photo-check, #thumb-check').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.photo-grid-item, #thumb-wrap').forEach(el => {
        el.style.outline = '';
        el.classList.remove('photo-selected');
    });
    const icon = document.getElementById('select-btn-icon');
    if (icon) icon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    const grid = document.querySelector('.photo-grid');
    if (grid) {
        grid.style.gridTemplateColumns = '1fr 1fr';
        grid.style.gap = '12px';
        grid.style.marginRight = '';
    }
    document.querySelectorAll('.photo-grid-item img').forEach(img => {
        img.style.transition = 'height 0.25s ease';
        img.style.height = '140px';
    });
    const thumb = document.querySelector('#thumb-wrap img');
    if (thumb) {
        thumb.style.transition = 'height 0.25s ease';
        thumb.style.height = '280px';
    }
    const thumbWrap = document.getElementById('thumb-wrap');
    if (thumbWrap) {
        thumbWrap.style.marginRight = '';
    }
}

function togglePhotoSelect(url, forceState = null) {
    if (forceState !== null) {
        if (forceState) bulkSelectedUrls.add(url);
        else bulkSelectedUrls.delete(url);
    } else {
        if (bulkSelectedUrls.has(url)) bulkSelectedUrls.delete(url);
        else bulkSelectedUrls.add(url);
    }
    
    document.querySelectorAll('#right-panel [data-url]').forEach(el => {
        const elUrl = el.getAttribute('data-url');
        if (elUrl === url) {
            const check = el.id === 'thumb-wrap' ? document.getElementById('thumb-check') : el.querySelector('.photo-check');
            const isSelected = bulkSelectedUrls.has(url);
            if (check) check.style.display = isSelected ? 'flex' : 'none';
            el.style.outline = isSelected ? '3px solid #d32f2f' : '';
        }
    });
    const countEl = document.getElementById('bulk-select-count');
    if (countEl) countEl.textContent = `${bulkSelectedUrls.size}枚選択中`;
    const icon = document.getElementById('select-btn-icon');
    if (icon) {
        if (bulkSelectedUrls.size > 0) {
            icon.innerHTML = '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>';
        } else {
            icon.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
        }
    }
    
    const selectAllBtn = document.getElementById('select-all-btn');
    if (selectAllBtn) {
        const data = memoriesData.find(m => m.id === selectedEntryId) || memoriesData.find(m => m.prefecture === selectedPref);
        const photosCount = data ? JSON.parse(data.photo_urls || '[]').length : 0;
        selectAllBtn.textContent = (photosCount > 0 && bulkSelectedUrls.size === photosCount) ? 'すべて解除' : 'すべて選択';
    }

    updateDownloadBtn();
}

async function downloadSelectedPhotos() {
    if (bulkSelectedUrls.size === 0) {
        alert("ダウンロードする写真を選択してください");
        return;
    }
    showLoading('準備中...');
    try {
        let count = 0;
        for (const urlOrId of bulkSelectedUrls) {
            count++;
            showLoading(`ダウンロード中... ${count} / ${bulkSelectedUrls.size}`);
            
            if (!urlOrId.startsWith('http')) {
                const base64 = await getPhotoFromIDB(urlOrId);
                if (base64) {
                    const a = document.createElement('a');
                    a.href = base64;
                    a.download = `ashiato_${selectedPref}_${count}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    await new Promise(r => setTimeout(r, 600)); // ブラウザの連続DL制限を回避
                }
            } else {
                 try {
                     const resp = await fetch(urlOrId);
                     const blob = await resp.blob();
                     const a = document.createElement('a');
                     a.href = URL.createObjectURL(blob);
                     a.download = `ashiato_${selectedPref}_${count}.jpg`;
                     document.body.appendChild(a);
                     a.click();
                     document.body.removeChild(a);
                     URL.revokeObjectURL(a.href);
                     await new Promise(r => setTimeout(r, 600));
                 } catch (e) {
                     window.open(urlOrId, '_blank');
                 }
            }
        }
        showLoading('完了！');
        setTimeout(() => { hideLoading(); cancelBulkSelect(); }, 1000);
    } catch(e) {
        console.error('Download error', e);
        alert('ダウンロード中にエラーが発生しました');
        hideLoading();
    }
}

async function deleteBulkSelected() {
    if (bulkSelectedUrls.size === 0) return;
    if (!confirm(`${bulkSelectedUrls.size}枚の写真を削除しますか？`)) return;
    
    // バックグラウンド化のためUIを即時更新
    const urlsToDelete = Array.from(bulkSelectedUrls);
    const deleteCount = urlsToDelete.length;
    const targetPref = selectedPref;
    
    const data = memoriesData.find(m => m.id === selectedEntryId) || memoriesData.find(m => m.prefecture === targetPref);
    let photosToSave = [];
    if (data) {
        let photos = JSON.parse(data.photo_urls || '[]');
        const urlsToDeleteSet = new Set(urlsToDelete);
        photosToSave = photos.filter(p => !urlsToDeleteSet.has(typeof p === 'string' ? p : p.id));
        data.photo_urls = JSON.stringify(photosToSave);
    }
    
    cancelBulkSelect();
    renderRightPanel();
    updateCounter();

    showSaveProgress(deleteCount, '削除中...');

    globalSaveQueue = globalSaveQueue.then(async () => {
        let count = 0;
        for (const urlOrId of urlsToDelete) {
            if (!urlOrId.startsWith('http')) {
                await deletePhotoFromIDB(urlOrId);
            }
            count++;
            updateSaveProgress(count, deleteCount, '削除中...');
        }
        
        // 削除後にSupabaseのDBを更新
        if (data) {
            if (photosToSave.length === 0) {
                // 写真が0枚になったらエントリ自体を削除
                await apiFetch({ method: 'POST', body: JSON.stringify({
                    action: 'delete_entry',
                    entry_id: data.id
                })});
                // memoriesDataからも除去
                memoriesData = memoriesData.filter(m => m.id !== data.id);
                selectedEntryId = null;
            } else {
                await apiFetch({ method: 'POST', body: JSON.stringify({
                    action: 'save_memory',
                    prefecture: targetPref,
                    date: data.date || '',
                    memo: data.memo || '',
                    existing_urls: photosToSave,
                    entry_id: data.id || undefined
                })});
            }
        }
        
        await fetchMemories(false);
        
        // 写真0枚でエントリ削除した場合の後処理
        if (photosToSave.length === 0) {
            const remaining = memoriesData.filter(m => m.prefecture === targetPref && !m.is_home);
            if (remaining.length === 0) {
                // 記録が全て消えたら一覧に戻る
                backToList();
            } else {
                // 残りエントリの先頭を選択してパネルを再描画
                selectedEntryId = remaining[0].id;
                renderRightPanel();
            }
        } else {
            renderRightPanel();
        }
        
        updateSaveProgress(deleteCount, deleteCount, '完了！');
        setTimeout(() => hideSaveProgress(), 1500);
    }).catch(e => {
        console.error('bulk delete error', e);
        updateSaveProgress(0, 1, 'エラーが発生しました');
        setTimeout(() => hideSaveProgress(), 1500);
    });
}

function showAuthPrivacyPopup() {
    const existing = document.getElementById('auth-privacy-popup');
    if (existing) existing.remove();
    const popup = document.createElement('div');
    popup.id = 'auth-privacy-popup';
    popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;box-sizing:border-box;';
    popup.innerHTML = `
        <div style="background:white;border-radius:16px;width:100%;max-width:400px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.2);overflow:hidden;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #f0f0f0;flex-shrink:0;">
                <h2 style="margin:0;font-size:1.2rem;color:#333;font-family:'Zen Kaku Gothic New',sans-serif;">プライバシーポリシー</h2>
                <button onclick="document.getElementById('auth-privacy-popup').remove()" style="background:none;border:none;font-size:24px;color:#aaa;cursor:pointer;line-height:1;padding:0;">✕</button>
            </div>
            <div style="overflow-y:auto;padding:20px;font-family:'Zen Kaku Gothic New',sans-serif;font-size:0.88rem;color:#555;line-height:1.85;">
                <p>あしあと（以下「本サービス」）は、運営者 ともい（以下「運営者」）が提供する旅の記録アプリです。本ポリシーでは、ユーザーの個人情報の取り扱いについて説明します。</p>
                <p style="font-weight:bold;color:#444;margin-top:18px;">■ 収集する情報</p>
                <p>・メールアドレス（アカウント登録・認証のため）<br>・都道府県・日付・メモ（旅の記録データ）<br>・写真データ<br><span style="font-size:0.82rem;color:#777;display:block;margin-top:4px;padding:8px 10px;background:#f4f7f6;border-radius:6px;line-height:1.6;">※プライバシー保護のため、写真はクラウドには保存されず、ご利用の端末内（ブラウザのIndexedDB）に直接保存されます。（共有機能の表示用にのみ、軽量なサムネイル画像がクラウドに保管されます）</span>・テーマ設定（端末内にのみ保存）</p>
                <p style="font-weight:bold;color:#444;margin-top:18px;">■ 情報の利用目的</p>
                <p>・サービスの提供および機能の維持<br>・ユーザー認証とアカウント管理<br>・旅の記録データの保存と表示</p>
                <p style="font-weight:bold;color:#444;margin-top:18px;">■ 第三者提供</p>
                <p>収集した個人情報は、法令に基づく場合を除き、第三者に提供することはありません。</p>
                <p style="font-weight:bold;color:#444;margin-top:18px;">■ 利用するサービス</p>
                <p>本サービスは、データの保存にSupabase（supabase.com）を利用しています。Supabaseのプライバシーポリシーは同社のウェブサイトをご確認ください。</p>
                <p style="font-weight:bold;color:#444;margin-top:18px;">■ データの削除</p>
                <p>アカウントを削除すると、すべての記録データおよびアップロードされた写真は完全に削除されます。</p>
                <p style="font-weight:bold;color:#444;margin-top:18px;">■ お問い合わせ</p>
                <p>プライバシーに関するご質問は、アプリ内のお問い合わせフォームよりご連絡ください。</p>
                <p style="color:#aaa;font-size:0.82rem;margin-top:24px;text-align:right;">運営者：ともい<br>サービス名：あしあと</p>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

function switchToSignup() {
    currentAuthTab = 'signup';
    document.getElementById('auth-submit-btn').textContent = 'アカウントを作成';
    document.getElementById('auth-submit-btn').disabled = true;
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-success').classList.add('hidden');
    const link = document.querySelector('.auth-signup-link');
    if (link) link.innerHTML = '<a href="#" onclick="switchToLogin(); return false;">ログインはこちら</a>';
    const privacyWrap = document.getElementById('privacy-agree-wrap');
    if (privacyWrap) privacyWrap.style.display = 'flex';
}

function switchToLogin() {
    currentAuthTab = 'login';
    document.getElementById('auth-submit-btn').textContent = 'ログイン';
    document.getElementById('auth-submit-btn').disabled = false;
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-success').classList.add('hidden');
    document.getElementById('auth-password').style.display = '';
    const link = document.querySelector('.auth-signup-link');
    if (link) link.innerHTML = 'アカウントの新規作成は<a href="#" onclick="switchToSignup(); return false;">こちら</a>';
    const forgotLink = document.getElementById('forgot-pw-link');
    if (forgotLink) forgotLink.style.display = '';
    const privacyWrap = document.getElementById('privacy-agree-wrap');
    if (privacyWrap) privacyWrap.style.display = 'none';
}

function switchToReset() {
    currentAuthTab = 'reset';
    document.getElementById('auth-submit-btn').textContent = 'リセットメールを送信';
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-success').classList.add('hidden');
    document.getElementById('auth-password').style.display = 'none';
    const link = document.querySelector('.auth-signup-link');
    if (link) link.innerHTML = '<a href="#" onclick="switchToLogin(); return false;">ログインに戻る</a>';
    const forgotLink = document.getElementById('forgot-pw-link');
    if (forgotLink) forgotLink.style.display = 'none';
}

async function sendResetEmail(email) {
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');
    const submitBtn = document.getElementById('auth-submit-btn');

    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';
    showLoading();

    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        if (error) {
            errorEl.textContent = '送信に失敗しました: ' + error.message;
            errorEl.classList.remove('hidden');
        } else {
            successEl.textContent = 'リセット用のメールを送信しました。メールを確認してください。';
            successEl.classList.remove('hidden');
        }
    } catch(e) {
        errorEl.textContent = '通信エラーが発生しました';
        errorEl.classList.remove('hidden');
    } finally {
        hideLoading();
        submitBtn.disabled = false;
        submitBtn.textContent = 'リセットメールを送信';
    }
}

async function handleAuth() {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');
    const submitBtn = document.getElementById('auth-submit-btn');

    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    if (!email) {
        errorEl.textContent = 'メールアドレスを入力してください';
        errorEl.classList.remove('hidden');
        return;
    }

    if (currentAuthTab === 'signup') {
        const agreed = document.getElementById('privacy-agree-check');
        if (!agreed || !agreed.checked) {
            errorEl.textContent = 'プライバシーポリシーに同意してください';
            errorEl.classList.remove('hidden');
            return;
        }
    }

    if (currentAuthTab === 'reset') {
        await sendResetEmail(email);
        return;
    }

    if (!password) {
        errorEl.textContent = 'パスワードを入力してください';
        errorEl.classList.remove('hidden');
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'パスワードは6文字以上にしてください';
        errorEl.classList.remove('hidden');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '処理中...';
    showLoading();

    try {
        let result;
        if (currentAuthTab === 'login') {
            result = await supabaseClient.auth.signInWithPassword({ email, password });
        } else {
            result = await supabaseClient.auth.signUp({ email, password });
        }

        if (result.error) {
            let msg = result.error.message;
            if (msg.includes('Invalid login credentials')) msg = 'メールアドレスまたはパスワードが違います';
            if (msg.includes('User already registered')) msg = 'このメールアドレスはすでに登録されています';
            if (msg.includes('Password should be')) msg = 'パスワードは6文字以上にしてください';
            if (msg.includes('rate limit') || msg.includes('Rate limit')) msg = '上限に達しました。しばらく時間をおいてください。';
            errorEl.textContent = msg;
            errorEl.classList.remove('hidden');
        } else {
            if (currentAuthTab === 'signup') {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session) {
                    localStorage.removeItem('tutorialDone');
                    await startApp(session);
                    showInstallSlides();
                }
            } else {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session) startApp(session);
            }
        }
    } catch(e) {
        errorEl.textContent = '通信エラーが発生しました';
        errorEl.classList.remove('hidden');
    } finally {
        hideLoading();
        submitBtn.disabled = false;
        submitBtn.textContent = currentAuthTab === 'login' ? 'ログイン' : 'アカウントを作成';
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !document.getElementById('auth-screen').classList.contains('hidden')) {
        handleAuth();
    }
});

function showPasswordRecoveryScreen() {
    isPasswordRecoveryMode = true;
    panelOpen = false;
    settingsOpen = false;
    selectedPref = null;

    const settingsPanel = document.getElementById('settings-panel');
    if (!settingsPanel) {
        const sp = document.createElement('div');
        sp.id = 'settings-panel';
        sp.className = 'list-section';
        document.querySelector('.main-layout') && document.querySelector('.main-layout').appendChild(sp);
    }
    settingsOpen = true;
    document.getElementById('settings-panel') && document.getElementById('settings-panel').classList.add('open');
    renderChangePassword();
}

async function startApp(session) {
    applyTheme(currentTheme);
    currentUser = session.user;
    currentToken = session.access_token;
    panelOpen = false;
    settingsOpen = false;
    selectedPref = null;
    dateEditingMode = false;
    memoriesData = [];
    homePrefectures = [];

    if (map) {
        try { map.remove(); } catch(e) {}
        map = null;
        geoJsonLayer = null;
        initialBounds = null;
    }

    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    const rightPanel = document.getElementById('right-panel');
    const settingsPanel = document.getElementById('settings-panel');
    if (rightPanel) rightPanel.classList.remove('open');
    if (settingsPanel) settingsPanel.classList.remove('open');

    await initApp();
    updateUIVisibility();
    
    // パッチバージョンのため、大型アップデートのポップアップのみ未読なら表示
    if (localStorage.getItem('tutorialDone')) {
        showUpdatePopup();
    }
}

async function logout() {
    if (!confirm('ログアウトしますか？')) return;
    showLoading('ログアウト中...');
    await supabaseClient.auth.signOut();
    currentUser = null;
    currentToken = null;
    memoriesData = [];
    homePrefectures = [];
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
    switchToLogin();
    hideLoading();
}

window.addEventListener('load', async () => {
    // 起動時にローディング画面を表示
    showLoading('地図を読み込み中...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const shareToken = urlParams.get('share');
    if (shareToken) {
        isShareMode = true;
        shareUserId = shareToken;
        initShareMode();
        return;
    }

    let recoveryHandled = false;

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED' && session) {
            currentToken = session.access_token;
        }
        if (event === 'SIGNED_OUT') {
            currentUser = null;
            currentToken = null;
        }
        if (event === 'PASSWORD_RECOVERY') {
            recoveryHandled = true;
            currentUser = session.user;
            currentToken = session.access_token;
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('app-screen').classList.remove('hidden');
            hideLoading();
            showPasswordRecoveryScreen();
        }
    });

    await new Promise(r => setTimeout(r, 300));
    if (!recoveryHandled) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            await startApp(session);
        } else {
            hideLoading();
        }
    }
});

// =============================================
// 共有モード（閲覧のみ）
// =============================================
let shareSettings = { show_thumb: true, show_date: true };

async function initShareMode() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');

    applyTheme(currentTheme);

    map = L.map('map-container', {
        zoomControl: false,
        attributionControl: false,
        doubleClickZoom: false,
        zoomSnap: 0
    }).setView([38.0, 137.0], 5);

    const mapPromise = fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson', { cache: 'force-cache' })
        .then(res => res.json())
        .then(data => {
            geoJsonLayer = L.geoJson(data, {
                style: { fillColor: '#f4f7f6', weight: 0.3, color: '#000000', fillOpacity: 1 },
                onEachFeature: function(feature, layer) {
                    const prefName = feature.properties.nam_ja;
                    layer.on('click', () => {
                        selectedPref = prefName;
                        openPanel();
                        renderRightPanel();
                    });
                }
            }).addTo(map);
            initialBounds = geoJsonLayer.getBounds();
            map.fitBounds(initialBounds);
        });

    const dataPromise = fetch(`/api?share=${encodeURIComponent(shareUserId)}`)
        .then(res => {
            if (!res.ok) throw new Error('Share link error');
            return res.json();
        })
        .then(data => {
            if (data.memories) {
                memoriesData = data.memories;
                shareSettings = data.settings;
            } else {
                memoriesData = data;
                shareSettings = { show_thumb: true, show_date: true };
            }
            homePrefectures = memoriesData
                .filter(m => m.is_home === true)
                .map(m => m.prefecture);
        });

    try {
        await Promise.all([mapPromise, dataPromise]);
    } catch(e) {
        console.error('Share load error', e);
    } finally {
        updateMapColors();
        updateCounter();
        hideLoading();
    }

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) settingsBtn.style.display = 'none';

    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        menuBtn.title = '一覧';
        menuBtn.addEventListener('click', () => {
            if (panelOpen) {
                closePanel();
            } else {
                selectedPref = null;
                openPanel();
                renderRightPanel();
            }
        });
    }

    map.on('dblclick', function() {
        if (initialBounds) map.flyToBounds(initialBounds, { duration: 0.6 });
        if (panelOpen) closePanel();
    });

    let lastTouchTime2 = 0;
    let isPinching2 = false;
    document.getElementById('map-container').addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) isPinching2 = true;
    });
    document.getElementById('map-container').addEventListener('touchend', function(e) {
        if (isPinching2) { if (e.touches.length === 0) isPinching2 = false; return; }
        const now = new Date().getTime();
        if (now - lastTouchTime2 < 400 && now - lastTouchTime2 > 0) {
            if (initialBounds) map.flyToBounds(initialBounds, { duration: 0.6 });
            if (panelOpen) closePanel();
        }
        lastTouchTime2 = now;
    });

    document.getElementById('btn-close-slider').addEventListener('click', () => {
        document.getElementById('slider-modal').classList.add('hidden');
    });
    document.getElementById('btn-prev').addEventListener('click', () => {
        if (slideIndex > 0) { slideIndex--; updateSlider(); }
    });
    document.getElementById('btn-next').addEventListener('click', () => {
        if (slideIndex < currentPhotos.length - 1) { slideIndex++; updateSlider(); }
    });

    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed; bottom:0; left:0; right:0; background:#6c8ca3; color:white; text-align:center; padding:8px; font-size:0.88rem; font-weight:bold; z-index:1000;';
    banner.textContent = '閲覧モード（編集できません）';
    document.body.appendChild(banner);
}

async function apiFetch(options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
    const url = options.url || '/api';
    const { url: _, ...rest } = options;
    return fetch(url, { headers, ...rest });
}

let map;
let geoJsonLayer;
let selectedPref = null;
let selectedEntryId = null; // 複数エントリのうち編集中のエントリID

// inline onclick から呼べるグローバルsetter
function setSelectedPref(v) { selectedPref = v; }
function setSelectedEntryId(v) { selectedEntryId = (v === 'null' || v === '') ? null : v; }
let memoriesData = [];
let currentPhotos = [];
let slideIndex = 0;
let autoSaveTimer = null;
let panelOpen = false;
let settingsOpen = false;
let initialBounds;

let homePrefectures = [];
let isShareMode = false;
let shareUserId = null;

async function initApp() {
    map = L.map('map-container', {
        zoomControl: false,
        attributionControl: false,
        doubleClickZoom: false,
        zoomSnap: 0
    }).setView([38.0, 137.0], 5);

    const mapPromise = fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson', { cache: 'force-cache' })
        .then(res => res.json())
        .then(data => {
            geoJsonLayer = L.geoJson(data, {
                style: { fillColor: '#f4f7f6', weight: 0.3, color: '#000000', fillOpacity: 1 },
                onEachFeature: function (feature, layer) {
                    const prefName = feature.properties.nam_ja;
                    layer.bindTooltip(prefName, { sticky: true, direction: 'top' });
                    layer.on('click', () => {
                        selectedPref = prefName;
                        if (settingsOpen) closeSettings();
                        openPanel();
                        renderRightPanel();
                    });
                }
            }).addTo(map);

            const bounds = geoJsonLayer.getBounds();
            map.fitBounds(bounds, { paddingTopLeft: [0, 80], paddingBottomRight: [0, 0] });

            setTimeout(() => {
                initialBounds = map.getBounds();
                const minZoom = map.getZoom();
                map.setMinZoom(minZoom);
                map.setMaxBounds(initialBounds.pad(0.05));
                map.dragging.disable();
            }, 100);
        });

    const dataPromise = fetchMemories(false);

    await Promise.all([mapPromise, dataPromise]);
    
    updateMapColors();
    updateCounter();
    hideLoading();
    checkAndStartTutorial();

    map.on('zoomend', function() {
        if (map.getZoom() <= map.getMinZoom()) {
            map.dragging.disable();
            if (initialBounds) {
                map.panTo(initialBounds.getCenter(), { animate: false });
            }
        } else {
            map.dragging.enable();
        }
    });

    map.on('dblclick', function(e) {
        if (initialBounds) {
            map.flyToBounds(initialBounds, { duration: 0.6 });
        }
        if (panelOpen) closePanel();
        if (settingsOpen) closeSettings();
    });

    let lastTouchTime = 0;
    let isPinching = false;

    document.getElementById('map-container').addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            isPinching = true;
        }
    });

    document.getElementById('map-container').addEventListener('touchend', function(e) {
        if (isPinching) {
            if (e.touches.length === 0) {
                isPinching = false;
            }
            return;
        }
        // パネルや設定が開いている時はダブルタップ判定をしない
        if (panelOpen || settingsOpen) {
            lastTouchTime = 0;
            return;
        }
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTouchTime;
        if (tapLength > 0 && tapLength < 400) {
            if (initialBounds) {
                map.flyToBounds(initialBounds, { duration: 0.6 });
            }
        }
        lastTouchTime = currentTime;
    });

    const menuBtn = document.getElementById('menu-btn');
    menuBtn.title = "一覧";
    menuBtn.addEventListener('click', () => {
        if (panelOpen) {
            closePanel();
        } else {
            if (settingsOpen) closeSettings();
            selectedPref = null;
            openPanel();
            renderRightPanel();
        }
    });

    document.getElementById('btn-close-slider').addEventListener('click', () => {
        document.getElementById('slider-modal').classList.add('hidden');
    });
    document.getElementById('btn-prev').addEventListener('click', () => {
        if (slideIndex > 0) { slideIndex--; updateSlider(); }
    });
    document.getElementById('btn-next').addEventListener('click', () => {
        if (slideIndex < currentPhotos.length - 1) { slideIndex++; updateSlider(); }
    });

    let settingsBtnEl = document.getElementById('settings-btn');
    if (!settingsBtnEl) {
        settingsBtnEl = document.createElement('button');
        settingsBtnEl.id = 'settings-btn';
        settingsBtnEl.className = 'settings-btn';
        settingsBtnEl.title = "設定";
        document.querySelector('.main-layout').appendChild(settingsBtnEl);
    }
    
    window.updateSettingsBadge = function() {
        const btn = document.getElementById('admin-msg-btn');
        if (!btn) return;
        const mailSvg = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`;
        if (getUnreadCount() > 0) {
            btn.innerHTML = `${mailSvg}<div style="position:absolute; top:4px; right:4px; width:10px; height:10px; background:#ffca28; border-radius:50%; border:2px solid white;"></div>`;
        } else {
            btn.innerHTML = mailSvg;
        }
        
        // 設定ボタン側の小さいバッジも同期
        if (getUnreadCount() > 0) {
            settingsBtnEl.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="#555"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg><div style="position:absolute; top:4px; right:4px; width:10px; height:10px; background:#ffca28; border-radius:50%; border:2px solid white;"></div>`;
        } else {
            settingsBtnEl.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="#555"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`;
        }
    }
    
    updateSettingsBadge();

    settingsBtnEl.onclick = () => {
        if (settingsOpen) {
            closeSettings();
        } else {
            if (panelOpen) closePanel();
            openSettings();
        }
    };

    if (!document.getElementById('settings-panel')) {
        const sp = document.createElement('div');
        sp.id = 'settings-panel';
        sp.className = 'list-section';
        document.querySelector('.main-layout').appendChild(sp);
    }
}

function showLoading(msg = null) {
    let overlay = document.getElementById('loading-overlay');
    
    if (overlay) {
        // HTMLに直書きされている不要な「処理中」テキストなどを完全に消去する
        Array.from(overlay.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) {
                node.nodeValue = '';
            }
        });
    }

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'hidden';
        document.body.appendChild(overlay);
    }
    
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.8); z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter:blur(3px);';
    
    let textEl = document.getElementById('loading-text');
    if (!textEl) {
        textEl = document.createElement('div');
        textEl.id = 'loading-text';
        textEl.style.cssText = 'color:#6c8ca3; font-weight:bold; margin-top:16px; font-size:1.1rem; letter-spacing:2px; font-family:"Zen Kaku Gothic New", sans-serif;';
        overlay.appendChild(textEl);
    }
    
    if (msg) {
        textEl.textContent = msg;
        textEl.style.display = 'block';
    } else {
        textEl.style.display = 'none';
    }
    
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
    }
}

// =============================================
// 写真保存・削除用のバックグラウンドプログレス機能
// =============================================
function initProgressToast() {
    if (!document.getElementById('save-progress-toast')) {
        const toast = document.createElement('div');
        toast.id = 'save-progress-toast';
        toast.style.cssText = 'position:fixed; bottom:-100px; left:25px; width:auto; min-width:200px; background:rgba(255,255,255,0.9); border-radius:30px; box-shadow:0 4px 15px rgba(0,0,0,0.1); padding:8px 16px; z-index:99999; transition:bottom 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); display:flex; flex-direction:column; gap:4px; pointer-events:none; border:1px solid rgba(0,0,0,0.05);';
        toast.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:#555; font-weight:bold; font-family:inherit; gap:16px;">
                <span id="save-progress-label">準備中...</span>
                <span id="save-progress-text" style="color:#6c8ca3; font-size:0.75rem;"></span>
            </div>
            <div style="width:100%; height:4px; background:#eef2f5; border-radius:2px; overflow:hidden; position:relative;">
                <div id="save-progress-bar" style="width:0%; height:100%; background:#6c8ca3; transition:width 0.2s ease-out; border-radius:2px;"></div>
            </div>
        `;
        document.body.appendChild(toast);
    }
}

function showSaveProgress(total, label = '写真を保存中...') {
    initProgressToast();
    const toast = document.getElementById('save-progress-toast');
    document.getElementById('save-progress-label').textContent = label;
    document.getElementById('save-progress-text').textContent = `0 / ${total}`;
    document.getElementById('save-progress-bar').style.width = '0%';
    toast.style.bottom = '95px'; // 設定ボタン等に被らない高さに調整
}

function updateSaveProgress(current, total, label = null) {
    const toast = document.getElementById('save-progress-toast');
    if (!toast) return;
    if (label) document.getElementById('save-progress-label').textContent = label;
    document.getElementById('save-progress-text').textContent = `${current} / ${total}`;
    const percent = Math.floor((current / total) * 100);
    document.getElementById('save-progress-bar').style.width = `${percent}%`;
}

function hideSaveProgress() {
    const toast = document.getElementById('save-progress-toast');
    if (toast) {
        toast.style.bottom = '-100px';
    }
}

function openPanel() {
    panelOpen = true;
    document.getElementById('right-panel').classList.add('open');
    const adContainer = document.getElementById('ad-container');
    if (adContainer) adContainer.style.display = 'none';
    updateUIVisibility();
}

function enterDateEditMode() {
    dateEditingMode = true;
    renderRightPanel();
}

function clearDateEditMode() {
    dateEditingMode = false;
}

async function clearDateAndSave() {
    if (!selectedPref) return;
    dateEditingMode = false;
    const data = memoriesData.find(m => m.id === selectedEntryId) || memoriesData.find(m => m.prefecture === selectedPref);
    if (data) data.date = '';
    const payload = { action: 'save_memory', prefecture: selectedPref, date: '', photos: [], entry_id: (data && data.id) || undefined };
    await apiFetch({ method: 'POST', body: JSON.stringify(payload) });
    await fetchMemories(false);
    renderRightPanel();
    updateMapColors();
    updateCounter();
}

function cleanupEmptyDate() {
    if (selectedPref && !homePrefectures.includes(selectedPref)) {
        const data = memoriesData.find(m => m.id === selectedEntryId) || memoriesData.find(m => m.prefecture === selectedPref);
        if (!data) return;
        let photoCount = 0;
        try { photoCount = JSON.parse(data.photo_urls || "[]").length; } catch(e){}
        if (data.date && photoCount === 0) {
            data.date = "";
            const payload = { action: "save_memory", prefecture: selectedPref, date: "", photos: [], entry_id: data.id || undefined };
            apiFetch({ method: 'POST', body: JSON.stringify(payload) })
                .then(() => fetchMemories(false));
        }
    }
}

function closePanel() {
    cancelBulkSelect();
    clearTimeout(autoSaveTimer);
    cleanupEmptyDate();
    dateEditingMode = false;
    panelOpen = false;
    selectedPref = null;
    selectedEntryId = null;
    document.getElementById('right-panel').classList.remove('open');
    const adContainer = document.getElementById('ad-container');
    if (adContainer) adContainer.style.display = 'flex';
    updateUIVisibility();
    updateMapColors();
    updateCounter();
}

async function addNewEntry() {
    if (!selectedPref) return;
    // 新しい空エントリをDBに作成
    const payload = {
        action: "save_memory",
        prefecture: selectedPref,
        date: "",
        existing_urls: [],
        memo: "",
        entry_id: null // nullを渡すと新規INSERT
    };
    showLoading('追加中...');
    try {
        const res = await apiFetch({ method: 'POST', body: JSON.stringify(payload) });
        if (res.ok) {
            const result = await res.json();
            // 返ってきた新しいエントリのIDを選択
            const newEntry = Array.isArray(result) ? result[0] : result;
            await fetchMemories(false);
            if (newEntry && newEntry.id) {
                selectedEntryId = newEntry.id;
            } else {
                // IDが取れなかった場合は最新エントリを選択
                const entries = memoriesData.filter(m => m.prefecture === selectedPref && !m.is_home);
                selectedEntryId = entries.length > 0 ? entries[entries.length - 1].id : null;
            }
            dateEditingMode = true; // 日付入力モードで開く
            renderRightPanel();
        }
    } catch(e) {
        console.error('addNewEntry error', e);
    } finally {
        hideLoading();
    }
}

function backToList() {
    cancelBulkSelect();
    clearTimeout(autoSaveTimer);
    cleanupEmptyDate();
    dateEditingMode = false;
    selectedPref = null;
    selectedEntryId = null;
    renderRightPanel();
    updateMapColors();
    updateCounter();
}

function openSettings() {
    settingsOpen = true;
    window.isAdminMsgOpen = false; // 設定を開く時は必ずメニュー画面に
    document.getElementById('settings-panel').classList.add('open');
    const adContainer = document.getElementById('ad-container');
    if (adContainer) adContainer.style.display = 'none';
    updateUIVisibility();
    renderSettingsMenu();
}

function closeSettings() {
    settingsOpen = false;
    window.isAdminMsgOpen = false;
    document.getElementById('settings-panel').classList.remove('open');
    const adContainer = document.getElementById('ad-container');
    if (adContainer) adContainer.style.display = 'flex';
    updateUIVisibility();
    if(window.updateSettingsBadge) window.updateSettingsBadge();
}

function renderSettingsMenu() {
    const panel = document.getElementById('settings-panel');
    panel.style.backgroundColor = '#ffffff';

    let headerHtml = `
    <div class="panel-header">
        <div class="panel-header-title-row">
            <div style="flex:1;"></div>
            <h2 style="margin: 0; font-size: 1.6rem; color: #333; position:absolute; left:50%; transform:translateX(-50%);">設定</h2>
            <button class="panel-close-btn" onclick="closeSettings()" style="position:relative; right:0;">✕</button>
        </div>
    </div>`;
    
    const unreadCount = getUnreadCount();
    const badgeHtml = unreadCount > 0 ? `<div style="position:absolute; top:12px; right:12px; width:12px; height:12px; background:#ffca28; border:2px solid #6c8ca3; border-radius:50%;"></div>` : '';
    const mailSvg = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`;
    
    const btnS = `text-align:center; padding:20px; background:#f4f7f6; border:none; border-radius:12px; font-size:1.2rem; color:#444; cursor:pointer; font-weight:bold; font-family:inherit; transition:background 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05);`;
    let contentHtml = `
    <div class="panel-content" style="position: relative;">
        <div style="display:flex; flex-direction:column; gap:15px; margin-top:20px; padding-bottom: 80px;">
            <button onclick="renderFeatureThemeSettings()" style="${btnS}">
                テーマ・機能の変更
            </button>
            <button onclick="renderHomeSettings()" style="${btnS}">
                家を登録
            </button>
            <button onclick="renderShareSettings()" style="${btnS}">
                あしあとを共有
            </button>
            <button onclick="renderGroupSettings()" style="${btnS}">
                お互いの記録が1つの地図に
            </button>
            <button onclick="renderContactSettings()" style="${btnS}">
                お問い合わせ
            </button>
            <button onclick="renderAccountSettings()" style="${btnS}">
                アカウント
            </button>
        </div>
        <button onclick="toggleAdminMessages()" title="お知らせ"
            style="position:fixed; bottom:25px; left:25px; width:56px; height:56px; border-radius:50%; background:#6c8ca3; color:white; border:none; box-shadow:0 4px 12px rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10000;">
            ${mailSvg}
            ${badgeHtml}
        </button>
    </div>`;
    
    panel.innerHTML = headerHtml + contentHtml;
}

// ── 新規：お知らせ（メール）画面のレンダリング ──
function renderAdminMessages() {
    const panel = document.getElementById('settings-panel');
    panel.style.backgroundColor = '#ffffff';

    let headerHtml = `
    <div class="panel-header">
        <div class="panel-header-title-row">
            <button onclick="toggleAdminMessages()" style="background:none; border:none; font-size:24px; color:#6c8ca3; cursor:pointer; padding:0; font-weight:bold; line-height:1; position:relative; z-index:2;">←</button>
            <h2 style="margin: 0; font-size: 1.4rem; color: #333; position:absolute; left:50%; transform:translateX(-50%); white-space:nowrap;">お知らせ</h2>
            <button class="panel-close-btn" onclick="closeSettings()" style="position:relative; right:0; z-index:2;">✕</button>
        </div>
    </div>`;

    const readIds = getReadMessages();
    const hasUnread = ADMIN_MESSAGES.some(m => !readIds.includes(m.id));

    let contentHtml = `<div class="panel-content" style="position: relative;"><div style="display:flex; flex-direction:column; gap:12px; margin-top:16px; padding-bottom: 80px;">`;

    if (hasUnread) {
        contentHtml += `
        <div style="display:flex; justify-content:flex-end; margin-bottom:4px;">
            <button onclick="markAllAsRead()" style="background:none; border:none; color:#6c8ca3; font-size:0.9rem; cursor:pointer; font-weight:bold; font-family:inherit;">すべて既読にする</button>
        </div>`;
    }

    ADMIN_MESSAGES.forEach(msg => {
        const isRead = readIds.includes(msg.id);
        const badge = isRead ? '' : `<div style="width:8px; height:8px; background:#ffca28; border-radius:50%; flex-shrink:0; margin-top:6px;"></div>`;
        const titleWeight = isRead ? 'normal' : 'bold';
        const titleColor = isRead ? '#666' : '#333';

        contentHtml += `
        <div onclick="window.toggleMessageDetail('${msg.id}')" style="background:#f4f7f6; border-radius:12px; padding:16px; cursor:pointer; transition:background 0.2s;">
            <div style="display:flex; gap:12px; align-items:flex-start;">
                ${badge}
                <div style="flex:1;">
                    <div style="font-size:0.8rem; color:#aaa; margin-bottom:4px;">${escapeHTML(msg.date)}</div>
                    <div style="font-size:1rem; color:${titleColor}; font-weight:${titleWeight}; line-height:1.4;">${escapeHTML(msg.title)}</div>
                    <div id="msg-detail-${msg.id}" style="display:none; margin-top:12px; font-size:0.9rem; color:#555; line-height:1.7; white-space:pre-wrap; border-top:1px dashed #ddd; padding-top:12px;">${escapeHTML(msg.content)}</div>
                </div>
            </div>
        </div>`;
    });

    contentHtml += `</div></div>`;
    
    // スクロールしても固定されるお知らせ（戻る）ボタン
    const mailSvg = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`;
    const unreadCount = getUnreadCount();
    const badgeHtml = unreadCount > 0 ? `<div style="position:absolute; top:12px; right:12px; width:12px; height:12px; background:#ffca28; border:2px solid #6c8ca3; border-radius:50%;"></div>` : '';

    let floatingBtnHtml = `
        <button id="admin-msg-btn" onclick="toggleAdminMessages()" title="設定に戻る"
            style="position:fixed; bottom:25px; left:25px; width:56px; height:56px; border-radius:50%; background:#6c8ca3; color:white; border:none; box-shadow:0 4px 12px rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10000;">
            ${mailSvg}
            ${badgeHtml}
        </button>
    `;
    
    panel.innerHTML = headerHtml + contentHtml + floatingBtnHtml;
    if(window.updateSettingsBadge) window.updateSettingsBadge();
}

window.toggleMessageDetail = function(id) {
    const detailEl = document.getElementById(`msg-detail-${id}`);
    if (detailEl) {
        if (detailEl.style.display === 'none') {
            detailEl.style.display = 'block';
            markAsRead(id);
            const badge = detailEl.parentElement.previousElementSibling;
            if (badge && badge.tagName.toLowerCase() === 'div' && badge.style.backgroundColor === 'rgb(255, 202, 40)') {
                badge.style.display = 'none';
            }
            detailEl.parentElement.querySelector('div:nth-child(2)').style.fontWeight = 'normal';
            detailEl.parentElement.querySelector('div:nth-child(2)').style.color = '#666';
            if(window.updateSettingsBadge) window.updateSettingsBadge();
        } else {
            detailEl.style.display = 'none';
        }
    }
};

async function deleteAccount() {
    const first = confirm("アカウントを削除しますか？\nすべてのデータも完全に削除されます。\nこの操作は取り消せません。");
    if (!first) return;
    const second = confirm("本当に削除しますか？\nこの操作は元に戻せません。");
    if (!second) return;

    showLoading('削除中...');
    try {
        const db = await initDB();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).clear();

        const res = await apiFetch({
            method: 'POST',
            body: JSON.stringify({ action: 'delete_account' })
        });
        if (res.ok) {
            alert("アカウントを削除しました。");
            await supabaseClient.auth.signOut();
            window.location.href = window.location.origin;
        } else {
            const d = await res.json().catch(() => ({}));
            alert("削除に失敗しました: " + (d.error || '不明なエラー'));
        }
    } catch(e) {
        alert("エラーが発生しました");
    } finally {
        hideLoading();
    }
}

async function deleteAllData() {
    if (confirm("すべてのデータを削除してもよろしいでしょうか。\nこの操作は取り消せません。")) {
        showLoading('削除中...');
        
        homePrefectures = [];
        memoriesData = [];
        selectedPref = null;
        currentPhotos = [];
        slideIndex = 0;

        closeSettings();
        if (panelOpen) closePanel();
        renderRightPanel();
        updateMapColors();
        updateCounter();

        try {
            const db = await initDB();
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).clear();

            await apiFetch({ method: 'POST', body: JSON.stringify({ action: "delete_all" }) });
            
            hideLoading();
            setTimeout(() => alert("すべてのデータを完全に削除しました。"), 100);
        } catch(e) {
            console.error("全削除エラー", e);
            hideLoading();
            alert("通信エラーが発生しました。");
        }
    }
}

function renderAccountSettings() {
    const panel = document.getElementById('settings-panel');
    panel.style.backgroundColor = '#ffffff';

    let headerHtml = `
    <div class="panel-header">
        <div class="panel-header-title-row">
            <button onclick="renderSettingsMenu()" style="background:none; border:none; font-size:24px; color:#6c8ca3; cursor:pointer; padding:0; font-weight:bold; line-height:1; position:relative; z-index:2;">←</button>
            <h2 style="margin: 0; font-size: 1.6rem; color: #333; position:absolute; left:50%; transform:translateX(-50%);">アカウント</h2>
            <button class="panel-close-btn" onclick="closeSettings()" style="position:relative; right:0; z-index:2;">✕</button>
        </div>
    </div>`;

    const email = currentUser ? escapeHTML(currentUser.email) : '';
    const btnStyle = 'text-align:center; padding:20px; background:#f4f7f6; border:none; border-radius:12px; font-size:1.2rem; color:#444; cursor:pointer; font-weight:bold; font-family:inherit; transition:background 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05); width:100%;';
    const dangerBtnStyle = 'text-align:center; padding:20px; background:#f4f7f6; border:none; border-radius:12px; font-size:1.2rem; color:#d32f2f; cursor:pointer; font-weight:bold; font-family:inherit; transition:background 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05); width:100%;';

    let contentHtml = `
    <div class="panel-content">
        <div style="display:flex; flex-direction:column; gap:15px; margin-top:20px;">
            <div style="background:#f4f7f6; border-radius:12px; padding:16px 20px; font-size:0.95rem; color:#666;">
                <span style="font-size:0.8rem; color:#aaa; display:block; margin-bottom:4px;">ログイン中のアカウント</span>
                <span style="font-weight:bold; color:#444;">${email}</span>
            </div>

            <button onclick="renderDataSettings()" style="${btnStyle}">
                データの引き継ぎ
            </button>

            <button onclick="closeSettings(); localStorage.removeItem('tutorialDone'); showInstallSlides();" style="${btnStyle}">
                チュートリアル
            </button>

            <button onclick="renderChangePassword()" style="${btnStyle}">
                パスワードを変更
            </button>

            <button onclick="renderPrivacyPolicy()" style="${btnStyle}">
                プライバシーポリシー
            </button>

            <button onclick="deleteAccount()" style="${dangerBtnStyle}">
                アカウントを削除
            </button>

            <button onclick="logout()" style="${btnStyle.replace('#444', '#777')}">
                ログアウト
            </button>

            <p style="text-align:center; color:#ccc; font-size:0.8rem; margin:8px 0 0 0;">version_2.2.0</p>
        </div>
    </div>`;

    panel.innerHTML = headerHtml + contentHtml;
}

function renderPrivacyPolicy() {
    showAuthPrivacyPopup();
}

function renderChangePassword() {
    const panel = document.getElementById('settings-panel');
    panel.style.backgroundColor = '#ffffff';

    const backBtn = isPasswordRecoveryMode
        ? ''
        : `<button onclick="renderAccountSettings()" style="background:none; border:none; font-size:24px; color:#6c8ca3; cursor:pointer; padding:0; font-weight:bold; line-height:1; position:relative; z-index:2;">←</button>`;
    const closeBtn = isPasswordRecoveryMode
        ? '<div style="width:44px;"></div>'
        : `<button class="panel-close-btn" onclick="closeSettings()" style="position:relative; right:0; z-index:2;">✕</button>`;
    const notice = isPasswordRecoveryMode
        ? `<div style="background:#eef2f5; border-radius:10px; padding:14px 16px; font-size:0.9rem; color:#555; text-align:center; line-height:1.6;">
               パスワードをリセットしてください。<br>設定後にアプリをご利用いただけます。
           </div>`
        : '';

    let headerHtml = `
    <div class="panel-header">
        <div class="panel-header-title-row">
            ${backBtn}
            <h2 style="margin: 0; font-size: 1.1rem; color: #333; position:absolute; left:50%; transform:translateX(-50%); white-space:nowrap;">パスワード変更</h2>
            ${closeBtn}
        </div>
    </div>`;

    let contentHtml = `
    <div class="panel-content">
        <div style="display:flex; flex-direction:column; gap:14px; margin-top:20px;">
            ${notice}
            <input type="password" id="pw-new" placeholder="新しいパスワード（6文字以上）"
                style="padding:13px 15px; border:1px solid #ddd; border-radius:10px; font-size:1rem; font-family:inherit; background:#fafafa; color:#333; box-sizing:border-box; width:100%;">
            <input type="password" id="pw-confirm" placeholder="新しいパスワード（確認）"
                style="padding:13px 15px; border:1px solid #ddd; border-radius:10px; font-size:1rem; font-family:inherit; background:#fafafa; color:#333; box-sizing:border-box; width:100%;">
            <div id="pw-error" style="color:#d32f2f; font-size:0.9rem; text-align:center; min-height:18px;"></div>
            <div id="pw-success" style="color:#2e7d32; font-size:0.9rem; text-align:center; min-height:18px;"></div>
            <button onclick="doChangePassword()"
                style="padding:16px; background:#eef2f5; color:#444; border:none; border-radius:12px; font-size:1.1rem; font-weight:bold; font-family:inherit; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                変更する
            </button>
        </div>
    </div>`;

    panel.innerHTML = headerHtml + contentHtml;
}

async function doChangePassword() {
    const newPw = document.getElementById('pw-new').value;
    const confirmPw = document.getElementById('pw-confirm').value;
    const errorEl = document.getElementById('pw-error');
    const successEl = document.getElementById('pw-success');

    errorEl.textContent = '';
    successEl.textContent = '';

    if (!newPw || !confirmPw) {
        errorEl.textContent = 'パスワードを入力してください';
        return;
    }
    if (newPw.length < 6) {
        errorEl.textContent = 'パスワードは6文字以上にしてください';
        return;
    }
    if (newPw !== confirmPw) {
        errorEl.textContent = 'パスワードが一致しません';
        return;
    }

    const btn = document.querySelector('#settings-panel button[onclick="doChangePassword()"]');
    if (btn) { btn.disabled = true; btn.textContent = '変更中...'; }
    showLoading('変更中...');

    try {
        const { error } = await supabaseClient.auth.updateUser({ password: newPw });

        if (error) {
            errorEl.textContent = 'エラーが発生しました: ' + error.message;
            if (btn) { btn.disabled = false; btn.textContent = '変更する'; }
        } else {
            successEl.textContent = 'パスワードを変更しました！';
            document.getElementById('pw-new').value = '';
            document.getElementById('pw-confirm').value = '';
            if (btn) { btn.disabled = false; btn.textContent = '変更する'; }
            if (isPasswordRecoveryMode) {
                isPasswordRecoveryMode = false;
                setTimeout(() => { window.location.href = window.location.origin; }, 1200);
            } else {
                setTimeout(() => renderAccountSettings(), 1500);
            }
        }
    } catch(e) {
        errorEl.textContent = 'エラーが発生しました';
        if (btn) { btn.disabled = false; btn.textContent = '変更する'; }
    } finally {
        hideLoading();
    }
}

function renderShareSettings() {
    const panel = document.getElementById('settings-panel');
    panel.style.backgroundColor = '#ffffff';

    panel.innerHTML = `
    <div class="panel-header">
        <div class="panel-header-title-row">
            <button onclick="renderSettingsMenu()" style="background:none; border:none; font-size:24px; color:#6c8ca3; cursor:pointer; padding:0; font-weight:bold; line-height:1; position:relative; z-index:2;">←</button>
            <h2 style="margin:0; font-size:1.25rem; color:#333; position:absolute; left:50%; transform:translateX(-50%); white-space:nowrap;">あしあとを共有</h2>
            <button class="panel-close-btn" onclick="closeSettings()" style="position:relative; right:0; z-index:2;">✕</button>
        </div>
    </div>
    <div class="panel-content">
        <div style="display:flex; flex-direction:column; gap:16px; margin-top:24px;">
            <p style="color:#666; font-size:0.92rem; line-height:1.7; margin:0;">
                設定を選んでURLを生成し、あしあとを共有しよう。
            </p>
            
            <div style="background:#f4f7f6; border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:12px;">
                <label style="font-size:0.95rem; font-weight:bold; color:#444;">閲覧時間</label>
                <select id="share-expires" style="padding:10px; border-radius:8px; border:1px solid #ccc; font-size:1rem; font-family:inherit;">
                    <option value="3600">1時間</option>
                    <option value="86400">24時間</option>
                    <option value="-1">制限なし</option>
                </select>

                <label style="font-size:0.95rem; font-weight:bold; color:#444; margin-top:8px;">共有する内容</label>
                <label style="display:flex; align-items:center; gap:10px; font-size:0.95rem; color:#555; cursor:pointer;">
                    <input type="checkbox" id="share-show-thumb" checked style="width:18px; height:18px; accent-color:#6c8ca3; cursor:pointer;">
                    サムネイル
                </label>
                <label style="display:flex; align-items:center; gap:10px; font-size:0.95rem; color:#555; cursor:pointer;">
                    <input type="checkbox" id="share-show-date" checked style="width:18px; height:18px; accent-color:#6c8ca3; cursor:pointer;">
                    日付
                </label>
                
                <button onclick="generateShareLink()" style="margin-top:10px; padding:12px; background:#6c8ca3; color:white; border:none; border-radius:8px; font-size:1rem; font-weight:bold; cursor:pointer;">URLを生成</button>
            </div>

            <div id="share-url-display" style="background:#f4f7f6; border-radius:12px; padding:14px 16px; word-break:break-all; font-size:0.82rem; color:#aaa; line-height:1.6;">
                URL未生成
            </div>
            <button id="share-copy-btn" onclick="copyShareUrl(window._currentShareUrl)"
                style="padding:16px; background:#eee; color:#aaa; border:none; border-radius:12px; font-size:1.05rem; font-weight:bold; font-family:inherit; cursor:not-allowed; box-shadow:0 2px 8px rgba(0,0,0,0.05);" disabled>
                URLをコピー
            </button>
            <div id="share-copy-msg" style="text-align:center; color:#5a8a6a; font-size:0.9rem; min-height:20px;"></div>
        </div>
    </div>`;
}

window.generateShareLink = function() {
    const expires_in = parseInt(document.getElementById('share-expires').value);
    const show_thumb = document.getElementById('share-show-thumb').checked;
    const show_date = document.getElementById('share-show-date').checked;
    
    const display = document.getElementById('share-url-display');
    const btn = document.getElementById('share-copy-btn');
    display.textContent = 'URLを生成中...';
    btn.disabled = true;
    btn.style.background = '#eee'; btn.style.color = '#aaa'; btn.style.cursor = 'not-allowed';

    apiFetch({ 
        method: 'POST', 
        body: JSON.stringify({ 
            action: 'generate_share_link',
            expires_in: expires_in,
            show_thumb: show_thumb,
            show_date: show_date
        }) 
    })
    .then(res => res.json())
    .then(data => {
        const token = data.token;
        const shareUrl = `${location.origin}${location.pathname}?share=${token}`;
        window._currentShareUrl = shareUrl;
        display.textContent = shareUrl; 
        display.style.color = '#555';
        btn.disabled = false; btn.style.background = '#f4f7f6'; btn.style.color = '#444'; btn.style.cursor = 'pointer';
    })
    .catch(() => {
        display.textContent = 'URL生成に失敗しました。再度お試しください。';
    });
}

function copyShareUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        const msg = document.getElementById('share-copy-msg');
        if (msg) { msg.textContent = 'コピーしました！'; setTimeout(() => { if(msg) msg.textContent = ''; }, 2000); }
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        const msg = document.getElementById('share-copy-msg');
        if (msg) { msg.textContent = 'コピーしました！'; setTimeout(() => { if(msg) msg.textContent = ''; }, 2000); }
    });
}

function renderGroupSettings() {
    const panel = document.getElementById('settings-panel');
    panel.style.backgroundColor = '#ffffff';
    panel.innerHTML = `
    <div class="panel-header">
        <div class="panel-header-title-row">
            <button onclick="renderSettingsMenu()" style="background:none; border:none; font-size:24px; color:#6c8ca3; cursor:pointer; padding:0; font-weight:bold; line-height:1; position:relative; z-index:2;">←</button>
            <h2 style="margin:0; font-size:1.4rem; color:#333; position:absolute; left:50%; transform:translateX(-50%); white-space:nowrap;">お互いの記録が1つの地図に</h2>
            <button class="panel-close-btn" onclick="closeSettings()" style="position:relative; right:0; z-index:2;">✕</button>
        </div>
    </div>
    <div class="panel-content">
        <p style="color:#aaa; text-align:center; margin-top:40px; font-size:0.95rem; line-height:1.8;">準備中です。<br>もう少しお待ちください。</p>
    </div>`;
}

function renderFeatureThemeSettings() {
    const panel = document.getElementById('settings-panel');
    panel.style.backgroundColor = '#ffffff';

    const headerHtml = '<div class="panel-header"><div class="panel-header-title-row">' +
        '<button onclick="renderSettingsMenu()" style="background:none; border:none; font-size:24px; color:#6c8ca3; cursor:pointer; padding:0; font-weight:bold; line-height:1; position:relative; z-index:2;">←</button>' +
        '<h2 style="margin:0; font-size:1.3rem; color:#333; position:absolute; left:50%; transform:translateX(-50%); white-space:nowrap;">機能・テーマの変更</h2>' +
        '<button class="panel-close-btn" onclick="closeSettings()" style="position:relative; right:0; z-index:2;">✕</button>' +
        '</div></div>';

    const knobOn  = 'position:absolute; top:3px; right:3px; width:22px; height:22px; border-radius:50%; background:white; transition:all 0.2s;';
    const knobOff = 'position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:white; transition:all 0.2s;';
    const btnBase = 'display:flex; align-items:center; justify-content:space-between; padding:18px 20px; background:#f4f7f6; border:none; border-radius:12px; font-size:1.1rem; font-weight:bold; color:#444; cursor:pointer; font-family:inherit; width:100%; box-sizing:border-box;';

    function makeToggle(label, isOn, onToggle) {
        return '<button onclick="' + onToggle + '" style="' + btnBase + '">' +
            '<span>' + label + '</span>' +
            '<span style="position:relative; width:52px; height:28px; border-radius:14px; background:' + (isOn ? '#6c8ca3' : '#ccc') + '; display:inline-block; transition:background 0.2s; flex-shrink:0;">' +
            '<span style="' + (isOn ? knobOn : knobOff) + '"></span>' +
            '</span></button>';
    }

    const themeBtns = Object.entries(MAP_THEMES).map(function(entry) {
        const key = entry[0]; const t = entry[1];
        const isActive = key === currentTheme;
        const swatches = t.preview.map(function(c) {
            return '<span style="width:18px; height:18px; border-radius:3px; background:' + c + '; display:inline-block;"></span>';
        }).join('');
        return '<button onclick="applyTheme(\'' + key + '\'); renderFeatureThemeSettings();" ' +
            'style="display:flex; align-items:center; gap:14px; padding:14px 18px; background:' + (isActive ? '#eef2f5' : '#f9f9f9') + '; border:2px solid ' + (isActive ? '#6c8ca3' : '#eee') + '; border-radius:12px; cursor:pointer; font-family:inherit; width:100%; box-sizing:border-box;">' +
            '<div style="display:flex; gap:3px; flex-shrink:0;">' + swatches + '</div>' +
            '<span style="font-size:1.05rem; font-weight:bold; color:#444;">' + t.name + '</span>' +
            (isActive ? '<span style="margin-left:auto; color:#6c8ca3; font-size:1.2rem;">✓</span>' : '') +
            '</button>';
    }).join('');

    const contentHtml =
        '<div class="panel-content">' +
        '<p style="font-size:0.85rem; color:#aaa; margin:20px 0 8px 4px;">機能</p>' +
        '<div style="display:flex; flex-direction:column; gap:12px;">' +
        makeToggle('期間', featureShowDate, "featureShowDate=!featureShowDate; localStorage.setItem('featureShowDate', featureShowDate); renderRightPanel(); renderFeatureThemeSettings();") +
        makeToggle('メモ', featureShowMemo, "featureShowMemo=!featureShowMemo; localStorage.setItem('featureShowMemo', featureShowMemo); renderRightPanel(); renderFeatureThemeSettings();") +
        makeToggle('サムネイル', featureShowThumbnail, "featureShowThumbnail=!featureShowThumbnail; localStorage.setItem('featureShowThumbnail', featureShowThumbnail); renderRightPanel(); renderFeatureThemeSettings();") +
        '</div>' +
        '<p style="font-size:0.85rem; color:#aaa; margin:20px 0 8px 4px;">地図テーマ</p>' +
        '<div style="display:flex; flex-direction:column; gap:12px;">' + themeBtns + '</div>' +
        '</div>';

    panel.innerHTML = headerHtml + contentHtml;
}

function renderContactSettings() {
    const panel = document.getElementById('settings-panel');
    panel.style.backgroundColor = '#ffffff';

    const inputStyle = 'width:100%; padding:12px 14px; border:1px solid #ddd; border-radius:10px; font-size:0.95rem; font-family:inherit; background:#fafafa; color:#333; box-sizing:border-box;';

    let headerHtml = `
    <div class="panel-header">
        <div class="panel-header-title-row">
            <button onclick="renderSettingsMenu()" style="background:none; border:none; font-size:24px; color:#6c8ca3; cursor:pointer; padding:0; font-weight:bold; line-height:1; position:relative; z-index:2;">←</button>
            <h2 style="margin:0; font-size:1.6rem; color:#333; position:absolute; left:50%; transform:translateX(-50%);">お問い合わせ</h2>
            <button class="panel-close-btn" onclick="closeSettings()" style="position:relative; right:0; z-index:2;">✕</button>
        </div>
    </div>`;

    let contentHtml = `
    <div class="panel-content">
        <div style="display:flex; flex-direction:column; gap:14px; margin-top:20px;">
            <p style="color:#888; font-size:0.9rem; line-height:1.7; margin:0;">
                ご意見・ご要望・不具合はお気軽にどうぞ。
            </p>

            <div>
                <label style="font-size:0.85rem; color:#888; display:block; margin-bottom:6px;">お問い合わせ内容</label>
                <textarea id="contact-body" placeholder="お気軽にご記入ください" rows="5"
                    oninput="updateContactBtn()" onchange="updateContactBtn()"
                    style="${inputStyle} resize:none;"></textarea>
            </div>

            <div style="background:#f4f7f6; border-radius:10px; padding:14px 16px;">
                <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:0.95rem; color:#444;">
                    <input type="checkbox" id="contact-reply" style="width:18px; height:18px; cursor:pointer; accent-color:#6c8ca3;">
                    返信を希望する
                </label>
                <div id="contact-email-wrap" style="display:none; margin-top:10px;">
                    <input type="email" id="contact-email" placeholder="返信先メールアドレス"
                        style="${inputStyle}">
                </div>
            </div>

            <div id="contact-error" style="color:#d32f2f; font-size:0.88rem; text-align:center; min-height:16px;"></div>
            <div id="contact-success" style="color:#2e7d32; font-size:0.88rem; text-align:center; min-height:16px;"></div>

            <button id="contact-send-btn" onclick="submitContact()" disabled
                style="padding:16px; background:#eef2f5; color:#aaa; border:none; border-radius:12px; font-size:1.1rem; font-weight:bold; font-family:inherit; cursor:not-allowed; box-shadow:0 2px 8px rgba(0,0,0,0.05); transition:color 0.2s;">
                送信する
            </button>
        </div>
    </div>`;

    panel.innerHTML = headerHtml + contentHtml;

    document.getElementById('contact-reply').addEventListener('click', function() {
        document.getElementById('contact-email-wrap').style.display = this.checked ? 'block' : 'none';
        if (this.checked) {
            const emailEl = document.getElementById('contact-email');
            if (emailEl && !emailEl.value && currentUser && currentUser.email) {
                emailEl.value = currentUser.email;
            }
        }
        updateContactBtn();
    });

    const emailEl = document.getElementById('contact-email');
    if (emailEl) {
        emailEl.addEventListener('input', updateContactBtn);
        emailEl.addEventListener('change', updateContactBtn);
    }
}

function updateContactBtn() {
    const body = document.getElementById('contact-body')?.value.trim() || '';
    const wantReply = document.getElementById('contact-reply')?.checked;
    const email = document.getElementById('contact-email')?.value.trim() || '';
    const valid = body !== '' && (!wantReply || email !== '');
    const btn = document.getElementById('contact-send-btn');
    if (!btn) return;
    btn.disabled = !valid;
    btn.style.background = valid ? '#6c8ca3' : '#eef2f5';
    btn.style.color = valid ? 'white' : '#aaa';
    btn.style.cursor = valid ? 'pointer' : 'not-allowed';
}

async function submitContact() {
    const name    = (document.getElementById('contact-name')?.value || '').trim();
    const body    = (document.getElementById('contact-body')?.value || '').trim();
    const wantReply = document.getElementById('contact-reply')?.checked;
    const email   = (document.getElementById('contact-email')?.value || '').trim();
    const errorEl   = document.getElementById('contact-error');
    const successEl = document.getElementById('contact-success');
    const btn = document.querySelector('#settings-panel button[onclick="submitContact()"]');

    errorEl.textContent = '';
    successEl.textContent = '';

    if (!body) {
        errorEl.textContent = 'お問い合わせ内容を入力してください';
        return;
    }
    if (wantReply && !email) {
        errorEl.textContent = '返信を希望する場合はメールアドレスを入力してください';
        return;
    }
    if (wantReply && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorEl.textContent = '正しいメールアドレスを入力してください';
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '送信中...'; }
    showLoading('送信中...');

    try {
        const res = await apiFetch({
            method: 'POST',
            body: JSON.stringify({
                action: 'send_contact',
                name,
                body,
                want_reply: wantReply,
                reply_email: email
            })
        });

        if (res.ok) {
            successEl.textContent = 'お問い合わせありがとうございます。';
            const nameEl = document.getElementById('contact-name');
            if (nameEl) nameEl.value = '';
            document.getElementById('contact-body').value = '';
            document.getElementById('contact-reply').checked = false;
            document.getElementById('contact-email-wrap').style.display = 'none';
            if (document.getElementById('contact-email')) document.getElementById('contact-email').value = '';
        } else {
            const d = await res.json().catch(() => ({}));
            errorEl.textContent = d.error || '送信に失敗しました。もう一度お試しください。';
        }
    } catch(e) {
        errorEl.textContent = '通信エラーが発生しました';
    } finally {
        hideLoading();
        if (btn) { btn.disabled = false; btn.textContent = '送信する'; }
    }
}

function renderHomeSettings() {
    const panel = document.getElementById('settings-panel');
    const prefOrder = Object.keys(MAP_THEMES.default.colors);
    let options = prefOrder.map(p => `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`).join('');

    let headerHtml = `
    <div class="panel-header">
        <div class="panel-header-title-row">
            <button onclick="renderSettingsMenu()" style="background:none; border:none; font-size:24px; color:#6c8ca3; cursor:pointer; padding:0; font-weight:bold; line-height:1; position:relative; z-index:2;">←</button>
            <h2 style="margin: 0; font-size: 1.6rem; color: #333; position:absolute; left:50%; transform:translateX(-50%);">家を登録</h2>
            <button class="panel-close-btn" onclick="closeSettings()" style="position:relative; right:0; z-index:2;">✕</button>
        </div>
    </div>`;

    let contentHtml = `
    <div class="panel-content">
        <div style="margin-top: 20px; text-align: left;">
            <div style="display:flex; gap: 8px; margin-bottom: 20px;">
                <select id="home-select" style="flex:1; padding: 12px; border: 1px solid #ccc; border-radius: 8px; font-family:inherit; font-size:15px; background:white;">
                    ${options}
                </select>
                <button onclick="addHomePrefecture()" style="background:#eef2f5; color:#444; border:none; padding:12px 20px; border-radius:10px; font-size:15px; cursor:pointer; font-family:inherit; font-weight:bold; box-shadow:0 2px 8px rgba(0,0,0,0.05);">追加</button>
            </div>
            <div id="home-list" style="display:flex; flex-direction:column; gap:8px;"></div>
        </div>
    </div>`;
    
    panel.innerHTML = headerHtml + contentHtml;
    renderHomeList();
}

function addHomePrefecture() {
    const select = document.getElementById('home-select');
    const pref = select.value;
    if (!homePrefectures.includes(pref)) {
        homePrefectures.push(pref);
        saveHomePrefectures();
        renderHomeList();
        updateMapColors();
        updateCounter();
    }
}

function removeHomePrefecture(pref) {
    homePrefectures = homePrefectures.filter(p => p !== pref);
    saveHomePrefectures();
    renderHomeList();
    updateMapColors();
    updateCounter();
}

function saveHomePrefectures() {
    apiFetch({
        method: 'POST',
        body: JSON.stringify({ action: "save_home", home_prefectures: homePrefectures })
    }).catch(e => console.error("home save error", e));
}

function renderHomeList() {
    const list = document.getElementById('home-list');
    if (!list) return;
    if (homePrefectures.length === 0) {
        list.innerHTML = `<span style="color:#aaa; font-size:14px;">登録されていません</span>`;
        return;
    }
    
    const prefOrder = Object.keys(MAP_THEMES.default.colors);
    const sortedHomes = [...homePrefectures].sort((a, b) => prefOrder.indexOf(a) - prefOrder.indexOf(b));

    list.innerHTML = sortedHomes.map(pref => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f4f7f6; padding:12px 15px; border-radius:8px;">
            <span style="font-weight:bold; color:#444; font-size:1.1rem;">${escapeHTML(pref)}</span>
            <button onclick="removeHomePrefecture('${escapeHTML(pref)}')" style="background:rgba(0,0,0,0.1); border:none; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#555; cursor:pointer; font-size:14px;">✕</button>
        </div>
    `).join('');
}

// データの引き継ぎ設定
function renderDataSettings() {
    const panel = document.getElementById('settings-panel');
    panel.style.backgroundColor = '#ffffff';

    let headerHtml = `
    <div class="panel-header">
        <div class="panel-header-title-row">
            <button onclick="renderAccountSettings()" style="background:none; border:none; font-size:24px; color:#6c8ca3; cursor:pointer; padding:0; font-weight:bold; line-height:1; position:relative; z-index:2;">←</button>
            <h2 style="margin: 0; font-size: 1.3rem; color: #333; position:absolute; left:50%; transform:translateX(-50%); white-space:nowrap;">データの引き継ぎ</h2>
            <button class="panel-close-btn" onclick="closeSettings()" style="position:relative; right:0; z-index:2;">✕</button>
        </div>
    </div>`;

    const btnStyle = 'text-align:center; padding:20px; background:#f4f7f6; border:none; border-radius:12px; font-size:1.1rem; color:#444; cursor:pointer; font-weight:bold; font-family:inherit; transition:background 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05); width:100%; box-sizing:border-box;';

    let contentHtml = `
    <div class="panel-content">
        <div style="display:flex; flex-direction:column; gap:15px; margin-top:20px;">
            <p style="color:#666; font-size:0.92rem; line-height:1.7; margin:0;">
                記録と写真をファイルに保存したり、別の端末に引き継ぐことができます。
            </p>
            <button onclick="exportData()" style="${btnStyle}">データをエクスポート</button>
            
            <label style="${btnStyle}; display:block; cursor:pointer;">
                データをインポート
                <input type="file" id="import-file" accept=".json" style="display:none;" onchange="importData(event)">
            </label>
        </div>
    </div>`;
    panel.innerHTML = headerHtml + contentHtml;
}

async function exportData() {
    showLoading('エクスポートの準備中...');
    try {
        const idbPhotos = await getAllPhotosFromIDB();
        const exportObj = {
            version: "2.2.0",
            memories: memoriesData,
            photos: idbPhotos
        };
        const blob = new Blob([JSON.stringify(exportObj)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ashiato_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert("エクスポートが完了しました。");
    } catch(e) {
        console.error(e);
        alert("エクスポートに失敗しました。");
    } finally {
        hideLoading();
    }
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm("データをインポートします。現在のデータに上書き・追加されますがよろしいですか？")) {
        event.target.value = '';
        return;
    }
    
    showLoading('インポート中...');
    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.photos && data.photos.length > 0) {
                    const db = await initDB();
                    const tx = db.transaction(IDB_STORE, 'readwrite');
                    data.photos.forEach(p => tx.objectStore(IDB_STORE).put(p));
                    await new Promise((res, rej) => {
                        tx.oncomplete = res;
                        tx.onerror = rej;
                    });
                }
                
                if (data.memories && data.memories.length > 0) {
                    for (const m of data.memories) {
                        const payload = {
                            action: "save_memory",
                            prefecture: m.prefecture,
                            date: m.date || '',
                            existing_urls: JSON.parse(m.photo_urls || "[]"),
                            memo: m.memo || ''
                        };
                        await apiFetch({ method: 'POST', body: JSON.stringify(payload) });
                        if (m.is_home && !homePrefectures.includes(m.prefecture)) {
                            homePrefectures.push(m.prefecture);
                        }
                    }
                    if(homePrefectures.length > 0){
                        await apiFetch({ method: 'POST', body: JSON.stringify({ action: "save_home", home_prefectures: homePrefectures }) });
                    }
                }
                
                await fetchMemories(false);
                renderRightPanel();
                alert("インポートが完了しました。");
            } catch (err) {
                console.error(err);
                alert("ファイルの読み込みまたは保存に失敗しました。");
            } finally {
                hideLoading();
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    } catch (err) {
        hideLoading();
        alert("エラーが発生しました。");
    }
}

function updateUIVisibility() {
    const counter = document.getElementById('pref-counter');
    const menuBtn = document.getElementById('menu-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const adminIcon = document.getElementById('admin-icon');

    if (panelOpen || settingsOpen) {
        counter.classList.add('hidden-ui');
        if (adminIcon) adminIcon.style.display = 'none';
    } else {
        counter.classList.remove('hidden-ui');
        if (adminIcon) adminIcon.style.display = 'block';
    }

    if (panelOpen && selectedPref !== null) {
        menuBtn.classList.add('hidden-ui');
        if (settingsBtn) settingsBtn.classList.add('hidden-ui');
    } else if (panelOpen && selectedPref === null) {
        menuBtn.classList.remove('hidden-ui');
        if (settingsBtn) settingsBtn.classList.add('hidden-ui');
    } else if (settingsOpen) {
        menuBtn.classList.add('hidden-ui');
        if (settingsBtn) settingsBtn.classList.remove('hidden-ui');
    } else {
        menuBtn.classList.remove('hidden-ui');
        if (settingsBtn) settingsBtn.classList.remove('hidden-ui');
    }
}

function updateCounter() {
    // 都道府県単位でvisited判定（複数エントリがあっても1カウント）
    const visitedPrefs = new Set();
    memoriesData.forEach(m => {
        if (homePrefectures.includes(m.prefecture)) return;
        const photos = JSON.parse(m.photo_urls || "[]");
        if (photos.length > 0) visitedPrefs.add(m.prefecture);
    });
    const totalVisited = visitedPrefs.size + homePrefectures.length;
    document.getElementById('pref-counter').innerText = `${totalVisited} / 47`;

    const hasWarning = memoriesData.some(m => {
        if (homePrefectures.includes(m.prefecture)) return false;
        const photos = JSON.parse(m.photo_urls || "[]");
        return photos.length > 0 && !m.date;
    });
    const menuBtn = document.getElementById('menu-btn');
    if (hasWarning) {
        menuBtn.classList.add('warning');
    } else {
        menuBtn.classList.remove('warning');
    }
}

function toSlashDate(val) { return val ? val.replace(/-/g, '/') : ''; }
function toDashDate(val) { return val ? val.replace(/\//g, '-') : ''; }
function getDateFrom(dateStr) { return toDashDate((dateStr?.split('~')[0] || '').trim()); }
function getDateTo(dateStr) { return toDashDate((dateStr?.split('~')[1] || '').trim()); }
function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('~');
    const from = toSlashDate(parts[0].trim());
    const to = parts[1] ? toSlashDate(parts[1].trim()) : '';
    return to ? `${from} - ${to}` : from;
}

function renderRightPanel() {
    // パネル描画時に選択モードを確実にリセット
    cancelBulkSelect();
    const panel = document.getElementById('right-panel');
    const prefOrder = Object.keys(MAP_THEMES.default.colors);
    panel.style.backgroundColor = '#ffffff';

    if (!selectedPref) {
        let headerHtml = `
        <div class="panel-header">
            <div class="panel-header-title-row">
                <div style="flex:1;"></div>
                <h2 style="margin: 0; font-size: 1.6rem; color: #333; position:absolute; left:50%; transform:translateX(-50%);">一覧</h2>
                <button class="panel-close-btn" onclick="closePanel()" style="position:relative; right:0;">✕</button>
            </div>
        </div>`;

        let contentHtml = `<div class="panel-content" style="padding-top:20px;">`;

        const sortedHomes = [...homePrefectures].sort((a, b) => prefOrder.indexOf(a) - prefOrder.indexOf(b));
        sortedHomes.forEach(pref => {
            contentHtml += `<button class="pref-btn" onclick="setSelectedPref('${escapeHTML(pref)}'); renderRightPanel();"
                style="border-left: 6px solid ${getCurrentColors()[pref]}; background: #fffdf5;">
                <span style="font-weight:bold; color:#444;">${escapeHTML(pref)}</span>
            </button>`;
        });

        const activeMemories = memoriesData.filter(m => {
            if (homePrefectures.includes(m.prefecture)) return false;
            const photos = JSON.parse(m.photo_urls || "[]");
            return photos.length > 0;
        });

        if (activeMemories.length === 0 && homePrefectures.length === 0) {
            contentHtml += `<p style="color:#888; text-align:center; margin-top:40px;">地図から都道府県を選んで<br>思い出を追加しましょう</p>`;
        } else {
            // 都道府県ごとにエントリをグループ化
            const prefGroups = {};
            activeMemories.forEach(m => {
                if (!prefGroups[m.prefecture]) prefGroups[m.prefecture] = [];
                prefGroups[m.prefecture].push(m);
            });
            const sortedPrefs = Object.keys(prefGroups).sort((a, b) => prefOrder.indexOf(a) - prefOrder.indexOf(b));
            
            sortedPrefs.forEach(pref => {
                const entries = prefGroups[pref];
                const color = getCurrentColors()[pref] || '#aaa';
                const needsData = entries.some(m => {
                    const photos = JSON.parse(m.photo_urls || "[]");
                    return photos.length > 0 && !m.date;
                });
                // 最新エントリの日付を表示
                const latestEntry = entries[entries.length - 1];
                const entryCountLabel = entries.length > 1 ? `<span style="font-size:0.78em; background:${color}33; color:${color}; padding:2px 7px; border-radius:10px; margin-left:6px; font-weight:bold;">${entries.length}回</span>` : '';
                contentHtml += `<button class="pref-btn" onclick="setSelectedPref('${escapeHTML(pref)}'); setSelectedEntryId('null'); renderRightPanel();"
                    style="border-left: 6px solid ${color};">
                    <span style="display:flex; align-items:center; font-weight:bold; color:#444;">
                        ${escapeHTML(pref)}${entryCountLabel}${needsData ? '<span class="status-dot"></span>' : ''}
                    </span>
                    <span style="color:#999; font-size:0.85em;">${escapeHTML(formatDate(latestEntry.date))}</span>
                </button>`;
            });
        }
        contentHtml += `</div>`;
        panel.innerHTML = headerHtml + contentHtml;
        
    } else {
        const color = getCurrentColors()[selectedPref] || '#6c8ca3';
        
        let headerHtml = `
        <div class="panel-header" style="border-bottom: 3px solid ${color}; padding-bottom: 15px;">
            <div class="panel-header-title-row">
                <button onclick="backToList();" style="background:none; border:none; font-size:24px; color:#6c8ca3; cursor:pointer; padding:0; font-weight:bold; line-height:1; position:relative; z-index:2;">←</button>
                <h2 style="margin: 0; font-size: 1.8rem; color: #333; position:absolute; left:50%; transform:translateX(-50%); letter-spacing:2px;">${escapeHTML(selectedPref)}</h2>
                <button class="panel-close-btn" onclick="closePanel()" style="position:relative; right:0; z-index:2;">✕</button>
            </div>
        </div>`;

        if (homePrefectures.includes(selectedPref)) {
            let contentHtml = `
            <div class="panel-content">
                <div style="text-align:center; margin-top: 20px; padding: 20px; background: #fffdf5; border-radius: 10px;">
                    <h3 style="color: #444; margin: 10px 0;">家に登録されています</h3>
                    <p style="color: #777; font-size: 13px; line-height: 1.6;">家として設定されているため、<br>写真や日付の登録はできません。</p>
                </div>
            </div>`;
            panel.innerHTML = headerHtml + contentHtml;
            return;
        }

        // 選択中の都道府県のエントリを全取得（home以外）
        const allEntries = memoriesData.filter(m => m.prefecture === selectedPref && !m.is_home);

        // selectedEntryIdが未設定 or 存在しない場合は最後のエントリ（最新）を選択
        if (!selectedEntryId || !allEntries.find(m => m.id === selectedEntryId)) {
            selectedEntryId = allEntries.length > 0 ? allEntries[allEntries.length - 1].id : null;
        }

        const data = allEntries.find(m => m.id === selectedEntryId) || { date: '', photo_urls: '[]', memo: '' };
        let photos = [];
        try { photos = JSON.parse(data.photo_urls); } catch(e){}
        const hasWarning = photos.length > 0 && !data.date;
        // 写真・日付が両方揃っている場合のみ→ボタンを表示
        const canAddEntry = photos.length > 0 && !!data.date;
        // 複数タブがある場合、現在のインデックスを取得
        const currentIdx = allEntries.findIndex(m => m.id === selectedEntryId);
        const hasNextTab = allEntries.length > 1 && currentIdx < allEntries.length - 1;
        const nextEntryId = hasNextTab ? allEntries[currentIdx + 1].id : null;

        let contentHtml = `<div class="panel-content" style="padding-top:20px;">`;

        // 複数エントリがある場合：ナビゲーター表示
        if (!isShareMode && allEntries.length > 1) {
            const navItems = allEntries.map((m, i) => {
                const isActive = m.id === selectedEntryId;
                const escapedId = m.id.replace(/"/g, '&quot;');
                return `<button onclick="setSelectedEntryId('${escapedId}'); clearDateEditMode(); renderRightPanel();"
                    style="padding:5px 12px; border:none; border-radius:20px; font-size:0.8rem; font-family:inherit; cursor:pointer;
                    background:${isActive ? color : '#eee'}; color:${isActive ? 'white' : '#888'}; font-weight:${isActive ? 'bold' : 'normal'};">
                    ${m.date ? escapeHTML(formatDate(m.date)) : '日付未設定'}
                </button>`;
            }).join('');
            contentHtml += `<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; padding:10px 12px; background:#f8f9fa; border-radius:10px;">${navItems}</div>`;
        }
            
        if (!isShareMode) {
            if (hasWarning) {
                contentHtml += `<div class="warning-banner" style="margin-bottom: 15px;">${!data.date ? '日付を登録してください' : '写真を追加してください'}</div>`;
            }
            if (featureShowDate) {
                if (data.date && !dateEditingMode) {
                    contentHtml += `
                    <div id="date-locked-display" onclick="enterDateEditMode()" title="タップして変更"
                        style="display:flex; align-items:center; justify-content:space-between;
                               background:${color}55; border-radius:14px; padding:14px 18px;
                               border: 1.5px solid ${color}99;
                               cursor:pointer; box-shadow: 0 2px 10px ${color}33;
                               transition: transform 0.15s, box-shadow 0.15s, background 0.15s;"
                        onmouseover="this.style.transform='scale(1.01)'; this.style.background='${color}77'; this.style.boxShadow='0 4px 16px ${color}44';"
                        onmouseout="this.style.transform='scale(1)'; this.style.background='${color}55'; this.style.boxShadow='0 2px 10px ${color}33';">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="background:${color}66; border-radius:8px; padding:5px 6px; display:flex; align-items:center; justify-content:center;">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            </div>
                            <span style="font-size:15px; font-weight:700; color:rgba(0,0,0,0.58); letter-spacing:0.8px;">${escapeHTML(formatDate(data.date))}</span>
                        </div>
                        <div style="background:${color}44; border-radius:6px; padding:4px 8px; font-size:11px; font-weight:600; color:rgba(0,0,0,0.4); letter-spacing:0.5px;">変更</div>
                    </div>`;
                } else {
                    contentHtml += `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <input type="date" id="input-date-from" value="${escapeHTML(getDateFrom(data.date))}" style="flex:1; padding:10px; border-radius:6px; border:1px solid #ddd; font-size:14px; background:#fafafa; color:#555;">
                            <span style="color:#aaa;">-</span>
                            <input type="date" id="input-date-to" value="${escapeHTML(getDateTo(data.date))}" style="flex:1; padding:10px; border-radius:6px; border:1px solid #ddd; font-size:14px; background:#fafafa; color:#555;">
                        </div>
                        <button id="date-save-btn" onclick="saveDateManual()" style="width:100%; padding:10px; background:#ddd; color:#aaa; border:none; border-radius:8px; font-size:14px; font-weight:bold; font-family:inherit; cursor:not-allowed; transition: background 0.3s, transform 0.15s, box-shadow 0.3s;">保存</button>
                    </div>`;
                }
            }
            contentHtml += `<p id="autosave-status" style="color:#888; text-align:center; font-size:12px; min-height:18px; margin:8px 0 0 0;"></p>`;
            if (featureShowMemo) {
                contentHtml += `<textarea id="input-memo" placeholder="旅の思い出をメモ..." rows="4"
                    style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd; font-size:14px; font-family:inherit; background:#fafafa; color:#444; resize:none; box-sizing:border-box; margin-top:4px;">${escapeHTML(data.memo || '')}</textarea>`;
            }
        } else {
            if (data.date) {
                if (shareSettings.show_date) {
                    contentHtml += `<p style="text-align:center; color:#888; font-size:0.9rem; margin:8px 0;">${escapeHTML(formatDate(data.date))}</p>`;
                } else {
                    contentHtml += `<p style="text-align:center; color:#bbb; font-size:0.9rem; margin:8px 0;">（期間は非公開）</p>`;
                }
            }
            if (data.memo) {
                contentHtml += `<p style="padding:10px 14px; background:#fafafa; border-radius:8px; font-size:0.9rem; color:#555; line-height:1.7; white-space:pre-wrap; margin-top:8px;">${escapeHTML(data.memo)}</p>`;
            }
        }

        const getPhotoId = p => typeof p === 'string' ? p : p.id;
        const getThumbSrc = p => typeof p === 'string' ? p : p.thumb;

        if (photos.length > 0) {
            if (isShareMode && !shareSettings.show_thumb) {
                contentHtml += `<p style="text-align:center; color:#bbb; font-size:13px; margin-top:30px;">（写真は非公開に設定されています）</p>`;
            } else {
                const escapedPhotos = JSON.stringify(photos).replace(/"/g, '&quot;');

                if (!isShareMode) {
                    contentHtml += `
                    <div id="bulk-delete-bar" style="display:none; align-items:center; justify-content:space-between; background:#f0f4f8; border-radius:10px; padding:10px 14px; margin-top:10px;">
                        <span id="bulk-select-count" style="font-size:0.95rem; color:#444; font-weight:bold;">0枚選択中</span>
                        <div style="display:flex; gap:8px;">
                            <button onclick="cancelBulkSelect()" style="padding:6px 14px; border:none; border-radius:8px; background:#ddd; color:#666; font-family:inherit; font-size:0.85rem; cursor:pointer;">キャンセル</button>
                            <button id="select-all-btn" onclick="selectAllPhotos()" style="padding:6px 14px; border:none; border-radius:8px; background:#6c8ca3; color:white; font-family:inherit; font-size:0.85rem; font-weight:bold; cursor:pointer;">すべて選択</button>
                        </div>
                    </div>`;
                }

                if (featureShowThumbnail) {
                    const thumbObj = photos[0];
                    const thumbId = getPhotoId(thumbObj);
                    const thumbSrc = getThumbSrc(thumbObj);
                    const escapedThumbId = thumbId.replace(/'/g, "\'");
                    contentHtml += `
                    <div id="thumb-wrap" data-url="${escapedThumbId}" style="position:relative; margin-top:10px; border-radius:12px; overflow:hidden; cursor:pointer; box-shadow:0 2px 12px rgba(0,0,0,0.1);"
                        onclick="handlePhotoClick(event, '${escapedThumbId}', ${escapedPhotos})"
                        oncontextmenu="event.preventDefault();">
                        <img id="img-${escapedThumbId}" src="${thumbSrc}" style="width:100%; height:280px; object-fit:cover; display:block;" loading="lazy">
                        <div id="thumb-check" style="display:none; position:absolute; top:10px; left:10px; width:26px; height:26px; border-radius:50%; background:#d32f2f; border:2px solid white; align-items:center; justify-content:center; color:white; font-size:14px; font-weight:bold;">✓</div>
                    </div>`;

                    if (!isShareMode && typeof thumbObj !== 'string') {
                        setTimeout(async () => {
                            const highRes = await getPhotoFromIDB(thumbId);
                            if (highRes) {
                                const imgEl = document.getElementById(`img-${thumbId}`);
                                if (imgEl) imgEl.src = highRes;
                            }
                        }, 0);
                    }
                }

                const gridPhotos = featureShowThumbnail ? photos.slice(1) : photos;
                if (gridPhotos.length > 0) {
                    contentHtml += `<div class="photo-grid" style="margin-top:10px;">`;
                    gridPhotos.forEach((p) => {
                        const pid = getPhotoId(p);
                        const psrc = getThumbSrc(p);
                        const escapedId = pid.replace(/'/g, "\'");
                        contentHtml += `<div class="photo-grid-item" data-url="${escapedId}"
                            onclick="handlePhotoClick(event, '${escapedId}', ${escapedPhotos})"
                            oncontextmenu="event.preventDefault();">
                            <img id="img-${escapedId}" src="${psrc}" loading="lazy">
                            <div class="photo-check" style="display:none; position:absolute; top:6px; left:6px; width:22px; height:22px; border-radius:50%; background:#d32f2f; border:2px solid white; align-items:center; justify-content:center; color:white; font-size:12px; font-weight:bold;">✓</div>
                        </div>`;

                        if (!isShareMode && typeof p !== 'string') {
                            setTimeout(async () => {
                                const highRes = await getPhotoFromIDB(pid);
                                if (highRes) {
                                    const imgEl = document.getElementById(`img-${pid}`);
                                    if (imgEl) imgEl.src = highRes;
                                }
                            }, 0);
                        }
                    });
                    contentHtml += `</div>`;
                }
            }
        } else if (!isShareMode) {
            contentHtml += `
            <p style="text-align:center; color:#bbb; font-size:13px; margin-top:30px;">右下の「＋」ボタンから写真を追加できます</p>
            <div style="margin-top:24px; padding:16px; background:#f8f9fa; border-radius:12px; border:1px solid #eee;">
                <p style="font-size:11px; font-weight:bold; color:#bbb; margin:0 0 8px 0; letter-spacing:1px;">PR</p>
                <p style="font-size:13px; font-weight:bold; color:#888; margin:0 0 8px 0;">ホテルの予約をここから</p>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <a href="https://px.a8.net/svt/ejp?a8mat=4AZA43+8645MA+14CS+63WO2" rel="nofollow"
                        style="display:block; padding:10px 14px; background:white; border-radius:8px; border:1px solid #e0e0e0; font-size:12px; color:#6c8ca3; text-decoration:none; line-height:1.5;">
                        【じゃらん】有名温泉から穴場まで温泉旅館・ホテル5,000件以上が予約OK!
                    </a>
                    <img border="0" width="1" height="1" src="https://www11.a8.net/0.gif?a8mat=4AZA43+8645MA+14CS+63WO2" alt="">
                    <a href="https://rpx.a8.net/svt/ejp?a8mat=4AZA43+9PHGVM+2HOM+6KESY&rakuten=y&a8ejpredirect=http%3A%2F%2Fhb.afl.rakuten.co.jp%2Fhgc%2F0eb4779e.5d30c5ba.0eb4779f.b871e4e3%2Fa26030686430_4AZA43_9PHGVM_2HOM_6KESY%3Fpc%3Dhttp%253A%252F%252Ftravel.rakuten.co.jp%252F%26m%3Dhttp%253A%252F%252Ftravel.rakuten.co.jp%252F" rel="nofollow"
                        style="display:block; padding:10px 14px; background:white; border-radius:8px; border:1px solid #e0e0e0; font-size:12px; color:#bf0000; text-decoration:none; line-height:1.5;">
                        旅行なら楽天トラベル
                    </a>
                    <img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=4AZA43+9PHGVM+2HOM+6KESY" alt="">
                </div>
                <p style="font-size:13px; font-weight:bold; color:#888; margin:14px 0 8px 0;">飛行機予約はここから</p>
                <a href="https://px.a8.net/svt/ejp?a8mat=4AZAW2+DK7GTU+4XZI+5YJRM" rel="nofollow"
                    style="display:block; padding:10px 14px; background:white; border-radius:8px; border:1px solid #e0e0e0; font-size:12px; color:#1a73e8; text-decoration:none; line-height:1.5;">
                    国内格安航空券・LCCの比較・予約なら【トラベリスト】
                </a>
                <img border="0" width="1" height="1" src="https://www10.a8.net/0.gif?a8mat=4AZAW2+DK7GTU+4XZI+5YJRM" alt="">
            </div>`;
        }
        
        if (!isShareMode) {
            contentHtml += `
            <label id="add-photo-btn" for="input-photos" class="add-photo-fab" 
                onclick="if(bulkSelectMode && bulkSelectedUrls.size === 0) { event.preventDefault(); cancelBulkSelect(); }"
                style="background:${color}; display:flex;" title="写真を追加">
                <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </label>
            <button id="download-photo-btn" onclick="downloadSelectedPhotos()" title="選択した写真をダウンロード"
                style="display:none; position:absolute; bottom:25px; right:25px; width:56px; height:56px; border-radius:50%; background:${color}; border:none; box-shadow:0 4px 12px rgba(0,0,0,0.25); align-items:center; justify-content:center; cursor:pointer; z-index:1000;">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
            <button onclick="toggleSelectOrDelete()" id="select-mode-btn" title="写真を選択"
                style="position:absolute; bottom:90px; right:25px; width:56px; height:56px; border-radius:50%; background:${color}; border:none; box-shadow:0 4px 12px rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:1000;">
                <svg id="select-btn-icon" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            ${hasNextTab ? `
            <button onclick="setSelectedEntryId('${nextEntryId}'); clearDateEditMode(); renderRightPanel();" title="次の旅行記録へ"
                style="position:absolute; bottom:155px; right:25px; width:56px; height:56px; border-radius:50%; background:${color}; border:none; box-shadow:0 4px 12px rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:1000;">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
            </button>` : canAddEntry ? `
            <button onclick="addNewEntry()" title="新しい旅行記録を追加"
                style="position:absolute; bottom:155px; right:25px; width:56px; height:56px; border-radius:50%; background:${color}; border:none; box-shadow:0 4px 12px rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:1000;">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>
            </button>` : ''}
            <input type="file" id="input-photos" multiple accept="image/*" style="display:none;">`;
        }
        contentHtml += `</div>`;

        panel.innerHTML = headerHtml + contentHtml;

        if (!isShareMode) {
            const photoInput = document.getElementById('input-photos');
            if (photoInput) photoInput.addEventListener('change', triggerAutoSave);

            initPhotoDragSort();

            if (featureShowDate) {
                const fromInput = document.getElementById('input-date-from');
                const toInput = document.getElementById('input-date-to');
                const activateSaveBtn = () => {
                    const btn = document.getElementById('date-save-btn');
                    if (!btn) return;
                    const hasDate = (fromInput && fromInput.value) || (toInput && toInput.value);
                    if (hasDate) {
                        btn.style.background = '#6c8ca3';
                        btn.style.color = 'white';
                        btn.style.cursor = 'pointer';
                        btn.style.boxShadow = '0 4px 12px rgba(108,140,163,0.4)';
                        btn.style.animation = 'date-btn-pulse 1.2s ease-in-out infinite';
                    } else {
                        btn.style.background = '#ddd';
                        btn.style.color = '#aaa';
                        btn.style.cursor = 'not-allowed';
                        btn.style.boxShadow = 'none';
                        btn.style.animation = 'none';
                    }
                };
                if (fromInput) fromInput.addEventListener('change', activateSaveBtn);
                if (toInput) toInput.addEventListener('change', activateSaveBtn);
            }
            if (featureShowMemo) {
                const memoInput = document.getElementById('input-memo');
                if (memoInput) memoInput.addEventListener('input', triggerAutoSave);
            }
        } 
    }
}

function compressImageDual(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvasHigh = document.createElement('canvas');
                let w = img.width, h = img.height;
                const MAX_SIZE = 3000;
                if (w > MAX_SIZE || h > MAX_SIZE) {
                    if (w > h) {
                        h = h * (MAX_SIZE / w); w = MAX_SIZE;
                    } else {
                        w = w * (MAX_SIZE / h); h = MAX_SIZE;
                    }
                }
                canvasHigh.width = w; canvasHigh.height = h;
                canvasHigh.getContext('2d').drawImage(img, 0, 0, w, h);
                const highResData = canvasHigh.toDataURL('image/jpeg', 0.95);

                const canvasThumb = document.createElement('canvas');
                let tw = img.width, th = img.height;
                if (tw > 150) { th = th * (150 / tw); tw = 150; }
                canvasThumb.width = tw; canvasThumb.height = th;
                canvasThumb.getContext('2d').drawImage(img, 0, 0, tw, th);
                const thumbData = canvasThumb.toDataURL('image/jpeg', 0.4);

                resolve({ highResData, thumbData });
            };
        };
    });
}

// ── バックグラウンド処理用のキュー ──
let globalSaveQueue = Promise.resolve();

async function saveDateManual() {
    const fromEl = document.getElementById('input-date-from');
    const toEl = document.getElementById('input-date-to');
    if (!fromEl) return;

    let fromVal = fromEl.value;
    let toVal = toEl ? toEl.value : '';

    if (fromVal && toVal) {
        if (fromVal === toVal) {
            toVal = '';
            toEl.value = '';
        } else if (new Date(fromVal) > new Date(toVal)) {
            [fromEl.value, toEl.value] = [toVal, fromVal];
            [fromVal, toVal] = [toVal, fromVal];
        }
    }
    triggerAutoSave();
}

function triggerAutoSave() {
    const statusEl = document.getElementById('autosave-status');
    if (statusEl) statusEl.innerText = '保存準備中...';
    clearTimeout(autoSaveTimer);
    
    const photoInputEl = document.getElementById('input-photos');
    const files = (photoInputEl && photoInputEl.files) ? Array.from(photoInputEl.files) : [];
    
    const targetPref = selectedPref;
    const targetEntryId = selectedEntryId; // この時点のIDをキャプチャ
    const fromEl = document.getElementById('input-date-from');
    const toEl = document.getElementById('input-date-to');
    const memoValue = document.getElementById('input-memo')?.value || '';
    
    let fromVal = fromEl ? toSlashDate(fromEl.value) : undefined;
    let toVal = toEl ? toSlashDate(toEl.value) : undefined;

    if (files.length > 0) {
        showSaveProgress(files.length, "準備中...");
        
        setTimeout(() => {
            if (photoInputEl) photoInputEl.value = '';
            globalSaveQueue = globalSaveQueue.then(() => 
                performQueuedSave(targetPref, targetEntryId, fromVal, toVal, memoValue, files)
            ).catch(e => console.error(e));
        }, 300);
    } else {
        autoSaveTimer = setTimeout(() => { 
            globalSaveQueue = globalSaveQueue.then(() => 
                performQueuedSave(targetPref, targetEntryId, fromVal, toVal, memoValue, files)
            ).catch(e => console.error(e));
        }, 800);
    }
}

async function performQueuedSave(targetPref, targetEntryId, fromVal, toVal, memoValue, files) {
    if (!targetPref) return;

    const existingData = (targetEntryId
        ? memoriesData.find(m => m.id === targetEntryId)
        : memoriesData.find(m => m.prefecture === targetPref)) || { prefecture: targetPref };
    
    let dateValue;
    if (fromVal !== undefined) {
        dateValue = fromVal && toVal ? `${fromVal}~${toVal}` : fromVal || toVal || '';
    } else {
        dateValue = existingData.date || '';
    }

    const statusEl = document.getElementById('autosave-status');
    const isHeavyTask = files.length > 0;

    if (!isHeavyTask && statusEl && selectedPref === targetPref) {
        statusEl.innerText = '保存中...';
    }

    try {
        let existingUrls = [];
        if (existingData.photo_urls) {
            try { existingUrls = JSON.parse(existingData.photo_urls); } catch(e){}
        }

        let newUrls = [];
        if (isHeavyTask) {
            updateSaveProgress(0, files.length, "圧縮中...");
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const { highResData, thumbData } = await compressImageDual(file);
                const photoId = crypto.randomUUID();
                
                await savePhotoToIDB(photoId, highResData);
                newUrls.push({ id: photoId, thumb: thumbData });
                
                updateSaveProgress(i + 1, files.length, "保存中...");
                
                await new Promise(r => setTimeout(r, 40)); 
            }
            updateSaveProgress(files.length, files.length, "クラウド同期中...");
        }

        const allUrls = [...existingUrls, ...newUrls];

        if (selectedPref === targetPref) {
            existingData.photo_urls = JSON.stringify(allUrls);
            if (fromVal !== undefined) existingData.date = dateValue;
            existingData.memo = memoValue;
            if (!memoriesData.includes(existingData)) memoriesData.push(existingData);
            renderRightPanel();
        }

        const payload = {
            action: "save_memory",
            prefecture: targetPref,
            date: dateValue,
            existing_urls: allUrls,
            new_photos: [],
            memo: memoValue,
            entry_id: targetEntryId || undefined
        };
        
        const res = await apiFetch({ method: 'POST', body: JSON.stringify(payload) });
        
        if (res.ok) {
            await fetchMemories(false);
            
            // 写真追加後はmemoiesDataが更新されたのでパネルを再描画する
            // （一覧への反映・→ボタン・canAddEntry等の再計算に必要）
            if (isHeavyTask && selectedPref === targetPref) {
                renderRightPanel();
            }

            updateMapColors();
            updateCounter();

            if (statusEl && selectedPref === targetPref) {
                statusEl.innerText = '保存完了';
                setTimeout(() => { 
                    const el = document.getElementById('autosave-status');
                    if (el) el.innerText = ''; 
                }, 2000);
            }
            
            if (isHeavyTask) {
                updateSaveProgress(files.length, files.length, "完了！");
                setTimeout(() => { hideSaveProgress(); }, 1500);
            }
        } else {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.error || '保存に失敗しました';
            if (statusEl && selectedPref === targetPref) statusEl.innerText = `⚠ ${errMsg}`;
            if (isHeavyTask) hideSaveProgress();
        }
    } catch(e) { 
        console.error("Save Error", e); 
        if (statusEl && selectedPref === targetPref) {
            statusEl.style.color = '#d32f2f';
            statusEl.innerText = '⚠ 保存に失敗しました。';
        }
        if (isHeavyTask) hideSaveProgress();
    }
}

async function fetchMemories(redraw = true) {
    try {
        const res = await apiFetch({ method: 'GET', url: '/api?t=' + new Date().getTime() });
        const rawData = await res.json();
        
        // 重複排除せず全エントリを保持（同一都道府県の複数旅行に対応）
        memoriesData = rawData;

        homePrefectures = memoriesData
            .filter(m => m.is_home === true)
            .map(m => m.prefecture);

        if (redraw) renderRightPanel();
        updateMapColors();
        updateCounter();
    } catch (e) { console.error("データ取得エラー", e); }
}

function updateMapColors() {
    if (!geoJsonLayer) return;
    geoJsonLayer.eachLayer(layer => {
        const pref = layer.feature.properties.nam_ja;
        const entries = memoriesData.filter(m => m.prefecture === pref);
        const isHome = homePrefectures.includes(pref);
        let isVisited = isHome;
        if (!isVisited) {
            isVisited = entries.some(m => {
                const photos = JSON.parse(m.photo_urls || "[]");
                return photos.length > 0;
            });
        }
        layer.setStyle({
            fillColor: isVisited ? (getCurrentColors()[pref] || '#8ab4f8') : '#f4f7f6',
            weight: 0.3,
            color: '#000000',
            fillOpacity: 1
        });
    });
}

function showUpdatePopup() {
    // パッチバージョンのため、2.0.0のポップアップのみ表示
    if (localStorage.getItem('updateNotified_v2.0.0')) return;
    localStorage.setItem('updateNotified_v2.0.0', '1');

    const popup = document.createElement('div');
    popup.id = 'update-popup';
    popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9000;padding:20px;box-sizing:border-box;';
    popup.innerHTML = `
        <div style="background:white;border-radius:16px;padding:30px 24px;max-width:320px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);position:relative;">
            <button onclick="document.getElementById('update-popup').remove()" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;color:#aaa;cursor:pointer;line-height:1;">✕</button>
            <p style="margin:0 0 14px 0;font-size:1.1rem;font-weight:bold;color:#444;font-family:'Zen Kaku Gothic New',sans-serif;">version_2.0.0にアップデートされました。</p>
            <p style="margin:0;font-size:0.92rem;color:#666;line-height:2;font-family:'Zen Kaku Gothic New',sans-serif;word-break:keep-all;overflow-wrap:anywhere;">・写真の保存先を端末に変更し、プライバシーと表示速度を向上させました。<br>・設定画面に機種変更時などに使える「データの引き継ぎ」機能を追加しました。</p>
        </div>
    `;
    document.body.appendChild(popup);
}

function openSliderAt(urlOrId, photos) {
    currentPhotos = photos;
    slideIndex = photos.findIndex(p => (typeof p === 'string' ? p : p.id) === urlOrId);
    if (slideIndex < 0) slideIndex = 0;
    updateSlider();
    const modal = document.getElementById('slider-modal');
    modal.classList.remove('hidden');

    if (!modal._swipeReady) {
        modal._swipeReady = true;
        let touchStartX = 0;
        let touchStartY = 0;
        let swipeDir = null;

        modal.addEventListener('touchstart', e => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            swipeDir = null;
        }, { passive: true });

        modal.addEventListener('touchmove', e => {
            const dx = e.touches[0].clientX - touchStartX;
            const dy = e.touches[0].clientY - touchStartY;
            const img = document.getElementById('slide-image');

            if (!swipeDir) {
                if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                    swipeDir = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
                }
            }

            if (swipeDir === 'horizontal') {
                img.style.transform = `translateX(${dx}px)`;
                img.style.opacity = `${1 - Math.abs(dx) / 400}`;
            } else if (swipeDir === 'vertical' && dy > 0) {
                img.style.transform = `translateY(${dy}px) scale(${1 - dy/800})`;
                img.style.opacity = `${1 - dy/300}`;
                modal.style.background = `rgba(0,0,0,${0.9 - dy/400})`;
            }
        }, { passive: true });

        modal.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            const img = document.getElementById('slide-image');
            img.style.transition = 'transform 0.25s ease, opacity 0.25s ease';

            if (swipeDir === 'vertical' && dy > 80) {
                img.style.transform = 'translateY(100vh)';
                img.style.opacity = '0';
                modal.style.transition = 'background 0.25s ease';
                modal.style.background = 'rgba(0,0,0,0)';
                setTimeout(() => {
                    modal.classList.add('hidden');
                    img.style.transition = '';
                    img.style.transform = '';
                    img.style.opacity = '';
                    modal.style.transition = '';
                    modal.style.background = '';
                }, 250);
                swipeDir = null;
                return;
            }

            if (swipeDir === 'horizontal' && Math.abs(dx) > 60) {
                const direction = dx < 0 ? 1 : -1;
                const canMove = direction === 1
                    ? slideIndex < currentPhotos.length - 1
                    : slideIndex > 0;
                if (canMove) {
                    img.style.transform = `translateX(${direction * -120}%)`;
                    img.style.opacity = '0';
                    setTimeout(() => {
                        slideIndex += direction;
                        img.style.transition = 'none';
                        img.style.transform = `translateX(${direction * 80}%)`;
                        img.style.opacity = '0';
                        updateSlider();
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                img.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
                                img.style.transform = 'translateX(0)';
                                img.style.opacity = '1';
                            });
                        });
                    }, 180);
                } else {
                    img.style.transform = 'translateX(0)';
                    img.style.opacity = '1';
                }
            } else {
                img.style.transform = 'translateX(0)';
                img.style.opacity = '1';
                modal.style.background = '';
            }
            setTimeout(() => { img.style.transition = ''; }, 300);
        }, { passive: true });
    }
}

function updateSlider() {
    const img = document.getElementById('slide-image');
    const p = currentPhotos[slideIndex];
    if (typeof p === 'string') {
        img.src = p;
    } else {
        img.src = p.thumb;
        if (!isShareMode) {
            getPhotoFromIDB(p.id).then(highRes => {
                if (highRes && currentPhotos[slideIndex] === p) {
                    img.src = highRes;
                }
            });
        }
    }
    document.getElementById('slide-counter').innerText = `${slideIndex + 1} / ${currentPhotos.length}`;
}

// =============================================
// インストールスライド（チュートリアル前）
// =============================================
function showInstallSlides() {
    const el = document.getElementById('install-slides');
    if (el) el.remove();

    let selectedOS = null;

    const overlay = document.createElement('div');
    overlay.id = 'install-slides';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(255,255,255,0.97); z-index:9998; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px 24px; box-sizing:border-box;';

    function renderSlide(slide) {
        overlay.innerHTML = '';

        const skipBtn = document.createElement('button');
        skipBtn.textContent = 'スキップ';
        skipBtn.style.cssText = 'position:absolute; top:20px; right:20px; background:none; border:none; color:#aaa; font-size:0.9rem; cursor:pointer; font-family:inherit;';
        skipBtn.onclick = () => { overlay.remove(); startTutorial(); };
        overlay.appendChild(skipBtn);

        const box = document.createElement('div');
        box.style.cssText = 'width:100%; max-width:360px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:20px;';
        box.innerHTML = slide.html;
        overlay.appendChild(box);

        const dots = document.createElement('div');
        dots.style.cssText = 'position:absolute; bottom:100px; display:flex; gap:8px;';
        [0,1,2].forEach(i => {
            const d = document.createElement('span');
            d.style.cssText = 'width:8px; height:8px; border-radius:50%; background:' + (i === slide.index ? '#6c8ca3' : '#ddd') + ';';
            dots.appendChild(d);
        });
        overlay.appendChild(dots);
    }

    function slide1() {
        renderSlide({ index: 0, html:
            '<h1 style="font-size:1.8rem; color:#333; margin:0; letter-spacing:2px;">あしあとへようこそ</h1>' +
            '<p style="color:#888; font-size:0.95rem; line-height:1.8; margin:0;">日本地図に旅の思い出を記録して<br>あなただけの あしあと を残しましょう。</p>' +
            '<button onclick="installSlide2()" style="margin-top:16px; padding:16px 48px; background:#6c8ca3; color:white; border:none; border-radius:12px; font-size:1.1rem; font-weight:bold; font-family:inherit; cursor:pointer;">次へ</button>'
        });
        window.installSlide2 = slide2;
    }

    function slide2() {
        renderSlide({ index: 1, html:
            '<h2 style="font-size:1.4rem; color:#333; margin:0;">アプリとして使おう</h2>' +
            '<p style="color:#888; font-size:0.9rem; line-height:1.8; margin:0;">ホーム画面に追加するとアプリのように使えます</p>' +
            '<div style="display:flex; flex-direction:column; gap:12px; width:100%; margin-top:8px;">' +
            '<button onclick="installSlide3ios()" style="padding:18px; background:#f4f7f6; border:none; border-radius:12px; font-size:1.1rem; font-weight:bold; color:#444; cursor:pointer; font-family:inherit;">iPhone / iPad</button>' +
            '<button onclick="installSlide3android()" style="padding:18px; background:#f4f7f6; border:none; border-radius:12px; font-size:1.1rem; font-weight:bold; color:#444; cursor:pointer; font-family:inherit;">Android</button>' +
            '</div>' +
            '<button onclick="installSlide4()" style="margin-top:4px; background:none; border:none; color:#aaa; font-size:0.88rem; cursor:pointer; font-family:inherit;">スキップ</button>'
        });
        window.installSlide3ios = slide3ios;
        window.installSlide3android = slide3android;
        window.installSlide4 = slide4;
    }

    function slide3ios() {
        renderSlide({ index: 2, html:
            '<h2 style="font-size:1.3rem; color:#333; margin:0;">iPhoneの場合</h2>' +
            '<div style="width:100%; background:#f4f7f6; border-radius:14px; padding:20px; text-align:left; display:flex; flex-direction:column; gap:14px;">' +
            '<div style="display:flex; align-items:flex-start; gap:12px;"><span style="background:#6c8ca3; color:white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-weight:bold; flex-shrink:0; font-size:0.9rem;">1</span><span style="color:#555; font-size:0.92rem; line-height:1.6;">Safariでこのページを開く</span></div>' +
            '<div style="display:flex; align-items:flex-start; gap:12px;"><span style="background:#6c8ca3; color:white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-weight:bold; flex-shrink:0; font-size:0.9rem;">2</span><span style="color:#555; font-size:0.92rem; line-height:1.6;">下部の（・・・）ボタンをタップ</span></div>' +
            '<div style="display:flex; align-items:flex-start; gap:12px;"><span style="background:#6c8ca3; color:white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-weight:bold; flex-shrink:0; font-size:0.9rem;">3</span><span style="color:#555; font-size:0.92rem; line-height:1.6;">「共有」をタップ</span></div>' +
            '<div style="display:flex; align-items:flex-start; gap:12px;"><span style="background:#6c8ca3; color:white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-weight:bold; flex-shrink:0; font-size:0.9rem;">4</span><span style="color:#555; font-size:0.92rem; line-height:1.6;">「ホーム画面に追加」をタップ</span></div>' +
            '</div>' +
            '<button onclick="installSlide4()" style="margin-top:8px; padding:16px 48px; background:#6c8ca3; color:white; border:none; border-radius:12px; font-size:1.1rem; font-weight:bold; font-family:inherit; cursor:pointer;">次へ</button>'
        });
        window.installSlide4 = slide4;
    }

    function slide3android() {
        renderSlide({ index: 2, html:
            '<h2 style="font-size:1.3rem; color:#333; margin:0;">Androidの場合</h2>' +
            '<div style="width:100%; background:#f4f7f6; border-radius:14px; padding:20px; text-align:left; display:flex; flex-direction:column; gap:14px;">' +
            '<div style="display:flex; align-items:flex-start; gap:12px;"><span style="background:#6c8ca3; color:white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-weight:bold; flex-shrink:0; font-size:0.9rem;">1</span><span style="color:#555; font-size:0.92rem; line-height:1.6;">Chromeでこのページを開く</span></div>' +
            '<div style="display:flex; align-items:flex-start; gap:12px;"><span style="background:#6c8ca3; color:white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-weight:bold; flex-shrink:0; font-size:0.9rem;">2</span><span style="color:#555; font-size:0.92rem; line-height:1.6;">右上のメニュー（⋮）をタップ</span></div>' +
            '<div style="display:flex; align-items:flex-start; gap:12px;"><span style="background:#6c8ca3; color:white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-weight:bold; flex-shrink:0; font-size:0.9rem;">3</span><span style="color:#555; font-size:0.92rem; line-height:1.6;">「ホーム画面に追加」を選択</span></div>' +
            '</div>' +
            '<button onclick="installSlide4()" style="margin-top:8px; padding:16px 48px; background:#6c8ca3; color:white; border:none; border-radius:12px; font-size:1.1rem; font-weight:bold; font-family:inherit; cursor:pointer;">次へ</button>'
        });
        window.installSlide4 = slide4;
    }

    function slide4() {
        overlay.innerHTML = '';
        overlay.style.justifyContent = 'center';

        const box = document.createElement('div');
        box.style.cssText = 'width:100%; max-width:360px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:20px;';
        box.innerHTML =
            '<h2 style="font-size:1.6rem; color:#333; margin:0;">準備完了！</h2>' +
            '<p style="color:#888; font-size:0.95rem; line-height:1.8; margin:0;">次に、アプリの使い方を<br>かんたんにご説明します。</p>' +
            '<button id="install-start-btn" style="margin-top:16px; padding:16px 48px; background:#6c8ca3; color:white; border:none; border-radius:12px; font-size:1.1rem; font-weight:bold; font-family:inherit; cursor:pointer;">はじめる</button>';
        overlay.appendChild(box);

        document.getElementById('install-start-btn').addEventListener('click', () => {
            overlay.remove();
            startTutorial();
        });
    }

    document.body.appendChild(overlay);
    slide1();
}

// =============================================
// チュートリアル
// =============================================
const TUTORIAL_STEPS = [
    {
        targetId: 'map-container',
        position: 'center',
        title: '地図',
        text: '都道府県をタップすると\n記録を追加できます'
    },
    {
        targetId: 'menu-btn',
        position: 'auto',
        title: '一覧',
        text: '訪問した都道府県を\n一覧で確認できます'
    },
    {
        targetId: '__photo-fab__',
        position: 'auto',
        title: '写真・日付・メモ',
        text: '都道府県を選択後、＋ボタンから\n写真を追加できます'
    },
    {
        targetId: 'settings-btn',
        position: 'auto',
        title: '設定',
        text: 'テーマ変更・家の登録・\nアカウント管理などができます'
    },
];

let tutorialStep = 0;

function startTutorial() {
    tutorialStep = 0;
    showTutorialStep();
}

function showTutorialStep() {
    const appScreen = document.getElementById('app-screen');
    if (!appScreen || appScreen.classList.contains('hidden')) return;

    const old = document.getElementById('tutorial-overlay');
    if (old) old.remove();

    if (tutorialStep >= TUTORIAL_STEPS.length) {
        localStorage.setItem('tutorialDone', '1');
        showUpdatePopup(); 
        return;
    }

    const step = TUTORIAL_STEPS[tutorialStep];

    let targetEl = document.getElementById(step.targetId);
    if (step.targetId === '__photo-fab__') {
        targetEl = document.querySelector('.add-photo-fab');
    }

    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; z-index:9999; pointer-events:none;';

    let spotStyle = '';
    let bubbleStyle = '';
    let arrowStyle = '';

    if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const r  = Math.max(rect.width, rect.height) * 0.8 + 20;

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; pointer-events:all;';
        svg.innerHTML = `
            <defs>
                <mask id="tut-mask">
                    <rect width="100%" height="100%" fill="white"/>
                    <circle cx="${cx}" cy="${cy}" r="${r}" fill="black"/>
                </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tut-mask)" onclick="skipTutorial()"/>
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="white" stroke-width="2.5" opacity="0.8"/>
        `;
        overlay.appendChild(svg);

        const bubbleW = 300;
        const bubbleH = 150;
        const margin  = 20;
        let bx, by, arrowDir;

        bx = 28;
        by = window.innerHeight / 2 - bubbleH / 2;
        arrowDir = null;

        bubbleStyle = `position:fixed; left:28px; right:28px; top:${by}px; width:auto; background:white; border-radius:16px; padding:26px 28px; box-shadow:0 8px 32px rgba(0,0,0,0.25); pointer-events:all; text-align:center;`;

        if (arrowDir === 'up') {
            arrowStyle = `position:absolute; left:${cx - bx - 10}px; top:-10px; width:0; height:0; border-left:10px solid transparent; border-right:10px solid transparent; border-bottom:10px solid white;`;
        } else if (arrowDir === 'down') {
            arrowStyle = `position:absolute; left:${cx - bx - 10}px; bottom:-10px; width:0; height:0; border-left:10px solid transparent; border-right:10px solid transparent; border-top:10px solid white;`;
        }
    } else {
        const by = window.innerHeight / 2 - 75;
        bubbleStyle = `position:fixed; left:28px; right:28px; top:${by}px; width:auto; background:white; border-radius:16px; padding:26px 28px; box-shadow:0 8px 32px rgba(0,0,0,0.25); pointer-events:all; text-align:center;`;
        const svg = document.createElement('div');
        svg.style.cssText = 'position:absolute; inset:0; background:rgba(0,0,0,0.6); pointer-events:all;';
        svg.onclick = skipTutorial;
        overlay.appendChild(svg);
    }

    const bubble = document.createElement('div');
    bubble.style.cssText = bubbleStyle;
    bubble.innerHTML = `
        ${arrowStyle ? `<div style="${arrowStyle}"></div>` : ''}
        <div style="font-size:1.1rem; font-weight:bold; color:#333; margin-bottom:10px;">${step.title}</div>
        <div style="font-size:0.95rem; color:#666; line-height:1.7; white-space:pre-line;">${step.text}</div>
        <div style="display:flex; gap:8px; margin-top:14px; justify-content:center;">
            <button onclick="skipTutorial()" style="flex:1; padding:9px; background:#f4f7f6; border:none; border-radius:8px; font-size:0.85rem; color:#888; cursor:pointer; font-family:inherit; font-weight:bold;">スキップ</button>
            <button onclick="nextTutorialStep()" style="flex:1; padding:9px; background:#6c8ca3; color:white; border:none; border-radius:8px; font-size:0.85rem; cursor:pointer; font-family:inherit; font-weight:bold;">${tutorialStep < TUTORIAL_STEPS.length - 1 ? '次へ' : '完了'}</button>
        </div>
        <div style="margin-top:10px; display:flex; justify-content:center; gap:6px;">
            ${TUTORIAL_STEPS.map((_, i) => `<span style="width:7px; height:7px; border-radius:50%; background:${i === tutorialStep ? '#6c8ca3' : '#ddd'}; display:inline-block;"></span>`).join('')}
        </div>
    `;
    overlay.appendChild(bubble);

    document.body.appendChild(overlay);
}

function nextTutorialStep() {
    tutorialStep++;
    showTutorialStep();
}

function skipTutorial() {
    const el = document.getElementById('tutorial-overlay');
    if (el) el.remove();
    localStorage.setItem('tutorialDone', '1');
    showUpdatePopup(); 
}

function checkAndStartTutorial() {
    if (!localStorage.getItem('tutorialDone')) {
        setTimeout(() => {
            const appScreen = document.getElementById('app-screen');
            if (appScreen && !appScreen.classList.contains('hidden')) {
                showInstallSlides();
            }
        }, 800);
    }
}