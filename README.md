# DINOVERSE

내가 만든 앱들을 한 곳에서 배포(다운로드/업데이트)하는 정적 사이트.
진입은 비번 없이 **기믹(메인 글자 클릭)** 으로 들어가고, 보호는 **앱별 개별 코드**로 합니다.
코드를 건 앱은 다운로드 링크가 **AES 암호화**되고, 안 건 앱은 자유 다운로드입니다.
백엔드·서버 없이 GitHub Pages 등 무료 정적 호스팅에 그대로 올라갑니다.

- 디자인: 타이포그래피 중심(2026 트렌드 #6) + 가로 스크롤 갤러리(#8)
- 부드러운 스크롤: [Lenis](https://github.com/darkroom-engineering/lenis) (로컬 vendoring, `assets/vendor/`)

---

## 폴더 구조

```
dinoverse/
├─ index.html            공개 사이트 (이것이 메인)
├─ admin.html            ⚙ 설정 도구 — 앱/코드 설정 후 data.js 생성
├─ data.js               생성된 암호화 데이터 (admin이 덮어씀)
├─ assets/
│  ├─ style.css          디자인
│  ├─ app.js             게이트·갤러리·다운로드 로직
│  ├─ crypto.js          PBKDF2 + AES-GCM (브라우저)
│  └─ vendor/lenis.min.js
└─ tools/
   ├─ generate.mjs       CLI로 data.js 생성 (admin 대신 쓸 때)
   ├─ config.demo.json   CLI용 예시 설정
   └─ verify.mjs         암호화 라운드트립 자가검증
```

---

## 1. 앱 등록하기 (admin.html)

1. `admin.html`을 브라우저로 엽니다 (더블클릭).
2. **사이트 설정**: 제목·부제만 정합니다. (진입 비번 없음 — 메인 글자 클릭으로 들어감)
3. **앱**별로
   - 이름·버전·플랫폼·설명 입력
   - **앱 코드**: 비우면 자유 다운로드 / 입력하면 그 앱만 코드 입력 후 다운로드(AES 암호화)
   - **다운로드 파일**: 라벨 + URL + 용량. URL은 아래 2번에서 만든 GitHub Releases 주소.
   - **배포** 체크된 앱만 사이트에 나옵니다 (선택 발행).
4. **DATA.JS 생성** → **⬇ 다운로드** → 받은 `data.js`를 프로젝트 루트에 **덮어쓰기**.

> 비밀번호는 `data.js`에 저장되지 않습니다. "상태 저장"은 비번을 제외한 앱 정보만 브라우저에 임시 보관합니다.

---

## 2. 앱 파일 올리기 (GitHub Releases)

바이너리(.exe/.msi/.apk 등)는 repo에 직접 넣지 말고 **Releases**에 올립니다 (대역폭 무제한, 파일당 2GB).

1. GitHub repo → **Releases** → **Draft a new release**
2. 태그 예: `flowdesk-v1.0.0` / 파일 첨부 → Publish
3. 다운로드 URL 형식 (admin의 URL 칸에 붙여넣기):
   ```
   https://github.com/<USER>/<REPO>/releases/download/<TAG>/<FILE>
   항상-최신: https://github.com/<USER>/<REPO>/releases/latest/download/<FILE>
   ```
   → `latest/download/...`를 쓰면 새 버전 릴리스만 올려도 "업데이트"가 자동 반영됩니다.

---

## 3. 배포 (GitHub Pages)

1. 공개 GitHub repo 생성 후 이 폴더를 push.
2. repo **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. 잠시 후 `https://<USER>.github.io/<REPO>/` 에서 열립니다.
4. 앱/코드가 바뀌면: admin에서 `data.js` 다시 생성 → 커밋/푸시.

> Cloudflare Pages에 올려도 동일하게 동작합니다 (대역폭 무제한이라 다운로드 사이트에 더 유리).

---

## CLI로 생성 (선택)

admin 대신 터미널에서:

```bash
# tools/config.demo.json 을 복사해 내 설정 작성 후
node tools/generate.mjs tools/config.demo.json data.js
node tools/verify.mjs   # 라운드트립 검증
```

---

## 보안 메모 (꼭 읽기)

- **진입 기믹은 보안이 아닙니다** — 그냥 들어가는 연출입니다. 앱 목록/이름/설명과 **코드 없는(자유) 앱의 링크는 공개**됩니다.
- **코드를 건 앱**의 다운로드 링크만 **실제 AES 암호화**됩니다 → 코드 없이는 복호화 불가 (단순 숨김 아님).
- 정적 호스팅의 한계상:
  - 코드를 아는 사람이 **받은 파일은 재공유** 가능.
  - **약한 코드는 오프라인 추측(brute-force)** 위험 → 앱 코드는 길고 무작위하게.
- 진짜 강한 접근 제어(계정별·취소 가능·로그)가 필요하면 Cloudflare Access 같은 서버측 인증을 얹어야 합니다.
- `admin.html`에는 비밀이 없어 배포에 포함돼도 안전하지만, 원하면 배포본에서 빼도 됩니다.
