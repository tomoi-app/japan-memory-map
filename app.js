async function saveMemoryData() {
    const dateValue = document.getElementById('input-date').value;
    const files = document.getElementById('input-photos').files;

    document.getElementById('upload-status').style.display = 'block';
    document.getElementById('btn-save-memory').disabled = true;

    let base64Photos = [];
    for (let file of files) {
        const b64 = await compressImage(file);
        base64Photos.push(b64);
    }

    const payload = { action: "save_memory", prefecture: selectedPref, date: dateValue, photos: base64Photos };
    
    try {
        // ヘッダーを明示的に指定
        const res = await fetch('/api', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload) 
        });
        
        // ★JSONではなく、まずは「生のテキスト」としてサーバーの返答を読み込む
        const responseText = await res.text(); 

        if (res.ok) {
            await fetchMemories();
            alert("保存しました！");
        } else {
            // エラー時：JSONに変換できればそれを、できなければ生のHTMLエラーを出す
            try {
                const errData = JSON.parse(responseText);
                alert("データベースの拒否エラー: " + (errData.error || "詳細不明"));
            } catch(e) {
                alert(`サーバーの致命的エラー (Status ${res.status}):\n${responseText.substring(0, 150)}...`);
            }
        }
    } catch(e) {
        // fetch自体が失敗した（CORSやネット切断など）場合
        alert(`ネットワーク遮断エラーの詳細:\n${e.message}`);
    } finally {
        if(document.getElementById('upload-status')) document.getElementById('upload-status').style.display = 'none';
        if(document.getElementById('btn-save-memory')) document.getElementById('btn-save-memory').disabled = false;
    }
}