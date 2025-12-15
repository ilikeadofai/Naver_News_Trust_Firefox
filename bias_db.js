const MEDIA_BIAS_DATABASE = {
    // --- 진보 (좌파) 언론사 ---
    "한겨레신문": { bias: "진보", category: "종합" },
    "경향신문": { bias: "진보", category: "종합" },
    "프레시안": { bias: "진보", category: "인터넷신문" },
    "오마이뉴스": { bias: "진보", category: "인터넷신문" },
    "시사in": { bias: "진보", category: "잡지/인터넷신문" },
    "민중의소리": { bias: "진보", category: "인터넷신문" },
    "딴지일보": { bias: "진보", category: "인터넷신문" },
    "미디어오늘": { bias: "진보", category: "인터넷신문" },
    "뉴스타파": { bias: "진보", category: "인터넷신문" },
    "노컷뉴스": { bias: "진보", category: "종합" },
    "레디앙": { bias: "진보", category: "인터넷신문" },
    "미디어스": { bias: "진보", category: "인터넷신문" },
    "PD저널": { bias: "진보", category: "인터넷신문" },
    "이로운넷": { bias: "진보", category: "인터넷신문" },
    "참세상": { bias: "진보", category: "인터넷신문" },
    "뉴스토마토": { bias: "진보", category: "경제" },
    "허프포스트": { bias: "진보", category: "인터넷신문" },
    "주간경향": { bias: "진보", category: "잡지" },
    "폴리뉴스": { bias: "진보", category: "인터넷신문" },
    "뷰스앤뉴스": { bias: "진보", category: "인터넷신문" },
    "팩트TV": { bias: "진보", category: "인터넷신문" },
    "한겨레21": { bias: "진보", category: "잡지" },
    "MBC": { bias: "진보", category: "방송" },
    "CBS": { bias: "진보", category: "방송" },
    "JTBC": { bias: "중도~진보", category: "방송" }, // 중도진보로 변경
    "머니투데이": { bias: "진보", category: "경제" },
    "이데일리": { bias: "진보", category: "경제" },

    // --- 보수 (우파) 언론사 ---
    "조선일보": { bias: "보수", category: "종합" },
    "중앙일보": { bias: "보수", category: "종합" },
    "동아일보": { bias: "보수", category: "종합" },
    "문화일보": { bias: "보수", category: "종합" },
    "국민일보": { bias: "보수", category: "종합" },
    "세계일보": { bias: "보수", category: "종합" },
    "TV조선": { bias: "강한 보수", category: "방송" },
    "채널A": { bias: "중도~보수", category: "방송" },
    "MBN": { bias: "중도~보수", category: "방송" },
    "뉴데일리": { bias: "보수", category: "인터넷신문" },
    "데일리안": { bias: "보수", category: "인터넷신문" },
    "독립신문": { bias: "보수", category: "인터넷신문" },
    "브레이크뉴스": { bias: "보수", category: "인터넷신문" },
    "데일리NK": { bias: "보수", category: "인터넷신문" },
    "쿠키뉴스": { bias: "보수", category: "인터넷신문" },
    "아시아투데이": { bias: "보수", category: "종합" },
    "한국경제": { bias: "보수", category: "경제" },
    "매일경제": { bias: "보수", category: "경제" },
    "서울경제": { bias: "보수", category: "경제" },
    "헤럴드경제": { bias: "보수", category: "경제" },
    "아시아경제": { bias: "보수", category: "경제" },
    "이투데이": { bias: "보수", category: "경제" },
    "주간조선": { bias: "보수", category: "잡지" },
    "주간동아": { bias: "보수", category: "잡지" },
    "펜앤드마이크": { bias: "보수", category: "인터넷신문" },
    "뉴스타운": { bias: "보수", category: "인터넷신문" },
    "미래한국": { bias: "보수", category: "인터넷신문" },
    "월간조선": { bias: "보수", category: "잡지" },
    "신동아": { bias: "보수", category: "잡지" },

    // --- 중도 언론사 ---
    "한국일보": { bias: "중도", category: "종합" },
    "서울신문": { bias: "중도", category: "종합" },
    "내일신문": { bias: "중도", category: "종합" },
    "뉴시스": { bias: "중도", category: "통신사" },
    "파이낸셜뉴스": { bias: "중도", category: "경제" },
    "SBS": { bias: "중도", category: "방송" },
    "연합뉴스": { bias: "중도", category: "통신사" }, // 일반 연합뉴스
    "연합뉴스TV": { bias: "중립(정부)", category: "방송" }, // 중립정부 성향 반영
    "YTN": { bias: "중도~진보", category: "방송" } // 중도진보로 변경
};

// 문자열 정규화 함수 (띄어쓰기/대소문자 제거)
function normalizeString(str) {
    if (!str) return '';
    return str.replace(/\s/g, '').toLowerCase(); 
}

// DB 키를 정규화된 형태로 미리 준비
const NORMALIZED_DB_KEYS = (() => {
    const normalized = {};
    for (const key in MEDIA_BIAS_DATABASE) {
        const normalizedKey = normalizeString(key);
        normalized[normalizedKey] = key;
    }
    return normalized;
})();

// 언론사 이름을 받아 DB에서 매칭되는 실제 키를 반환하는 함수
function findMatchingDbKey(mediaName) {
    const normalizedInput = normalizeString(mediaName);
    if (NORMALIZED_DB_KEYS[normalizedInput]) {
        return NORMALIZED_DB_KEYS[normalizedInput];
    }
    return null;
}