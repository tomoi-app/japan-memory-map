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
            '奈良県':'#86c27e','和歌山県':'#88c47e','鳥取県':'#88c47e','島根県':'#86c27c',
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

// ログイン ↔ サインアップ 切り替え
function switchToSignup() {
    currentAuthTab = 'signup';
    document.getElementById('auth-submit-btn').textContent = 'アカウントを作成';
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-success').classList.add('hidden');
    const link = document.querySelector('.auth-signup-link');
    if (link) link.innerHTML = '<a href="#" onclick="switchToLogin(); return false;">ログインはこちら</a>';
}

function switchToLogin() {
    currentAuthTab = 'login';
    document.getElementById('auth-submit-btn').textContent = 'ログイン';
    document.getElementById('auth-error').classList.add('hidden');
    document.getElementById('auth-success').classList.add('hidden');
    document.getElementById('auth-password').style.display = '';
    const link = document.querySelector('.auth-signup-link');
    if (link) link.innerHTML = 'アカウントの新規作成は<a href="#" onclick="switchToSignup(); return false;">こちら</a>';
    const forgotLink = document.getElementById('forgot-pw-link');
    if (forgotLink) forgotLink.style.display = '';
}

// パスワードリセット画面に切り替え
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

// パスワードリセットメール送信
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

// ログイン / サインアップ 実行
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

    // パスワードリセットモード
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
            errorEl.textContent = msg;
            errorEl.classList.remove('hidden');
        } else {
            if (currentAuthTab === 'signup') {
                successEl.textContent = 'アカウントを作成しました！ログインしてください。';
                successEl.classList.remove('hidden');
                switchToLogin();
                document.getElementById('auth-password').value = '';
            } else {
                // セッション取得してアプリ起動
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

// Enterキーで送信
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !document.getElementById('auth-screen').classList.contains('hidden')) {
        handleAuth();
    }
});

// アプリ起動
// パスワード再設定専用画面
function showPasswordRecoveryScreen() {
    isPasswordRecoveryMode = true;
    panelOpen = false;
    settingsOpen = false;
    selectedPref = null;

    // 設定パネルを強制表示してパスワード変更画面へ
    const settingsPanel = document.getElementById('settings-panel');
    if (!settingsPanel) {
        // settings-panelがまだなければ作成
        const sp = document.createElement('div');
        sp.id = 'settings-panel';
        sp.className = 'list-section';
        document.querySelector('.main-layout') && document.querySelector('.main-layout').appendChild(sp);
    }
    settingsOpen = true;
    document.getElementById('settings-panel') && document.getElementById('settings-panel').classList.add('open');
    renderChangePassword();
}

function startApp(session) {
    applyTheme(currentTheme);
    currentUser = session.user;
    currentToken = session.access_token;
    // 状態を初期化してから表示
    panelOpen = false;
    settingsOpen = false;
    selectedPref = null;
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    // パネルが開いていたら閉じる
    const rightPanel = document.getElementById('right-panel');
    const settingsPanel = document.getElementById('settings-panel');
    if (rightPanel) rightPanel.classList.remove('open');
    if (settingsPanel) settingsPanel.classList.remove('open');
    initApp();
}

// ログアウト
async function logout() {
    if (!confirm('ログアウトしますか？')) return;
    showLoading();
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

// ページ読み込み時にセッション確認
window.addEventListener('load', async () => {
    // PASSWORD_RECOVERYを先に監視してからセッション確認
    let recoveryHandled = false;

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'TOKEN_REFRESHED' && session) {
            currentToken = session.access_token;
        }
        if (event === 'SIGNED_OUT') {
            currentUser = null;
            currentToken = null;
        }
        // パスワードリセットリンクからの遷移
        if (event === 'PASSWORD_RECOVERY') {
            recoveryHandled = true;
            currentUser = session.user;
            currentToken = session.access_token;
            // 地図を初期化せず、パスワード変更専用画面だけ表示
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('app-screen').classList.remove('hidden');
            showPasswordRecoveryScreen();
        }
    });

    // 少し待ってPASSWORD_RECOVERYが来なかった場合のみ通常起動
    await new Promise(r => setTimeout(r, 300));
    if (!recoveryHandled) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) startApp(session);
    }
});

