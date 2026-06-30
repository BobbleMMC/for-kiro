using System;
using System.Text;
using System.Collections.Generic;
using System.Globalization;

public static class JavaCodeGenerator
{
    // ─── Live preview helper (single block, always Fabric) ───────────────────
    public static string GenerateFabricBlockCode(BlockDataModel model)
    {
        if (model == null) return "// Ma'lumot topilmadi.";

        string upperBlockId = model.blockId.ToUpper();
        StringBuilder sb    = new StringBuilder();

        sb.AppendLine($"package net.{model.textureNamespace}.block;");
        sb.AppendLine();
        sb.AppendLine("import net.fabricmc.api.ModInitializer;");
        sb.AppendLine("import net.minecraft.block.AbstractBlock;");
        sb.AppendLine("import net.minecraft.block.Block;");
        sb.AppendLine("import net.minecraft.registry.Registries;");
        sb.AppendLine("import net.minecraft.registry.Registry;");
        sb.AppendLine("import net.minecraft.util.Identifier;");
        sb.AppendLine();
        sb.AppendLine("public class ModBlocks implements ModInitializer {");
        sb.AppendLine();
        sb.AppendLine($"    // {model.displayName} elementi deklaratsiyasi");
        sb.Append($"    public static final Block {upperBlockId} = registerBlock(\"{model.blockId}\", ");
        sb.Append($"new Block(AbstractBlock.Settings.create()");
        sb.Append($".strength({F(model.hardness)}f, {F(model.resistance)}f)");
        if (model.lightLevel > 0) sb.Append($".luminance(state -> {model.lightLevel})");
        sb.AppendLine("));");
        sb.AppendLine();
        sb.AppendLine("    private static Block registerBlock(String name, Block block) {");
        sb.AppendLine($"        return Registry.register(Registries.BLOCK, Identifier.of(\"{model.textureNamespace}\", name), block);");
        sb.AppendLine("    }");
        sb.AppendLine();
        sb.AppendLine("    @Override");
        sb.AppendLine("    public void onInitialize() {");
        sb.AppendLine($"        // {model.displayName} o'yinga muvaffaqiyatli yuklandi");
        sb.AppendLine("    }");
        sb.AppendLine("}");

        return sb.ToString();
    }

    // ─── Full export: ModBlocks.java ─────────────────────────────────────────
    public static string GenerateModBlocksCode(
        List<BlockDataModel> blocks, string modId,
        string loader = "Fabric", string mcVersion = "1.21")
    {
        return loader == "NeoForge"
            ? GenerateNeoForgeModBlocks(blocks, modId)
            : GenerateFabricModBlocks(blocks, modId, mcVersion);
    }

    private static string GenerateFabricModBlocks(
        List<BlockDataModel> blocks, string modId, string mcVersion)
    {
        bool useResourceKey = IsVersionAtLeast(mcVersion, 1, 21);
        StringBuilder sb    = new StringBuilder();

        sb.AppendLine($"package net.{modId}.block;");
        sb.AppendLine();
        sb.AppendLine("import net.fabricmc.fabric.api.object.builder.v1.block.FabricBlockSettings;");
        sb.AppendLine("import net.minecraft.block.Block;");
        sb.AppendLine("import net.minecraft.registry.Registries;");
        sb.AppendLine("import net.minecraft.registry.Registry;");
        if (useResourceKey)
            sb.AppendLine("import net.minecraft.registry.RegistryKey;");
        sb.AppendLine("import net.minecraft.util.Identifier;");
        sb.AppendLine();
        sb.AppendLine($"public class ModBlocks {{");
        sb.AppendLine();

        foreach (var block in blocks)
        {
            string uid = block.blockId.ToUpper();
            string settings = BuildFabricBlockSettings(block);

            sb.AppendLine($"    // {block.displayName}");
            sb.AppendLine($"    public static final Block {uid} =");
            sb.AppendLine($"        register(\"{block.blockId}\", new Block({settings}));");
            sb.AppendLine();
        }

        if (useResourceKey)
        {
            // 1.21+ pattern
            sb.AppendLine("    private static Block register(String id, Block block) {");
            sb.AppendLine($"        return Registry.register(Registries.BLOCK, Identifier.of(\"{modId}\", id), block);");
            sb.AppendLine("    }");
        }
        else
        {
            // 1.20.x pattern
            sb.AppendLine("    private static Block register(String id, Block block) {");
            sb.AppendLine($"        return Registry.register(Registries.BLOCK, new Identifier(\"{modId}\", id), block);");
            sb.AppendLine("    }");
        }

        sb.AppendLine();
        sb.AppendLine("    /** Bloklar ro'yxatga olish paytida classload orqali ishga tushiriladi. */");
        sb.AppendLine("    public static void initialize() {}");
        sb.AppendLine("}");

        return sb.ToString();
    }

