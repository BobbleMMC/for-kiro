using System;
using System.Text;
using System.Collections.Generic;

/// <summary>
/// Retsept turi — Minecraft qo'llab-quvvatlaydigan barcha turdagi retseptlar.
/// </summary>
public enum RecipeType
{
    CraftingShaped,       // 3x3 grid bilan shaklli retsept
    CraftingShapeless,    // Tartibsiz — ingredientlar ixtiyoriy joyda
    Smelting,             // Oddiy pech (Furnace)
    Blasting,             // Blast Furnace (2x tezroq)
    Smoking,              // Smoker (ovqat uchun 2x tezroq)
    CampfireCooking,      // Campfire (yoqilg'isiz, sekin)
    Stonecutting          // Stone Cutter (1:1 blok konvertatsiya)
}

[System.Serializable]
public class RecipeDataModel
{
    // ── Umumiy maydonlar ──
    public RecipeType recipeType = RecipeType.CraftingShaped;
    public string resultItem = "custom_ruby_block";
    public int resultCount = 1;
    public string textureNamespace = "mymod";

    // ── Shaped/Shapeless uchun ──
    public string[] grid = new string[9] { "", "", "", "", "", "", "", "", "" };
    public List<string> shapelessIngredients = new List<string>(); // Shapeless uchun

    // ── Smelting/Blasting/Smoking/Campfire uchun ──
    public string smeltingInput = "";
    public float experience = 0.7f;
    public int cookingTime = 200; // ticks (200 = 10 soniya)

    // ── Stonecutting uchun ──
    public string stonecuttingInput = "";

    // ═══════════════════════════════════════════════════════════════════════
    // ASOSIY GENERATSIYA
    // ═══════════════════════════════════════════════════════════════════════

    public string GenerateRecipeJson()
    {
        switch (recipeType)
        {
            case RecipeType.CraftingShaped:    return GenerateShapedJson();
            case RecipeType.CraftingShapeless: return GenerateShapelessJson();
            case RecipeType.Smelting:          return GenerateCookingJson("minecraft:smelting", cookingTime);
            case RecipeType.Blasting:          return GenerateCookingJson("minecraft:blasting", cookingTime / 2);
            case RecipeType.Smoking:           return GenerateCookingJson("minecraft:smoking", cookingTime / 2);
            case RecipeType.CampfireCooking:   return GenerateCookingJson("minecraft:campfire_cooking", cookingTime * 3);
            case RecipeType.Stonecutting:      return GenerateStonecuttingJson();
            default:                           return GenerateShapedJson();
        }
    }

