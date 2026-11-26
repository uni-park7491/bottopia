# 웹 연동 API 최저 공개 견적 · 2026-11-26

정확한 모델 버전과 공개 가격·인증·요청 계약을 확인한 후보 중 선택이다. 실제 계정의 권한, 공급 안정성, 출력 품질, 실청구는 검증하지 않았다. 참조 없음·1개 정상 출력 기준이며 세금·수수료·재시도·보너스는 제외한다.

| 이미지 모델 | 제공자 | 장당 사용료 | 사용 가능한 $50 전액의 이론 장수 |
|---|---|---:|---:|
| 씨드림 Pro 5.0 2K | [ArgoLink](https://argolink.io/en/models/seedream-5.0-pro) | $0.030 | 1,666 |
| 씨드림 5.5 2K | [Kie](https://kie.ai/seedream-5-5) | $0.0315 | 1,587 |
| 나노바나나 2.1 4K | [ArgoLink](https://argolink.io/en/models/nano-banana-2.1) | $0.025 | 2,000 |

기존 Kie 자체 가격·장수는 유효하지만, 세 모델 모두 Kie가 최저라는 결론은 아니다. Kie 5.5는 참조 이미지당 $0.0072가 추가된다. Argo Pro/Nano는 별도 참조료가 명시되지 않아 무료라고 확정하지 않는다. 제공자별 잔액은 공유되지 않는다.

Argo의 [현재 가격표](https://argolink.io/en/pricing)와 [API 문서](https://argolink.io/en/docs)는 Bearer 키, `POST /v1/images/generations`와 `/v1/images/edits`, 정확한 모델 ID `seedream-5.0-pro`·`seedream-5.5`·`nano-banana-2.1`을 명시한다. Nano는 `resolution: "4k"`, `n: 1`을 보낸다. 동기 완료 방식이며 600초 이상 클라이언트 타임아웃을 권고하므로, Vercel의 실행 한도와 재시도/중복 청구 보호에 맞춘 처리가 선행돼야 한다. 기존 Kie 작업 ID·상태 폴링 어댑터에 URL만 바꾸어 연결할 수는 없다.

| 씨댄스 2.5 제공자·상품 | 해상도 | 15초 | 30초 | 성격 |
|---|---|---:|---:|---|
| [WXKS `seedance-2.5-special2`](https://api.wxksai.com/docs/) | 1080p 표시 | ¥2.49 ≈ $0.373 | ¥2.49 ≈ $0.373 | 확인한 API 계약 중 최저 표시 고정 특가 |
| [KovAPI 일반형](https://docs.kovapi.com/seedance-2.5) | 720p | $2.37 | $4.74 | 출력초당 $0.158 |
| KovAPI 일반형 | 1080p | $5.70 | $11.40 | 출력초당 $0.38 |

WXKS는 5–30초 편당 고정가, Bearer 키, `POST /v1/videos` → `GET /v1/videos/{id}` → `GET /v1/videos/{id}/content` 계약이 있어 웹 연동 후보에 포함한다. 정확한 무이미지 T2V 허용·최소 이미지·생성 오디오·네이티브 해상도/fps·실제 공급은 미검증이다. API 문서 존재를 유료 생성 성공으로 해석하지 않는다. CNY 환산은 ECB 2026-11-25 USD/EUR 1.0935, CNY/EUR 7.2999 기준이며 실제 카드 환율과 다를 수 있다.

현재 구현된 어댑터는 Kie 이미지와 명시적 설정을 거친 Beat 영상이다. Argo/WXKS/Kov로 변경하거나 키를 발급하고 충전·생성한 상태는 아니다. 가격표와 실제 선택된 제공자의 비용을 혼합하지 않는다. 기본 유료 생성 차단과 소유자 권한 검사는 유지한다.
