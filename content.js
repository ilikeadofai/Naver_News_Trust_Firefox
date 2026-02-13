function extractNewsInfo() {
    let mediaName = '알 수 없음';

    try {
        const mediaElement = document.querySelector('img.media_end_head_top_logo_img:nth-child(1)');
        if (mediaElement) {
            mediaName = (mediaElement.title || mediaElement.alt || '알 수 없음').trim();
        }
    } catch (e) {
        console.error('언론사 이름 추출 오류:', e);
    }

    let articleText = '';
    try {
        const articleBody = document.querySelector('article#dic_area');
        if (articleBody) {
            articleText = articleBody.innerText;
        }
    } catch (e) {
        console.error('기사 본문 추출 오류:', e);
    }

    if (mediaName !== '알 수 없음' && articleText.length > 100) {
        chrome.runtime.sendMessage(
            {
                type: 'ANALYZE_ARTICLE_REQUEST',
                mediaName,
                articleText: articleText.substring(0, 15000)
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    insertAnalysisResult({
                        score: 0,
                        officialBias: '분석 실패',
                        category: '',
                        reason: '확장 프로그램 통신 오류가 발생했습니다. 확장 프로그램을 다시 로드해주세요.',
                        provider: 'unknown'
                    });
                    return;
                }

                if (response?.data) {
                    insertAnalysisResult(response.data);
                } else {
                    insertAnalysisResult({
                        score: 0,
                        officialBias: '분석 실패',
                        category: '',
                        reason: response?.error || '알 수 없는 오류가 발생했습니다.',
                        provider: 'unknown'
                    });
                }
            }
        );
        return true;
    }

    return false;
}

function setupExtractionLoop() {
    let attemptCount = 0;
    const maxAttempts = 10;

    const loop = setInterval(() => {
        const success = extractNewsInfo();

        if (success) {
            clearInterval(loop);
        } else if (attemptCount++ >= maxAttempts) {
            clearInterval(loop);
            console.error('기사 콘텐츠 추출 최대 시도 횟수 초과.');
        }
    }, 500);
}

function createRow(label, value) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'flex-start';
    row.style.gap = '10px';
    row.style.marginBottom = '8px';

    const labelNode = document.createElement('strong');
    labelNode.textContent = `${label}:`;
    labelNode.style.minWidth = '90px';
    labelNode.style.color = '#334155';

    const valueNode = document.createElement('span');
    valueNode.textContent = value;
    valueNode.style.color = '#0f172a';
    valueNode.style.lineHeight = '1.6';

    row.appendChild(labelNode);
    row.appendChild(valueNode);

    return row;
}

function insertAnalysisResult(data) {
    const targetContainer = document.querySelector('div.outside_area_inner');
    if (!targetContainer) {
        return;
    }

    const existing = document.getElementById('ai-analysis-container');
    if (existing) existing.remove();

    const box = document.createElement('section');
    box.id = 'ai-analysis-container';
    box.style.marginBottom = '20px';
    box.style.padding = '16px';
    box.style.border = '1px solid #dbeafe';
    box.style.background = 'linear-gradient(135deg,#eff6ff,#f8fafc)';
    box.style.borderRadius = '12px';

    const title = document.createElement('h2');
    title.textContent = 'AI 디지털 신뢰 지수';
    title.style.margin = '0 0 10px 0';
    title.style.fontSize = '20px';
    title.style.fontWeight = '800';
    title.style.color = '#1d4ed8';

    const providerTag = document.createElement('div');
    providerTag.textContent = `분석 엔진: ${data.provider || 'unknown'}`;
    providerTag.style.display = 'inline-block';
    providerTag.style.padding = '3px 8px';
    providerTag.style.fontSize = '12px';
    providerTag.style.borderRadius = '999px';
    providerTag.style.border = '1px solid #bfdbfe';
    providerTag.style.marginBottom = '10px';

    box.appendChild(title);
    box.appendChild(providerTag);
    box.appendChild(createRow('신뢰도', `${data.score} / 100`));
    box.appendChild(createRow('언론사 성향', `${data.officialBias} (${data.category})`));
    box.appendChild(createRow('분석 근거', data.reason || '분석 근거가 없습니다.'));

    targetContainer.prepend(box);
}

setupExtractionLoop();

chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'TRIGGER_CONTENT_EXTRACTION') {
        setupExtractionLoop();
    }
});
