function extractNewsInfo() {
    let mediaName = '알 수 없음';
    
    try {
        const mediaElement = document.querySelector('img.media_end_head_top_logo_img:nth-child(1)'); 
        if (mediaElement) {
            if (mediaElement.title && mediaElement.title.trim() !== '') {
                 mediaName = mediaElement.title.trim();
            } else if (mediaElement.alt && mediaElement.alt.trim() !== '') {
                 mediaName = mediaElement.alt.trim();
            }
        }
    } catch(e) {
        console.error("언론사 이름 추출 오류:", e);
    }
    
    let articleText = '';
    try {
        const articleBody = document.querySelector('article#dic_area'); 
        if (articleBody) {
            articleText = articleBody.innerText;
        }
    } catch(e) {
        console.error("기사 본문 추출 오류:", e);
    }

    if (mediaName !== '알 수 없음' && articleText.length > 100) {
        console.log("✅ 추출 성공: 언론사 =", mediaName, "텍스트 길이 =", articleText.length);
        
        // ★★★ 여기가 핵심 수정 지점 ★★★
        // background.js에 분석을 '요청'하고, '응답'을 기다림
        chrome.runtime.sendMessage(
            {
                type: "ANALYZE_ARTICLE_REQUEST", // 요청 타입 이름 변경
                mediaName: mediaName,
                articleText: articleText.substring(0, 15000)
            }, 
            (response) => { // 응답을 받았을 때 실행되는 콜백 함수
                if (response.data) {
                    // 성공적으로 결과를 받으면 페이지에 삽입
                    insertAnalysisResult(response.data);
                } else if (response.error) {
                    // 에러가 발생하면 에러 메시지를 포함하여 삽입
                    insertAnalysisResult({ 
                        score: 0, 
                        officialBias: '분석 실패', 
                        category: '', 
                        reason: response.error 
                    });
                }
            }
        );
        return true;
    } else {
        console.log("❌ 추출 실패 (재시도 예정): 언론사 =", mediaName, "텍스트 길이 =", articleText.length);
        return false;
    }
}

function setupExtractionLoop() {
    let attemptCount = 0;
    const maxAttempts = 10;
    const intervalTime = 500;

    const loop = setInterval(() => {
        const success = extractNewsInfo();
        
        if (success) {
            clearInterval(loop);
        } else if (attemptCount++ >= maxAttempts) {
            clearInterval(loop);
            console.error("기사 콘텐츠 추출 최대 시도 횟수 초과.");
        }
    }, intervalTime);
}

setupExtractionLoop(); 

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    console.log("📬 content.js: 메시지 수신됨", request);

    if (request.type === "TRIGGER_CONTENT_EXTRACTION") {
        setupExtractionLoop();
    }
    
    if (request.type === "RESULT_TO_CONTENT") {
        insertAnalysisResult(request.data);
    }
});

// content.js 파일 내의 insertAnalysisResult 함수를 아래 코드로 교체합니다.

// content.js 파일 내의 insertAnalysisResult 함수를 아래 코드로 교체합니다.

// content.js 파일 내의 insertAnalysisResult 함수를 아래 코드로 교체합니다.

function insertAnalysisResult(data) {
    const targetContainer = document.querySelector('div.outside_area_inner');
    if (!targetContainer) {
        console.error("AI 분석 결과를 삽입할 위치를 찾지 못했습니다.");
        return;
    }
    
    const existingResult = document.getElementById('ai-analysis-container');
    if (existingResult) {
        existingResult.remove();
    }
    
    const resultContainer = document.createElement('div');
    resultContainer.id = 'ai-analysis-container';
    // 별도의 배경이나 테두리 없이, 아래 헤드라인과 자연스럽게 이어지도록 여백만 추가
    resultContainer.style.marginBottom = "24px"; 

    // --- ★★★ "헤드라인" 스타일을 모방한 HTML 템플릿 ★★★ ---
    resultContainer.innerHTML = `
        <div>
            <!-- 제목: 파란색, 굵은 글씨로 헤드라인 스타일 모방 -->
            <div class="border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
                <h2 class="text-lg font-bold text-blue-600 dark:text-blue-400">AI 디지털 신뢰 지수</h2>
            </div>
            
            <div class="space-y-4">
                <!-- 신뢰도: 레이블과 점수를 한 줄로 배치, 폰트 크기 조정 -->
                <div class="flex items-baseline">
                    <span class="w-20 font-semibold text-gray-700 dark:text-gray-300">신뢰도</span>
                    <span class="text-xl font-bold text-gray-900 dark:text-white">${data.score}</span>
                    <span class="text-base text-gray-500 dark:text-gray-400 ml-1">/ 100</span>
                </div>
                
                <!-- 언론사 성향 -->
                <div class="flex items-start">
                    <span class="w-20 font-semibold text-gray-700 dark:text-gray-300">언론사 성향</span>
                    <p class="flex-1 text-gray-800 dark:text-gray-300">${data.officialBias} (${data.category})</p>
                </div>
                
                <!-- 분석 근거 -->
                <div class="flex items-start">
                    <span class="w-20 font-semibold text-gray-700 dark:text-gray-300">분석 근거</span>
                    <p class="flex-1 text-gray-800 dark:text-gray-300 leading-relaxed">
                        ${data.reason}
                    </p>
                </div>
            </div>
        </div>
    `;
    // --- ★★★ 수정 끝 ★★★ ---

    if (!document.querySelector('script[src="https://cdn.tailwindcss.com?plugins=forms,typography"]')) {
        const tailwindScript = document.createElement('script');
        tailwindScript.src = "https://cdn.tailwindcss.com?plugins=forms,typography";
        document.head.appendChild(tailwindScript);
    }
    
    targetContainer.prepend(resultContainer);
}