// APIリクエスト共通関数（トークンを自動付与）
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
let memoriesData = [];
let currentPhotos = [];
let slideIndex = 0;
let autoSaveTimer = null;
let panelOpen = false;
let settingsOpen = false;
let initialBounds;

let homePrefectures = [];

// PREF_COLORSはgetCurrentColors()で取得

function initApp() {
    applyTheme(currentTheme);
    map = L.map('map-container', {
        zoomControl: false,
        attributionControl: false,
        doubleClickZoom: false,
        zoomSnap: 0
    }).setView([38.0, 137.0], 5);

    fetch('https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson', { cache: 'force-cache' })
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

            updateMapColors();
        });

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
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTouchTime;
        if (tapLength > 0 && tapLength < 400) {
            if (initialBounds) {
                map.flyToBounds(initialBounds, { duration: 0.6 });
            }
            if (panelOpen) closePanel();
            if (settingsOpen) closeSettings();
        }
        lastTouchTime = currentTime;
    });

    fetchMemories();

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

    if (!document.getElementById('settings-btn')) {
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'settings-btn';
        settingsBtn.className = 'settings-btn';
        settingsBtn.title = "設定";
        settingsBtn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="#555"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`;
        
        settingsBtn.onclick = () => {
            if (settingsOpen) {
                closeSettings();
            } else {
                if (panelOpen) closePanel();
                openSettings();
            }
        };
        document.querySelector('.main-layout').appendChild(settingsBtn);
    }

    if (!document.getElementById('settings-panel')) {
        const sp = document.createElement('div');
        sp.id = 'settings-panel';
        sp.className = 'list-section';
        document.querySelector('.main-layout').appendChild(sp);
    }
}

function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function openPanel() {
    panelOpen = true;
    document.getElementById('right-panel').classList.add('open');
    updateUIVisibility();
}

function cleanupEmptyDate() {
    if (selectedPref && !homePrefectures.includes(selectedPref)) {
        const fromEl = document.getElementById('input-date-from');
        const toEl = document.getElementById('input-date-to');
        const hasDateInput = (fromEl && fromEl.value) || (toEl && toEl.value);

        const data = memoriesData.find(m => m.prefecture === selectedPref);
        let photoCount = 0;
        if (data) {
            try { photoCount = JSON.parse(data.photo_urls || "[]").length; } catch(e){}
        }

        if (hasDateInput && photoCount === 0) {
            if (data) data.date = "";
            const payload = { action: "save_memory", prefecture: selectedPref, date: "", photos: [] };
            apiFetch({ method: 'POST', body: JSON.stringify(payload) })
                .then(() => fetchMemories(false));
        }
    }
}

function closePanel() {
    clearTimeout(autoSaveTimer);
    cleanupEmptyDate();
    panelOpen = false;
    selectedPref = null;
    document.getElementById('right-panel').classList.remove('open');
    updateUIVisibility();
    updateMapColors();
    updateCounter();
}

function backToList() {
    clearTimeout(autoSaveTimer);
    cleanupEmptyDate();
    selectedPref = null;
    renderRightPanel();
    updateMapColors();
    updateCounter();
}

function openSettings() {
    settingsOpen = true;
    document.getElementById('settings-panel').classList.add('open');
    updateUIVisibility();
    renderSettingsMenu();
}

function closeSettings() {
    settingsOpen = false;
    document.getElementById('settings-panel').classList.remove('open');
    updateUIVisibility();
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
    
    const btnS = `text-align:center; padding:20px; background:var(--bg); border:none; border-radius:12px; font-size:1.2rem; color:#444; cursor:pointer; font-weight:bold; font-family:inherit; transition:background 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05);`;
    let contentHtml = `
    <div class="panel-content">
        <div style="display:flex; flex-direction:column; gap:15px; margin-top:20px;">
            <button onclick="renderHomeSettings()" style="${btnS}">
                家を登録
            </button>
            <button onclick="renderThemeSettings()" style="${btnS}">
                テーマの変更
            </button>
            <button onclick="renderContactSettings()" style="${btnS}">
                お問い合わせ
            </button>
            <button onclick="renderAccountSettings()" style="${btnS}">
                アカウント
            </button>
        </div>
    </div>`;
    
    panel.innerHTML = headerHtml + contentHtml;
}

