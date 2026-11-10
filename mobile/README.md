# Ao tôm — app mobile (Android + iOS)

App Expo / React Native dùng chung logic với bản web (`../src/api.ts`, `../src/geo.ts`, `../src/catalog.ts`, `../src/types.ts`, `../data/*.json`, ảnh `../public/ponds`). Metro được cấu hình trong `metro.config.js` để đọc các file này.

## Chức năng

| Tab | Nội dung |
| --- | --- |
| **Ao** | Đếm ao Nguy hiểm / Cảnh báo / Ổn (bấm để lọc), tìm kiếm, danh sách ao xếp theo mức nguy hiểm kèm DO, pH, nhiệt độ. |
| Chi tiết ao | Ảnh camera và trạng thái mất hình, 4 chỉ số chính (DO, pH, nhiệt độ, độ mặn) theo ngưỡng, tất cả chỉ số, biểu đồ lịch sử 1/7/30 ngày, cảnh báo, vận hành (thiết bị, vụ nuôi, cho ăn và thay nước trong tuần), công việc. |
| **Cảnh báo** | Cảnh báo của ao, thiết bị và xe (xe chỉ hiện với Admin); bấm để mở ao. |
| **Tài khoản** | Tài khoản, vai trò, nguồn dữ liệu, làm mới, mở PCTomCa trên web, đăng xuất. |

- **Đăng nhập** bằng tài khoản PCTomCa (`https://iot.clb4u.com`), gọi thẳng máy chủ, không qua proxy. Cookie phiên do hệ điều hành giữ.
- **Xem dữ liệu đã lưu** chạy không cần mạng.
- Số đo tự làm mới mỗi 15 giây khi app đang mở; kéo xuống để nạp lại toàn bộ.
- **Không có trên mobile:** bản đồ 3D, panel xe/chuyến/nhà máy, đổi mật khẩu. Những phần này dùng trên web.

## Chạy thử

```bash
npm install
npx expo start
```

## Build APK Android (trên Windows)

Cần JDK 17 và Android SDK (máy này: `D:\INSTALLATION`). Trên Windows có hai giới hạn:
1. **Gradle không build được khi đường dẫn có dấu tiếng Việt.** `subst` cũng không giúp được vì autolinking của Expo trả về đường dẫn thật.
2. **Đường dẫn file object C++ không được vượt 260 ký tự**, nếu vượt thì ninja báo `mkdir … No such file or directory`.

Vì vậy hãy chép repo sang một thư mục **rất ngắn**: thư mục mobile nằm ở `C:\a\m`, code dùng chung ở `C:\a\src`, `C:\a\data`, `C:\a\public`. Sau đó cho CMake ghi file tạm vào `C:\c`:

```bat
set SRC=D:\DỮ LIỆU PHỤC HỒI\VisualSenseGroup\projects\2026\Ao_tom
robocopy "%SRC%" C:\a /MIR /XD .git mobile node_modules dist
robocopy "%SRC%\mobile" C:\a\m /MIR /XD android node_modules
cd /d C:\a\m
npm install
npx expo prebuild --platform android --clean
echo sdk.dir=D:/INSTALLATION> android\local.properties
```

Sửa 2 chỗ trong thư mục `android` vừa sinh ra. Chúng sẽ mất mỗi lần chạy prebuild nên phải sửa lại sau mỗi lần:
- `android/gradle.properties`: `reactNativeArchitectures=arm64-v8a,x86_64`. `arm64-v8a` dùng cho điện thoại thật, `x86_64` cho emulator; build ít kiến trúc thì nhanh hơn.
- `android/app/build.gradle`, ngay dưới dòng `ndkVersion …` trong khối `android {`: thêm `externalNativeBuild { cmake { buildStagingDirectory "C:/c" } }`

```bat
cd android && gradlew.bat assembleRelease
```

Lần build đầu sẽ tải NDK (khoảng 3 GB) và thư viện Gradle, mất từ 30 đến 40 phút. Các lần sau nhanh hơn nhiều.

File APK nằm ở `android/app/build/outputs/apk/release/app-release.apk`. Bản này được ký bằng debug keystore, cài trực tiếp được, chưa dùng để đưa lên Google Play.

## Build iOS (EAS, trên cloud)

Không build iOS được trên Windows. Dùng EAS Build. Cần tài khoản expo.dev và Apple Developer (99 USD/năm):

```bash
npx eas-cli login
npx eas-cli build -p ios --profile preview
```

Cài file `.ipa` qua link EAS gửi về. iPhone cần đăng ký UDID ở bước `eas device:create`; hoặc dùng profile `production` kèm `eas submit` để đưa lên TestFlight.

EAS cũng build được APK Android: `npx eas-cli build -p android --profile preview`.
