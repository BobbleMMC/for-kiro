using System;
using System.Text;
using System.Collections.Generic;
using System.Globalization;

/// <summary>
/// Biome mob spawn konfiguratsiyasi.
/// </summary>
[System.Serializable]
public class BiomeMobSpawn
{
    public string entityId = "minecraft:zombie";
    public int weight = 80;
    public int minCount = 1;
    public int maxCount = 4;
}

/// <summary>
/// Biome xususiyatlari (feature) konfiguratsiyasi.
/// </summary>
public enum BiomeFeatureStep
{
    RawGeneration,
    Lakes,
    LocalModifications,
    UndergroundStructures,
    SurfaceStructures,
    Strongholds,
    UndergroundOres,
    UndergroundDecoration,
    FluidSprings,
    VegetalDecoration,
    TopLayerModification
}

[System.Serializable]
public class BiomeFeature
{
    public BiomeFeatureStep step = BiomeFeatureStep.VegetalDecoration;
    public string featureId = "minecraft:trees_plains"; // Placed Feature ID
}

[System.Serializable]
public class BiomeDataModel
{
    // ── Asosiy xususiyatlar ──
    public string biomeId = "ruby_plains";
    public string displayName = "Ruby Plains";
    public bool precipitation = true;
    public float temperature = 0.8f;
    public float downfall = 0.4f;
    public bool hasFog = false;
    public string textureNamespace = "mymod";

    // ── Rang sozlamalari ──
    public string skyColor = "#78A2FF";
    public string grassColor = "#91FF8A";
    public string waterColor = "#3F76E4";
    public string waterFogColor = "#050533";
    public string fogColor = "#C0D8FF";
    public string foliageColor = "#59AE30"; // Daraxt barglari

    // ── Mob Spawn ro'yxati ──
    public List<BiomeMobSpawn> monsterSpawns = new List<BiomeMobSpawn>
    {
        new BiomeMobSpawn { entityId = "minecraft:zombie", weight = 95, minCount = 2, maxCount = 4 },
        new BiomeMobSpawn { entityId = "minecraft:skeleton", weight = 80, minCount = 1, maxCount = 4 }
    };

    public List<BiomeMobSpawn> creatureSpawns = new List<BiomeMobSpawn>
    {
        new BiomeMobSpawn { entityId = "minecraft:cow", weight = 8, minCount = 2, maxCount = 4 },
        new BiomeMobSpawn { entityId = "minecraft:sheep", weight = 12, minCount = 2, maxCount = 4 }
    };

    public List<BiomeMobSpawn> ambientSpawns = new List<BiomeMobSpawn>
    {
        new BiomeMobSpawn { entityId = "minecraft:bat", weight = 10, minCount = 1, maxCount = 2 }
    };

    // ── Features (dunyo generatsiyasi) ──
    public List<BiomeFeature> features = new List<BiomeFeature>
    {
        new BiomeFeature { step = BiomeFeatureStep.VegetalDecoration, featureId = "minecraft:trees_plains" },
        new BiomeFeature { step = BiomeFeatureStep.VegetalDecoration, featureId = "minecraft:flower_plains" },
        new BiomeFeature { step = BiomeFeatureStep.UndergroundOres, featureId = "minecraft:ore_iron" },
        new BiomeFeature { step = BiomeFeatureStep.UndergroundOres, featureId = "minecraft:ore_coal" }
    };

    // ── Carvers (g'orlar) ──
    public bool generateCaves = true;
    public bool generateCanyons = false;

    // ── Musiqa va ambient ──
    public string musicId = ""; // bo'sh = standart
    public string ambientSoundId = ""; // masalan: "minecraft:ambient.cave"
    public float ambientMoodTickDelay = 6000; // Mood sound delay (ticks)

    // ═══════════════════════════════════════════════════════════════════════
    // TO'LIQ DATAPACK BIOME JSON GENERATSIYASI
    // ═══════════════════════════════════════════════════════════════════════

    public string GenerateFabricCode()
    {
        return GenerateFullBiomeJson();
    }