// ------------------------------------------
// 強制・一撃で全データ削除の処理（API呼び出しを1回に変更）
// ------------------------------------------
async function deleteAllData() {
    if (confirm("すべてのデータを削除してもよろしいでしょうか。\nこの操作は取り消せません。")) {
        showLoading();
        
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
            // サーバーに「全部消せ」という命令を1回だけ送る
            await apiFetch({ method: 'POST', body: JSON.stringify({ action: "delete_all" }) 
            });
            
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

    const email = currentUser ? currentUser.email : '';
    const btnStyle = 'text-align:center; padding:20px; background:#eef2f5; border:none; border-radius:12px; font-size:1.2rem; color:#444; cursor:pointer; font-weight:bold; font-family:inherit; transition:background 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05); width:100%;';
    const dangerBtnStyle = 'text-align:center; padding:20px; background:#eef2f5; border:none; border-radius:12px; font-size:1.2rem; color:#d32f2f; cursor:pointer; font-weight:bold; font-family:inherit; transition:background 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05); width:100%;';

    let contentHtml = `
    <div class="panel-content">
        <div style="display:flex; flex-direction:column; gap:15px; margin-top:20px;">
            <div style="background:#f4f7f6; border-radius:12px; padding:16px 20px; font-size:0.95rem; color:#666;">
                <span style="font-size:0.8rem; color:#aaa; display:block; margin-bottom:4px;">ログイン中のアカウント</span>
                <span style="font-weight:bold; color:#444;">${email}</span>
            </div>

            <button onclick="renderChangePassword()" style="${btnStyle}">
                パスワードを変更
            </button>

            <button onclick="deleteAllData()" style="${dangerBtnStyle}">
                すべてのデータを削除
            </button>

            <button onclick="logout()" style="${btnStyle.replace('#444', '#777')}">
                ログアウト
            </button>
        </div>
    </div>`;

    panel.innerHTML = headerHtml + contentHtml;
}

function renderChangePassword() {
    const panel = document.getElementById('settings-panel');
    panel.style.backgroundColor = '#ffffff';

    // リカバリーモード時は戻るボタン・閉じるボタンを非表示
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
    showLoading();

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

function renderThemeSettings() {
    const panel = document.getElementById('settings-panel');
    panel.style.backgroundColor = '#ffffff';

    let headerHtml = `
    <div class="panel-header">
        <div class="panel-header-title-row">
            <button onclick="renderSettingsMenu()" style="background:none; border:none; font-size:24px; color:#6c8ca3; cursor:pointer; padding:0; font-weight:bold; line-height:1; position:relative; z-index:2;">←</button>
            <h2 style="margin:0; font-size:1.6rem; color:#333; position:absolute; left:50%; transform:translateX(-50%);">テーマの変更</h2>
            <button class="panel-close-btn" onclick="closeSettings()" style="position:relative; right:0; z-index:2;">✕</button>
        </div>
    </div>`;

    let themeBtns = Object.entries(MAP_THEMES).map(([key, t]) => {
        const isActive = key === currentTheme;
        const swatches = t.preview.map(c =>
            `<span style="width:18px; height:18px; border-radius:3px; background:${c}; display:inline-block;"></span>`
        ).join('');
        return `<button onclick="applyTheme('${key}'); renderThemeSettings();"
            style="display:flex; align-items:center; gap:14px; padding:14px 18px; background:${isActive ? '#eef2f5' : '#f9f9f9'}; border:2px solid ${isActive ? '#6c8ca3' : '#eee'}; border-radius:12px; cursor:pointer; font-family:inherit; transition:all 0.2s; width:100%; box-sizing:border-box;">
            <div style="display:flex; gap:3px; flex-shrink:0;">${swatches}</div>
            <span style="font-size:1.05rem; font-weight:bold; color:#444;">${t.name}</span>
            ${isActive ? `<span style="margin-left:auto; color:#6c8ca3; font-size:1.2rem;">✓</span>` : ''}
        </button>`;
    }).join('');

    let contentHtml = `
    <div class="panel-content">
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
            ${themeBtns}
        </div>
    </div>`;

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
                ご意見・ご要望・不具合のご報告をお気軽にどうぞ。
            </p>

            <div>
                <label style="font-size:0.85rem; color:#888; display:block; margin-bottom:6px;">お名前</label>
                <input type="text" id="contact-name" placeholder="無記入でも送信できます。" style="${inputStyle}">
            </div>

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

    // 返信希望チェックでメールフィールドを表示
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

    document.getElementById('contact-reply').addEventListener('click', function() {
        document.getElementById('contact-email-wrap').style.display = this.checked ? 'block' : 'none';
        updateContactBtn();
    });

    const emailEl = document.getElementById('contact-email');
    if (emailEl) {
        emailEl.addEventListener('input', updateContactBtn);
        emailEl.addEventListener('change', updateContactBtn);
    }
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
    showLoading();

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
            document.getElementById('contact-name').value = '';
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
    let options = prefOrder.map(p => `<option value="${p}">${p}</option>`).join('');

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
            <span style="font-weight:bold; color:#444; font-size:1.1rem;">${pref}</span>
            <button onclick="removeHomePrefecture('${pref}')" style="background:rgba(0,0,0,0.1); border:none; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#555; cursor:pointer; font-size:14px;">✕</button>
        </div>
    `).join('');
}

function updateUIVisibility() {
    const counter = document.getElementById('pref-counter');
    const menuBtn = document.getElementById('menu-btn');
    const settingsBtn = document.getElementById('settings-btn');
    
    if (panelOpen || settingsOpen) {
        counter.classList.add('hidden-ui');
    } else {
        counter.classList.remove('hidden-ui');
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
    const activeMemories = memoriesData.filter(m => {
        if (homePrefectures.includes(m.prefecture)) return false;
        const photos = JSON.parse(m.photo_urls || "[]");
        return m.date || photos.length > 0;
    });
    const totalVisited = activeMemories.length + homePrefectures.length;
    document.getElementById('pref-counter').innerText = `${totalVisited} / 47`;

    const hasWarning = activeMemories.some(m => {
        const photos = JSON.parse(m.photo_urls || "[]");
        return !m.date || photos.length === 0;
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
            contentHtml += `<button class="pref-btn" onclick="selectedPref='${pref}'; openPanel(); renderRightPanel();"
                style="border-left: 6px solid ${getCurrentColors()[pref]}; background: #fffdf5;">
                <span style="font-weight:bold; color:#444;">${pref}</span>
            </button>`;
        });

        const activeMemories = memoriesData.filter(m => {
            if (homePrefectures.includes(m.prefecture)) return false;
            const photos = JSON.parse(m.photo_urls || "[]");
            return m.date || photos.length > 0;
        });

        if (activeMemories.length === 0 && homePrefectures.length === 0) {
            contentHtml += `<p style="color:#888; text-align:center; margin-top:40px;">地図から都道府県を選んで<br>思い出を追加しましょう</p>`;
        } else {
            const sortedMemories = [...activeMemories].sort((a, b) => prefOrder.indexOf(a.prefecture) - prefOrder.indexOf(b.prefecture));
            
            sortedMemories.forEach(m => {
                const photos = JSON.parse(m.photo_urls || "[]");
                const color = getCurrentColors()[m.prefecture] || '#aaa';
                const needsData = !m.date || photos.length === 0;
                contentHtml += `<button class="pref-btn" onclick="selectedPref='${m.prefecture}'; openPanel(); renderRightPanel();"
                    style="border-left: 6px solid ${color};">
                    <span style="display:flex; align-items:center; font-weight:bold; color:#444;">
                        ${m.prefecture}${needsData ? '<span class="status-dot"></span>' : ''}
                    </span>
                    <span style="color:#999; font-size:0.85em;">${formatDate(m.date)}</span>
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
                <h2 style="margin: 0; font-size: 1.8rem; color: #333; position:absolute; left:50%; transform:translateX(-50%); letter-spacing:2px;">${selectedPref}</h2>
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

        const data = memoriesData.find(m => m.prefecture === selectedPref) || { date: '', photo_urls: '[]' };
        let photos = [];
        try { photos = JSON.parse(data.photo_urls); } catch(e){}
        const hasWarning = (data.date || photos.length > 0) && (!data.date || photos.length === 0);

        let contentHtml = `<div class="panel-content" style="padding-top:20px;">`;
            
        if (hasWarning) {
            contentHtml += `<div class="warning-banner" style="margin-bottom: 15px;">${!data.date ? '日付を登録してください' : '写真を追加してください'}</div>`;
        }
        
        contentHtml += `
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="date" id="input-date-from" value="${getDateFrom(data.date)}" style="flex:1; padding:10px; border-radius:6px; border:1px solid #ddd; font-size:14px; background:#fafafa; color:#555;">
                <span style="color:#aaa;">-</span>
                <input type="date" id="input-date-to" value="${getDateTo(data.date)}" style="flex:1; padding:10px; border-radius:6px; border:1px solid #ddd; font-size:14px; background:#fafafa; color:#555;">
            </div>
            <p id="autosave-status" style="color:#888; text-align:center; font-size:12px; min-height:18px; margin:8px 0 0 0;"></p>
        `;

        if (photos.length > 0) {
            contentHtml += `<div class="photo-grid" style="margin-top:10px;">`;
            photos.forEach(url => {
                const escapedPhotos = JSON.stringify(photos).replace(/"/g, '&quot;');
                contentHtml += `<div class="photo-grid-item" onclick="openSliderAt('${url}', ${escapedPhotos})"><img src="${url}" loading="lazy"><button class="photo-delete-btn" onclick="event.stopPropagation(); deletePhoto('${url}')">✕</button></div>`;
            });
            contentHtml += `</div>`;
        } else {
            contentHtml += `<p style="text-align:center; color:#bbb; font-size:13px; margin-top:30px;">右下の「＋」ボタンから写真を追加できます</p>`;
        }
        
        contentHtml += `
            <label for="input-photos" class="add-photo-fab" style="background:${color};" title="写真を追加">
                <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </label>
            <input type="file" id="input-photos" multiple accept="image/*" style="display:none;">
        </div>`;

        panel.innerHTML = headerHtml + contentHtml;

        const fromInput = document.getElementById('input-date-from');
        const toInput = document.getElementById('input-date-to');
        const photoInput = document.getElementById('input-photos');

        const handleDateChange = () => {
            if (fromInput.value && toInput.value) {
                if (fromInput.value === toInput.value) {
                    toInput.value = '';
                } else if (new Date(fromInput.value) > new Date(toInput.value)) {
                    const temp = fromInput.value;
                    fromInput.value = toInput.value;
                    toInput.value = temp;
                }
            }
            triggerAutoSave();
        };

        if (fromInput) fromInput.addEventListener('change', handleDateChange);
        if (toInput) toInput.addEventListener('change', handleDateChange);
        if (photoInput) photoInput.addEventListener('change', triggerAutoSave);
    }
}

function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > 600) { h = h * (600 / w); w = 600; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
}

function triggerAutoSave() {
    const statusEl = document.getElementById('autosave-status');
    if (statusEl) statusEl.innerText = '保存中...';
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => { await saveMemoryData(); }, 800);
}

