# DINOVERSE

내가 만든 앱들을 한 곳에서 배포(다운로드/업데이트)하는 정적 사이트.
접속하면 바로 히어로(**WE BUILD APPS THE WORLD NEEDS.**) + 가로 스크롤 앱 갤러리가 뜹니다.
보호는 **앱별 개별 코드**로 합니다 — 코드를 건 앱은 다운로드 링크가 **AES 암호화**되고, 안 건 앱은 자유 다운로드입니다.
백엔드·서버 없이 GitHub Pages 등 무료 정적 호스팅에 그대로 올라갑니다.

- 디자인: 타이포그래피 중심(2026 트렌드 #6) + 가로 스크롤 갤러리(#8)
- 색: 검정 / 페이퍼(흰색) / 애시드 라임(동작) / 일렉트릭 블루(구조)
- 부드러운 스크롤: [Lenis](https://github.com/darkroom-engineering/lenis) (로컬 vendoring, `assets/vendor/`)

---

## 폴더 구조

```
dinoverse/
├─ index.html            공개 사이트 (이것이 메인)
├─ data.js               앱 데이터 (tools/generate.mjs가 생성)
├─ assets/
│  ├─ style.css          디자인
│  ├─ app.js             갤러리·다운로드 로직
│  ├─ crypto.js          PBKDF2 + AES-GCM (브라우저 복호화)
│  └─ vendor/lenis.min.js
└─ tools/
   ├─ generate.mjs       data.js 생성기 (CLI)
   ├─ config.demo.json   설정 예시
   └─ verify.mjs         암호화 라운드트립 자가검증
```

---

## 1. 앱 등록하기 (config + generate)

1. `tools/config.demo.json`을 복사/수정해서 내 설정을 만듭니다.
   - `config.title`, `config.heroSub`
   - `apps[]`: `id` · `name` · `version` · `platforms` · `description`
   - `password`: **비우면 자유 다운로드** / **입력하면 그 앱만 코드 입력 후 다운로드**(AES 암호화)
   - `files`: `label` + `url` + `size`. `url`은 아래 2번의 GitHub Releases 또는 Google Drive 직링크.
   - `publish`: `false`면 사이트에서 제외 (선택 발행)
2. 생성:
   ```bash
   node tools/generate.mjs tools/config.demo.json data.js
   node tools/verify.mjs        # 라운드트립 검증
   ```
3. `data.js`를 커밋/푸시하면 사이트에 반영됩니다.

> 앱 코드(비밀번호)는 `data.js`에 저장되지 않습니다. 코드를 건 앱은 **암호화된 `enc` 블록만** 들어갑니다.

---

## 2. 앱 파일 올리기

다운로드 `url`에는 어떤 URL이든 넣을 수 있습니다. 두 가지를 권장합니다.

### A. GitHub Releases (바이너리 권장)

바이너리(.exe/.msi/.apk 등)는 repo에 직접 넣지 말고 **Releases**에 올립니다 (대역폭 무제한, 파일당 2GB).

1. GitHub repo → **Releases** → **Draft a new release**
2. 태그 예: `flowdesk-v1.0.0` / 파일 첨부 → Publish
3. URL 형식:
   ```
   https://github.com/<USER>/<REPO>/releases/download/<TAG>/<FILE>
   항상-최신: https://github.com/<USER>/<REPO>/releases/latest/download/<FILE>
   ```
   → `latest/download/...`를 쓰면 새 버전만 릴리스해도 "업데이트"가 자동 반영됩니다.

### B. Google Drive 링크

구글 드라이브 파일도 `url`로 쓸 수 있습니다. **단, 일반 공유 링크는 미리보기 페이지로 열리므로 "직접 다운로드" 형식으로 바꿔야** 합니다.

1. 파일 우클릭 → 공유 → **"링크가 있는 모든 사용자"** 로 공개
2. 공유 링크에서 `FILE_ID`만 뽑아 직링크로 변환:
   ```
   공유 링크 : https://drive.google.com/file/d/FILE_ID/view?usp=sharing
   직접 다운로드: https://drive.google.com/uc?export=download&id=FILE_ID
   ```
   → 이 `uc?export=download&id=...` 주소를 `url`에 넣습니다.

> ⚠️ 주의
> - **큰 파일(대략 100MB 이상)** 은 구글의 바이러스 검사 경고 페이지가 떠서 직링크가 한 번에 안 받아질 수 있습니다(확인 토큰 필요). 큰 바이너리는 **GitHub Releases가 더 안정적**입니다.
> - 다운로드가 몰리면 `download quota exceeded`로 일시 차단될 수 있습니다.
> - 버전 업데이트 시 같은 파일을 교체하려면 드라이브에서 **"버전 관리 → 새 버전 업로드"** 를 쓰면 `FILE_ID`가 유지됩니다(링크 그대로).

---

## 3. 배포 (GitHub Pages)

1. 공개 GitHub repo에 이 폴더를 push.
2. repo **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. 잠시 후 `https://<USER>.github.io/<REPO>/` 에서 열립니다.
4. 앱/코드가 바뀌면: `config.json` 수정 → `generate.mjs` 재실행 → 커밋/푸시.

> Cloudflare Pages에 올려도 동일하게 동작합니다 (대역폭 무제한이라 다운로드 사이트에 더 유리).

---

## 보안 메모 (꼭 읽기)

- 앱 목록/이름/설명과 **코드 없는(자유) 앱의 링크는 공개**됩니다.
- **코드를 건 앱**의 다운로드 링크만 **실제 AES 암호화**됩니다 → 코드 없이는 복호화 불가 (단순 숨김 아님).
- 정적 호스팅의 한계상:
  - 코드를 아는 사람이 **받은 파일은 재공유** 가능.
  - **약한 코드는 오프라인 추측(brute-force)** 위험 → 앱 코드는 길고 무작위하게.
- 진짜 강한 접근 제어(계정별·취소 가능·로그)가 필요하면 Cloudflare Access 같은 서버측 인증을 얹어야 합니다.
