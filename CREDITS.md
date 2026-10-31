# COSMOS — 사진·글꼴 출처

COSMOS v2.3의 강철 패널, 주황 띠, 기체와 적의 실루엣을 이어 쓴다. 원본은 `reference/cosmos-io-v2.3/`에 보존한다. 이번 도트판의 기체·적·보스·물건·아이콘은 `src/pixel-art.ts`의 문자 격자와 팔레트로 새로 찍었다. 로고 글자도 직접 찍었으며 패널·버튼 그림은 `scripts/art-preview.mjs`에서 만든다. 새 외부 그림을 내려받지 않았다. 음악은 완성곡을 스트리밍하고 효과음은 녹음 파일을 재생한다.

## 갈무리 글꼴

`public/assets/fonts/Galmuri11.woff2`, `Galmuri11-Bold.woff2`는 원본 자산의 바이트 동일 복사다. SIL Open Font License 1.1로 함께 배포하며 전문은 [assets/fonts/OFL.md](assets/fonts/OFL.md)에 있다. 저작권 표시는 동봉 OFL 전문을 따른다. 웹 화면과 Canvas 글자는 모두 갈무리11을 쓴다.

개발 그림 확인에 사용한 `.cache/*.ttf`는 이 WOFF2를 풀어서 만든 검사 전용 사본이며 배포 빌드에 넣지 않는다. 글꼴을 새로 받은 것이 아니다.

## 천체 사진

원본 JPEG 9장은 바꾸지 않고 보존한다. 여섯 구역 배경과 선택 화면에는 orion, pleiades, m13, milkyway, andromeda, deepfield의 도트 파생본을 쓴다. `public/assets/pixel/photos/`의 PNG 9장은 2026-10-29에 변경했다. 가로 640px로 줄이고 공통 32색 팔레트와 4×4 Bayer 순서 디더를 적용했다. 색 수와 색 배치가 달라졌으며, 화면에서 어두운 덧층·자르기·느린 배경 이동을 더 적용한다. 추가 천체나 생성형 그림을 합성하지 않았다. 파생본에도 원본과 같은 CC BY 4.0 및 아래 개별 저작자 표시가 적용된다. 사진 제공 기관의 게임 후원을 뜻하지 않는다.

파생본 파일: `orion.png`, `pleiades.png`, `m13.png`, `milkyway.png`, `andromeda.png`, `deepfield.png`, `horsehead.png`, `elliptical.png`, `irregular.png`. 생성 명령은 `node --experimental-strip-types scripts/art-preview.mjs`, 실제 색 수 기록은 `artifacts/m3/pixel-assets.json`에 있다.

아래 동봉 기록의 Changes와 Size는 보존한 원본 JPEG에 대한 설명이다. 도트 파생본에는 위의 추가 변경이 적용된다.

아래는 원본 동봉 출처다. 전체 저작자 이름과 공식 자료 주소를 유지했다.

