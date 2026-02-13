# 🦊 AI 기반 디지털 신뢰 지수 (Firefox/Chromium 확장 프로그램)

네이버 뉴스 기사 텍스트의 **내부 논리 기반 신뢰도**와 **언론사 성향**을 표시하는 브라우저 확장 프로그램입니다.

## 주요 개선 사항 (v2)

- ✅ **Manifest V3 전환**: Firefox/Chromium 계열에서 동작하도록 구조 개선
- ✅ **멀티 LLM 지원**: Gemini, GPT(OpenAI), Claude, OpenRouter, Custom(OpenAI-Compatible)
- ✅ **제공자별 API 키/모델 저장**: 팝업에서 제공자 전환 및 설정 저장
- ✅ **UI 개선**: 팝업 및 기사 내 분석 카드 시각 개선

## 주의사항

- API 키는 브라우저 `storage.local`에 저장됩니다.
- 실제 서비스 배포 환경에서는 프록시 서버를 두고 키를 보호하는 방식을 권장합니다.

## 설치

1. 저장소 클론
2. 브라우저 확장 개발자 모드에서 로드
3. 팝업에서 제공자/모델/API 키 설정 저장
4. 네이버 뉴스 기사에서 “현재 탭 분석 시작” 클릭

## 지원 모델 API

- Gemini: `generativelanguage.googleapis.com`
- GPT(OpenAI): `api.openai.com`
- Claude(Anthropic): `api.anthropic.com`
- OpenRouter: `openrouter.ai`
- Custom: OpenAI 호환 Chat Completions Endpoint
