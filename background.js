const API_KEY_STORAGE_KEY = "geminiApiKey";

function getApiKey(callback) {
    chrome.storage.local.get([API_KEY_STORAGE_KEY], function(result) {
        callback(result[API_KEY_STORAGE_KEY] || null);
    });
}

async function callGeminiAPI(apiKey, articleText) {
    const PROMPT_BASE = `당신은 텍스트 일관성 및 논리 분석 전문가입니다. 다음 기사 텍스트를 분석하여 신뢰 점수(0-100)와 주요 판단 근거를 JSON으로 응답하세요. **주의: 외부 사실 관계(현재 일본 총리가 누구인지 등)를 확인하려 하지 말고, 오직 기사 텍스트 내부의 논리적 구조만을 근거로 평가하세요.** JSON 형식: {'score': XX, 'reason': '판단 근거 텍스트', 'ideology': '좌파적/우파적/중립'}`;
    const MODEL = 'gemini-2.5-flash-lite';
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const response = await fetch(
        API_URL,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
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
        
        resultText = resultText.replace(/```json\n|```\n/g, '').replace(/\n```/g, '').trim();
        
        try {
            return JSON.parse(resultText);
        } catch (e) {
            console.error("최종 JSON 파싱 실패. 원본 텍스트:", resultText);
            return { 
                score: 50, 
                reason: "Gemini 응답 파싱 오류 발생. (콘솔 확인 필요)", 
                ideology: "알 수 없음" 
            }; 
        }
    }
    throw new Error("API 응답 형식 오류");
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "ANALYZE_ARTICLE_REQUEST") {
        const { mediaName, articleText } = request;
        
        getApiKey(async (apiKey) => {
            if (!apiKey) {
                sendResponse({ error: "API 키를 설정해주세요." });
                return;
            }

            const matchedDbKey = findMatchingDbKey(mediaName);
            let officialBias = "미확인";
            let category = "기타";
            let customPrompt = null;

            if (matchedDbKey) {
                const mediaData = MEDIA_BIAS_DATABASE[matchedDbKey];
                officialBias = mediaData.bias;
                category = mediaData.category;
            } else {
                officialBias = "DB 미등록";
                category = "추론됨";
                customPrompt = `[언론사 이름: ${mediaName}] 이 기사의 신뢰도를 분석하세요. 추가적으로 이 언론사의 성향을 추론하세요.`;
            }

            try {
                const geminiResult = await callGeminiAPI(apiKey, articleText, customPrompt);
                
                const finalResult = {
                    score: geminiResult.score || 50,
                    officialBias: matchedDbKey ? officialBias : (geminiResult.ideology || "DB 미등록"),
                    articleTone: geminiResult.ideology || "중립",
                    reason: matchedDbKey ? geminiResult.reason : `[${mediaName} 성향 추론] ` + geminiResult.reason,
                    category: category
                };
                
                // 팝업으로도 결과 전송 (팝업이 열려 있을 경우를 대비)
                chrome.runtime.sendMessage({ type: "RESULT_TO_POPUP", data: finalResult });
                // content.js에 최종 결과 응답
                sendResponse({ data: finalResult });

            } catch (error) {
                console.error("API 처리 중 오류:", error);
                sendResponse({ error: error.message || "알 수 없는 분석 오류" });
            }
        });

        return true; // 비동기 응답을 위해 필수
    }
});