```text
COSMOS.IO 실제 천체 사진 출처·라이선스 (2026-10-27 확인)

모든 사진은 기관이 공개한 관측 사진이며, 생성형 이미지가 아니다. 실제 관측 필터 자료의 색 합성은 원본 제작 기관이 수행하였다.
이 패키지에서는 원본 비율을 유지한 크기 축소와 JPEG 압축만 수행한다. 배경 렌더링의 어두운 덧층·화면 맞춤 자르기는 교육용 식별 사진 원본 파일에 반영하지 않는다.
사진은 저작자표시 4.0 국제(CC BY 4.0)로 재배포한다. 전체 크레디트·출처·라이선스·변경 사실을 유지한다. 기관의 게임 후원을 뜻하지 않는다.

파일 | 대상 | 공식 자료 | 라이선스
orion.jpg | 오리온 성운 M42 | https://esahubble.org/images/heic0601a/ | CC BY 4.0
pleiades.jpg | 플레이아데스 산개성단 M45 | https://noirlab.edu/public/images/noao-m45/ | CC BY 4.0
m13.jpg | M13 구상성단 | https://esahubble.org/images/opo0840a/ | CC BY 4.0
horsehead.jpg | 말머리 암흑 성운 Barnard 33 | https://esahubble.org/images/heic0105a/ | CC BY 4.0
andromeda.jpg | 안드로메다 은하 M31 | https://esahubble.org/images/opo1204c/ | CC BY 4.0
milkyway.jpg | 지구에서 본 은하수 전천 파노라마 | https://www.eso.org/public/images/eso0932a/ | CC BY 4.0
elliptical.jpg | 타원 은하 NGC 1132 | https://esahubble.org/images/heic0804a/ | CC BY 4.0
irregular.jpg | 불규칙 은하 NGC 4449 | https://esahubble.org/images/heic0711a/ | CC BY 4.0
deepfield.jpg | 허블 울트라 딥 필드 | https://esahubble.org/images/heic0406a/ | CC BY 4.0

개별 크레디트 및 수정 내역

orion.jpg — 오리온 성운 M42
기체가 빛을 내는 방출 성운. Hubble 관측과 지상 사진의 합성.
Credit: NASA, ESA, M. Robberto (Space Telescope Science Institute/ESA) and the Hubble Space Telescope Orion Treasury Project Team
Source: https://esahubble.org/images/heic0601a/
Download: https://cdn.esahubble.org/archives/images/publicationjpg/heic0601a.jpg
License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Policy: https://esahubble.org/copyright/
Changes: 원본 비율을 유지해 크기 축소 및 JPEG 재압축. 색·형태·천체 내용 변경 없음. 게임 배경에서는 어두운 덧층과 화면 맞춤 자르기가 적용될 수 있음.
Size: 1600 x 1600, 238314 bytes

pleiades.jpg — 플레이아데스 산개성단 M45
WIYN 0.9m 망원경으로 관측한 산개성단과 푸른 반사 성운. 흩어진 밝은 별들과 별빛을 산란하는 먼지가 함께 보임.
Credit: NOIRLab/NSF/AURA/T.A. Rector (University of Alaska Anchorage), R. Cool (University of Arizona) and WIYN
Source: https://noirlab.edu/public/images/noao-m45/
Download: https://noirlab.edu/public/media/archives/images/screen/noao-m45.jpg
License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Policy: https://noirlab.edu/public/copyright/
Changes: 원본 비율을 유지해 크기 축소 및 JPEG 재압축. 색·형태·천체 내용 변경 없음. 게임 배경에서는 어두운 덧층과 화면 맞춤 자르기가 적용될 수 있음.
Size: 1200 x 876, 163029 bytes
공급자 메타데이터 교차 확인: https://www.astropix.org/image/noirlab/noao-m45

m13.jpg — M13 구상성단
수많은 별이 중심 쪽에 조밀하게 모여 보이는 구상성단의 Hubble 사진.
Credit: NASA, ESA, and the Hubble Heritage Team (STScI/AURA)
Source: https://esahubble.org/images/opo0840a/
Download: https://cdn.esahubble.org/archives/images/screen/opo0840a.jpg
License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Policy: https://esahubble.org/copyright/
Changes: 원본 비율을 유지해 크기 축소 및 JPEG 재압축. 색·형태·천체 내용 변경 없음. 게임 배경에서는 어두운 덧층과 화면 맞춤 자르기가 적용될 수 있음.
Size: 1200 x 1200, 453151 bytes

horsehead.jpg — 말머리 암흑 성운 Barnard 33
밝은 배경 성운 앞에서 어두운 실루엣으로 보이는 먼지 구름. 가시광 중심의 Hubble·지상 관측 합성.
Credit: NASA, NOAO, ESA and The Hubble Heritage Team (STScI/AURA)
Source: https://esahubble.org/images/heic0105a/
Download: https://cdn.esahubble.org/archives/images/large/heic0105a.jpg
License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Policy: https://esahubble.org/copyright/
Changes: 원본 비율을 유지해 크기 축소 및 JPEG 재압축. 색·형태·천체 내용 변경 없음. 게임 배경에서는 어두운 덧층과 화면 맞춤 자르기가 적용될 수 있음.
Size: 1200 x 873, 158592 bytes

andromeda.jpg — 안드로메다 은하 M31
중심부와 원반·나선 구조가 보이는 지상 망원경 관측 사진. ESA/Hubble 공식 자료실 제공.
Credit: T. Rector and B. Wolpa (NOAO/AURA/NSF)
Source: https://esahubble.org/images/opo1204c/
Download: https://cdn.esahubble.org/archives/images/publicationjpg/opo1204c.jpg
License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Policy: https://esahubble.org/copyright/
Changes: 원본 비율을 유지해 크기 축소 및 JPEG 재압축. 색·형태·천체 내용 변경 없음. 게임 배경에서는 어두운 덧층과 화면 맞춤 자르기가 적용될 수 있음.
Size: 1489 x 1600, 357806 bytes

milkyway.jpg — 지구에서 본 은하수 전천 파노라마
우리은하 내부인 지구에서 본 밤하늘을 연결한 파노라마. 우리은하를 외부에서 촬영한 사진이 아님.
Credit: ESO/S. Brunier
Source: https://www.eso.org/public/images/eso0932a/
Download: https://cdn.eso.org/images/publicationjpg/eso0932a.jpg
License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Policy: https://www.eso.org/public/copyright/
Changes: 원본 비율을 유지해 크기 축소 및 JPEG 재압축. 색·형태·천체 내용 변경 없음. 게임 배경에서는 어두운 덧층과 화면 맞춤 자르기가 적용될 수 있음.
Size: 1600 x 800, 207667 bytes

elliptical.jpg — 타원 은하 NGC 1132
뚜렷한 나선팔 없이 중심에서 바깥으로 밝기가 부드럽게 감소하는 타원 은하의 Hubble 사진.
Credit: NASA, ESA and the Hubble Heritage (STScI/AURA)-ESA/Hubble Collaboration. Acknowledgment: M. West (ESO, Chile)
Source: https://esahubble.org/images/heic0804a/
Download: https://cdn.esahubble.org/archives/images/large/heic0804a.jpg
License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Policy: https://esahubble.org/copyright/
Changes: 원본 비율을 유지해 크기 축소 및 JPEG 재압축. 색·형태·천체 내용 변경 없음. 게임 배경에서는 어두운 덧층과 화면 맞춤 자르기가 적용될 수 있음.
Size: 1104 x 1200, 119327 bytes

irregular.jpg — 불규칙 은하 NGC 4449
뚜렷한 나선·타원 형태로 정리되지 않는 불규칙 은하의 Hubble 사진.
Credit: NASA, ESA, A. Aloisi (STScI/ESA), and The Hubble Heritage (STScI/AURA)-ESA/Hubble Collaboration
Source: https://esahubble.org/images/heic0711a/
Download: https://cdn.esahubble.org/archives/images/screen/heic0711a.jpg
License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Policy: https://esahubble.org/copyright/
Changes: 원본 비율을 유지해 크기 축소 및 JPEG 재압축. 색·형태·천체 내용 변경 없음. 게임 배경에서는 어두운 덧층과 화면 맞춤 자르기가 적용될 수 있음.
Size: 1200 x 773, 251025 bytes

deepfield.jpg — 허블 울트라 딥 필드
다양한 모양의 외부 은하가 담긴 깊은 우주 관측 사진. 이 정지 사진 자체가 우주 팽창을 직접 보여 주는 것은 아님.
Credit: NASA, ESA, and S. Beckwith (STScI) and the HUDF Team
Source: https://esahubble.org/images/heic0406a/
Download: https://cdn.esahubble.org/archives/images/screen/heic0406a.jpg
License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Policy: https://esahubble.org/copyright/
Changes: 원본 비율을 유지해 크기 축소 및 JPEG 재압축. 색·형태·천체 내용 변경 없음. 게임 배경에서는 어두운 덧층과 화면 맞춤 자르기가 적용될 수 있음.
Size: 1280 x 1280, 274931 bytes

```

## 개발 도구

게임 실행 중 외부 라이브러리 요청은 없다. TypeScript(검사·빌드), Happy DOM와 @napi-rs/canvas(개발 검사), Node.js 타입 정의는 개발용이며 게임 빌드에는 넣지 않는다. 버전은 `package-lock.json`에 기록한다. 두 reference 폴더와 이전 검사 결과는 보존한다.

## 음악과 효과음

음악 9곡과 효과음 46종은 CC0 1.0으로 공개된 완성 음원이다. 원 제작자의 저작자 표기와 상업 이용·변경 허용 원문을 함께 배포한다.

- 음악: [음악 라이선스](assets/audio/LICENSES/music.txt)
- 전투 효과음: [효과음 라이선스](assets/audio/LICENSES/scifi.txt)
- 메뉴와 신호음: [인터페이스 라이선스](assets/audio/LICENSES/interface.txt)
- 발소리와 동작: [폴리 라이선스](assets/audio/LICENSES/foley.txt)

앞뒤 무음 정리·길이 제한·선형 음량·짧은 페이드·AAC 압축을 적용했다. 원 제작자의 보증이나 후원을 뜻하지 않는다. 파일별 원본·가공 내역은 소스 작업 공간의 docs/audio_sources.md에 있다.