    private static string GenerateNeoForgeModBlocks(List<BlockDataModel> blocks, string modId)
    {
        StringBuilder sb = new StringBuilder();

        sb.AppendLine($"package net.{modId}.block;");
        sb.AppendLine();
        sb.AppendLine("import net.minecraft.world.level.block.Block;");
        sb.AppendLine("import net.minecraft.world.level.block.state.BlockBehaviour;");
        sb.AppendLine("import net.neoforged.bus.api.IEventBus;");
        sb.AppendLine("import net.neoforged.neoforge.registries.DeferredBlock;");
        sb.AppendLine("import net.neoforged.neoforge.registries.DeferredRegister;");
        sb.AppendLine($"import net.{modId}.MyMod;");
        sb.AppendLine();
        sb.AppendLine($"public class ModBlocks {{");
        sb.AppendLine();
        sb.AppendLine("    public static final DeferredRegister.Blocks BLOCKS =");
        sb.AppendLine($"        DeferredRegister.createBlocks(MyMod.MOD_ID);");
        sb.AppendLine();

        foreach (var block in blocks)
        {
            string uid      = block.blockId.ToUpper();
            string settings = BuildNeoForgeBlockProperties(block);

            sb.AppendLine($"    // {block.displayName}");
            sb.AppendLine($"    public static final DeferredBlock<Block> {uid} =");
            sb.AppendLine($"        BLOCKS.registerSimpleBlock(\"{block.blockId}\", {settings});");
            sb.AppendLine();
        }

        sb.AppendLine("    public static void register(IEventBus eventBus) {");
        sb.AppendLine("        BLOCKS.register(eventBus);");
        sb.AppendLine("    }");
        sb.AppendLine("}");

        return sb.ToString();
    }

    // ─── Full export: ModItems.java ──────────────────────────────────────────
    public static string GenerateModItemsCode(
        List<ItemDataModel> items, List<ToolDataModel> tools, List<ArmorDataModel> armors,
        string modId, string loader = "Fabric", string mcVersion = "1.21")
    {
        return loader == "NeoForge"
            ? GenerateNeoForgeModItems(items, tools, armors, modId)
            : GenerateFabricModItems(items, tools, armors, modId, mcVersion);
    }

