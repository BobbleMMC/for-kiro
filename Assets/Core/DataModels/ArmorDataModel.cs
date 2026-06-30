using System;

public enum ArmorSlot
{
    Helmet,
    Chestplate,
    Leggings,
    Boots
}

[System.Serializable]
public class ArmorDataModel
{
    public string armorId = "custom_ruby_helmet";
    public string displayName = "Ruby Helmet";
    public ArmorSlot armorSlot = ArmorSlot.Helmet;
    public int defense = 3;
    public float toughness = 2.0f;
    public float knockbackResistance = 0.0f;
    public MinecraftCreativeTab creativeTab = MinecraftCreativeTab.Misc;
    public string textureNamespace = "mymod";

    public string GenerateFabricCode()
    {
        string upperId = armorId.ToUpper();
        string slotType = "";
        switch (armorSlot)
        {
            case ArmorSlot.Helmet: slotType = "ArmorItem.Type.HELMET"; break;
            case ArmorSlot.Chestplate: slotType = "ArmorItem.Type.CHESTPLATE"; break;
            case ArmorSlot.Leggings: slotType = "ArmorItem.Type.LEGGINGS"; break;
            case ArmorSlot.Boots: slotType = "ArmorItem.Type.BOOTS"; break;
        }

        return $@"package net.mymod.item;

import net.fabricmc.api.ModInitializer;
import net.minecraft.item.*;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.sound.SoundEvent;
import net.minecraft.sound.SoundEvents;
import net.minecraft.recipe.Ingredient;
import net.minecraft.util.Identifier;

public class ModArmor implements ModInitializer {{

    // Custom Armor Material
    public static final ArmorMaterial CUSTOM_MATERIAL = new ArmorMaterial() {{
        @Override public int getDurability(ArmorItem.Type type) {{ return 500; }}
        @Override public int getProtection(ArmorItem.Type type) {{ 
            return type == {slotType} ? {defense} : 1; 
        }}
        @Override public int getEnchantability() {{ return 15; }}
        @Override public SoundEvent getEquipSound() {{ return SoundEvents.ITEM_ARMOR_EQUIP_DIAMOND; }}
        @Override public Ingredient getRepairIngredient() {{ return null; }}
        @Override public String getName() {{ return ""custom_ruby""; }}
        @Override public float getToughness() {{ return {toughness.ToString("0.0")}f; }}
        @Override public float getKnockbackResistance() {{ return {knockbackResistance.ToString("0.0")}f; }}
    }};

    // {displayName} elementi deklaratsiyasi
    public static final ArmorItem {upperId} = registerArmor(""{armorId}"", 
        new ArmorItem(CUSTOM_MATERIAL, {slotType}, new Item.Settings()));

    private static ArmorItem registerArmor(String name, ArmorItem armor) {{
        return Registry.register(Registries.ITEM, new Identifier(""{textureNamespace}"", name), armor);
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
  ""item.{textureNamespace}.{armorId}"": ""{displayName}""
}}";
    }

    public string GenerateItemModelJson()
    {
        return $@"{{
  ""parent"": ""minecraft:item/generated"",
  ""textures"": {{
    ""layer0"": ""{textureNamespace}:item/{armorId}""
  }}
}}";
    }
}
