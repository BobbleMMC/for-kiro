using System;

[System.Serializable]
public class ItemDataModel
{
    public string itemId = "custom_ruby";
    public string displayName = "Ruby";
    public int stackSize = 64;
    public bool isFood = false;
    public MinecraftCreativeTab creativeTab = MinecraftCreativeTab.Misc;
    public string textureNamespace = "mymod";

    public string GenerateFabricCode()
    {
        string upperId = itemId.ToUpper();
        string foodSettings = isFood ? "\n            .food(new FoodComponent.Builder().hunger(4).saturationModifier(0.3f).build())" : "";
        
        return $@"package net.mymod.item;

import net.fabricmc.api.ModInitializer;
import net.minecraft.item.Item;
import net.minecraft.item.FoodComponent;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.util.Identifier;

public class ModItems implements ModInitializer {{

    // {displayName} elementi deklaratsiyasi
    public static final Item {upperId} = registerItem(""{itemId}"", 
        new Item(new Item.Settings()
            .maxCount({stackSize}){foodSettings}
        ));

    private static Item registerItem(String name, Item item) {{
        return Registry.register(Registries.ITEM, new Identifier(""{textureNamespace}"", name), item);
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
  ""item.{textureNamespace}.{itemId}"": ""{displayName}""
}}";
    }

    public string GenerateItemModelJson()
    {
        return $@"{{
  ""parent"": ""minecraft:item/generated"",
  ""textures"": {{
    ""layer0"": ""{textureNamespace}:item/{itemId}""
  }}
}}";
    }
}
