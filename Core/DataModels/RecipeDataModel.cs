using System;
using System.Text;
using System.Collections.Generic;

[System.Serializable]
public class RecipeDataModel
{
    public string[] grid = new string[9] { "", "", "", "", "", "", "", "", "" };
    public string resultItem = "custom_ruby_block";
    public int resultCount = 1;
    public string textureNamespace = "mymod";

    public string GenerateRecipeJson()
    {
        // 1. Unique items and their character keys
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

        // 2. Build pattern
        string[] patternLines = new string[3];
        for (int row = 0; row < 3; row++)
        {
            StringBuilder sb = new StringBuilder();
            for (int col = 0; col < 3; col++)
            {
                int index = row * 3 + col;
                string item = grid[index]?.Trim();
                if (string.IsNullOrEmpty(item))
                {
                    sb.Append(" ");
                }
                else
                {
                    sb.Append(itemKeys[item]);
                }
            }
            patternLines[row] = sb.ToString();
        }

        // Format result item
        string formattedResult = resultItem.Trim();
        if (string.IsNullOrEmpty(formattedResult))
        {
            formattedResult = "air";
        }
        if (!formattedResult.Contains(":"))
        {
            formattedResult = $"{textureNamespace}:{formattedResult}";
        }

        // 3. Build JSON string
        StringBuilder json = new StringBuilder();
        json.AppendLine("{");
        json.AppendLine("  \"type\": \"minecraft:crafting_shaped\",");
        json.AppendLine("  \"pattern\": [");
        json.AppendLine($"    \"{patternLines[0]}\",");
        json.AppendLine($"    \"{patternLines[1]}\",");
        json.AppendLine($"    \"{patternLines[2]}\"");
        json.AppendLine("  ],");
        json.AppendLine("  \"key\": {");

        int keyCount = 0;
        foreach (var pair in itemKeys)
        {
            string itemVal = pair.Key;
            if (!itemVal.Contains(":"))
            {
                // Simple heuristics: check common minecraft items
                if (itemVal == "stone" || itemVal == "stick" || itemVal == "coal" || itemVal == "iron_ingot" || itemVal == "gold_ingot" || itemVal == "diamond")
                {
                    itemVal = "minecraft:" + itemVal;
                }
                else
                {
                    itemVal = $"{textureNamespace}:{itemVal}";
                }
            }

            string comma = (keyCount < itemKeys.Count - 1) ? "," : "";
            json.AppendLine($"    \"{pair.Value}\": {{");
            json.AppendLine($"      \"item\": \"{itemVal}\"");
            json.Append("    }");
            json.AppendLine(comma);
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

    public string GenerateFabricCode()
    {
        return GenerateRecipeJson();
    }
}
