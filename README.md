# ViralCut

긴 영상을 쇼츠로 자르고, 원본의 소리와 자막을 통째로 새로 입혀 재구성하는 웹 서비스입니다.
크레딧이나 요금 개념 없이 전면 무료로 동작하도록 만들어졌습니다.

## 두 가지 모드

### 쇼츠 추출 (`SHORTS`)

원본에서 하이라이트 구간을 찾아 세로 클립으로 잘라냅니다. **원본 음성은 그대로 유지**하고,
말한 내용을 받아써서 자막으로 붙입니다.

### 영상 재구성 (`RECONSTRUCT`)

이 프로젝트의 핵심 기능입니다. **화면만 남기고 들리는 것과 읽히는 것을 전부 교체**합니다.

| 제거 | → | 생성 |
|---|---|---|
| 원본 목소리 | → | 새 내레이션 (AI 음성 합성) |
| 원본 효과음 · 배경음 | → | 새 효과음 · 배경음악 |
| 원본 자막 | → | 새 자막 |

결과물 길이는 **1분에서 28분 사이**로 지정하며, 정한 길이에 따라 장면 수와 새 대본의
분량이 함께 계산됩니다 (`src/lib/reconstruct-plan.ts`).

처리 순서:

1. 원본 오디오를 목소리 / 그 외로 분리 → **양쪽 다 폐기**
2. 분리한 목소리를 받아씀 (내용 파악 용도)
3. 목표 길이에 맞는 분량으로 대본을 새로 작성
4. 선택한 목소리로 대본을 읽어 내레이션 생성
5. 내레이션 아래에 새 효과음과 배경음을 깔고 사이드체인으로 덕킹
6. 번인 자막 영역을 가리고, 장면을 이어붙인 뒤 새 자막을 얹어 렌더링

## 운영 동작

**보존 기간 정리.** 워커가 기동 시와 이후 매시간 정리 작업을 돌립니다.
`RETENTION_DAYS`(기본 14일)가 지난 완료·실패 프로젝트의 **원본과 중간 파일을
삭제하고 결과물은 남깁니다** (`src/worker/maintenance.ts`). 멱등이라 워커가
여러 대여도 안전합니다.

**중단된 작업 정리.** 워커가 렌더링 도중 죽으면(OOM, 재배포, 호스트 재시작)
프로젝트가 `RUNNING`에 영원히 멈춰 사용자에게는 진행바만 계속 보입니다. 같은
정리 작업이 큐에 살아 있는 작업이 없는데 30분 넘게 멈춰 있는 건을 찾아
`WORKER_LOST`로 실패 처리합니다.

**헬스체크.** `GET /api/health` 가 Postgres와 Redis를 확인해 정상이면 200,
하나라도 안 되면 503을 반환합니다. compose 헬스체크에 연결돼 있어 응답 못 하는
컨테이너는 재시작됩니다.

## 알려진 한계

**화면에 박힌 자막은 완전히 제거할 수 없습니다.** 픽셀로 새겨진 글자 아래에는 복원할
그림이 없기 때문입니다. 해당 영역을 블러 처리하고 그 위에 새 자막을 얹는 방식으로
처리합니다 (`subtitleMaskGraph`). 별도 자막 트랙으로 들어 있는 자막은 흔적 없이
제거됩니다.

**원본보다 크게 긴 결과물은 만들지 않습니다.** 없는 장면을 지어내지 않으므로, 목표
길이가 원본 대비 지나치게 길면 작업을 시작하지 않습니다 (`isSourceLongEnough`).

## 실행

### 로컬 (Docker)

```bash
./scripts/setup-env.sh     # AUTH_SECRET·DB 비밀번호 생성해서 .env 작성
docker compose up -d --build
```

`http://localhost:3000` 에서 열립니다. 웹, 워커, Postgres, Redis가 함께 뜨고
DB 스키마는 기동 시 자동 적용됩니다.

### 실제 도메인에 배포 (HTTPS)

VPS 한 대(2 vCPU / 4GB 이상 권장, 렌더링이 CPU를 쓰므로 여유 있을수록 좋습니다)와
도메인이 있으면 됩니다.

**1. DNS 먼저.** 도메인의 A 레코드를 서버 IP로 지정하고 전파를 기다립니다.
Caddy가 80·443 포트로 소유권을 증명하므로, **첫 기동 전에** 두 포트가 외부에서
열려 있어야 합니다.

**2. 서버에서:**

```bash
git clone <이 저장소> && cd ViralCut.video
sudo ./scripts/bootstrap-server.sh   # Docker 설치 + 스왑 + 디스크 점검
./scripts/setup-env.sh
```

`bootstrap-server.sh` 는 우분투/데비안 새 서버용입니다. Docker Engine과 compose
플러그인을 설치하고, 스왑이 없으면 4GB 스왑파일을 만들고(4GB RAM 서버에서 x264
인코딩 중 OOM으로 워커가 죽는 것을 막습니다), 디스크 여유를 점검합니다.

**방화벽은 건드리지 않고 명령어만 출력합니다.** SSH를 먼저 허용하지 않고 `ufw
enable` 을 하면 본인이 잠기기 때문에, 순서를 확인하고 직접 실행하시는 편이
안전합니다.

