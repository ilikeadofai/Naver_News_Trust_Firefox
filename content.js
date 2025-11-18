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
        
        chrome.runtime.sendMessage({
            type: "ARTICLE_DATA",
            mediaName: mediaName,
            articleText: articleText.substring(0, 15000)
        });
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
    if (request.type === "TRIGGER_CONTENT_EXTRACTION") {
        setupExtractionLoop();
    }
});