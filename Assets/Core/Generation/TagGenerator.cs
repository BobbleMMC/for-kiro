using System;
using System.Text;
using System.Collections.Generic;

/// <summary>
/// Minecraft Tag JSON fayllarini avtomatik generatsiya qiladi.
/// Tag fayllar bloklarning qaysi qurol bilan sindirilishini,
/// qaysi kategoriyaga tegishli ekanini va boshqa xususiyatlarini belgilaydi.
///
/// Yaratiladi:
///   • data/{modid}/tags/blocks/mineable/pickaxe.json
///   • data/{modid}/tags/blocks/mineable/axe.json
///   • data/{modid}/tags/blocks/mineable/shovel.json
///   • data/{modid}/tags/blocks/needs_iron_tool.json
///   • data/{modid}/tags/blocks/needs_diamond_tool.json
///   • data/{modid}/tags/items/{modid}_items.json
///   • data/minecraft/tags/blocks/mineable/pickaxe.json (vanilla tag ga qo'shish)
/// </summary>
public static class TagGenerator
{
    // ═══════════════════════════════════════════════════════════════════════
    // ASOSIY: Barcha tag fayllarini generatsiya
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Barcha kerakli tag JSON fayllarini qaytaradi.
    /// Key = fayl yo'li (relative to data/), Value = JSON.
    /// </summary>
    public static Dictionary<string, string> GenerateAllTags(WorkspaceData ws)
    {
        if (ws == null) return new Dictionary<string, string>();

        string modId = ws.modId.Trim();
        if (string.IsNullOrEmpty(modId)) modId = "mymod";

        var tags = new Dictionary<string, string>();

        // ── Block mineable tags ──
        var pickaxeBlocks = new List<string>();
        var axeBlocks = new List<string>();
        var shovelBlocks = new List<string>();
        var hoeBlocks = new List<string>();

        // Barcha bloklarni hardness ga qarab pickaxe ga qo'shamiz (standart)
        if (ws.blocks != null)
        {
            foreach (var block in ws.blocks)
            {
                pickaxeBlocks.Add($"{modId}:{block.blockId}");
            }
        }

        // Tag fayllar yaratish
        if (pickaxeBlocks.Count > 0)
            tags[$"minecraft/tags/blocks/mineable/pickaxe.json"] = GenerateTagJson(pickaxeBlocks, false);

        if (axeBlocks.Count > 0)
            tags[$"minecraft/tags/blocks/mineable/axe.json"] = GenerateTagJson(axeBlocks, false);

        if (shovelBlocks.Count > 0)
            tags[$"minecraft/tags/blocks/mineable/shovel.json"] = GenerateTagJson(shovelBlocks, false);

        // ── Mining level tags ──
        var ironLevelBlocks = new List<string>();
        var diamondLevelBlocks = new List<string>();
        var netheriteLevelBlocks = new List<string>();

        if (ws.blocks != null)
        {
            foreach (var block in ws.blocks)
            {
                if (block.hardness >= 15.0f)
                    netheriteLevelBlocks.Add($"{modId}:{block.blockId}");
                else if (block.hardness >= 8.0f)
                    diamondLevelBlocks.Add($"{modId}:{block.blockId}");
                else if (block.hardness >= 4.0f)
                    ironLevelBlocks.Add($"{modId}:{block.blockId}");
            }
        }

        if (ironLevelBlocks.Count > 0)
            tags[$"minecraft/tags/blocks/needs_iron_tool.json"] = GenerateTagJson(ironLevelBlocks, false);

        if (diamondLevelBlocks.Count > 0)
            tags[$"minecraft/tags/blocks/needs_diamond_tool.json"] = GenerateTagJson(diamondLevelBlocks, false);

        if (netheriteLevelBlocks.Count > 0)
            tags[$"{modId}/tags/blocks/needs_netherite_tool.json"] = GenerateTagJson(netheriteLevelBlocks, true);

        // ── Custom mod item tag ──
        var allModItems = new List<string>();
        if (ws.items != null)
            foreach (var item in ws.items) allModItems.Add($"{modId}:{item.itemId}");
        if (ws.tools != null)
            foreach (var tool in ws.tools) allModItems.Add($"{modId}:{tool.toolId}");
        if (ws.armors != null)
            foreach (var armor in ws.armors) allModItems.Add($"{modId}:{armor.armorId}");

        if (allModItems.Count > 0)
            tags[$"{modId}/tags/items/{modId}_items.json"] = GenerateTagJson(allModItems, true);

        // ── Custom mod block tag ──
        var allModBlocks = new List<string>();
        if (ws.blocks != null)
            foreach (var block in ws.blocks) allModBlocks.Add($"{modId}:{block.blockId}");

        if (allModBlocks.Count > 0)
            tags[$"{modId}/tags/blocks/{modId}_blocks.json"] = GenerateTagJson(allModBlocks, true);

        // ── Tool-specific tags (sword effective, axe effective) ──
        // Bloklarni qaysi qurolga ta'sir qilishini ToolDataModel dan aniqlash
        if (ws.tools != null && ws.tools.Count > 0)
        {
            var swordEffective = new List<string>();
            var axeEffective = new List<string>();

            // Agar qurollar orasida axe bo'lsa, barcha yog'och bloklarni effective qilamiz
            foreach (var tool in ws.tools)
            {
                if (tool.toolType == ToolType.Axe && ws.blocks != null)
                {
                    foreach (var block in ws.blocks)
                    {
                        if (block.blockId.Contains("log") || block.blockId.Contains("wood") || block.blockId.Contains("plank"))
                            axeBlocks.Add($"{modId}:{block.blockId}");
                    }
                }
            }

            if (axeBlocks.Count > 0)
                tags[$"minecraft/tags/blocks/mineable/axe.json"] = GenerateTagJson(axeBlocks, false);
        }

        return tags;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TAG JSON FORMAT
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Standart Minecraft tag JSON formatida fayl yaratadi.
    /// replace=false: mavjud vanilla tagga qo'shadi (append).
    /// replace=true: o'z modining ichki tagi (to'liq almashtirish).
    /// </summary>
    private static string GenerateTagJson(List<string> values, bool replace)
    {
        StringBuilder json = new StringBuilder();
        json.AppendLine("{");
        json.AppendLine($"  \"replace\": {(replace ? "true" : "false")},");
        json.AppendLine("  \"values\": [");

        for (int i = 0; i < values.Count; i++)
        {
            string comma = i < values.Count - 1 ? "," : "";
            json.AppendLine($"    \"{values[i]}\"{comma}");
        }

        json.AppendLine("  ]");
        json.AppendLine("}");

        return json.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INDIVIDUAL TAG GENERATORS (tashqaridan chaqirish uchun)
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Bitta blokni vanilla tag ga qo'shish uchun JSON.
    /// Masalan: "minecraft:planks" tagiga custom blokni qo'shish.
    /// </summary>
    public static string GenerateSingleBlockTag(string blockId, string modId)
    {
        return $@"{{
  ""replace"": false,
  ""values"": [
    ""{modId}:{blockId}""
  ]
}}";
    }

    /// <summary>
    /// Item tag yaratish — masalan mod uchun barcha gemlar.
    /// </summary>
    public static string GenerateCustomItemTag(string tagName, List<string> itemIds, string modId)
    {
        var fullIds = new List<string>();
        foreach (string id in itemIds)
        {
            fullIds.Add(id.Contains(":") ? id : $"{modId}:{id}");
        }
        return GenerateTagJson(fullIds, true);
    }

    /// <summary>
    /// Beacon base blocks — custom blokni beacon baza sifatida ishlatish uchun.
    /// </summary>
    public static string GenerateBeaconBaseTag(List<BlockDataModel> blocks, string modId)
    {
        var blockIds = new List<string>();
        foreach (var block in blocks)
        {
            // Faqat mineral bloklari (hardness >= 5) beacon base bo'lishi mumkin
            if (block.hardness >= 5.0f)
                blockIds.Add($"{modId}:{block.blockId}");
        }

        if (blockIds.Count == 0) return null;
        return GenerateTagJson(blockIds, false);
    }
}
