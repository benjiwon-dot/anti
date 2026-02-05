# Google Sign-In Fix: Firebase auth/invalid-credential (Audience Not Authorized)

## 증상
iOS(또는 Android)에서 Google 로그인 후 Firebase에서 아래 에러가 발생합니다.

- `auth/invalid-credential`
- `Invalid Idp Response: the Google id_token is not allowed ...`
- `audience (OAuth 2.0 client ID) is ... which is not authorized to be used in the project with project_number: 459952418126`

이 에러는 보통 **현재 사용 중인 Google OAuth Client ID가, Firebase 프로젝트와 연결된 Google Cloud Project에서 만들어진 ID가 아닐 때** 발생합니다.

---

## 1) 가장 먼저 확인할 것 (Firebase 프로젝트 번호)
이번 문제에서 Firebase가 요구하는 프로젝트 번호는:

- **Project Number: 459952418126**

이 번호와 **같은 Google Cloud Project** 안에서 OAuth Client ID를 새로 만들어야 합니다.

---

## 2) 올바른 Google Cloud Project로 이동하는 방법
1. **Firebase Console**에 로그인
2. 해당 Firebase 프로젝트를 선택
3. 톱니바퀴(⚙️) → **Project settings**
4. 아래/중간쯤에 있는 **Google Cloud Platform (GCP) project** 섹션에서  
   **Open in Google Cloud Console** (또는 프로젝트 링크)를 클릭

> 중요: 여기서 열린 GCP 프로젝트가 “Firebase와 연결된” 정확한 프로젝트입니다.

---

## 3) 그 GCP 프로젝트에서 OAuth Client ID 새로 만들기
Google Cloud Console에서:

1. **APIs & Services → Credentials**
2. 상단 **Create Credentials → OAuth client ID**
3. 아래 3개를 새로 생성합니다.

### A) Web application (WEB Client ID)
- Application type: **Web application**
- Name: 예) `Memotile Web Client`
- Authorized redirect URIs:
  - (Expo/Firebase 방식에 따라 다를 수 있어 비워도 되지만, 필요시 추가)
- 생성 후 나오는 Client ID를 복사해둡니다.

### B) iOS (iOS Client ID)
- Application type: **iOS**
- Name: 예) `Memotile iOS`
- iOS bundle ID: `app.json` / `app.config.ts`의 iOS bundle identifier와 동일해야 합니다.
  - 예: `com.benjiwon.memotileappanti` (프로젝트 설정값에 맞게)

생성 후 나오는 Client ID를 복사해둡니다.

### C) Android (Android Client ID)
- Application type: **Android**
- Name: 예) `Memotile Android`
- Package name: Android applicationId와 동일
- SHA-1 certificate fingerprint:
  - 개발/배포 키에 따라 SHA-1 등록이 필요할 수 있습니다.
  - (EAS/Play 배포 시 SHA-1을 추가 등록해야 할 수 있음)

생성 후 나오는 Client ID를 복사해둡니다.

---

## 4) .env 업데이트
프로젝트 루트 `.env`에 아래 3개를 **새로 만든 값으로 교체**합니다.

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=NEW_WEB_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=NEW_IOS_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=NEW_ANDROID_CLIENT_ID.apps.googleusercontent.com
```

---

## 5) 캐시 리셋 및 확인
새로운 환경 변수가 반영되도록 아래 명령어로 다시 시작합니다.

```bash
npx expo start -c
```

1. iOS Dev Client에서 Google 로그인을 시도합니다.
2. 로그에 `[GoogleAuth] idToken payload:` 섹션의 `aud`가 새로 만든 Web Client ID와 일치하는지 확인합니다.
3. Firebase 로그인이 성공(`✅`)하는지 확인합니다.
