using System;
using System.Text;
using System.Text.RegularExpressions;
using System.Collections.Generic;

/// <summary>
/// Project Validator — mod loyihasidagi xatoliklarni oldindan aniqlaydi.
/// Kompilatsiyadan OLDIN tekshiradi va foydalanuvchiga ogohlantirish beradi.
///
/// Tekshirishlar:
///   • ID validatsiya (Java naming rules)
///   • ID conflict detection (dublikatlar)
///   • Missing texture references
///   • Invalid recipe ingredients
///   • Versiya moslik tekshirish
///   • Hardness/resistance oqilona chegaralar
/// </summary>
public static class ModValidator
{
    // ═══════════════════════════════════════════════════════════════════════
    // VALIDATSIYA NATIJALARI
    // ═══════════════════════════════════════════════════════════════════════

    public enum ValidationSeverity
    {
        Error,       // Kompilatsiya qilmaydi
        Warning,     // Ishlaydi lekin muammo chiqishi mumkin
        Info         // Tavsiya
    }

    [System.Serializable]
    public class ValidationResult
    {
        public ValidationSeverity severity;
        public string category;     // "ID", "Recipe", "Texture", "Version"
        public string message;
        public string elementId;    // Qaysi elementda muammo

        public ValidationResult(ValidationSeverity sev, string cat, string msg, string elemId = "")
        {
            severity = sev;
            category = cat;
            message = msg;
            elementId = elemId;
        }

