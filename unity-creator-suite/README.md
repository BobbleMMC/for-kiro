# Creator Suite — Unity'da ko'rish

Bu papkada Mod Studio'ning chiroyli, Minecraft-uslubidagi **Creator Suite** oynasi bor —
to'liq C# UI Toolkit'da yozilgan (UXML'siz, overlap bug'idan xoli).

## 📂 Fayl
`CreatorSuiteWindow.cs` — bitta fayl, drop-in EditorWindow.

## ▶️ Unity'da qanday ko'rish

1. Faylni Unity loyihangizning **`Assets/Editor/`** papkasiga (yoki istalgan
   `Editor` papkasiga) ko'chiring. *(Allaqachon `Assets.zip` ichida
   `Assets/Editor/Windows/CreatorSuiteWindow.cs` sifatida mavjud.)*
2. Unity kompilyatsiyani tugatguncha kuting.
3. Yuqori menyudan oching:  **Mod Studio ▸ Creator Suite**
   (yoki **Tools ▸ Mod Studio ▸ Creator Suite**).

## 🎨 Nima ko'rasiz

- **Dashboard** — statistika kartalari + 12 ta rangli element editor kartasi + recent ro'yxat
- **Texture Editor** — ishlaydigan piksel painter:
  pencil / eraser / fill / eyedropper, 24 rangli palette, undo/redo,
  jonli block-face preview, **PNG eksport**
- **Block Editor** — jonli forma (hardness/resistance/light/sound/flags/type),
  yorug'lik bilan o'zgaradigan preview, **real-time Java kod** generatsiyasi

## 🧩 Texnik

- Unity 2021.3+ (UI Toolkit / UIElements)
- Hech qanday tashqi paket kerak emas
- Mavjud `ModStudioEditorWindow` bilan ziddiyatga kirmaydi (alohida menyu va klass)

> Bu oyna dizayn referensi sifatida ishlatilishi mumkin — mavjud editorlarni
> shu uslubga ko'chirish uchun namuna.
