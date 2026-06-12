using System;

public enum ToolType
{
    Sword,
    Pickaxe,
    Axe,
    Shovel,
    Hoe
}

[System.Serializable]
public class ToolDataModel
{
    public string toolId = "custom_ruby_sword";
    public string displayName = "Ruby Sword";
    public ToolType toolType = ToolType.Sword;
    public float attackDamage = 3.0f;
    public float attackSpeed = -2.4f;
    public int durability = 1561;
    public int miningLevel = 3;
    public MinecraftCreativeTab creativeTab = MinecraftCreativeTab.Misc;
    public string textureNamespace = "mymod";

    public string GenerateFabricCode()
    {
        string upperId = toolId.ToUpper();
        string toolItemClass = toolType.ToString() + "Item"; // SwordItem, PickaxeItem, etc.
        
        return $@"package net.mymod.item;

import net.fabricmc.api.ModInitializer;
import net.minecraft.item.*;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.util.Identifier;

public class ModTools implements ModInitializer {{

    // Custom Tool Material
    public static final ToolMaterial CUSTOM_MATERIAL = new ToolMaterial() {{
        @Override public int getDurability() {{ return {durability}; }}
        @Override public float getMiningSpeedMultiplier() {{ return 8.0f; }}
        @Override public float getAttackDamage() {{ return {attackDamage.ToString("0.0")}f; }}
        @Override public int getMiningLevel() {{ return {miningLevel}; }}
        @Override public int getEnchantability() {{ return 15; }}
        @Override public Ingredient getRepairIngredient() {{ return null; }}
    }};

    // {displayName} elementi deklaratsiyasi
    public static final ToolItem {upperId} = registerTool(""{toolId}"", 
        new {toolItemClass}(CUSTOM_MATERIAL, {(int)attackDamage}, {attackSpeed.ToString("0.0")}f, new Item.Settings()));

    private static ToolItem registerTool(String name, ToolItem tool) {{
        return Registry.register(Registries.ITEM, new Identifier(""{textureNamespace}"", name), tool);
    }}

    @Override
    public void onInitialize() {{
        // {displayName} o'yinga muvaffaqiyatli yuklandi
    }}
}}";
    }

    public string GenerateLanguageJson()
    {
        return $@"{{
  ""item.{textureNamespace}.{toolId}"": ""{displayName}""
}}";
    }

    public string GenerateItemModelJson()
    {
        return $@"{{
  ""parent"": ""minecraft:item/handheld"",
  ""textures"": {{
    ""layer0"": ""{textureNamespace}:item/{toolId}""
  }}
}}";
    }
}
