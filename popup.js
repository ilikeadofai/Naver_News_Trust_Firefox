const API_KEY_STORAGE_KEY = "geminiApiKey";
const apiKeyInput = document.getElementById('gemini-api-key');
const saveButton = document.getElementById('save-key-button');
const changeKeyButton = document.getElementById('change-key-button');
const setupDiv = document.getElementById('key-setup');
const resultDiv = document.getElementById('result-container');

function showSetupUI() {
    setupDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    apiKeyInput.value = ''; // 입력창 초기화
    saveButton.innerText = '키 저장 및 분석 시작';
}

function showResultUI() {
    setupDiv.style.display = 'none';
    resultDiv.style.display = 'block';
    chrome.runtime.sendMessage({ type: "START_ANALYSIS_REQUEST" });
}

// 1. 키 로드 및 UI 상태 설정
chrome.storage.local.get([API_KEY_STORAGE_KEY], function(result) {
    if (result[API_KEY_STORAGE_KEY]) {
        showResultUI();
    } else {
        showSetupUI();
    }
});

// 2. 키 저장/수정 버튼 이벤트
saveButton.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: key }, function() {
            alert('API Key가 저장/수정되었습니다.');
            showResultUI();
        });
    } else {
        alert('API Key를 입력해주세요.');
    }
});

// 3. 키 수정 버튼 이벤트 (설정 UI로 돌아가기)
changeKeyButton.addEventListener('click', () => {
    showSetupUI();
});

// 4. background.js로부터 분석 결과 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "RESULT_TO_POPUP") {
        const data = request.data;
        
        document.getElementById('score-display').innerText = `신뢰도: ${data.score}/100`;
        document.getElementById('bias-display').innerText = `${data.officialBias} (${data.category})`;
        document.getElementById('reason-display').innerText = data.reason;
    }
});