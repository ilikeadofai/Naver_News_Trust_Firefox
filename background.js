importScripts('bias_db.js');

const PROVIDER_STORAGE_KEY = 'llmProviderSettings';

const DEFAULT_PROVIDER_SETTINGS = {
    selectedProvider: 'gemini',
    providers: {
        gemini: {
            apiKey: '',
            model: 'gemini-2.5-flash-lite'
        },
        gpt: {
            apiKey: '',
            model: 'gpt-4o-mini'
        },
        claude: {
            apiKey: '',
            model: 'claude-3-5-sonnet-latest'
        },
        openrouter: {
            apiKey: '',
            model: 'openai/gpt-4o-mini'
        },
        custom: {
            apiKey: '',
            model: 'gpt-4o-mini',
            endpoint: 'https://api.openai.com/v1/chat/completions',
            headerName: 'Authorization',
            headerPrefix: 'Bearer '
        }
    }
};

function storageGet(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve);
    });
}

function normalizeGeminiJson(text) {
    if (!text) return '';

    return text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
}

function parseModelJson(text) {
    const normalized = normalizeGeminiJson(text);

    try {
        return JSON.parse(normalized);
    } catch (_error) {
        const objectLike = normalized.match(/\{[\s\S]*\}/);
        if (objectLike) {
            return JSON.parse(objectLike[0]);
        }
        throw new Error('모델 응답을 JSON으로 변환할 수 없습니다.');
    }
}

function getPrompt(articleText, mediaName, matchedDbKey) {
    const basePrompt = [
        '당신은 기사 텍스트 내부 논리 분석 전문가입니다.',
        '외부 사실 확인은 하지 말고 오직 제공된 텍스트의 논리적 일관성만 평가하세요.',
        '반드시 JSON으로만 답변하세요.',
        "형식: {'score': 0-100 숫자, 'reason': '간결한 판단 근거', 'ideology': '좌파적/우파적/중립'}"
    ].join(' ');

    if (!matchedDbKey) {
        return `${basePrompt}\n[언론사 이름: ${mediaName}] 기사 신뢰도를 분석하고 언론 성향도 추론하세요.\n\n기사 텍스트:\n${articleText}`;
    }

    return `${basePrompt}\n\n기사 텍스트:\n${articleText}`;
}

function getProviderSettings() {
    return storageGet([PROVIDER_STORAGE_KEY]).then((result) => {
        const saved = result[PROVIDER_STORAGE_KEY] || {};

        return {
            selectedProvider: saved.selectedProvider || DEFAULT_PROVIDER_SETTINGS.selectedProvider,
            providers: {
                ...DEFAULT_PROVIDER_SETTINGS.providers,
                ...(saved.providers || {})
            }
        };
    });
}

async function callProvider(providerName, providerConfig, prompt) {
    let url = '';
    let method = 'POST';
    let headers = { 'Content-Type': 'application/json' };
    let body = null;

    if (!providerConfig.apiKey) {
        throw new Error(`${providerName} API 키를 먼저 저장해주세요.`);
    }

    switch (providerName) {
        case 'gemini': {
            const model = providerConfig.model || 'gemini-2.5-flash-lite';
            url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
            headers['x-goog-api-key'] = providerConfig.apiKey;
            body = {
                contents: [{ parts: [{ text: prompt }] }]
            };
            break;
        }
        case 'gpt': {
            url = 'https://api.openai.com/v1/chat/completions';
            headers.Authorization = `Bearer ${providerConfig.apiKey}`;
            body = {
                model: providerConfig.model || 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2
            };
            break;
        }
        case 'claude': {
            url = 'https://api.anthropic.com/v1/messages';
            headers['x-api-key'] = providerConfig.apiKey;
            headers['anthropic-version'] = '2023-06-01';
            body = {
                model: providerConfig.model || 'claude-3-5-sonnet-latest',
                max_tokens: 700,
                messages: [{ role: 'user', content: prompt }]
            };
            break;
        }
        case 'openrouter': {
            url = 'https://openrouter.ai/api/v1/chat/completions';
            headers.Authorization = `Bearer ${providerConfig.apiKey}`;
            body = {
                model: providerConfig.model || 'openai/gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2
            };
            break;
        }
        case 'custom': {
            url = providerConfig.endpoint || '';
            if (!url) {
                throw new Error('커스텀 API Endpoint를 입력해주세요.');
            }
            const headerName = providerConfig.headerName || 'Authorization';
            const headerPrefix = providerConfig.headerPrefix || 'Bearer ';
            headers[headerName] = `${headerPrefix}${providerConfig.apiKey}`;
            body = {
                model: providerConfig.model || 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2
            };
            break;
        }
        default:
            throw new Error('지원하지 않는 제공자입니다.');
    }

    const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        console.error('Provider API Error:', providerName, response.status, data);
        throw new Error(`${providerName} API 오류 (${response.status})`);
    }

    let rawText = '';

    if (providerName === 'gemini') {
        rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (providerName === 'claude') {
        rawText = data?.content?.[0]?.text || '';
    } else {
        rawText = data?.choices?.[0]?.message?.content || '';
    }

    if (!rawText) {
        throw new Error('모델 응답이 비어 있습니다.');
    }

    return parseModelJson(rawText);
}