    private static string GenerateFabricModItems(
        List<ItemDataModel> items, List<ToolDataModel> tools, List<ArmorDataModel> armors,
        string modId, string mcVersion)
    {
        bool useResourceKey = IsVersionAtLeast(mcVersion, 1, 21);
        StringBuilder sb    = new StringBuilder();

        sb.AppendLine($"package net.{modId}.item;");
        sb.AppendLine();
        sb.AppendLine("import net.fabricmc.fabric.api.item.v1.FabricItemSettings;");
        sb.AppendLine("import net.minecraft.item.*;");
        sb.AppendLine("import net.minecraft.registry.Registries;");
        sb.AppendLine("import net.minecraft.registry.Registry;");
        sb.AppendLine("import net.minecraft.sound.SoundEvents;");
        sb.AppendLine("import net.minecraft.sound.SoundEvent;");
        sb.AppendLine("import net.minecraft.recipe.Ingredient;");
        sb.AppendLine("import net.minecraft.util.Identifier;");
        sb.AppendLine();
        sb.AppendLine($"public class ModItems {{");
        sb.AppendLine();

        // Basic items
        if (items != null && items.Count > 0)
        {
            sb.AppendLine("    // ── Basic Items ──────────────────────────────────────────");
            foreach (var item in items)
            {
                string uid  = item.itemId.ToUpper();
                string food = item.isFood
                    ? "\n            .food(new FoodComponent.Builder().hunger(4).saturationModifier(0.3f).build())"
                    : "";
                sb.AppendLine($"    public static final Item {uid} =");
                sb.AppendLine($"        register(\"{item.itemId}\", new Item(new Item.Settings().maxCount({item.stackSize}){food}));");
                sb.AppendLine();
            }
        }

        // Tools
        if (tools != null && tools.Count > 0)
        {
            sb.AppendLine("    // ── Tools ────────────────────────────────────────────────");
            foreach (var tool in tools)
            {
                string uid  = tool.toolId.ToUpper();
                string mat  = $"MATERIAL_{uid}";
                string cls  = tool.toolType.ToString() + "Item";

                sb.AppendLine($"    public static final ToolMaterial {mat} = new ToolMaterial() {{");
                sb.AppendLine($"        @Override public int getDurability()               {{ return {tool.durability}; }}");
                sb.AppendLine($"        @Override public float getMiningSpeedMultiplier()  {{ return 8.0f; }}");
                sb.AppendLine($"        @Override public float getAttackDamage()           {{ return {F(tool.attackDamage)}f; }}");
                sb.AppendLine($"        @Override public int getMiningLevel()              {{ return {tool.miningLevel}; }}");
                sb.AppendLine($"        @Override public int getEnchantability()           {{ return 15; }}");
                sb.AppendLine($"        @Override public Ingredient getRepairIngredient()  {{ return null; }}");
                sb.AppendLine("    };");
                sb.AppendLine();
                sb.AppendLine($"    public static final ToolItem {uid} =");
                sb.AppendLine($"        registerTool(\"{tool.toolId}\", new {cls}({mat}, {(int)tool.attackDamage}, {F(tool.attackSpeed)}f, new Item.Settings()));");
                sb.AppendLine();
            }
        }

        // Armors
        if (armors != null && armors.Count > 0)
        {
            sb.AppendLine("    // ── Armors ───────────────────────────────────────────────");
            foreach (var armor in armors)
            {
                string uid   = armor.armorId.ToUpper();
                string mat   = $"ARMOR_MATERIAL_{uid}";
                string slot  = NeoForgeArmorSlot(armor.armorSlot); // same constants on Fabric too

                sb.AppendLine($"    public static final ArmorMaterial {mat} = new ArmorMaterial() {{");
                sb.AppendLine($"        @Override public int getDurability(ArmorItem.Type t)  {{ return 500; }}");
                sb.AppendLine($"        @Override public int getProtection(ArmorItem.Type t)  {{ return t == ArmorItem.Type.{armor.armorSlot.ToString().ToUpper()} ? {armor.defense} : 1; }}");
                sb.AppendLine($"        @Override public int getEnchantability()              {{ return 15; }}");
                sb.AppendLine($"        @Override public SoundEvent getEquipSound()           {{ return SoundEvents.ITEM_ARMOR_EQUIP_DIAMOND; }}");
                sb.AppendLine($"        @Override public Ingredient getRepairIngredient()     {{ return null; }}");
                sb.AppendLine($"        @Override public String getName()                     {{ return \"{armor.armorId}\"; }}");
                sb.AppendLine($"        @Override public float getToughness()                 {{ return {F(armor.toughness)}f; }}");
                sb.AppendLine($"        @Override public float getKnockbackResistance()       {{ return {F(armor.knockbackResistance)}f; }}");
                sb.AppendLine("    };");
                sb.AppendLine();
                sb.AppendLine($"    public static final ArmorItem {uid} =");
                sb.AppendLine($"        registerArmor(\"{armor.armorId}\", new ArmorItem({mat}, ArmorItem.Type.{armor.armorSlot.ToString().ToUpper()}, new Item.Settings()));");
                sb.AppendLine();
            }
        }

        // Register helpers
        string idFactory = useResourceKey
            ? $"Identifier.of(\"{modId}\", name)"
            : $"new Identifier(\"{modId}\", name)";

        sb.AppendLine("    private static Item     register    (String name, Item     item)  {");
        sb.AppendLine($"        return Registry.register(Registries.ITEM, {idFactory}, item);");
        sb.AppendLine("    }");
        sb.AppendLine("    private static ToolItem registerTool(String name, ToolItem tool)  {");
        sb.AppendLine($"        return Registry.register(Registries.ITEM, {idFactory}, tool);");
        sb.AppendLine("    }");
        sb.AppendLine("    private static ArmorItem registerArmor(String name, ArmorItem a) {");
        sb.AppendLine($"        return Registry.register(Registries.ITEM, {idFactory}, a);");
        sb.AppendLine("    }");
        sb.AppendLine();
        sb.AppendLine("    public static void initialize() {}");
        sb.AppendLine("}");

        return sb.ToString();
    }

