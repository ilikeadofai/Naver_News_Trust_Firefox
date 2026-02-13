const DEFAULT_SETTINGS = {
    selectedProvider: 'gemini',
    providers: {
        gemini: { apiKey: '', model: 'gemini-2.5-flash-lite' },
        gpt: { apiKey: '', model: 'gpt-4o-mini' },
        claude: { apiKey: '', model: 'claude-3-5-sonnet-latest' },
        openrouter: { apiKey: '', model: 'openai/gpt-4o-mini' },
        custom: {
            apiKey: '',
            model: 'gpt-4o-mini',
            endpoint: 'https://api.openai.com/v1/chat/completions',
            headerName: 'Authorization',
            headerPrefix: 'Bearer '
        }
    }
};

const providerSelect = document.getElementById('provider-select');
const modelInput = document.getElementById('model-input');
const apiKeyInput = document.getElementById('api-key-input');
const endpointInput = document.getElementById('endpoint-input');
const headerNameInput = document.getElementById('header-name-input');
const headerPrefixInput = document.getElementById('header-prefix-input');
const customFields = document.getElementById('custom-fields');
const saveBtn = document.getElementById('save-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const statusEl = document.getElementById('status');
const scoreDisplay = document.getElementById('score-display');
const reasonDisplay = document.getElementById('reason-display');
const activeProviderPill = document.getElementById('active-provider-pill');
const biasPill = document.getElementById('bias-pill');

let settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

function setStatus(message, type = '') {
    statusEl.className = `status ${type}`.trim();
    statusEl.textContent = message;
}

function getCurrentProvider() {
    return providerSelect.value;
}

function applyProviderToForm(providerName) {
    const provider = settings.providers[providerName] || {};

    modelInput.value = provider.model || '';
    apiKeyInput.value = provider.apiKey || '';

    if (providerName === 'custom') {
        customFields.classList.remove('hidden');
        endpointInput.value = provider.endpoint || '';
        headerNameInput.value = provider.headerName || 'Authorization';
        headerPrefixInput.value = provider.headerPrefix || 'Bearer ';
    } else {
        customFields.classList.add('hidden');
    }
}

function updateResultUI(data) {
    scoreDisplay.textContent = `${data.score}/100`;
    reasonDisplay.textContent = data.reason || '분석 근거 없음';
    biasPill.textContent = `성향: ${data.officialBias} (${data.category})`;
    activeProviderPill.textContent = `Provider: ${data.provider || settings.selectedProvider}`;
}

function collectFormIntoSettings() {
    const providerName = getCurrentProvider();
    const base = {
        ...(settings.providers[providerName] || {}),
        apiKey: apiKeyInput.value.trim(),
        model: modelInput.value.trim()
    };

    if (providerName === 'custom') {
        base.endpoint = endpointInput.value.trim();
        base.headerName = headerNameInput.value.trim() || 'Authorization';
        base.headerPrefix = headerPrefixInput.value;
    }

    settings.selectedProvider = providerName;
    settings.providers[providerName] = base;
}

function loadSettings() {
    chrome.runtime.sendMessage({ type: 'GET_PROVIDER_SETTINGS' }, (response) => {
        if (chrome.runtime.lastError || !response?.data) {
            setStatus('설정 로드 실패. 기본값을 사용합니다.', 'warn');
            providerSelect.value = settings.selectedProvider;
            applyProviderToForm(settings.selectedProvider);
            return;
        }

        settings = {
            ...DEFAULT_SETTINGS,
            ...response.data,
            providers: {
                ...DEFAULT_SETTINGS.providers,
                ...(response.data.providers || {})
            }
        };

        providerSelect.value = settings.selectedProvider;
        applyProviderToForm(settings.selectedProvider);
        activeProviderPill.textContent = `Provider: ${settings.selectedProvider}`;
    });
}

saveBtn.addEventListener('click', () => {
    collectFormIntoSettings();

    chrome.runtime.sendMessage({ type: 'SAVE_PROVIDER_SETTINGS', payload: settings }, (response) => {
        if (chrome.runtime.lastError || !response?.ok) {
            setStatus('설정 저장 실패', 'warn');
            return;
        }

        setStatus('설정이 저장되었습니다.', 'ok');
        activeProviderPill.textContent = `Provider: ${settings.selectedProvider}`;
    });
});

analyzeBtn.addEventListener('click', () => {
    collectFormIntoSettings();

    chrome.runtime.sendMessage({ type: 'SAVE_PROVIDER_SETTINGS', payload: settings }, (saveResp) => {
        if (chrome.runtime.lastError || !saveResp?.ok) {
            setStatus('분석 전 설정 저장에 실패했습니다.', 'warn');
            return;
        }

        scoreDisplay.textContent = '분석중...';
        reasonDisplay.textContent = '현재 탭 기사 분석을 시작했습니다.';

        chrome.runtime.sendMessage({ type: 'START_ANALYSIS_REQUEST' }, (response) => {
            if (chrome.runtime.lastError) {
                setStatus('분석 요청 실패', 'warn');
                reasonDisplay.textContent = '확장 프로그램 통신 오류가 발생했습니다.';
                return;
            }

            if (response?.error) {
                setStatus(response.error, 'warn');
                reasonDisplay.textContent = response.error;
                return;
            }

            setStatus('분석 요청을 보냈습니다. 잠시만 기다려주세요.', 'ok');
        });
    });
});

providerSelect.addEventListener('change', () => {
    applyProviderToForm(getCurrentProvider());
});

chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'RESULT_TO_POPUP') {
        updateResultUI(request.data);
        setStatus('분석 완료', 'ok');
    }
});

loadSettings();
