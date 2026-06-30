using System;
using System.IO;
using System.Collections.Generic;

// Creative rejimdagi papkalar (Tabs) ro'yxati
public enum MinecraftCreativeTab
{
    BuildingBlocks,
    Decorations,
    Redstone,
    Transportation,
    Misc
}

[System.Serializable]
public class BlockDataModel
{
    // 1. Blokning asosiy xususiyatlari
    public string blockId = "custom_ruby_block";
    public string displayName = "Ruby Block";
    public float hardness = 5.0f;
    public float resistance = 6.0f;
    public int lightLevel = 0;
    public MinecraftCreativeTab creativeTab = MinecraftCreativeTab.BuildingBlocks;
    
    // Tekstura yo'li (masalan: "modid:block/custom_ruby_block")
    public string textureNamespace = "mymod";
    public string texturePath = "custom_ruby_block";

    // 2. Blockstates JSON generatsiyasi
    public string GenerateBlockstatesJson()
    {
        return $@"{{
  ""variants"": {{
    """": {{ ""model"": ""{textureNamespace}:block/{blockId}"" }}
  }}
}}";
    }

    // 3. Block Model JSON generatsiyasi (Standart Kub shakli uchun)
    public string GenerateBlockModelJson()
    {
        return $@"{{
  ""parent"": ""minecraft:block/cube_all"",
  ""textures"": {{
    ""all"": ""{textureNamespace}:block/{texturePath}""
  }}
}}";
    }

    // 4. Item Model JSON generatsiyasi (Inventarda blok ko'rinishi)
    public string GenerateItemModelJson()
    {
        return $@"{{
  ""parent"": ""{textureNamespace}:block/{blockId}""
}}";
    }

    // 5. Mod Manifesti va Til fayli uchun (en_us.json)
    public string GenerateLanguageJson()
    {
        return $@"{{
  ""block.{textureNamespace}.{blockId}"": ""{displayName}""
}}";
    }
}