function triggerAnalysisOnActiveTab(sendResponse) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs?.[0];

        if (!activeTab?.id) {
            sendResponse({ error: '활성 탭을 찾을 수 없습니다.' });
            return;
        }

        chrome.tabs.sendMessage(activeTab.id, { type: 'TRIGGER_CONTENT_EXTRACTION' }, () => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: '현재 페이지에서 분석할 수 없습니다. 네이버 뉴스 기사 페이지에서 실행해주세요.' });
                return;
            }
            sendResponse({ ok: true });
        });
    });
}

async function analyzeArticle({ mediaName, articleText }) {
    const settings = await getProviderSettings();
    const selectedProvider = settings.selectedProvider || 'gemini';
    const providerConfig = settings.providers[selectedProvider] || {};

    const matchedDbKey = findMatchingDbKey(mediaName);
    let officialBias = '미확인';
    let category = '기타';

    if (matchedDbKey) {
        const mediaData = MEDIA_BIAS_DATABASE[matchedDbKey];
        officialBias = mediaData.bias;
        category = mediaData.category;
    } else {
        officialBias = 'DB 미등록';
        category = '추론됨';
    }

    const prompt = getPrompt(articleText, mediaName, matchedDbKey);
    const modelResult = await callProvider(selectedProvider, providerConfig, prompt);

    const reasonText = modelResult.reason || '분석 근거를 생성하지 못했습니다.';

    return {
        score: Number(modelResult.score) || 50,
        officialBias: matchedDbKey ? officialBias : (modelResult.ideology || 'DB 미등록'),
        articleTone: modelResult.ideology || '중립',
        reason: matchedDbKey ? reasonText : `[${mediaName} 성향 추론] ${reasonText}`,
        category,
        provider: selectedProvider
    };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'START_ANALYSIS_REQUEST') {
        triggerAnalysisOnActiveTab(sendResponse);
        return true;
    }

    if (request.type === 'GET_PROVIDER_SETTINGS') {
        getProviderSettings().then((settings) => sendResponse({ data: settings }));
        return true;
    }

    if (request.type === 'SAVE_PROVIDER_SETTINGS') {
        chrome.storage.local.set({ [PROVIDER_STORAGE_KEY]: request.payload }, () => {
            sendResponse({ ok: true });
        });
        return true;
    }

    if (request.type === 'ANALYZE_ARTICLE_REQUEST') {
        analyzeArticle(request)
            .then((finalResult) => {
                chrome.runtime.sendMessage({ type: 'RESULT_TO_POPUP', data: finalResult });
                sendResponse({ data: finalResult });
            })
            .catch((error) => {
                console.error('API 처리 중 오류:', error);
                sendResponse({ error: error.message || '알 수 없는 분석 오류' });
            });
        return true;
    }
});
