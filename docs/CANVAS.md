# BOTTOPIA Canvas

이미지 및 15초·30초 영상의 최신 선택은 [웹 연동 API 최저 견적](API_LOWEST_SELECTION.md)에, 전체 영상 후보는 [영상 API 가격 비교](VIDEO_API_PRICING.md)에 정리했다. 기존 제공자 설정과 신규 후보의 구현 여부를 구분한다.

노드에 프롬프트와 미디어를 놓고 연결해 생성 입력을 구성한다. 프로젝트와 실제 미디어는 브라우저 IndexedDB에 저장되며 계정별 공간을 나눈다. 서버 프로젝트 저장·기기간 동기화는 구현 범위에 포함되지 않는다. 다른 브라우저로 옮기거나 브라우저 데이터를 지우기 전에는 미디어가 포함된 프로젝트 파일로 내보낸다. 작업 영수증과 임시 파일 URL은 영구 보관을 대신하지 않는다.

## 캔버스 화면과 연결

로그인 후 `/tools?tab=canvas`에서 연다. 현재 NEWTAKE 화면을 참고해 전체 작업면, 하단 중앙 도구 모음, 좌하단 보기 도구, 가로 미디어 카드와 선택한 노드 아래의 생성 패널로 구성했다. 다른 창작 도구는 상단 왼쪽 메뉴에서 열며, 방문한 작업실은 탭 전환 중에도 유지한다.

- 하단 ＋ 또는 빈 공간 더블클릭으로 노드를 추가한다. 출력 ＋를 기존 입력 ＋에 끌어 연결하거나, 빈 곳에 놓고 호환 노드를 골라 생성과 연결을 함께 수행한다.
- 선택한 노드 아래에서 참조·프롬프트·모델·비율·해상도·길이·오디오·예상 사용료를 확인한다. 생성은 명시적인 ↑ 버튼으로만 실행한다. 참조 미디어 추가는 별도 노드와 연결을 만들며, 노드 자체 파일 교체·내려받기는 상세 메뉴에 둔다.
- 선택 문맥 메뉴에서 복제·삭제·그룹을 사용한다. 보기 도구는 확대, 노드 정리, 미니맵, 연결선 표시, 격자 맞추기를 제공한다. 미니맵은 클릭과 방향키로 이동한다.
- 생성 기록은 현재 기기의 작업 미디어 목록이다. NEWTAKE의 공유·게시·MCP·Agent·스토리보드 전체 기능이 구현됐다는 뜻은 아니다.

브라우저 검수는 별도 로컬 fixture의 모의 API로 수행하며, 운영 인증을 우회하거나 실제 생성 비용을 쓰지 않는다. Vercel Preview는 프로젝트의 로그인 보호를 유지한다.

## 서버 설정

기존 Supabase 설정, `works` 버킷, 사이트 소유자 설정, 기존 요청 제한 기능이 필요하다. 이 기능을 위해 새 DB 스키마나 저장소 권한을 추가하지 않았다. API 키는 서버 환경에만 둔다. `NEXT_PUBLIC_` 변수, 브라우저 코드, 프로젝트 내보내기 파일에 넣지 않는다. 빈 키·미설정 상태에서는 실제 생성이 동작하지 않는다.

| 변수 | 용도 |
| --- | --- |
| `KIE_API_KEY` | 이미지 모델 3종의 Kie 서버 키 |
| `OPENSAND_API_KEY` | 저가 영상 후보 OpenSand 키; 현재 규격 확인 대기로 사용 차단 |
| `BEATAPI_API_KEY` | 명시적으로 Beat를 선택할 때 사용하는 영상 서버 키 |
| `CANVAS_VIDEO_PROVIDER` | `opensand` 또는 `beat`; 미설정 기본값은 `opensand` |
| `CANVAS_GENERATION_ENABLED` | 정확히 `true`일 때만 소유자 유료 생성 허용; 기본 꺼짐 |
| `CANVAS_JOB_SECRET` | 선택 사항, 32자 이상의 독립 작업 서명 키 |

[.env.example](../.env.example)의 Canvas 키는 비어 있다. 선택적인 영상 제공자 행은 주석 처리했다. `CANVAS_VIDEO_PROVIDER`를 설정한다면 유효한 값을 명시한다. 빈 문자열은 미설정과 달리 설정 오류로 처리된다. 유료 생성을 켜는 작업은 이 문서 작성·테스트 과정에서 실행하지 않았다.

