using System;
using System.Text.RegularExpressions;
using System.Globalization;
using UnityEngine;

public static class JavaCodeParser
{
    public static void ParseJavaIntoModel(string javaCode, BlockDataModel model)
    {
        if (string.IsNullOrEmpty(javaCode) || model == null) return;

        try
        {
            // 1. Rich Text rangli teglarini parser adashmasligi uchun tozalaymiz
            string cleanCode = Regex.Replace(javaCode, @"<[^>]*>", "");

            // 2. Moslashuvchan yangi Regex: raqamlar orqasidagi 'f' harfi bo'lsa ham, bo'lmasa ham o'qiydi
            Match strengthMatch = Regex.Match(cleanCode, @"\.strength\s*\(\s*([0-9.]+)(?:f|F)?\s*,\s*([0-9.]+)(?:f|F)?\s*\)");
            if (strengthMatch.Success)
            {
                // C# indeksatsiyasi to'g'rilandi: Groups[1] va Groups[2]
                if (float.TryParse(strengthMatch.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out float h)) 
                {
                    model.hardness = h;
                }
                if (float.TryParse(strengthMatch.Groups[2].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out float r)) 
                {
                    model.resistance = r;
                }
            }

            // 3. Blok ID-sini tahlil qilish: registerBlock("custom_block", ...
            Match idMatch = Regex.Match(cleanCode, @"registerBlock\s*\(\s*""([^""]+)""");
            if (idMatch.Success)
            {
                model.blockId = idMatch.Groups[1].Value;
            }
        }
        catch (Exception ex)
        {
            Debug.LogWarning("[Parser] Java kodini o'qishda xatolik: " + ex.Message);
        }
    }
}