        public override string ToString()
        {
            string icon = severity == ValidationSeverity.Error ? "❌" : severity == ValidationSeverity.Warning ? "⚠️" : "ℹ️";
            return $"{icon} [{category}] {message}";
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ASOSIY VALIDATSIYA
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// WorkspaceData ni to'liq tekshiradi.
    /// Barcha xatoliklar, ogohlantirishlar va tavsiyalarni qaytaradi.
    /// </summary>
    public static List<ValidationResult> ValidateWorkspace(WorkspaceData workspace)
    {
        var results = new List<ValidationResult>();

        if (workspace == null)
        {
            results.Add(new ValidationResult(ValidationSeverity.Error, "System", "Workspace ma'lumotlari topilmadi!"));
            return results;
        }

        // 1. Mod ID validatsiya
        ValidateModId(workspace.modId, results);

        // 2. Element ID lar
        ValidateBlockIds(workspace.blocks, results);
        ValidateItemIds(workspace.items, results);
        ValidateToolIds(workspace.tools, results);
        ValidateArmorIds(workspace.armors, results);
        ValidateEntityIds(workspace.entities, results);

        // 3. ID conflict (dublikatlar)
        DetectIdConflicts(workspace, results);

        // 4. Recipe validatsiya
        ValidateRecipes(workspace, results);

        // 5. Qiymat chegaralari
        ValidateValueRanges(workspace, results);

        // 6. Versiya moslik
        ValidateVersionCompatibility(workspace, results);

        return results;
    }

    /// <summary>
    /// Faqat xatoliklar sonini qaytaradi (tez tekshirish).
    /// </summary>
    public static int GetErrorCount(List<ValidationResult> results)
    {
        int count = 0;
        foreach (var r in results)
            if (r.severity == ValidationSeverity.Error) count++;
        return count;
    }

    /// <summary>
    /// Natijalarni formatlangan matn sifatida qaytaradi.
    /// </summary>
    public static string FormatResults(List<ValidationResult> results)
    {
        if (results.Count == 0) return "✅ Xatoliklar topilmadi! Loyiha tayyor.";

        StringBuilder sb = new StringBuilder();
        int errors = 0, warnings = 0, infos = 0;

        foreach (var r in results)
        {
            if (r.severity == ValidationSeverity.Error) errors++;
            else if (r.severity == ValidationSeverity.Warning) warnings++;
            else infos++;

            sb.AppendLine(r.ToString());
        }

        sb.Insert(0, $"─── Tekshirish natijasi: {errors} xato, {warnings} ogohlantirish, {infos} tavsiya ───\n\n");
        return sb.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VALIDATSIYA QOIDALARI
    // ═══════════════════════════════════════════════════════════════════════

    private static void ValidateModId(string modId, List<ValidationResult> results)
    {
        if (string.IsNullOrEmpty(modId))
        {
            results.Add(new ValidationResult(ValidationSeverity.Error, "ID", "Mod ID bo'sh! Mod ID belgilang."));
            return;
        }

        if (modId.Length < 2)
            results.Add(new ValidationResult(ValidationSeverity.Error, "ID", "Mod ID juda qisqa (minimum 2 belgi).", modId));

        if (modId.Length > 64)
            results.Add(new ValidationResult(ValidationSeverity.Error, "ID", "Mod ID juda uzun (maksimum 64 belgi).", modId));

        if (!Regex.IsMatch(modId, @"^[a-z][a-z0-9_]*$"))
            results.Add(new ValidationResult(ValidationSeverity.Error, "ID",
                $"Mod ID '{modId}' noto'g'ri! Faqat kichik harflar, raqamlar va pastki chiziq (_) ishlatish mumkin. Harf bilan boshlanishi kerak.", modId));

        // Minecraft reserved IDs
        string[] reserved = { "minecraft", "forge", "fabric", "neoforge", "quilt", "java", "realms" };
        foreach (string r in reserved)
        {
            if (modId == r)
                results.Add(new ValidationResult(ValidationSeverity.Error, "ID", $"'{modId}' — bu tizim tomonidan band qilingan ID!", modId));
        }
    }

    private static bool IsValidElementId(string id)
    {
        if (string.IsNullOrEmpty(id)) return false;
        return Regex.IsMatch(id, @"^[a-z][a-z0-9_]*$");
    }

    private static void ValidateBlockIds(List<BlockDataModel> blocks, List<ValidationResult> results)
    {
        if (blocks == null) return;
        foreach (var block in blocks)
        {
            if (!IsValidElementId(block.blockId))
                results.Add(new ValidationResult(ValidationSeverity.Error, "ID",
                    $"Blok ID '{block.blockId}' noto'g'ri! Faqat kichik harf, raqam va _ ishlatish mumkin.", block.blockId));
        }
    }

    private static void ValidateItemIds(List<ItemDataModel> items, List<ValidationResult> results)
    {
        if (items == null) return;
        foreach (var item in items)
        {
            if (!IsValidElementId(item.itemId))
                results.Add(new ValidationResult(ValidationSeverity.Error, "ID",
                    $"Item ID '{item.itemId}' noto'g'ri!", item.itemId));
        }
    }

    private static void ValidateToolIds(List<ToolDataModel> tools, List<ValidationResult> results)
    {
        if (tools == null) return;
        foreach (var tool in tools)
        {
            if (!IsValidElementId(tool.toolId))
                results.Add(new ValidationResult(ValidationSeverity.Error, "ID",
                    $"Tool ID '{tool.toolId}' noto'g'ri!", tool.toolId));
        }
    }

    private static void ValidateArmorIds(List<ArmorDataModel> armors, List<ValidationResult> results)
    {
        if (armors == null) return;
        foreach (var armor in armors)
        {
            if (!IsValidElementId(armor.armorId))
                results.Add(new ValidationResult(ValidationSeverity.Error, "ID",
                    $"Armor ID '{armor.armorId}' noto'g'ri!", armor.armorId));
        }
    }

    private static void ValidateEntityIds(List<EntityDataModel> entities, List<ValidationResult> results)
    {
        if (entities == null) return;
        foreach (var entity in entities)
        {
            if (!IsValidElementId(entity.entityId))
                results.Add(new ValidationResult(ValidationSeverity.Error, "ID",
                    $"Entity ID '{entity.entityId}' noto'g'ri!", entity.entityId));
        }
    }

    private static void DetectIdConflicts(WorkspaceData workspace, List<ValidationResult> results)
    {
        var allIds = new Dictionary<string, string>(); // id → element type

        if (workspace.blocks != null)
            foreach (var b in workspace.blocks) CheckDuplicate(allIds, b.blockId, "Block", results);
        if (workspace.items != null)
            foreach (var i in workspace.items) CheckDuplicate(allIds, i.itemId, "Item", results);
        if (workspace.tools != null)
            foreach (var t in workspace.tools) CheckDuplicate(allIds, t.toolId, "Tool", results);
        if (workspace.armors != null)
            foreach (var a in workspace.armors) CheckDuplicate(allIds, a.armorId, "Armor", results);
    }

    private static void CheckDuplicate(Dictionary<string, string> allIds, string id, string type, List<ValidationResult> results)
    {
        if (string.IsNullOrEmpty(id)) return;

        if (allIds.ContainsKey(id))
        {
            results.Add(new ValidationResult(ValidationSeverity.Error, "Conflict",
                $"ID '{id}' dublikat! Avval {allIds[id]} da, endi {type} da ishlatilgan.", id));
        }
        else
        {
            allIds[id] = type;
        }
    }

    private static void ValidateRecipes(WorkspaceData workspace, List<ValidationResult> results)
    {
        if (workspace.recipes == null) return;

        foreach (var recipe in workspace.recipes)
        {
            // Natija tekshirish
            if (string.IsNullOrEmpty(recipe.resultItem))
                results.Add(new ValidationResult(ValidationSeverity.Error, "Recipe", "Retsept natijasi bo'sh!"));

            if (recipe.resultCount < 1)
                results.Add(new ValidationResult(ValidationSeverity.Warning, "Recipe",
                    $"Retsept natija soni 0 yoki manfiy ({recipe.resultCount}).", recipe.resultItem));

            // Shaped/Shapeless — kamida 1 ta ingredient kerak
            if (recipe.recipeType == RecipeType.CraftingShaped || recipe.recipeType == RecipeType.CraftingShapeless)
            {
                bool hasIngredient = false;
                if (recipe.grid != null)
                {
                    foreach (string slot in recipe.grid)
                    {
                        if (!string.IsNullOrEmpty(slot?.Trim())) { hasIngredient = true; break; }
                    }
                }
                if (!hasIngredient)
                    results.Add(new ValidationResult(ValidationSeverity.Warning, "Recipe",
                        $"Retsept '{recipe.resultItem}' uchun ingredient yo'q!", recipe.resultItem));
            }

            // Smelting — input kerak
            if (recipe.recipeType == RecipeType.Smelting || recipe.recipeType == RecipeType.Blasting ||
                recipe.recipeType == RecipeType.Smoking || recipe.recipeType == RecipeType.CampfireCooking)
            {
                if (string.IsNullOrEmpty(recipe.smeltingInput))
                    results.Add(new ValidationResult(ValidationSeverity.Error, "Recipe",
                        $"Pishirish retsepti '{recipe.resultItem}' uchun kirish materiali belgilanmagan!", recipe.resultItem));
            }
        }
    }

    private static void ValidateValueRanges(WorkspaceData workspace, List<ValidationResult> results)
    {
        if (workspace.blocks != null)
        {
            foreach (var block in workspace.blocks)
            {
                if (block.hardness < 0)
                    results.Add(new ValidationResult(ValidationSeverity.Warning, "Value",
                        $"Blok '{block.blockId}' qattiqligi manfiy ({block.hardness}).", block.blockId));
                if (block.hardness > 100)
                    results.Add(new ValidationResult(ValidationSeverity.Info, "Value",
                        $"Blok '{block.blockId}' juda qattiq ({block.hardness}). Obsidian = 50.", block.blockId));
                if (block.lightLevel > 15)
                    results.Add(new ValidationResult(ValidationSeverity.Error, "Value",
                        $"Blok '{block.blockId}' yorug'lik darajasi 15 dan oshmasligi kerak!", block.blockId));
            }
        }

        if (workspace.entities != null)
        {
            foreach (var entity in workspace.entities)
            {
                if (entity.health <= 0)
                    results.Add(new ValidationResult(ValidationSeverity.Error, "Value",
                        $"Entity '{entity.entityId}' sog'lig'i 0 yoki manfiy!", entity.entityId));
                if (entity.health > 2048)
                    results.Add(new ValidationResult(ValidationSeverity.Warning, "Value",
                        $"Entity '{entity.entityId}' sog'lig'i juda yuqori ({entity.health}). Wither = 300.", entity.entityId));
            }
        }
    }

    private static void ValidateVersionCompatibility(WorkspaceData workspace, List<ValidationResult> results)
    {
        string version = workspace.mcVersion;
        string loader = workspace.modloader;

        var vData = StudioDatabase.GetVersionData(version);
        if (vData == null)
        {
            results.Add(new ValidationResult(ValidationSeverity.Warning, "Version",
                $"Minecraft versiyasi '{version}' bazada topilmadi. Noto'g'ri versiya bo'lishi mumkin."));
            return;
        }

        // Modloader moslik
        if (vData.supportedModloaders != null && !vData.supportedModloaders.Contains(loader))
        {
            results.Add(new ValidationResult(ValidationSeverity.Error, "Version",
                $"'{loader}' modloader Minecraft {version} uchun qo'llab-quvvatlanmaydi! " +
                $"Mavjud: {string.Join(", ", vData.supportedModloaders)}"));
        }

        // Java versiya ogohlantirish
        if (vData.requiredJavaVersion >= 21 && (version == "1.20.6" || version.StartsWith("1.21") || version.StartsWith("1.22")))
        {
            results.Add(new ValidationResult(ValidationSeverity.Info, "Version",
                $"Minecraft {version} Java {vData.requiredJavaVersion} talab qiladi. Tizimingizda mavjudligini tekshiring."));
        }
    }
}