OpenSand는 현재 코드의 기본 영상 제공자 설정이다. 공개 모델 표에 정확한 `doubao-seedance-2-5-260628`과 낮은 종량제 요금이 있지만, 같은 문서의 생성 요청 표는 2.0으로 표시되어 2.5 전용 요청 규격을 확정할 수 없었다. 따라서 **키와 생성 활성화 설정이 있어도 `canGenerate=false`이며, 제출·조회 어댑터는 외부 호출 없이 503을 반환한다.** 화면의 임시 참조 제한도 검증된 2.5 API 기능을 뜻하지 않는다. [OpenSand 문서](https://opensand.ai/manual/video-generation/video-doubao-seedance)

Beat를 사용하려면 서버에서 `CANVAS_VIDEO_PROVIDER=beat`와 해당 키를 명시한다. 정확한 표준 모델 `seedance-2.5`의 문서에 맞춘 어댑터와 가짜 응답 테스트는 준비되어 있다. 실제 계정 접근·생성·품질·최종 청구를 검증한 상태는 아니다. 다른 모델이나 더 비싼 제공자로 자동 전환하지 않는다. [Beat 계약](https://docs.beatapi.io/api-reference/video-api/seedance-2-5)

`GET /api/canvas/models`의 `connected`는 키 설정 유무다. 실제 사용 가능 여부는 소유자, 키, 생성 활성화, 제공자 규격 검증을 모두 반영한 각 모델의 `canGenerate`와 `configurationNote`로 판단한다. 일반 회원과 비로그인 사용자의 유료 생성 요청은 허용되지 않는다.

## 작업 영수증과 참조 파일

- 생성 응답의 영수증은 소유자·제공자·모델·작업 ID·발급 시각을 HMAC으로 묶고 7일간 유효하다. 만료된 영수증으로 재조회하거나 참조할 수 없으므로 결과 파일을 별도로 보관한다.
- 독립 서명 키가 없으면 해당 제공자의 API 키에서 문맥별 HMAC을 도출한다. 이때 API 키를 교체하면 이전 영수증도 무효화된다. 독립 서명 키를 쓰면 API 키 교체와 서명을 분리할 수 있지만, 서명 키 자체를 교체하면 기존 영수증이 무효화된다. 이전 작업 조회에는 유효한 제공자 키가 계속 필요하다.
- 참조는 내 `canvas/<owner>/<uuid>.<ext>` 파일 또는 서명된 완료 작업의 출력만 허용한다. 클라이언트가 임의 URL·제공자·콜백 주소를 넘길 수 없다.
- 파일은 메타데이터만 서버에 보내 업로드 티켓을 받은 뒤 브라우저에서 Supabase에 직접 전송한다. 이미지 10MiB, 영상 50MiB, 오디오 15MiB까지 허용하며 생성 직전 실제 저장소 크기·MIME·종류를 다시 확인한다. 참조 다운로드 URL은 1시간으로 서명한다.
- 부분 업로드 실패 시 클라이언트가 업로드한 참조의 삭제를 시도한다. 삭제 요청도 실패하거나 브라우저가 종료되면 임시 파일이 남을 수 있다. 보관한 키를 확인해 내 Canvas 경로만 다시 정리한다. 자동 서버 만료·청소 작업은 설정하지 않았다. `DELETE /api/canvas/assets`는 요청 목록 중 하나라도 소유 경로가 아니면 전체를 거절한다.
- 제출 타임아웃·연결 끊김은 이미 과금 작업이 접수된 상태일 수 있다. **유료 POST를 자동 재시도하지 않는다.** 영수증이 있으면 같은 영수증으로 상태만 조회하고, 없으면 제공자의 작업 기록을 확인한 뒤 새 제출 여부를 판단한다.

## 현재 모델과 이미지 참조 요금

사용자 작업 기준은 씨드림 프로 5.0·씨드림 5.5 **2K**다. 새 이미지 노드와 씨드림 모델로 바꿀 때 2K를 기본 선택한다. 나노바나나 2.1은 **1K·2K·4K**를 선택할 수 있다.

2026-11-26 공개 일반 요금 기준이다. 아래 금액은 계정에서 실제 결제한 영수증이 아니다. 충전 보너스·세금·환전 수수료는 반영하지 않는다. `n`은 참조 이미지 수이며 0–10장까지 지원한다.

| 모델 | 작업 해상도·출력 요금(USD/장) | 참조 요금 | 지정 해상도에서 0장 / 5장 / 10장 참조 |
| --- | --- | --- | --- |
| [씨드림 프로 5.0](https://kie.ai/seedream-5-0-pro) | 2K $0.070 | 첫 장 무료, `max(0,n−1)×$0.0025` | $0.070 / $0.080 / $0.0925 |
| [씨드림 5.5](https://kie.ai/seedream-5-5?model=seedream%2F5-5-image-to-image) | 2K $0.0315 | 첫 장부터 `n×$0.0072` | $0.0315 / $0.0675 / $0.1035 |
| [나노바나나 2.1](https://kie.ai/nano-banana-2-1) | 최대 4K $0.045 (1K $0.020, 2K $0.030) | 별도 참조 요금이 현재 표에 표시되지 않음 | 4K: $0.045 / $0.045 / $0.045 |

참조가 많아지면 처음에 싼 모델이 계속 가장 싼 것은 아니다. 예를 들어 2K 씨드림 5.5는 참조 8장에서 $0.0891로 프로 5.0의 $0.0875보다 높아진다. 화면 견적은 선택한 모델·해상도·참조 수로 다시 계산한다.

Beat 영상 참조는 최대 이미지 30장·영상 10개·오디오 10개이며 영상·오디오는 각각 총 30초다. 영상 참조가 없을 때의 16:9 근사치는 720p $0.194/출력초, 1080p $0.481/출력초다. 영상 참조가 있으면 약 $0.117/$0.287에 입력·출력 영상 길이를 합산하며 짧은 참조의 최소 청구가 적용될 수 있다. 이미지·오디오 참조와 오디오 생성 자체의 추가 요금은 없다. 따라서 근사 계산은 청구 상한이 아니다. OpenSand 영상 참조 비용은 현재 앱에서 확정 견적을 제공하지 않는다.

## 씨댄스 2.5 표준 API 조사: 14개 주요 경로

조건은 영상 참조 없음, 16:9, 오디오 생성 켬, 5초/10초, 목표 24fps다. I2V는 16:9 첫 프레임을 전제로 한다. 토큰 행은 명목 1280×720 또는 1920×1080으로 계산한 **추정액**이며 실제 출력 크기·추가 프레임·토큰 사용량에 따라 달라진다. 일부 게이트웨이는 자체 출력 fps를 명시하지 않아 모든 경로가 실제로 같은 24fps를 출력한다고 검증하지 못했다. 아래 비교만으로 전 세계 절대 최저를 주장하지 않는다.

| 제공자·1차 출처 | 720p 5초 / 10초(USD) | 1080p 5초 / 10초(USD) | 근거·한계 |
| --- | --- | --- | --- |
| [OpenSand domestic China](https://opensand.ai/pricing) | ≈$0.936 / ≈$1.872 | ≈$2.303 / ≈$4.606 | 중국 경로, 정확한 2.5 요청 규격 미확인·현재 차단 |
| [BeatAPI](https://docs.beatapi.io/api-reference/video-api/seedance-2-5) | ≈$0.970 / ≈$1.940 | ≈$2.405 / ≈$4.810 | 공식 초당 근사치; 어댑터 준비, 실생성 미검증 |
| [BytePlus ModelArk](https://docs.byteplus.com/en/docs/modelark/model-pricing) | ≈$1.156 / ≈$2.311 | ≈$2.843 / ≈$5.686 | 공식 토큰 요금 |
| [ByteDance Seed enterprise](https://seed.bytedance.com/en/seedance-enterprise/api) | ≈$1.387 / ≈$2.773 | ≈$3.412 / ≈$6.823 | ModelArk와 별도 판매 경로 |
| [Volcengine China](https://docs.volcengine.com/docs/ark/model-pricing?lang=zh) | ≈$1.132 / ≈$2.265 | ≈$2.803 / ≈$5.606 | CNY 요금을 참고 환율로 변환 |
| [Replicate](https://replicate.com/bytedance/seedance-2.5) | ≈$1.156 / ≈$2.312 | 미확인/불가 / 미확인/불가 | 현재 API schema는 1080p 미지원 |
| [fal](https://fal.ai/models/bytedance/seedance-2.5/text-to-video) | ≈$2.311 / ≈$4.622 | ≈$5.686 / ≈$11.372 | 명목 픽셀·24fps 토큰식 추정 |
| [Kie.ai](https://kie.ai/seedance-2-5) | ≈$1.575 / ≈$3.150 | ≈$3.950 / ≈$7.900 | 일반 크레딧 요금 |
| [WaveSpeedAI](https://wavespeed.ai/models/bytedance/seedance-2.5/text-to-video) | ≈$1.800 / ≈$3.600 | ≈$4.500 / ≈$9.000 | 행사 전 일반가 |
| [reAPI official direct](https://reapi.ai/models/seedance-2-5) | ≈$1.225 / ≈$2.450 | ≈$2.695 / ≈$5.390 | 기본 필터·표준 경로; Eco 제외 |
| [Segmind](https://www.segmind.com/models/seedance-2.5/pricing) | ≈$1.230 / ≈$2.440 | ≈$3.020 / ≈$6.010 | 공식 클립 예시·추가 1프레임 포함 |
| [Runway Dev](https://dev.runwayml.com/learn/seedance-2-5-api) | ≈$1.500 / ≈$3.000 | ≈$3.400 / ≈$6.800 | 일반 출력 요금 |
| [Atlas Cloud](https://www.atlascloud.ai/blog/tips/seedance-2.5-flash-vs-seedance-2.5) | ≈$1.502 / ≈$3.005 | ≈$2.957 / ≈$5.914 | 11/17 공개 할인 추정; 최신 작업 견적 미검증 |
| [Higgsfield](https://open.higgsfield.ai/models/bytedance/seedance-2.5/text-to-video/api-reference) | 미확인/불가 / 미확인/불가 | 미확인/불가 / 미확인/불가 | 동일 조건 전체 요금 미확인, 순위 제외 |

Volcengine 환산은 2026-11-25 ECB 참조환율 EUR/USD 1.0935, EUR/CNY 7.2999의 교차환율(USD/CNY 약 6.67572)을 사용했다. [중앙은행 출처](https://www.bancaditalia.it/compiti/operazioni-cambi/cambio/cambi_rif_20261125/?com.dotmarketing.htmlpage.language=1) BytePlus의 720p/1080p 일반 토큰 단가 $10.70/$11.70과 Seed enterprise의 $12.84/$14.04는 서로 다른 판매 경로다. Replicate는 현재 확인한 스키마에 1080p가 없다. WaveSpeed의 별도 10% 행사가 적용되면 720p 5/10초는 $1.62/$3.24, 1080p는 $4.05/$8.10이며 위 행은 일반가다. Atlas 행은 명시한 할인 추정치를 그대로 분리했다.

Flash·Fast·Mini·Eco·Draft·SR/ESR, 구독·대량 충전 혜택은 표준 요금과 섞지 않았다. 특히 [LoopToken의 판매자 문서](https://looptoken.vibelab.me/docs/video/seedance)는 CapCut 경로 `seedance-2-5-pro`의 720p 요금을 **¥0.398/초**로 제시한다. 더 낮은 문서상 후보지만 표준 API와 같은 품질·업스트림·fps·실제 지속 공급을 검증하지 않아 기본 제공자나 자동 대안으로 사용하지 않는다.

## API와 확인 범위

`POST /api/canvas/generate`는 HTTP 202 `{receipt,state,pollAfterSeconds}`, `GET /api/canvas/status?receipt=...`는 상태·출력·가능한 경우 실제 공급자 사용료를 반환한다. `POST /api/canvas/assets`는 `{type,size}`를 받아 `{assetKey,signedUrl,token}`을 반환한다. 상태와 영수증 응답은 `private, no-store`다. 기존 소유자 확인과 요청 제한을 사용한다.

가격 조사와 어댑터 테스트는 공개 문서·익명 무료 카탈로그 조회·가짜 공급자 응답으로 수행했다. 계정 생성, 키 조회, 실제 생성, 결제, 배포는 하지 않았다. 실제 출력·품질·오디오·지역 접근·최종 청구는 검증되지 않았다. [Beat 업로드 문서](https://docs.beatapi.io/quick-guide)와 [웹훅 문서](https://docs.beatapi.io/webhooks)는 참고 계약이며, 현재 앱은 GET 상태 조회를 사용하고 웹훅 등록을 자동 수행하지 않는다.
