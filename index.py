<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>思い出マップ</title>
    <link rel="stylesheet" href="style.css">
    <link rel="manifest" href="manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <link rel="apple-touch-icon" href="https://placehold.jp/192x192.png?text=Map">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
    <header>
        <h1>思い出マップ</h1>
        <button id="btn-home-settings" class="settings-btn">設定</button>
    </header>
    
    <main class="main-layout">
        <div class="map-section">
            <div id="map-container"></div>
            
            <div id="input-modal" class="custom-modal">
                <div class="modal-content">
                    <h3>思い出を記録</h3>
                    <input type="text" id="input-title" placeholder="タイトル（例：温泉旅行）">
                    <input type="text" id="input-pref" placeholder="都道府県（例：群馬）">
                    <input type="date" id="input-date">
                    <div class="modal-buttons">
                        <button id="btn-cancel" class="btn-secondary">キャンセル</button>
                        <button id="btn-save" class="btn-primary">保存する</button>
                    </div>
                </div>
            </div>

            <div id="settings-modal" class="custom-modal">
                <div class="modal-content">
                    <h3>設定</h3>
                    <p class="settings-desc">アプリの設定やユーザー情報はこちらで管理します。（※現在は準備中です）</p>
                    <div class="modal-buttons">
                        <button id="btn-close-settings" class="btn-secondary">閉じる</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="list-section">
            <div class="progress-container">
                <div class="progress-label">訪問した都道府県</div>
                <div class="progress-text"><span id="visited-count">0</span> / 47</div>
                <div class="progress-bar-bg">
                    <div id="progress-bar-fill" class="progress-bar-fill"></div>
                </div>
            </div>
            <h2>記録された思い出</h2>
            <ul id="memories-list"></ul>
        </div>
    </main>

    <script src="app.js"></script>
</body>
</html>