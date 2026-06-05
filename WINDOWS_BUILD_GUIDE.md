# Windows Desktop Application Build Guide

Minecraft Mod Generator desktop application uchun Windows installer va portable executable yaratish uchun qo'llanma.

## 📋 Talablar

- **Node.js**: v18.0.0 yoki undan yuqori
- **npm**: v8.0.0 yoki undan yuqori
- **Windows**: Windows 10 yoki undan yuqori (x64)
- **RAM**: Qurilish uchun minimal 4GB RAM
- **Disk Space**: Minimal 2GB bo'sh joy

## 🚀 Lokal Qurilish

### 1. Loyihani Tayyorlash

```bash
# Repository klonlash
git clone https://github.com/BobbleMMC/for-kiro.git
cd for-kiro

# Mod UI loyihasiga o'tish
cd minecraft-mod-ui

# Bog'liqliklarni o'rnatish
npm install --legacy-peer-deps
```

### 2. Qurilish Procedurlari

#### Opciya 1: Har ikkalasi Ham (NSIS + Portable)

```bash
npm run build:windows
```

Bu buyruq:
- React ilovani build qiladi
- Electron fayllarini kompilyatsiya qiladi
- NSIS installer yaratadi
- Portable executable yaratadi

#### Opciya 2: Faqat NSIS Installer

```bash
npm run build:windows:nsis
```

**Chiqarish**: `MinecraftModGenerator Setup.exe` (Full installer with wizard)

#### Opciya 3: Faqat Portable Executable

```bash
npm run build:windows:portable
```

**Chiqarish**: `MinecraftModGenerator.exe` (Standalone, no installation needed)

#### Opciya 4: Manual Qurilish

```bash
# 1. React ilovani build qilish
npm run build

# 2. Electron fayllarini kompilyatsiya qilish
npm run compile:electron

# 3. Electron Builder bilan build qilish
npx electron-builder --win nsis portable --publish never
```

## 📦 Chiqarilgan Fayllar

Qurilishdan so'ng `release/` papkasida quyidagi fayllar bo'ladi:

```
release/
├── MinecraftModGenerator Setup.exe      (NSIS Installer)
├── MinecraftModGenerator.exe            (Portable Executable)
└── builder-effective-config.yaml        (Build config)
```

### Fayl Tavsifi

| Fayl | O'lchami | Rasm | Ishlash Tarzi |
|------|---------|------|--------------|
| `MinecraftModGenerator Setup.exe` | ~150 MB | NSIS Installer | Wizard bilan o'rnatish |
| `MinecraftModGenerator.exe` | ~200 MB | Portable | USB dan yoki darhol ishga tushish |

## 💾 O'rnatish

### NSIS Installer Bilan

1. `MinecraftModGenerator Setup.exe` faylini ishga tushiring
2. O'rnatish wizard amallarini bajaring
3. O'rnatish manzilini tanlang (Default: `C:\Program Files\Minecraft Mod Generator`)
4. Desktop shortcut va Start Menu shortcut-larni o'rnatishni belgilang
5. "Install" tugmasini bosing

### Portable Executable Bilan

1. `MinecraftModGenerator.exe` faylini ishga tushiring
2. Hech qanday o'rnatish kerak emas, darhol ishga tushadi

## 🔍 Tez Ko'rishni Tekshirish

Qurilish muvaffaqiyatli bo'lganini tekshirish uchun:

```bash
# Release papkasini ko'rish
dir release/

# Portable executable-ni tekshirish
release\MinecraftModGenerator.exe --version
```

## 🐛 Muammolar va Yechimlar

### Muammo: "Build qo'llanmada muvaffaq bo'lmadi"

**Yechim**:
```bash
# Cache-ni tozalash
npm cache clean --force
rm -r node_modules package-lock.json

# Qayta o'rnatish
npm install --legacy-peer-deps

# Qayta qurilish
npm run build:windows
```

### Muammo: "TypeScript xatolari"

**Yechim**:
```bash
# Type checking
npm run type-check

# Agar muammo bo'lsa, compile:electron-ni qayta ishga tushiring
npm run compile:electron
```

### Muammo: "Electron builder hisobga olmadi"

**Yechim**:
```bash
# Electron builder-ni reinstall qilish
npm install electron-builder --save-dev --legacy-peer-deps

# Keyin qayta qurilish
npm run build:windows
```

## 🔐 Kod Imzolash (Optional)

Windows Defender xavfsizlik ogohlantilarini kamaytirish uchun kod imzolash mumkin:

```bash
# Certificate yaratish (Test uchun)
# macOS/Linux-da:
openssl genrsa -out private.key 2048

# Windows PowerShell-da:
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Minecraft Mod Generator"
Export-Certificate -Cert $cert -FilePath certificate.cer
```

## 📊 Build Statistikasi

Tipik qurilish vaqtlari:

| Tezlik | Vaqt |
|--------|------|
| Birinchi qurilish | 3-5 minut |
| Cache bilan qurilish | 1-2 minut |
| Faqat Portable | 30-45 sekund |

## 🚀 GitHub Actions-dan Build Qilish

Branch-ga push qilganda GitHub Actions avtomatik ravishda build qiladi:

```bash
git add .
git commit -m "feat: Windows installer build optimization"
git push origin feature/windows-installer-build
```

Pull request yaratganda barcha platformalar uchun build qilinadi:
- Windows (NSIS + Portable)
- macOS (DMG + ZIP)
- Linux (AppImage + DEB)

## 📚 Qo'shimcha Resurslar

- [Electron Builder Documentation](https://www.electron.build/)
- [NSIS Installer Documentation](https://nsis.sourceforge.io/)
- [Minecraft Mod Generator README](../README.md)
- [Installation Guide](../INSTALLER_GUIDE.md)

## 💡 Eng Yaxshi Amaliyotlar

1. **Qurilish Oldin Tekshirish**
   ```bash
   npm run type-check
   npm run build
   ```

2. **Regular Cache Tozalash**
   ```bash
   npm cache clean --force
   ```

3. **Version Yangilash**
   ```json
   // package.json-da version-ni yangilang
   "version": "1.0.1"
   ```

4. **Release Notes Yaratish**
   Har bir release-da test-ni va new features-ni dokumentlash

## 🤝 Hissa Qo'shish

Agar build jarayonini takomillashtirish uchun o'rinakesish ma'lumotlariniz bo'lsa:

1. Feature branch yaratish
2. O'zgarishlar qo'shish
3. Pull request yuborish

## 📞 Qo'llab-quvvatlash

Muammolar uchun:
- GitHub Issues: [BobbleMMC/for-kiro/issues](https://github.com/BobbleMMC/for-kiro/issues)
- Documentation: [INSTALLER_GUIDE.md](../INSTALLER_GUIDE.md)

---

**Oxirgi Yangilash**: June 2026
**Versiya**: 1.0.0
