# CAD-Viewer（한국어）

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

cad-viewer는 `백엔드 서비스에 전혀 의존하지 않고 완전히 브라우저에서 동작하는` CAD 도면 편집기입니다. 모든 세션은 새 빈 도면으로 시작하며, 도면을 파일에서 불러오거나 파일로 저장하지 않습니다.
지오메트리 처리와 렌더링을 브라우저에서 직접 수행하므로 cad-viewer는 오프라인 사용과 개인정보에 민감한 워크플로에 적합합니다.

- [**🌐 홈페이지**](https://mlightcad.com/)
- **🌐 라이브 데모**: [Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 API 문서**: [Read the Docs](https://cad-viewer.readthedocs.io/en/latest/) (버전별) · [MCP 서버](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

## 기능

- **고성능** — 대규모 도면을 60+ FPS로 부드럽게 렌더링
- **백엔드 불필요** — 파일을 브라우저에서 완전히 파싱 및 처리
- **향상된 데이터 보안** — 파일이 기기를 떠나지 않아 완전한 프라이버시 보장
- **쉬운 통합** — 서버 설정이나 백엔드 인프라 불필요
- 서드파티 통합을 위한 모듈형 아키텍처
- **모바일 레이아웃 및 터치** — `@mlightcad/cad-simple-viewer`에 반응형 폰/태블릿 UI와 터치 제스처(핀치 줌, 한 손가락 팬, 탭 선택)가 내장되어 별도 모바일 앱 없이 모바일 브라우저에서 사용 가능
- 오프라인 및 온라인 편집 워크플로
- 고급 최적화 기법을 적용한 THREE.js 3D 렌더링 엔진
- CMS, Notion, WeChat 등 플랫폼과의 확장 및 통합을 위해 설계

## 시작하기

### 사전 요구 사항

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10

### 설치

```bash
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer
pnpm install
```

### 개발

```bash
# 전체 기능 뷰어(cad-viewer) 시작
pnpm dev

# 또는 간단한 뷰어 시작
pnpm dev:simple
```

### 빌드

```bash
pnpm build
```

### 미리보기

```bash
# 전체 기능 뷰어 미리보기
pnpm preview

# 간단한 뷰어 미리보기
pnpm preview:simple
```

## 사용 방법

CAD Viewer를 처음 사용하시나요? **[사용자 가이드](https://mlightcad.com/cad-viewer/docs/)**에서 뷰어 인터페이스, 데스크톱 및 터치 조작, 마크업, 측정 도구에 대한 단계별 안내를 확인하세요.

### 데스크톱 브라우저 조작
- **선택**: 엔티티를 왼쪽 클릭
- **확대/축소**: 마우스 휠 위/아래 스크롤
- **팬**: 가운데 마우스 버튼을 누른 채 드래그
- **지우기**: 엔티티를 선택한 후 `Del` 키 누르기

### 태블릿/모바일 브라우저 조작
- **선택**: 엔티티 탭
- **줌**: 두 손가락으로 핀치
- **팬**: 한 손가락으로 드래그

## 플러그인 시스템

CAD-Viewer는 [`@mlightcad/cad-simple-viewer`](packages/cad-simple-viewer)의 모듈형 **플러그인 시스템**을 중심으로 구축됩니다. 플러그인은 `AcApPlugin` 인터페이스를 구현하고 `onLoad` / `onUnload`를 통해 뷰어 생명주기에 연결됩니다—일반적으로 명령 등록, UI 추가, 내보내기/가져오기 파이프라인 연결에 사용됩니다.

`AcApDocManager.instance.pluginManager`(`loadPlugin`, `registerLazyPlugin`, 또는 문서 관리자 생성 시 `plugins.fromConfig`)를 통해 플러그인을 로드합니다. 플러그인은 **지연 로딩**을 지원합니다: 작은 stub을 먼저 등록하고, 사용자가 관련 명령을 실행할 때만 무거운 번들을 다운로드합니다.

모노레포에는 여러 퍼스트파티 플러그인이 포함되어 있습니다. 각각 하나의 관심사에 집중하며, 필요에 따라 조합할 수 있습니다. **설치, 등록, API 세부 사항은 각 패키지 README**에 있습니다—아래 링크를 참조하세요.

### 공식 플러그인

| 패키지 | 역할 | 명령 / 기능 |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](packages/cad-simple-ui-plugin) | `cad-simple-viewer`용 **툴바·측정 팔레트 UI**(순수 DOM, Vue/React 없음) | `measurementpanel`, 기본 툴바(보기, 측정, 테마, 로케일) |

### `@mlightcad/cad-simple-ui-plugin` — 간단한 뷰어용 UI 크롬

[`cad-simple-viewer`](packages/cad-simple-viewer)는 의도적으로 **애플리케이션 UI 없이** 캔버스와 CAD 코어만 제공합니다. 자체 웹 앱에 간단한 뷰어를 임베드하고 전체 Vue 기반 [`cad-viewer`](packages/cad-viewer) 셸을 채택하지 않으려면 **`cad-simple-ui-plugin`이 의도된 UI 레이어**입니다.

제공 기능:

- **구성 가능한 툴바**(임의의 가장자리 배치, 기본 CAD 명령, 중첩 메뉴, 커스텀 항목)
- **독 패널**: **측정** 탭
- **`COLORTHEME` sysvar 및 호스트 요소의 `--ml-ui-*` CSS 토큰과 테마 동기화**
- **`AcApI18n`과 로케일 동기화**(영어 / 중국어 / 체코어 / 터키어)

모든 위젯은 프레임워크에 독립적(순수 DOM)입니다. 전체 Vue [`cad-viewer`](packages/cad-viewer) 앱은 자체 Element Plus UI가 있으며 이 플러그인이 필요하지 않습니다. `cad-simple-viewer`를 직접 기반으로 구축할 때 `cad-simple-ui-plugin`을 사용하세요.

→ **빠른 시작, 툴바 커스터마이징, 옵션:** [packages/cad-simple-ui-plugin/README.md](packages/cad-simple-ui-plugin/README.md)

## 성능

CAD-Viewer는 **탁월한 성능**을 위해 설계되었으며, 높은 프레임률을 유지하면서 매우 큰 도면을 처리할 수 있습니다. 여러 고급 렌더링 기술로 성능을 최적화합니다:

- **커스텀 셰이더 머티리얼**: GPU 가속 셰이더 머티리얼로 복잡한 선종과 해치 채우기 패턴을 효율적으로 렌더링
- **지오메트리 배칭**: 동일 머티리얼의 점, 선, 영역을 병합하여 드로우 호출을 크게 줄임
- **인스턴스 렌더링**: 인스턴싱 기법으로 반복 지오메트리 렌더링 최적화
- **버퍼 지오메트리 최적화**: 효율적인 메모리 관리 및 지오메트리 병합으로 GPU 오버헤드 감소
- **머티리얼 캐싱**: 유사 엔티티 간 머티리얼 재사용으로 상태 변경 최소화
- **WebGL 최적화**: 최신 WebGL 기능으로 하드웨어 가속 렌더링 활용

이러한 최적화를 통해 CAD-Viewer는 수천 개의 엔티티가 있는 복잡한 CAD 도면을 부드럽게 렌더링하면서 반응성 있는 사용자 상호작용을 유지합니다.

## 로드맵

이 프로젝트의 목표는 모듈형 아키텍처와 프레임워크에 독립적인 통합을 갖춘 **브라우저의 풀 기능 2D AutoCAD 유사 시스템**(뷰어 + 에디터)을 만드는 것입니다.

범례:
- [x] 완료
- [ ] 계획됨
- [ ] ⏳ 진행 중

### 핵심 파일 및 데이터 레이어

#### 데이터 모델

* [x] 통합 엔티티 데이터 모델
* [x] 레이어 테이블 지원
* [x] 블록 / 삽입 구조
* [ ] ⏳ Handle 및 객체 ID 관리: 현재 objectId는 handle과 동일하며 bigint(int64) 대신 하나의 문자열로 표현됨.
* [ ] ⏳ XData / 확장 사전 지원
* [ ] 프록시 엔티티 처리

### 렌더링 및 성능

#### 렌더링 엔진

* [x] WebGL 기반 렌더링(Three.js)
* [x] 2D 전용 최적화 파이프라인
* [x] 레이어 기반 씬 구성
* [x] 레이아웃 / 용지 공간 렌더링
* [ ] 뷰포트 엔티티 지원

#### 성능 최적화

* [x] 지오메트리 병합 및 배칭
* [x] 공간 인덱싱(기본)
* [x] 고급 공간 인덱스(R-tree / BVH)
* [ ] LOD(Level-of-detail) 렌더링
* [ ] 매우 큰 도면용 멀티 캔버스 / 타일 렌더링

### 보기 및 탐색

#### 뷰 컨트롤

* [x] 팬
* [x] 줌(휠 / 박스 줌)
* [x] 뷰 맞춤 / 범위
* [ ] 명명된 뷰
* [ ] 뷰 히스토리(뷰 변경 실행 취소 / 다시 실행)

#### 표시 컨트롤

* [x] 선 두께 표시
* [ ] 선종 스케일링
* [x] 배경 / 테마 전환

### 선택 및 상호작용

#### 선택

* [x] 단일 엔티티 선택
* [x] 선택된 엔티티 강조
* [x] 윈도우 선택
* [x] 크로싱 선택
* [x] 선택 필터(유형 / 레이어별)
* [x] 선택 순환

#### 스냅(OSNAP)

* [x] 끝점
* [x] 중점
* [x] 중심
* [x] 교차점
* [ ] 수직 / 접선
* [x] 최근접
* [ ] 스냅 추적


### 편집 및 수정

#### 기본 편집

* [x] 엔티티 편집 프레임워크
* [x] 이동
* [x] 복사
* [x] 회전
* [ ] 축척
* [x] 삭제
* [x] 실행 취소 / 다시 실행

#### 지오메트리 편집

* [x] 그립 포인트
* [ ] 스트레치
* [ ] 트림
* [ ] 연장
* [x] 오프셋
* [ ] 분해
* [ ] 결합 / 필렛 / 모따기(2D)

### 그리기 및 생성 도구

#### 기본 엔티티

* [x] 선
* [x] 폴리라인
* [x] 스플라인
* [x] 원
* [x] 호
* [x] 타원
* [x] 사각형 / 다각형

#### 고급 엔티티

* [x] 해치
* [ ] 텍스트(한 줄 / 여러 줄)
* [ ] 치수(선형, 정렬, 각도)
* [ ] 블록 생성 및 삽입

### 측정

* [x] 거리
* [x] 호 길이
* [x] 면적
* [x] 각도
* [ ] 좌표
* [ ] 엔티티 통계(길이, 면적, 개수)

### 치수

* [x] 선형 치수
* [ ] 각도 치수
* [ ] 좌표

### 속성 및 UI 패널

#### 속성 팔레트

* [x] 선택된 엔티티 속성
* [ ] 색상, 선종 편집
* [x] 변경 시 실시간 업데이트

#### 패널 및 UI

* [ ] 블록 관리자
* [x] 명령 히스토리 / 콘솔
* [x] 상태 표시줄(스냅, 직교, 그리드)

#### 명령 시스템

* [x] 명령 레지스트리
* [x] 명령 별칭
* [x] 명령 프롬프트(AutoCAD 스타일)

### 통합 및 확장성

#### 프레임워크 통합

* [x] 프레임워크에 독립적인 코어
* [ ] React 통합 예제
* [x] Vue 통합 예제
* [ ] OpenLayers / 지도 통합
* [ ] CMS / Notion 임베딩

#### 플러그인 시스템

* [x] 플러그인 API
* [ ] 커스텀 엔티티 지원
* [x] 커스텀 명령

### 오프라인 및 온라인 편집

#### 오프라인 에디터

* [x] 브라우저 로컬 편집
* [ ] 변경 세트 / diff 저장
* [ ] IndexedDB 영속성

#### 온라인 에디터

* [ ] 백엔드 API 설계
* [ ] 사용자 인증
* [ ] 파일 버전 관리
* [ ] 다중 사용자 접근 제어
* [ ] 실시간 협업(향후)

### 플랫폼 목표

* [ ] WeChat 미니 프로그램 뷰어
* [x] 모바일 브라우저 지원(반응형 레이아웃 및 터치)

### 문서 및 커뮤니티

* [x] 아키텍처 문서
* [x] API 레퍼런스
* [ ] 기여 가이드
* [x] 예제 프로젝트
* [x] 로드맵 및 변경 로그 유지

이 로드맵은 기여자가 **무엇이 있는지**, **무엇이 없는지**, **어디에 도움이 필요한지**를 명확히 볼 수 있도록 의도적으로 세분화되어 있습니다.

## 기여

기여를 환영합니다! 버그 수정, 새 기능, 제안을 위해 이슈나 풀 리퀘스트를 열어 주세요. 버그 리포트의 경우, 문제가 있는 도면 링크를 제공하면 재현 및 수정에 도움이 됩니다.

## 라이선스

cad-viewer 모노레포는 주로 [MIT](LICENSE) 라이선스입니다.