    public string GenerateFabricCode()
    {
        return GenerateRecipeJson();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SHAPED RECIPE (3x3 grid)
    // ═══════════════════════════════════════════════════════════════════════

    private string GenerateShapedJson()
    {
        // 1. Unique items va ularning belgilari
        Dictionary<string, char> itemKeys = new Dictionary<string, char>();
        char nextKey = 'A';

        for (int i = 0; i < 9; i++)
        {
            string item = grid[i]?.Trim();
            if (!string.IsNullOrEmpty(item))
            {
                if (!itemKeys.ContainsKey(item))
                {
                    itemKeys[item] = nextKey++;
                }
            }
        }

        // 2. Pattern qurish
        string[] patternLines = new string[3];
        for (int row = 0; row < 3; row++)
        {
            StringBuilder sb = new StringBuilder();
            for (int col = 0; col < 3; col++)
            {
                int index = row * 3 + col;
                string item = grid[index]?.Trim();
                if (string.IsNullOrEmpty(item))
                    sb.Append(" ");
                else
                    sb.Append(itemKeys[item]);
            }
            patternLines[row] = sb.ToString();
        }

        // 3. Bo'sh qatorlarni olib tashlash (optimizatsiya)
        List<string> trimmedPattern = new List<string>();
        foreach (string line in patternLines)
        {
            if (line.Trim().Length > 0) trimmedPattern.Add(line);
        }
        if (trimmedPattern.Count == 0) trimmedPattern.Add("   ");

        string formattedResult = FormatItemId(resultItem);

        // 4. JSON qurish
        StringBuilder json = new StringBuilder();
        json.AppendLine("{");
        json.AppendLine("  \"type\": \"minecraft:crafting_shaped\",");
        json.AppendLine("  \"pattern\": [");
        for (int i = 0; i < trimmedPattern.Count; i++)
        {
            string comma = i < trimmedPattern.Count - 1 ? "," : "";
            json.AppendLine($"    \"{trimmedPattern[i]}\"{comma}");
        }
        json.AppendLine("  ],");
        json.AppendLine("  \"key\": {");

        int keyCount = 0;
        foreach (var pair in itemKeys)
        {
            string itemVal = FormatItemId(pair.Key);
            string comma = (keyCount < itemKeys.Count - 1) ? "," : "";
            json.AppendLine($"    \"{pair.Value}\": {{");
            json.AppendLine($"      \"item\": \"{itemVal}\"");
            json.Append($"    }}{comma}");
            json.AppendLine();
            keyCount++;
        }
        json.AppendLine("  },");
        json.AppendLine("  \"result\": {");
        json.AppendLine($"    \"id\": \"{formattedResult}\",");
        json.AppendLine($"    \"count\": {resultCount}");
        json.AppendLine("  }");
        json.AppendLine("}");

        return json.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SHAPELESS RECIPE (tartibsiz)
    // ═══════════════════════════════════════════════════════════════════════

    private string GenerateShapelessJson()
    {
        // Grid dan yoki shapelessIngredients dan ingredientlarni olish
        List<string> ingredients = new List<string>();

        if (shapelessIngredients != null && shapelessIngredients.Count > 0)
        {
            ingredients.AddRange(shapelessIngredients);
        }
        else
        {
            // Grid dan bo'sh bo'lmagan slotlarni olish
            for (int i = 0; i < 9; i++)
            {
                string item = grid[i]?.Trim();
                if (!string.IsNullOrEmpty(item))
                    ingredients.Add(item);
            }
        }

        string formattedResult = FormatItemId(resultItem);

        StringBuilder json = new StringBuilder();
        json.AppendLine("{");
        json.AppendLine("  \"type\": \"minecraft:crafting_shapeless\",");
        json.AppendLine("  \"ingredients\": [");

        for (int i = 0; i < ingredients.Count; i++)
        {
            string itemVal = FormatItemId(ingredients[i]);
            string comma = i < ingredients.Count - 1 ? "," : "";
            json.AppendLine($"    {{ \"item\": \"{itemVal}\" }}{comma}");
        }

        json.AppendLine("  ],");
        json.AppendLine("  \"result\": {");
        json.AppendLine($"    \"id\": \"{formattedResult}\",");
        json.AppendLine($"    \"count\": {resultCount}");
        json.AppendLine("  }");
        json.AppendLine("}");

        return json.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SMELTING / BLASTING / SMOKING / CAMPFIRE
    // ═══════════════════════════════════════════════════════════════════════

    private string GenerateCookingJson(string type, int time)
    {
        string input = FormatItemId(string.IsNullOrEmpty(smeltingInput) ? "cobblestone" : smeltingInput);
        string result = FormatItemId(resultItem);

        StringBuilder json = new StringBuilder();
        json.AppendLine("{");
        json.AppendLine($"  \"type\": \"{type}\",");
        json.AppendLine("  \"ingredient\": {");
        json.AppendLine($"    \"item\": \"{input}\"");
        json.AppendLine("  },");
        json.AppendLine($"  \"result\": \"{result}\",");
        json.AppendLine($"  \"experience\": {experience.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture)},");
        json.AppendLine($"  \"cookingtime\": {time}");
        json.AppendLine("}");

        return json.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STONECUTTING
    // ═══════════════════════════════════════════════════════════════════════

    private string GenerateStonecuttingJson()
    {
        string input = FormatItemId(string.IsNullOrEmpty(stonecuttingInput) ? "stone" : stonecuttingInput);
        string result = FormatItemId(resultItem);

        StringBuilder json = new StringBuilder();
        json.AppendLine("{");
        json.AppendLine("  \"type\": \"minecraft:stonecutting\",");
        json.AppendLine("  \"ingredient\": {");
        json.AppendLine($"    \"item\": \"{input}\"");
        json.AppendLine("  },");
        json.AppendLine($"  \"result\": \"{result}\",");
        json.AppendLine($"  \"count\": {resultCount}");
        json.AppendLine("}");

        return json.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Item ID ni to'g'ri namespace bilan formatlaydi.
    /// "diamond" → "minecraft:diamond", "custom_ruby" → "mymod:custom_ruby"
    /// </summary>
    private string FormatItemId(string rawId)
    {
        if (string.IsNullOrEmpty(rawId)) return "minecraft:air";

        rawId = rawId.Trim();
        if (rawId.Contains(":")) return rawId; // Allaqachon namespace bor

        // Minecraft standart elementlarini tanib olish
        string[] vanillaItems = {
            "stone", "cobblestone", "stick", "coal", "iron_ingot", "gold_ingot",
            "diamond", "netherite_ingot", "emerald", "lapis_lazuli", "redstone",
            "oak_planks", "oak_log", "sand", "gravel", "glass", "obsidian",
            "iron_ore", "gold_ore", "diamond_ore", "copper_ingot", "raw_iron",
            "raw_gold", "raw_copper", "wheat", "bread", "apple", "beef",
            "porkchop", "chicken", "cod", "salmon", "leather", "string",
            "bone", "gunpowder", "ender_pearl", "blaze_rod", "ghast_tear"
        };

        foreach (string vanilla in vanillaItems)
        {
            if (rawId == vanilla) return "minecraft:" + rawId;
        }

        return $"{textureNamespace}:{rawId}";
    }
}