    private static string GenerateNeoForgeModItems(
        List<ItemDataModel> items, List<ToolDataModel> tools, List<ArmorDataModel> armors,
        string modId)
    {
        StringBuilder sb = new StringBuilder();

        sb.AppendLine($"package net.{modId}.item;");
        sb.AppendLine();
        sb.AppendLine("import net.minecraft.world.item.*;");
        sb.AppendLine("import net.neoforged.bus.api.IEventBus;");
        sb.AppendLine("import net.neoforged.neoforge.registries.DeferredItem;");
        sb.AppendLine("import net.neoforged.neoforge.registries.DeferredRegister;");
        sb.AppendLine($"import net.{modId}.MyMod;");
        sb.AppendLine();
        sb.AppendLine($"public class ModItems {{");
        sb.AppendLine();
        sb.AppendLine("    public static final DeferredRegister.Items ITEMS =");
        sb.AppendLine($"        DeferredRegister.createItems(MyMod.MOD_ID);");
        sb.AppendLine();

        if (items != null)
        {
            foreach (var item in items)
            {
                sb.AppendLine($"    // {item.displayName}");
                sb.AppendLine($"    public static final DeferredItem<Item> {item.itemId.ToUpper()} =");
                sb.AppendLine($"        ITEMS.registerSimpleItem(\"{item.itemId}\", new Item.Properties().stacksTo({item.stackSize}));");
                sb.AppendLine();
            }
        }

        if (tools != null)
        {
            foreach (var tool in tools)
            {
                sb.AppendLine($"    // {tool.displayName}");
                sb.AppendLine($"    public static final DeferredItem<Item> {tool.toolId.ToUpper()} =");
                sb.AppendLine($"        ITEMS.registerSimpleItem(\"{tool.toolId}\");");
                sb.AppendLine();
            }
        }

        sb.AppendLine("    public static void register(IEventBus eventBus) {");
        sb.AppendLine("        ITEMS.register(eventBus);");
        sb.AppendLine("    }");
        sb.AppendLine("}");

        return sb.ToString();
    }

    // ─── Utilities ───────────────────────────────────────────────────────────

    /// <summary>float → "0.0" with invariant culture</summary>
    private static string F(float v) => v.ToString("0.0", CultureInfo.InvariantCulture);

    private static bool IsVersionAtLeast(string ver, int major, int minor)
    {
        var parts = ver.Split('.');
        if (parts.Length < 2) return false;
        if (!int.TryParse(parts[0], out int ma) || !int.TryParse(parts[1], out int mi)) return false;
        return ma > major || (ma == major && mi >= minor);
    }

    private static string BuildFabricBlockSettings(BlockDataModel block)
    {
        var sb = new StringBuilder("FabricBlockSettings.create()");
        sb.Append($".strength({F(block.hardness)}f, {F(block.resistance)}f)");
        if (block.lightLevel > 0) sb.Append($".luminance(state -> {block.lightLevel})");
        return sb.ToString();
    }

    private static string BuildNeoForgeBlockProperties(BlockDataModel block)
    {
        var sb = new StringBuilder("BlockBehaviour.Properties.of()");
        sb.Append($".strength({F(block.hardness)}f, {F(block.resistance)}f)");
        if (block.lightLevel > 0) sb.Append($".lightLevel(state -> {block.lightLevel})");
        return sb.ToString();
    }

    private static string NeoForgeArmorSlot(ArmorSlot slot)
    {
        switch (slot)
        {
            case ArmorSlot.Helmet:     return "HELMET";
            case ArmorSlot.Chestplate: return "CHESTPLATE";
            case ArmorSlot.Leggings:   return "LEGGINGS";
            case ArmorSlot.Boots:      return "BOOTS";
            default:                   return "CHESTPLATE";
        }
    }
}
