const API_KEY_STORAGE_KEY = "geminiApiKey";

function getApiKey(callback) {
    chrome.storage.local.get([API_KEY_STORAGE_KEY], function(result) {
        callback(result[API_KEY_STORAGE_KEY] || null);
    });
}

async function callGeminiAPI(apiKey, articleText) {
    const PROMPT_BASE = `당신은 텍스트 일관성 및 논리 분석 전문가입니다. 당신은 주어진 대한민국의 뉴스 기사의 텍스트를 비판적이고 논리적으로 비평하는 능력을 가졌습니다. 당신은 뉴스 기사에 내포되어 있는 뜻을 정확히 통찰하는 능력을 가졌습니다. 대한민국의 뉴스는 정치적인 목적으로 편향되어 작성될 수 있다는 것을 알아두세요. 언론사의 진보/보수/중립 성향을 평가할 때는 기사의 텍스트만 참고하지 말고 대중적인 인식과 사전 지식을 고려하여 평가하세요. 다음 기사 텍스트를 분석하여 신뢰 점수(0-100, 약간 비판적으로 평가)와 주요 판단 근거(200자 내외)를 JSON으로 응답하세요. **주의: 외부 사실 관계(현재 일본 총리가 누구인지 등)를 확인하려 하지 마세요.** JSON 형식: {'score': XX, 'reason': '판단 근거 텍스트', 'ideology': '진보/보수/중립'}`;
    const MODEL = 'gemini-2.5-flash-lite'; // 기본 모델
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const response = await fetch(
        API_URL,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey // API 키를 헤더에 포함
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: PROMPT_BASE + "\n\n기사 텍스트:\n" + articleText }] }]
            })
        }
    );

    if (response.status === 404) {
        console.error("Gemini API 404 Error: API Endpoint 또는 Model Name을 확인하세요. (모델명: " + MODEL + ")");
        throw new Error("API 404 Error");
    }
    
    const data = await response.json();
    
    if (!response.ok) { 
        console.error("Gemini API HTTP Error:", response.status, response.statusText, data);
        throw new Error(`API 통신 오류: ${response.status}`);
    }

    if (data.candidates && data.candidates.length > 0) {
        let resultText = data.candidates[0].content.parts[0].text;
        
        // 마크다운 제거 로직 (파싱 오류 방지)
        resultText = resultText.replace(/```json\n|```\n/g, '').replace(/\n```/g, '').trim();
        
        try {
            return JSON.parse(resultText);
        } catch (e) {
            console.error("최종 JSON 파싱 실패. 원본 텍스트:", resultText);
            throw new Error("파싱 오류");
        }
    }
    throw new Error("API 응답 형식 오류");
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "ARTICLE_DATA") {
        const { mediaName, articleText } = request;
        
        const matchedDbKey = findMatchingDbKey(mediaName);
        let officialBias = "미확인";
        let category = "기타";
        
        if (matchedDbKey) {
            const mediaData = MEDIA_BIAS_DATABASE[matchedDbKey];
            officialBias = mediaData.bias;
            category = mediaData.category;
            
            getApiKey(async (apiKey) => {
                if (!apiKey) {
                     chrome.runtime.sendMessage({
                        type: "RESULT_TO_POPUP",
                        data: { score: 0, officialBias: officialBias, reason: "API 키를 설정해주세요.", category: category }
                    });
                    return;
                }
                try {
                    const geminiResult = await callGeminiAPI(apiKey, articleText);
                    const finalResult = {
                        score: geminiResult.score || 50,
                        officialBias: officialBias,
                        articleTone: geminiResult.ideology || "중립",
                        reason: geminiResult.reason || "분석 완료",
                        category: category
                    };
                    chrome.runtime.sendMessage({ type: "RESULT_TO_POPUP", data: finalResult });
                } catch (error) {
                     console.error("DB 등록 언론사 처리 중 오류:", error);
                     chrome.runtime.sendMessage({ type: "RESULT_TO_POPUP", data: { score: 0, officialBias: officialBias, reason: "분석 API 통신 오류 발생", category: category }});
                }
            });
            
        } else {
            // DB에 없는 언론사일 경우, API 이용 직접 성향 분석 요청
            
            getApiKey(async (apiKey) => {
                if (!apiKey) {
                     chrome.runtime.sendMessage({
                        type: "RESULT_TO_POPUP",
                        data: { score: 0, officialBias: "미확인", reason: "API 키를 설정해주세요.", category: "기타" }
                    });
                    return;
                }
                
                try {
                    // DB 미등록 시 성향 추론 요청 포함
                    const customPromptText = `[언론사 이름: ${mediaName}] 이 기사의 신뢰도를 분석하세요. 추가적으로 이 언론사의 성향을 추론하세요.`;
                    const geminiResult = await callGeminiAPI(apiKey, customPromptText + "\n\n기사 텍스트:\n" + articleText);
                    
                    const finalResult = {
                        score: geminiResult.score || 50,
                        officialBias: geminiResult.ideology || "DB 미확인",
                        articleTone: geminiResult.ideology || "중립",
                        reason: `[${mediaName} 성향 추론] ` + geminiResult.reason,
                        category: "추론됨"
                    };
                    chrome.runtime.sendMessage({ type: "RESULT_TO_POPUP", data: finalResult });
                } catch (error) {
                     console.error("DB 미등록 언론사 처리 중 오류:", error);
                     chrome.runtime.sendMessage({ type: "RESULT_TO_POPUP", data: { score: 0, officialBias: "미확인", reason: "DB 미등록 언론사 분석 API 오류", category: "추론됨" }});
                }
            });
        }
        
        return true;
    }
    
    if (request.type === "START_ANALYSIS_REQUEST") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs) {
                chrome.tabs.sendMessage(tabs.id, { type: "TRIGGER_CONTENT_EXTRACTION" });
            }
        });
    }
});