**3. `.env` 를 채웁니다:**

| 항목 | 없으면 |
|---|---|
| `DOMAIN`, `ACME_EMAIL` | HTTPS 오버레이가 기동하지 않습니다 |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | 로그인 페이지가 "설정되지 않음"을 표시합니다 |
| `OPENAI_API_KEY` | 목 모드로 동작합니다 (렌더링은 되고 대본·음성만 예시) |

Google 자격증명은 [Google Cloud 콘솔](https://console.cloud.google.com/apis/credentials)에서
만들고, 승인된 리디렉션 URI에 `https://<도메인>/api/auth/callback/google` 을 넣습니다.

**4. 기동:**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`https://<도메인>` 으로 열립니다. 인증서는 Caddy가 발급하고 자동 갱신하므로
certbot이나 갱신 크론은 필요 없습니다.

로그와 상태:

```bash
docker compose logs -f web worker
docker compose ps
```

`docker-compose.yml` 단독으로 띄우면 앱은 `127.0.0.1:3000` 에만 바인딩됩니다.
공개 서버에서 TLS 없이 노출되지 않도록 한 것이라, 외부 공개는 위 프로덕션
오버레이(Caddy)를 통해서만 이뤄집니다.

### 서버리스는 안 됩니다

Vercel 같은 곳에는 올릴 수 없습니다. 재구성 작업은 ffmpeg으로 수 분에서 수십 분
동안 영상을 렌더링하는데, 서버리스 함수의 실행 시간 제한과 임시 파일 시스템으로는
감당되지 않습니다. 워커가 상주하는 서버가 필요합니다.

### 로컬 개발

`ffmpeg`, `ffprobe`, `yt-dlp` 가 PATH에 있어야 하고 Postgres와 Redis가 필요합니다.

```bash
npm install
cp .env.example .env
npx prisma db push

npm run dev      # 웹 (:3000)
npm run worker   # 렌더 워커 (별도 터미널)
```

## API 키 없이 돌려보기

API 키를 넣지 않으면 **목 모드**로 동작합니다. 이건 기능을 막아둔 상태가 아니라,
받아쓰기·대본·음성만 예시 데이터로 대체하고 **ffmpeg 렌더링은 실제로 수행**하는
모드입니다. 덕분에 편집 파이프라인을 벤더와 무관하게 검증할 수 있습니다.

```bash
npm run smoke
```

테스트용 영상을 만들어 두 파이프라인을 모두 돌리고, 나온 파일의 길이·해상도·오디오
트랙을 검증합니다. ffmpeg 관련 변경 후 회귀를 잡는 가장 빠른 방법입니다.

실제 결과물을 만들려면 `.env`에 `OPENAI_API_KEY`를 넣으면 됩니다. 받아쓰기, 대본
작성, 음성 합성이 한 번에 실제 구현으로 전환됩니다.

## 벤더 교체

AI 단계는 전부 `src/lib/providers/types.ts` 의 인터페이스 뒤에 있습니다.

| 인터페이스 | 하는 일 | 현재 구현 |
|---|---|---|
| `SpeechToText` | 받아쓰기 | OpenAI Whisper / 목 |
| `ScriptWriter` | 대본 작성, 하이라이트 선별 | OpenAI / 목 |
| `TextToSpeech` | 음성 합성 | OpenAI / 목 |
| `SourceSeparator` | 목소리 / 배경음 분리 | 필터 기반 근사 |

다른 벤더를 쓰려면 해당 인터페이스를 구현한 클래스를 하나 추가하고
`resolveProviders()` 에 연결하면 됩니다. 파이프라인 코드는 건드릴 필요가 없습니다.

음원 분리는 아직 근사 구현입니다. 품질이 중요하다면 Demucs를 별도 서비스로 띄우고
`SourceSeparator` 를 구현해 붙이는 것을 권합니다.

## 구조

```
src/
├── app/
│   ├── (marketing)/       랜딩 · 가이드 · FAQ · 로그인
│   ├── app/               대시보드 · 작업 생성 · 프로젝트 상세
│   └── api/               프로젝트 · 업로드 · 결과물 다운로드
├── components/
├── content/site.ts        랜딩 카피 전체
├── lib/
│   ├── media/             ffmpeg, 자막, 내레이션, 인제스트
│   ├── providers/         AI 어댑터
│   └── reconstruct-plan.ts  길이 → 장면 수 · 대본 분량 계산
└── worker/
    ├── index.ts           BullMQ 워커
    └── pipeline/          reconstruct · shorts · sound-bed
```

렌더링은 웹 서버와 분리된 워커 프로세스에서 돌아갑니다. ffmpeg 작업은 길고 CPU를
점유해서, 같은 프로세스에 두면 요청 처리가 막히기 때문입니다.

결과물은 public 디렉터리가 아니라 `/api/outputs/[id]` 를 거쳐 전달되며, 매 요청마다
소유권을 확인합니다.

## 업로드 영상에 대한 권리

본인이 만들었거나 이용 허락을 받은 영상만 처리해 주세요. 업로드한 영상의 권리 확인은
이용자 책임이며, 서비스는 이를 대신 확인하지 않습니다.
