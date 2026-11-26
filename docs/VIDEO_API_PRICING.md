# 씨댄스 2.5 API 저가순 · 2026-11-26

공개 판매자 견적과 API 문서의 비교다. 실생성·품질·상위 체크포인트 동등성·최종 청구는 검증하지 않았다. Flash·WAN3 등 다른 모델을 표준2.5로 대체하지 않는다.

## 중계형 표시 견적

출력 **5초 표시 금액**을 해상도별로 정렬했다. 음성·참조·실제 출력 품질이 모두 같은 조건으로 확인된 순위는 아니다. USD는 [ECB2026-11-25 기준율](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml), 1CNY≈$0.14979657로 환산했으며 결제 환율·세금·수수료는 제외했다.

### 720p

|순서|제공자·정확한 판매자 모델 ID|5초 CNY|USD 환산|조건|
|---|---|---:|---:|---|
|1|[CCAPI](https://ccapi.us/api/geo/models/mg-seedance-2.5-720p) `mg-seedance-2.5-720p`|¥1.00|≈$0.150|요청당/초당 문서 충돌, 정확 단위 미확정|
|2|[ZhongY GW](https://ai.zyyun.xyz/api/pricing) `官网GW-seedance-2.5-720p`|¥1.80|≈$0.270|공개 그룹1.2 적용; 실제 키의 그룹 접근 미확인|
|3|[LoopToken CapCut](https://looptoken.vibelab.me/docs/video/seedance) `seedance-2-5-pro`|¥1.99|≈$0.298|표시 할인가; 4–30초·첫/끝 프레임·오디오 문서 있음|
|4|[LoopToken JM](https://looptoken.vibelab.me/docs/video/seedance) `seedance-2-5-jm`|¥2.25|≈$0.337|4–30초; 첫/끝 프레임 모드 미지원|
|5|[WXKS full720 9-image](https://api.wxksai.com/docs/) `seedance-2.5-full-720p-9img`|¥2.52|≈$0.377|편당 고정; 5·10·15초만 표기|
|6|[WXKS special](https://api.wxksai.com/docs/) `seedance2.5-tejia-special`|¥2.85|≈$0.427|별도 특가 등급; 4–30초|

### 1080p

|순서|제공자·정확한 판매자 모델 ID|5초 CNY|USD 환산|조건|
|---|---|---:|---:|---|
|1|[WXKS special2](https://api.wxksai.com/docs/) `seedance-2.5-special2`|¥2.49|≈$0.373|5–30초 고정; 영상참조 불가, 생성오디오 미확인|
|2|[WXKS special](https://api.wxksai.com/docs/) `seedance2.5-tejia-special`|¥2.85|≈$0.427|별도 특가 등급; 4–30초|
|3|[ZhongY GW fallback](https://ai.zyyun.xyz/api/pricing) `官网GW-备用-seedance-2.5-1080p`|¥3.60|≈$0.539|공개 그룹1.2 적용; 네이티브1080p·fps 미검증|
|4|[LoopToken JM](https://looptoken.vibelab.me/docs/video/seedance) `seedance-2-5-jm`|¥4.95|≈$0.741|4–30초; 첫/끝 프레임 모드 미지원|
|5|[WXKS independent full](https://api.wxksai.com/docs/) `seedance2.5_full-per-v`|¥6.00|≈$0.899|5–30초 고정; 1080p는 이미지1장 필수|

CCAPI는 개별 공개 견적이 요청당이나 일반 문서는 초당으로 설명해 실제 청구 단위를 확인해야 한다. ZhongY는 공개 그룹 배수를 적용했다. LoopToken CapCut는 현재 표시 할인으로 종료일 미확인이다. WXKS 특가2는 T2V·최소 이미지·생성 오디오·네이티브1080p/업스케일·fps·최소충전이 미확인이다. 오디오 참조 지원을 생성 오디오 보장으로 해석하지 않는다.

길이에 따라 순서가 달라진다. WXKS720p9이미지는 15초에도 ¥2.52지만 30초는 지원 표기에 없다. WXKS1080p특가2는 5–30초 모두 ¥2.49로 표시한다. CCAPI의 30초 실제 청구는 단위 충돌 때문에 ¥1로 확정하지 않는다.

## 일반형 API 문서·가격 비교

16:9·영상참조 없음·일반 PAYG 기준, 새로 확인한 후보의 명목 단가순이다. 토큰 환산·초당 근사치는 확정 청구나 비용 상한이 아니다.

|순서|제공자|720p/출력초|1080p/출력초|지원/계약|
|---|---|---:|---:|---|
|1|[KovAPI](https://docs.kovapi.com/seedance-2.5)|$0.158000|$0.380000|4–30초; 오디오 필수·명시적 첫/끝 프레임 미지원|
|2|[OpenSand](https://opensand.ai/pricing)|≈$0.187207|≈$0.460582|정확한2.5요청·길이 미확인|
|3|[BeatAPI](https://beatapi.io/pricing)|≈$0.194000|≈$0.481000|4–30초|
|4|[BytePlus](https://docs.byteplus.com/en/docs/modelark/model-pricing)|≈$0.231120|≈$0.568620|4–30초|

KovAPI 일반형은 720p5/15/30초 $0.79/$2.37/$4.74, 1080p $1.90/$5.70/$11.40이다. 영상참조가 있으면 720p $0.11·1080p $0.27 × (입력영상+출력초)로 달라진다. 이미지·오디오 참조 추가료는 없다. 최소 충전 카드/USDT $5·WeChat¥10, 구독/충전 보너스 제외. [가격](https://kovapi.com/pricing), [결제 FAQ](https://kovapi.com/faq).

[Kov 임시 seedance-2.5-30s](https://docs.kovapi.com/seedance-2.5-30s)는720p4–30초 $2/영상이지만 공급이 보장되지 않는 임시 경로라 일반가와 분리했다. OpenSand는 [생성 요청 표](https://opensand.ai/manual/video-generation/video-doubao-seedance)가 여전히2.0을 명명한다. Beat의 공식8초720p예시는 $1.5633으로 반올림된 초당 단순 곱과 다르다. [Beat 가격](https://beatapi.io/pricing).

## 현재 구현과 연결 판단

현재 어댑터는 Kie 이미지3종과 명시적으로 선택한 Beat다. OpenSand는 계약 미확인으로 외부 호출 없이 차단한다. 신규 중계 후보와 KovAPI는 아직 코드에 연결하지 않았고 키 생성·충전·결제·실제 생성은 수행하지 않았다.

첫/끝 프레임이 필요한720p 저가 후보는 LoopToken CapCut의 문서 계약을 우선 검토할 수 있다. 1080p최저 표시 후보 WXKS특가2는 입력·오디오 조건 확인,720p최저 표시 CCAPI는 청구 단위 확인이 필요하다. 일반형 계약이 명확한 대안은 KovAPI다. 필요한 노드 기능과 실제 계정 조건을 맞춘 뒤 선택한다.
