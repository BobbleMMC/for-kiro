// ============================================================
//  PixelArtTexturePostProcessor.cs
//  Joylashuv: Assets/Editor/PixelArtTexturePostProcessor.cs
//
//  Vazifa: Loyihaga yangi .png fayl qo'shilganda avtomatik
//          ravishda sozlamalarni "Pixel Art" formatiga o'tkazadi:
//            • Filter Mode  → Point (no filter)
//            • Compression  → None
//            • Max Size     → 64 (Minecraft uchun)
//            • Sprite Mode  → Single
//            • sRGB         → true
//
//  BU FAYL Editor/ papkasida bo'lishi SHART — aks holda
//  TextureImporter Unity build-da topilmaydi.
// ============================================================

using UnityEditor;
using UnityEngine;

/// <summary>
/// AssetPostprocessor — Unity har yangi asset importida
/// bu klassni avtomatik chaqiradi.
/// Faqat "Textures/Minecraft" kabi papkalarni filtrlash uchun
/// <see cref="IsMinecraftTexture"/> ni o'zgartiring.
/// </summary>
public class PixelArtTexturePostProcessor : AssetPostprocessor
{
    // ── Qaysi papkalar tekshirilsin? ──────────────────────────

    /// <summary>
    /// Faqat ushbu papkadagi .png fayllar avtomatik sozlanadi.
    /// "" qilib qo'ysangiz — barcha loyihadagi PNG lar uchun ishlaydi.
    /// </summary>
    private const string TARGET_FOLDER = "Assets/Textures"; // "" = hammasi

    // ── Asosiy kirish nuqtasi ─────────────────────────────────

    /// <summary>
    /// Unity har yangi tekstura import qilganda bu metodni chaqiradi.
    /// </summary>
    private void OnPreprocessTexture()
    {
        // Faqat belgilangan papkani tekshir
        if (!string.IsNullOrEmpty(TARGET_FOLDER) &&
            !assetPath.StartsWith(TARGET_FOLDER))
            return;

        // Faqat PNG fayllar
        if (!assetPath.EndsWith(".png", System.StringComparison.OrdinalIgnoreCase))
            return;

        ApplyPixelArtSettings(assetImporter as TextureImporter, assetPath);
    }

    // ── Sozlamalar funksiyasi ─────────────────────────────────

    /// <summary>
    /// TextureImporter sozlamalarini Minecraft Pixel-Art
    /// standartiga moslaydi.
    /// Bu funksiyani boshqa joydan ham chaqirish mumkin:
    /// <code>
    ///   PixelArtTexturePostProcessor.ApplyPixelArtSettings(
    ///       AssetImporter.GetAtPath(path) as TextureImporter, path);
    /// </code>
    /// </summary>
    public static void ApplyPixelArtSettings(TextureImporter importer, string path)
    {
        if (importer == null)
        {
            Debug.LogWarning($"[PixelArt] TextureImporter topilmadi: {path}");
            return;
        }

        // ── 1. Asosiy sozlamalar ──────────────────────────────
        importer.textureType         = TextureImporterType.Sprite;
        importer.spriteImportMode    = SpriteImportMode.Single;
        importer.filterMode          = FilterMode.Point;     // ← Eng muhimi!
        importer.mipmapEnabled       = false;                // Piksel art uchun mipmap shart emas
        importer.sRGBTexture         = true;                 // Ranglar to'g'ri ko'rinsin

        // ── 2. Platform sozlamalari (siqishsiz) ───────────────
        TextureImporterPlatformSettings platformSettings = new TextureImporterPlatformSettings
        {
            name              = "DefaultTexturePlatform",
            overridden        = true,
            maxTextureSize    = 64,                          // 16x16 yoki 32x32 uchun yetarli
            format            = TextureImporterFormat.RGBA32,// Siqishsiz, to'liq sifat
            textureCompression = TextureImporterCompression.Uncompressed // ← Compression: None
        };
        importer.SetPlatformTextureSettings(platformSettings);

        // ── 3. Filtrsiz aniqlash: wrapMode ────────────────────
        importer.wrapMode = TextureWrapMode.Clamp;

        Debug.Log($"[PixelArt ✓] Avtomatik sozlandi: {path}\n" +
                  $"  Filter: Point | Compression: None | MaxSize: 64");
    }

    // ── Qo'lda qayta sozlash (Tools menyusidan) ───────────────

    /// <summary>
    /// Loyihadagi mavjud barcha PNG larni qayta sozlash uchun
    /// Unity menyusida: Tools → Pixel Art → Barcha PNG larni sozla
    /// </summary>
    [MenuItem("Tools/Pixel Art/Barcha PNG larni Qayta Sozla")]
    public static void ReprocessAllTextures()
    {
        string[] guids = AssetDatabase.FindAssets(
            "t:Texture2D",
            new[] { string.IsNullOrEmpty(TARGET_FOLDER) ? "Assets" : TARGET_FOLDER }
        );

        int count = 0;
        foreach (string guid in guids)
        {
            string path = AssetDatabase.GUIDToAssetPath(guid);
            if (!path.EndsWith(".png", System.StringComparison.OrdinalIgnoreCase)) continue;

            var imp = AssetImporter.GetAtPath(path) as TextureImporter;
            if (imp == null) continue;

            ApplyPixelArtSettings(imp, path);
            imp.SaveAndReimport();
            count++;
        }

        Debug.Log($"[PixelArt ✓] {count} ta tekstura qayta sozlandi.");
        EditorUtility.DisplayDialog(
            "Pixel Art Textures",
            $"{count} ta PNG fayl muvaffaqiyatli Point filter va No Compression bilan sozlandi!",
            "OK"
        );
    }

    /// <summary>
    /// Project panelida tanlangan PNG ni qayta sozlash:
    /// Assets menyusi → Pixel Art → Tanlanganni Sozla
    /// </summary>
    [MenuItem("Assets/Pixel Art/Bu PNG ni Sozla")]
    public static void ReprocessSelected()
    {
        foreach (Object obj in Selection.objects)
        {
            string path = AssetDatabase.GetAssetPath(obj);
            if (!path.EndsWith(".png", System.StringComparison.OrdinalIgnoreCase)) continue;

            var imp = AssetImporter.GetAtPath(path) as TextureImporter;
            if (imp == null) continue;

            ApplyPixelArtSettings(imp, path);
            imp.SaveAndReimport();
        }
    }

    // Faqat PNG tanlanganda menyu ko'rinsin
    [MenuItem("Assets/Pixel Art/Bu PNG ni Sozla", true)]
    private static bool ValidateReprocessSelected()
    {
        foreach (Object obj in Selection.objects)
        {
            string path = AssetDatabase.GetAssetPath(obj);
            if (path.EndsWith(".png", System.StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }
}