// ③ Supabaseに画像を直接アップロード（Python経由なし）
async function uploadImageDirect(file) {
    const compressed = await compressImage(file);
    // base64 → Blob変換
    const base64 = compressed.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'image/jpeg' });

    const filename = `${crypto.randomUUID()}.jpg`;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/photos/${filename}`;

    const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'image/jpeg'
        },
        body: blob
    });
    if (!res.ok) throw new Error('画像アップロード失敗');
    return `${SUPABASE_URL}/storage/v1/object/public/photos/${filename}`;
}

async function saveMemoryData() {
    const fromEl = document.getElementById('input-date-from');
    const toEl = document.getElementById('input-date-to');
    const files = document.getElementById('input-photos').files;
    if (!fromEl) return;
    
    const fromVal = toSlashDate(fromEl.value);
    const toVal = toSlashDate(toEl.value);
    const dateValue = fromVal && toVal ? `${fromVal}~${toVal}` : fromVal || toVal || '';
    
    const statusEl = document.getElementById('autosave-status');
    
    if (files.length > 0) {
        if (statusEl) statusEl.innerText = 'アップロード中...';
        showLoading();
    }

    try {
        // 既存URLはそのまま保持
        let existingUrls = [];
        const existingData = memoriesData.find(m => m.prefecture === selectedPref);
        if (existingData && existingData.photo_urls) {
            try { existingUrls = JSON.parse(existingData.photo_urls); } catch(e){}
        }

        // ③ 新規画像をSupabaseに直接並列アップロード
        let newUrls = [];
        if (files.length > 0) {
            newUrls = await Promise.all(Array.from(files).map(f => uploadImageDirect(f)));
        }

        const allUrls = [...existingUrls, ...newUrls];
        const payload = {
            action: "save_memory",
            prefecture: selectedPref,
            date: dateValue,
            existing_urls: allUrls,
            new_photos: []
        };
        
        const res = await apiFetch({ method: 'POST', body: JSON.stringify(payload) });
        
        if (res.ok) {
            await fetchMemories(false);
            renderRightPanel();
            updateMapColors();
            updateCounter();
            if (statusEl) {
                statusEl.innerText = '保存完了';
                setTimeout(() => { if (statusEl) statusEl.innerText = ''; }, 2000);
            }
        }
    } catch(e) { 
        console.error("Save Error", e); 
        if (statusEl) statusEl.innerText = 'エラー発生';
    } finally {
        hideLoading(); 
    }
}

// --- ゴーストデータを画面に表示させない処理を追加 ---
async function fetchMemories(redraw = true) {
    try {
        const res = await apiFetch({ method: 'GET', url: '/api?t=' + new Date().getTime() });
        const rawData = await res.json();
        
        // 同じ都道府県があったら1つにまとめる（ダミーを排除）
        const uniqueData = {};
        rawData.forEach(item => {
            if (!uniqueData[item.prefecture]) {
                uniqueData[item.prefecture] = item;
            } else {
                const existingPhotos = JSON.parse(uniqueData[item.prefecture].photo_urls || "[]");
                const newPhotos = JSON.parse(item.photo_urls || "[]");
                if ((!uniqueData[item.prefecture].date && !existingPhotos.length) && (item.date || newPhotos.length)) {
                    uniqueData[item.prefecture] = item;
                }
            }
        });
        memoriesData = Object.values(uniqueData);

        // is_homeフラグからhomePrefecturesを復元
        homePrefectures = memoriesData
            .filter(m => m.is_home === true)
            .map(m => m.prefecture);

        if (redraw) renderRightPanel();
        updateMapColors();
        updateCounter();
    } catch (e) { console.error("データ取得エラー", e); }
}

async function deletePhoto(url) {
    showLoading(); 
    const payload = { action: "delete_photo", prefecture: selectedPref, photo_url: url };
    try {
        await apiFetch({ method: 'POST', body: JSON.stringify(payload) });
        await fetchMemories(false);
        renderRightPanel();
        updateMapColors();
        updateCounter();
    } catch(e) { 
        console.error("削除エラー", e); 
    } finally {
        hideLoading();
    }
}

function updateMapColors() {
    if (!geoJsonLayer) return;
    geoJsonLayer.eachLayer(layer => {
        const pref = layer.feature.properties.nam_ja;
        const memory = memoriesData.find(m => m.prefecture === pref);
        const isHome = homePrefectures.includes(pref);
        let isVisited = isHome;
        if (!isVisited && memory) {
            const photos = JSON.parse(memory.photo_urls || "[]");
            if (memory.date || photos.length > 0) isVisited = true;
        }
        layer.setStyle({
            fillColor: isVisited ? (getCurrentColors()[pref] || '#8ab4f8') : '#f4f7f6',
            weight: 0.3,
            color: '#000000',
            fillOpacity: 1
        });
    });
}

function openSliderAt(url, photos) {
    currentPhotos = photos;
    slideIndex = photos.indexOf(url);
    if (slideIndex < 0) slideIndex = 0;
    updateSlider();
    document.getElementById('slider-modal').classList.remove('hidden');
}

function updateSlider() {
    document.getElementById('slide-image').src = currentPhotos[slideIndex];
    document.getElementById('slide-counter').innerText = `${slideIndex + 1} / ${currentPhotos.length}`;
}