    public string GenerateFullBiomeJson()
    {
        StringBuilder json = new StringBuilder();
        json.AppendLine("{");

        // ── has_precipitation ──
        json.AppendLine($"  \"has_precipitation\": {(precipitation ? "true" : "false")},");

        // ── temperature va downfall ──
        json.AppendLine($"  \"temperature\": {F(temperature)},");
        json.AppendLine($"  \"downfall\": {F(downfall)},");

        // ── effects ──
        json.AppendLine("  \"effects\": {");
        json.AppendLine($"    \"sky_color\": {HexToDecimal(skyColor)},");
        json.AppendLine($"    \"fog_color\": {HexToDecimal(fogColor)},");
        json.AppendLine($"    \"water_color\": {HexToDecimal(waterColor)},");
        json.AppendLine($"    \"water_fog_color\": {HexToDecimal(waterFogColor)},");
        json.AppendLine($"    \"grass_color\": {HexToDecimal(grassColor)},");
        json.AppendLine($"    \"foliage_color\": {HexToDecimal(foliageColor)},");

        // Mood sound (ambient)
        json.AppendLine("    \"mood_sound\": {");
        json.AppendLine("      \"sound\": \"minecraft:ambient.cave\",");
        json.AppendLine($"      \"tick_delay\": {(int)ambientMoodTickDelay},");
        json.AppendLine("      \"block_search_extent\": 8,");
        json.AppendLine("      \"offset\": 2.0");
        json.AppendLine("    }");

        // Music (agar belgilangan bo'lsa)
        if (!string.IsNullOrEmpty(musicId))
        {
            json.AppendLine("    ,\"music\": {");
            json.AppendLine($"      \"sound\": \"{musicId}\",");
            json.AppendLine("      \"min_delay\": 12000,");
            json.AppendLine("      \"max_delay\": 24000,");
            json.AppendLine("      \"replace_current_music\": false");
            json.AppendLine("    }");
        }

        json.AppendLine("  },");

        // ── spawners ──
        json.AppendLine("  \"spawners\": {");
        json.AppendLine("    \"monster\": [");
        AppendSpawnList(json, monsterSpawns);
        json.AppendLine("    ],");
        json.AppendLine("    \"creature\": [");
        AppendSpawnList(json, creatureSpawns);
        json.AppendLine("    ],");
        json.AppendLine("    \"ambient\": [");
        AppendSpawnList(json, ambientSpawns);
        json.AppendLine("    ],");
        json.AppendLine("    \"water_creature\": [],");
        json.AppendLine("    \"water_ambient\": [],");
        json.AppendLine("    \"underground_water_creature\": [],");
        json.AppendLine("    \"axolotls\": [],");
        json.AppendLine("    \"misc\": []");
        json.AppendLine("  },");

        // ── spawn_costs (ixtiyoriy) ──
        json.AppendLine("  \"spawn_costs\": {},");

        // ── carvers ──
        json.AppendLine("  \"carvers\": {");
        if (generateCaves || generateCanyons)
        {
            json.Append("    \"air\": [");
            List<string> carverList = new List<string>();
            if (generateCaves) carverList.Add("\"minecraft:cave\"");
            if (generateCanyons) carverList.Add("\"minecraft:canyon\"");
            json.Append(string.Join(", ", carverList));
            json.AppendLine("]");
        }
        else
        {
            json.AppendLine("    \"air\": []");
        }
        json.AppendLine("  },");

        // ── features (10 bosqich) ──
        json.AppendLine("  \"features\": [");
        // Minecraft 10 ta feature step ishlatadi (indeks bo'yicha)
        for (int step = 0; step < 11; step++)
        {
            List<string> stepFeatures = new List<string>();
            foreach (var f in features)
            {
                if ((int)f.step == step)
                    stepFeatures.Add($"\"{f.featureId}\"");
            }

            string comma = step < 10 ? "," : "";
            if (stepFeatures.Count > 0)
            {
                json.AppendLine($"    [{string.Join(", ", stepFeatures)}]{comma}");
            }
            else
            {
                json.AppendLine($"    []{comma}");
            }
        }
        json.AppendLine("  ]");

        json.AppendLine("}");
        return json.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════════════════════

    private void AppendSpawnList(StringBuilder json, List<BiomeMobSpawn> spawns)
    {
        if (spawns == null || spawns.Count == 0) return;

        for (int i = 0; i < spawns.Count; i++)
        {
            var s = spawns[i];
            string comma = i < spawns.Count - 1 ? "," : "";
            json.AppendLine($"      {{");
            json.AppendLine($"        \"type\": \"{s.entityId}\",");
            json.AppendLine($"        \"weight\": {s.weight},");
            json.AppendLine($"        \"minCount\": {s.minCount},");
            json.AppendLine($"        \"maxCount\": {s.maxCount}");
            json.AppendLine($"      }}{comma}");
        }
    }

    private int HexToDecimal(string hex)
    {
        hex = hex.Replace("#", "").Trim();
        try { return Convert.ToInt32(hex, 16); }
        catch { return 0; }
    }

    private string F(float v) => v.ToString("0.0", CultureInfo.InvariantCulture);

    public string GenerateLanguageJson()
    {
        return $@"{{
  ""biome.{textureNamespace}.{biomeId}"": ""{displayName}""
}}";
    }
}
