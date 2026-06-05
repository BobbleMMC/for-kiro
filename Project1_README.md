# 🎮 PROJECT 1: MINECRAFT MOD GENERATOR

## 📋 Rasmiy Dokumentatsiya

Ushbu papkada Minecraft Mod Generator ilovasining rasmiy hujjatlari joylashgan.

### 📄 Fayllar Ro'yxati

#### 1️⃣ **Project1_Database_Schema.html**
- **Maqsadi:** Ma'lumotlar bazasi tuzilmasini batafsil tavsiflash
- **O'lcham:** ~30 KB
- **Tarkibi:**
  - SQLite jadvallarning to'liq sxemasi (projects, blocks, items, crafting_recipes)
  - Jadvallar orasidagi aloqalar (Foreign Keys)
  - ER diagramma
  - 150+ satr SQL skripti
  - Indekslar va optimizatsiya
  - Foydali query misollari
  - Ma'lumotlar chegaralari va xavfsizlik tavsiyalari

#### 2️⃣ **Project1_UI_Architecture.html**
- **Maqsadi:** Foydalanuvchi interfeysi arxitekturasini to'liq tavsiflash
- **O'lcham:** ~32 KB
- **Tarkibi:**
  - 3-qatlamli UI arxitektura (Presentation, ViewModel, Service, Data Access)
  - Dashboard oynasi wireframe'i
  - Workspace (Editor) oynasi wireframe'i
  - Dialog va Pop-up oynalari ro'yxati
  - Komponent hiyerarxiyasi
  - Foydalanuvchi vorkflou (User Flow)
  - Responsiv dizayn sostemasi (Desktop, Laptop, Tablet, Mobile)
  - Dark Mode va tema tizimi
  - Keyboard Shortcut'lar
  - Accessibility (A11Y) standartlari
  - Error Handling va User Feedback

---

## 🚀 Fayllarni Ochish

### 💻 Desktop'da
```bash
# Linux/Mac
open Project1_Database_Schema.html
open Project1_UI_Architecture.html

# Windows
start Project1_Database_Schema.html
start Project1_UI_Architecture.html
```

### 📱 Browser'da
Har qanday modern browser'da (Chrome, Firefox, Safari, Edge) fayllarni oching.

---

## 📥 MS Word/PDF Formatiga Export Qilish

### **Variant 1: Browser Print Funktsiyasidan Foydalanish** (Eng Tez)

1. HTML faylni browser'da oching
2. `Ctrl+P` (yoki Mac'da `Cmd+P`) bosing
3. "Save as PDF" tanlang
4. Fayl nomini kiriting
5. Location tanlang va save qiling

**Natija:** Professional PDF fayl

---

### **Variant 2: MS Word'ga Direct Import**

#### **Variant 2.1: Copy-Paste usuli**

1. HTML faylni browser'da oching
2. `Ctrl+A` bilan barcha matnni tanlang
3. `Ctrl+C` bilan nusxa oling
4. MS Word'ni oching
5. `Ctrl+V` bilan yil-yil qiling
6. Formatting'ni sozlang va save qiling

#### **Variant 2.2: Save As Web Archive (Windows)**

1. HTML faylni browser'da oching
2. `File` → `Save As` → `Web Page, HTML Only (.html)`
3. Word'da `File` → `Open` → shu faylni tanlang
4. Word avtomatik HTML'ni Word formatiga konvertatsiya qiladi
5. Save qiling

---

### **Variant 3: Online Converter'dan Foydalanish**

1. Quyidagi saytlardan birini oching:
   - [CloudConvert.com](https://cloudconvert.com/html-to-pdf)
   - [Online-Convert.com](https://www.online-convert.com/convert-to-pdf)
   - [Zamzar.com](https://www.zamzar.com/convert/html-to-pdf/)

2. HTML faylni yuklang
3. PDF formatini tanlang
4. Convert qiling va download qiling

---

### **Variant 4: Command Line (Texnik Foydalanuvchilar uchun)**

#### **wkhtmltopdf ishlatish:**
```bash
# O'rnatish (agar o'rnatilmagan bo'lsa)
# Ubuntu/Debian:
sudo apt-get install wkhtmltopdf

# Mac:
brew install --cask wkhtmltopdf

# Konvertatsiya:
wkhtmltopdf Project1_Database_Schema.html Project1_Database_Schema.pdf
wkhtmltopdf Project1_UI_Architecture.html Project1_UI_Architecture.pdf
```

#### **pandoc ishlatish:**
```bash
# O'rnatish
sudo apt-get install pandoc

# Konvertatsiya
pandoc Project1_Database_Schema.html -t docx -o Project1_Database_Schema.docx
pandoc Project1_UI_Architecture.html -t docx -o Project1_UI_Architecture.docx
```

---

## 📊 Dokumentlarni Birlashtirish

Agar ikkala dokumentni bitta faylga birlashtirmoqchi bo'lsangiz:

### **PDF Birlashtirish:**
```bash
# Linux/Mac (ghostscript kerak)
gs -q -sPAPERSIZE=a4 -dNOPAUSE -dBATCH -sDEVICE=pdfwrite \
   -sOutputFile=Project1_Combined.pdf \
   Project1_Database_Schema.pdf Project1_UI_Architecture.pdf
```

### **Word Birlashtirish:**
1. Project1_Database_Schema.docx'ni Word'da oching
2. `Insert` → `Object` → `Text from File`
3. Project1_UI_Architecture.docx ni tanlang
4. Birlashgan faylni save qiling

---

## ✨ Tavsiyalar

| Vazifa | Eng Yaxshi Usuli | Ishlash Vaqti |
|--------|-----------------|--------------|
| **Tez PDF** | Browser Print | 1 daqiqa |
| **Professional PDF** | wkhtmltopdf | 2 daqiqa |
| **Presentatsiya** | MS Word | 5 daqiqa |
| **Printing** | PDF format | ~ |
| **Sharing** | HTML fayllar | ~ |

---

## 📌 Eslatmalar

✅ **HTML fayllar:** Barcha brauzerda ishlaydi (offline ham)  
✅ **PDF:** Qat'iy format (tekshirivga ideal)  
✅ **Word:** Tekshirish va tahrir uchun ideal  
✅ **Print:** PDF'dan eng yaxshi natija  

---

## 🔒 Fayllar Xavfsizligi

- Barcha fayllar lokal kompyuterda saqlanadi
- Personal ma'lumotlar mavjud emas
- Backup qilish tavsiya qilinadi

---

## 📞 Qo'shimcha Yordam

Qaysi xato yoki muammoga duch kelsangiz, qo'shimcha hujjatlar joylastirilgan:
- Database Schema: `Project1_Database_Schema.html`
- UI Architecture: `Project1_UI_Architecture.html`

---

**© 2024 | Minecraft Mod Generator Official Documentation**
