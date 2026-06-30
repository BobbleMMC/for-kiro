using System;
using System.Text;
using System.Collections.Generic;
using System.Globalization;

/// <summary>
/// Block va Entity uchun Loot Table JSON generatsiyasi.
/// Minecraft datapack formatida loot_tables/ papkasiga yoziladigan fayllarni yaratadi.
///
/// Qo'llab-quvvatlanadigan turlar:
///   • Block drops (o'zini tushirish, ore drops, silk touch)
///   • Entity drops (mob loot — allaqachon EntityDataModel da)
///   • Chest loot (dungeon loot tables)
/// </summary>
public static class LootTableGenerator
{
    // ═══════════════════════════════════════════════════════════════════════
    // BLOCK LOOT TABLES
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Oddiy blok — o'zini o'zi tushiradi (drops self).
    /// Misol: Diamond Block → Diamond Block
    /// </summary>
    public static string GenerateBlockDropsSelf(BlockDataModel block, string modId)
    {
        string blockId = $"{modId}:{block.blockId}";

        return $@"{{
  ""type"": ""minecraft:block"",
  ""pools"": [
    {{
      ""rolls"": 1,
      ""bonus_rolls"": 0.0,
      ""entries"": [
        {{
          ""type"": ""minecraft:item"",
          ""name"": ""{blockId}""
        }}
      ],
      ""conditions"": [
        {{
          ""condition"": ""minecraft:survives_explosion""
        }}
      ]
    }}
  ]
}}";
    }

    /// <summary>
    /// Ore blok — Silk Touch bilan o'zini, oddiy holda item tushiradi.
    /// Misol: Diamond Ore → Diamond (oddiy) yoki Diamond Ore (silk touch)
    /// </summary>
    public static string GenerateOreDrops(BlockDataModel block, string modId, 
        string dropItemId, int minCount = 1, int maxCount = 1, float fortuneMultiplier = 1.0f)
    {
        string blockId = $"{modId}:{block.blockId}";
        string itemId = dropItemId.Contains(":") ? dropItemId : $"{modId}:{dropItemId}";

        StringBuilder json = new StringBuilder();
        json.AppendLine("{");
        json.AppendLine("  \"type\": \"minecraft:block\",");
        json.AppendLine("  \"pools\": [");
        json.AppendLine("    {");
        json.AppendLine("      \"rolls\": 1,");
        json.AppendLine("      \"bonus_rolls\": 0.0,");
        json.AppendLine("      \"entries\": [");
        json.AppendLine("        {");
        json.AppendLine("          \"type\": \"minecraft:alternatives\",");
        json.AppendLine("          \"children\": [");

        // Silk Touch → blok o'zi tushadi
        json.AppendLine("            {");
        json.AppendLine("              \"type\": \"minecraft:item\",");
        json.AppendLine($"              \"name\": \"{blockId}\",");
        json.AppendLine("              \"conditions\": [");
        json.AppendLine("                {");
        json.AppendLine("                  \"condition\": \"minecraft:match_tool\",");
        json.AppendLine("                  \"predicate\": {");
        json.AppendLine("                    \"enchantments\": [");
        json.AppendLine("                      { \"enchantment\": \"minecraft:silk_touch\", \"levels\": { \"min\": 1 } }");
        json.AppendLine("                    ]");
        json.AppendLine("                  }");
        json.AppendLine("                }");
        json.AppendLine("              ]");
        json.AppendLine("            },");

        // Silk Touch yo'q → item tushadi (Fortune bilan)
        json.AppendLine("            {");
        json.AppendLine("              \"type\": \"minecraft:item\",");
        json.AppendLine($"              \"name\": \"{itemId}\",");
        json.AppendLine("              \"functions\": [");

        if (minCount != maxCount)
        {
            json.AppendLine("                {");
            json.AppendLine("                  \"function\": \"minecraft:set_count\",");
            json.AppendLine("                  \"count\": {");
            json.AppendLine("                    \"type\": \"minecraft:uniform\",");
            json.AppendLine($"                    \"min\": {minCount}.0,");
            json.AppendLine($"                    \"max\": {maxCount}.0");
            json.AppendLine("                  }");
            json.AppendLine("                },");
        }

        // Fortune bonus
        json.AppendLine("                {");
        json.AppendLine("                  \"function\": \"minecraft:apply_bonus\",");
        json.AppendLine("                  \"enchantment\": \"minecraft:fortune\",");
        json.AppendLine("                  \"formula\": \"minecraft:ore_drops\"");
        json.AppendLine("                },");

        json.AppendLine("                {");
        json.AppendLine("                  \"function\": \"minecraft:explosion_decay\"");
        json.AppendLine("                }");
        json.AppendLine("              ]");
        json.AppendLine("            }");
        json.AppendLine("          ]");
        json.AppendLine("        }");
        json.AppendLine("      ]");
        json.AppendLine("    }");
        json.AppendLine("  ]");
        json.AppendLine("}");

        return json.ToString();
    }

    /// <summary>
    /// Slab blok — 1 yoki 2 tushiradi (double slab = 2).
    /// </summary>
    public static string GenerateSlabDrops(BlockDataModel block, string modId)
    {
        string blockId = $"{modId}:{block.blockId}";

        return $@"{{
  ""type"": ""minecraft:block"",
  ""pools"": [
    {{
      ""rolls"": 1,
      ""bonus_rolls"": 0.0,
      ""entries"": [
        {{
          ""type"": ""minecraft:item"",
          ""name"": ""{blockId}"",
          ""functions"": [
            {{
              ""function"": ""minecraft:set_count"",
              ""count"": 2,
              ""conditions"": [
                {{
                  ""condition"": ""minecraft:block_state_property"",
                  ""block"": ""{blockId}"",
                  ""properties"": {{ ""type"": ""double"" }}
                }}
              ]
            }},
            {{
              ""function"": ""minecraft:explosion_decay""
            }}
          ]
        }}
      ]
    }}
  ]
}}";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BARCHA BLOKLARNING LOOT TABLE LARINI GENERATSIYA QILISH
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// WorkspaceData dagi barcha bloklar uchun loot table JSON fayllarini qaytaradi.
    /// Key = fayl nomi (block_id.json), Value = JSON mazmuni.
    /// </summary>
    public static Dictionary<string, string> GenerateAllBlockLootTables(List<BlockDataModel> blocks, string modId)
    {
        var tables = new Dictionary<string, string>();
        if (blocks == null) return tables;

        foreach (var block in blocks)
        {
            // Standart: blok o'zini o'zi tushiradi
            tables[$"{block.blockId}.json"] = GenerateBlockDropsSelf(block, modId);
        }

        return tables;
    }

    /// <summary>
    /// Barcha entitylar uchun loot table larni qaytaradi.
    /// </summary>
    public static Dictionary<string, string> GenerateAllEntityLootTables(List<EntityDataModel> entities, string modId)
    {
        var tables = new Dictionary<string, string>();
        if (entities == null) return tables;

        foreach (var entity in entities)
        {
            entity.textureNamespace = modId;
            tables[$"{entity.entityId}.json"] = entity.GenerateLootTableJson();
        }

        return tables;
    }
}
