using System;

[System.Serializable]
public class CreativeTabDataModel
{
    public string tabId = "ruby_tab";
    public string displayName = "Ruby Mod Elements";
    public string iconItemId = "custom_ruby_block";
    public string textureNamespace = "mymod";

    public string GenerateFabricCode()
    {
        string upperId = tabId.ToUpper();
        string formattedIcon = iconItemId.Contains(":") ? iconItemId : $"{textureNamespace}:{iconItemId}";

        return $@"package net.mymod.item;

import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.itemgroup.v1.FabricItemGroup;
import net.minecraft.item.ItemGroup;
import net.minecraft.item.ItemStack;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;

public class ModItemGroup implements ModInitializer {{

    // {displayName} Creative Tab deklaratsiyasi
    public static final ItemGroup {upperId} = Registry.register(
        Registries.ITEM_GROUP,
        new Identifier(""{textureNamespace}"", ""{tabId}""),
        FabricItemGroup.builder()
            .displayName(Text.translatable(""itemGroup.{textureNamespace}.{tabId}""))
            .icon(() -> new ItemStack(Registries.ITEM.get(new Identifier(""{formattedIcon}""))))
            .build()
    );

    @Override
    public void onInitialize() {{
        // {displayName} Creative Tab o'yinga muvaffaqiyatli yuklandi
    }}
}}";
    }

    public string GenerateLanguageJson()
    {
        return $@"{{
  ""itemGroup.{textureNamespace}.{tabId}"": ""{displayName}""
}}";
    }
}
