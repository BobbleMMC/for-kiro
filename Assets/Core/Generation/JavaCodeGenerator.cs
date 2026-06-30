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
        bool useComponents  = IsVersionAtLeast(mcVersion, 1, 21); // 1.20.5+ Item Components
        StringBuilder sb    = new StringBuilder();

        sb.AppendLine($"package net.{modId}.item;");
        sb.AppendLine();

        // Versiya-farqli import lar
        if (useComponents)
        {
            sb.AppendLine("import net.minecraft.component.DataComponentTypes;");
            sb.AppendLine("import net.minecraft.component.type.FoodComponent;");
            sb.AppendLine("import net.minecraft.item.*;");
            sb.AppendLine("import net.minecraft.registry.Registries;");
            sb.AppendLine("import net.minecraft.registry.Registry;");
            sb.AppendLine("import net.minecraft.registry.tag.BlockTags;");
            sb.AppendLine("import net.minecraft.sound.SoundEvents;");
            sb.AppendLine("import net.minecraft.sound.SoundEvent;");
            sb.AppendLine("import net.minecraft.recipe.Ingredient;");
            sb.AppendLine("import net.minecraft.util.Identifier;");
        }
        else
        {
            sb.AppendLine("import net.fabricmc.fabric.api.item.v1.FabricItemSettings;");
            sb.AppendLine("import net.minecraft.item.*;");
            sb.AppendLine("import net.minecraft.registry.Registries;");
            sb.AppendLine("import net.minecraft.registry.Registry;");
            sb.AppendLine("import net.minecraft.sound.SoundEvents;");
            sb.AppendLine("import net.minecraft.sound.SoundEvent;");
            sb.AppendLine("import net.minecraft.recipe.Ingredient;");
            sb.AppendLine("import net.minecraft.util.Identifier;");
        }
        sb.AppendLine();
        sb.AppendLine($"public class ModItems {{");
        sb.AppendLine();

        // Basic items
        if (items != null && items.Count > 0)
        {
            sb.AppendLine("    // ── Basic Items ──────────────────────────────────────────");
            foreach (var item in items)
            {
                string uid = item.itemId.ToUpper();

                if (useComponents)
                {
                    // 1.21+ Item Components pattern
                    string settings = $"new Item.Settings().maxCount({item.stackSize})";
                    if (item.isFood)
                    {
                        settings += "\n            .component(DataComponentTypes.FOOD, new FoodComponent.Builder()" +
                                    "\n                .nutrition(4).saturationModifier(0.3f).build())";
                    }
                    sb.AppendLine($"    public static final Item {uid} =");
                    sb.AppendLine($"        register(\"{item.itemId}\", new Item({settings}));");
                }
                else
                {
                    // 1.20.x legacy pattern
                    string food = item.isFood
                        ? "\n            .food(new FoodComponent.Builder().hunger(4).saturationModifier(0.3f).build())"
                        : "";
                    sb.AppendLine($"    public static final Item {uid} =");
                    sb.AppendLine($"        register(\"{item.itemId}\", new Item(new Item.Settings().maxCount({item.stackSize}){food}));");
                }
                sb.AppendLine();
            }
        }

        // Tools
        if (tools != null && tools.Count > 0)
        {
            sb.AppendLine("    // ── Tools ────────────────────────────────────────────────");

            if (useComponents)
            {
                // 1.21+ ToolMaterial — static factory method pattern
                sb.AppendLine("    // 1.21+ ToolMaterial: ToolMaterial.of() factory yoki anonymous class");
                sb.AppendLine();
            }

            foreach (var tool in tools)
            {
                string uid = tool.toolId.ToUpper();
                string mat = $"MATERIAL_{uid}";
                string cls = tool.toolType.ToString() + "Item";

                if (useComponents)
                {
                    // 1.21+ pattern: ToolMaterial record-style
                    sb.AppendLine($"    public static final ToolMaterial {mat} = new ToolMaterial(");
                    sb.AppendLine($"        BlockTags.INCORRECT_FOR_DIAMOND_TOOL, // Qazish darajasi");
                    sb.AppendLine($"        {tool.durability},   // Chidamlilik");
                    sb.AppendLine($"        8.0f,                // Qazish tezligi");
                    sb.AppendLine($"        {F(tool.attackDamage)}f,  // Hujum kuchi");
                    sb.AppendLine($"        15,                  // Sehrlanish qobiliyati");
                    sb.AppendLine($"        () -> Ingredient.EMPTY");
                    sb.AppendLine($"    );");
                    sb.AppendLine();
                    sb.AppendLine($"    public static final ToolItem {uid} =");
                    sb.AppendLine($"        registerTool(\"{tool.toolId}\", new {cls}({mat},");
                    sb.AppendLine($"            new Item.Settings().attributeModifiers({cls}.createAttributeModifiers(");
                    sb.AppendLine($"                {mat}, {(int)tool.attackDamage}, {F(tool.attackSpeed)}f))));");
                }
                else
                {
                    // 1.20.x legacy anonymous class pattern
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
                }
                sb.AppendLine();
            }
        }

        // Armors
        if (armors != null && armors.Count > 0)
        {
            sb.AppendLine("    // ── Armors ───────────────────────────────────────────────");

            if (useComponents)
            {
                // 1.21+ ArmorMaterial — registry-based (Holder<ArmorMaterial>)
                sb.AppendLine("    // 1.21+: ArmorMaterial registratsiya orqali Holder sifatida olinadi");
                sb.AppendLine("    // Haqiqiy loyihada ArmorMaterials registry ga qo'shiladi");
                sb.AppendLine();
            }

            foreach (var armor in armors)
            {
                string uid  = armor.armorId.ToUpper();
                string mat  = $"ARMOR_MATERIAL_{uid}";
                string slot = armor.armorSlot.ToString().ToUpper();

                if (useComponents)
                {
                    // 1.21+ pattern: simplified ArmorItem with component settings
                    sb.AppendLine($"    // {armor.displayName} ({armor.armorSlot})");
                    sb.AppendLine($"    public static final ArmorItem {uid} =");
                    sb.AppendLine($"        registerArmor(\"{armor.armorId}\", new ArmorItem(");
                    sb.AppendLine($"            ArmorMaterials.DIAMOND, // TODO: Custom material registratsiya qiling");
                    sb.AppendLine($"            ArmorItem.Type.{slot},");
                    sb.AppendLine($"            new Item.Settings().maxDamage(ArmorItem.Type.{slot}.getMaxDamage(37))");
                    sb.AppendLine($"        ));");
                }
                else
                {
                    // 1.20.x legacy anonymous ArmorMaterial pattern
                    sb.AppendLine($"    public static final ArmorMaterial {mat} = new ArmorMaterial() {{");
                    sb.AppendLine($"        @Override public int getDurability(ArmorItem.Type t)  {{ return 500; }}");
                    sb.AppendLine($"        @Override public int getProtection(ArmorItem.Type t)  {{ return t == ArmorItem.Type.{slot} ? {armor.defense} : 1; }}");
                    sb.AppendLine($"        @Override public int getEnchantability()              {{ return 15; }}");
                    sb.AppendLine($"        @Override public SoundEvent getEquipSound()           {{ return SoundEvents.ITEM_ARMOR_EQUIP_DIAMOND; }}");
                    sb.AppendLine($"        @Override public Ingredient getRepairIngredient()     {{ return null; }}");
                    sb.AppendLine($"        @Override public String getName()                     {{ return \"{armor.armorId}\"; }}");
                    sb.AppendLine($"        @Override public float getToughness()                 {{ return {F(armor.toughness)}f; }}");
                    sb.AppendLine($"        @Override public float getKnockbackResistance()       {{ return {F(armor.knockbackResistance)}f; }}");
                    sb.AppendLine("    };");
                    sb.AppendLine();
                    sb.AppendLine($"    public static final ArmorItem {uid} =");
                    sb.AppendLine($"        registerArmor(\"{armor.armorId}\", new ArmorItem({mat}, ArmorItem.Type.{slot}, new Item.Settings()));");
                }
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
        sb.AppendLine("import net.minecraft.world.item.crafting.Ingredient;");
        sb.AppendLine("import net.minecraft.sounds.SoundEvents;");
        sb.AppendLine("import net.minecraft.sounds.SoundEvent;");
        sb.AppendLine("import net.minecraft.core.Holder;");
        sb.AppendLine("import net.minecraft.tags.BlockTags;");
        sb.AppendLine("import net.neoforged.bus.api.IEventBus;");
        sb.AppendLine("import net.neoforged.neoforge.registries.DeferredItem;");
        sb.AppendLine("import net.neoforged.neoforge.registries.DeferredRegister;");
        sb.AppendLine($"import net.{modId}.MyMod;");
        sb.AppendLine();
        sb.AppendLine("import java.util.EnumMap;");
        sb.AppendLine("import java.util.List;");
        sb.AppendLine();
        sb.AppendLine($"public class ModItems {{");
        sb.AppendLine();
        sb.AppendLine("    public static final DeferredRegister.Items ITEMS =");
        sb.AppendLine($"        DeferredRegister.createItems(MyMod.MOD_ID);");
        sb.AppendLine();

        // ── Basic Items ──
        if (items != null && items.Count > 0)
        {
            sb.AppendLine("    // ═══════════════════════════════════════════════════════════");
            sb.AppendLine("    // BASIC ITEMS");
            sb.AppendLine("    // ═══════════════════════════════════════════════════════════");
            sb.AppendLine();
            foreach (var item in items)
            {
                string uid = item.itemId.ToUpper();
                string food = item.isFood ? ".food(new FoodProperties.Builder().nutrition(4).saturationModifier(0.3f).build())" : "";
                sb.AppendLine($"    // {item.displayName}");
                sb.AppendLine($"    public static final DeferredItem<Item> {uid} =");
                sb.AppendLine($"        ITEMS.registerSimpleItem(\"{item.itemId}\", new Item.Properties().stacksTo({item.stackSize}){food});");
                sb.AppendLine();
            }
        }

        // ── Tool Tier ──
        if (tools != null && tools.Count > 0)
        {
            sb.AppendLine("    // ═══════════════════════════════════════════════════════════");
            sb.AppendLine("    // CUSTOM TOOL TIER");
            sb.AppendLine("    // ═══════════════════════════════════════════════════════════");
            sb.AppendLine();
            sb.AppendLine($"    public static final Tier CUSTOM_TIER = new Tier(");
            sb.AppendLine($"        BlockTags.INCORRECT_FOR_DIAMOND_TOOL, // Qazish darajasi (Diamond = 3)");
            sb.AppendLine($"        {tools[0].durability},                // Chidamlilik");
            sb.AppendLine($"        8.0f,                                 // Qazish tezligi");
            sb.AppendLine($"        {F(tools[0].attackDamage)}f,          // Hujum kuchi bonusi");
            sb.AppendLine($"        15,                                   // Sehrlanish qobiliyati");
            sb.AppendLine($"        () -> Ingredient.EMPTY               // Ta'mirlash materiali");
            sb.AppendLine($"    );");
            sb.AppendLine();

            sb.AppendLine("    // ── Tool Items ───────────────────────────────────────────");
            sb.AppendLine();
            foreach (var tool in tools)
            {
                string uid = tool.toolId.ToUpper();
                string toolClass = GetNeoForgeToolClass(tool.toolType);
                float baseDamage = tool.attackDamage;
                float baseSpeed = tool.attackSpeed;

                sb.AppendLine($"    // {tool.displayName} ({tool.toolType})");
                sb.AppendLine($"    public static final DeferredItem<Item> {uid} =");
                sb.AppendLine($"        ITEMS.registerItem(\"{tool.toolId}\", props -> new {toolClass}(");
                sb.AppendLine($"            CUSTOM_TIER, {F(baseDamage)}f, {F(baseSpeed)}f,");
                sb.AppendLine($"            props.durability({tool.durability})");
                sb.AppendLine($"        ));");
                sb.AppendLine();
            }
        }

        // ── Armor Material ──
        if (armors != null && armors.Count > 0)
        {
            sb.AppendLine("    // ═══════════════════════════════════════════════════════════");
            sb.AppendLine("    // CUSTOM ARMOR MATERIAL");
            sb.AppendLine("    // ═══════════════════════════════════════════════════════════");
            sb.AppendLine();

            // NeoForge ArmorMaterial (1.21+ style)
            sb.AppendLine("    public static final ArmorMaterial CUSTOM_ARMOR_MATERIAL = new ArmorMaterial(");
            sb.AppendLine("        // Himoya qiymatlari (slot bo'yicha)");
            sb.AppendLine("        new EnumMap<>(ArmorItem.Type.class) {{");

            // Har bir armor slot uchun defense qiymati
            int helmetDef = 3, chestDef = 8, legsDef = 6, bootsDef = 3;
            foreach (var armor in armors)
            {
                switch (armor.armorSlot)
                {
                    case ArmorSlot.Helmet:     helmetDef = armor.defense; break;
                    case ArmorSlot.Chestplate: chestDef  = armor.defense; break;
                    case ArmorSlot.Leggings:   legsDef   = armor.defense; break;
                    case ArmorSlot.Boots:      bootsDef  = armor.defense; break;
                }
            }
            sb.AppendLine($"            put(ArmorItem.Type.HELMET, {helmetDef});");
            sb.AppendLine($"            put(ArmorItem.Type.CHESTPLATE, {chestDef});");
            sb.AppendLine($"            put(ArmorItem.Type.LEGGINGS, {legsDef});");
            sb.AppendLine($"            put(ArmorItem.Type.BOOTS, {bootsDef});");
            sb.AppendLine("        }},");
            sb.AppendLine("        15,                                    // Sehrlanish qobiliyati");
            sb.AppendLine("        SoundEvents.ARMOR_EQUIP_DIAMOND,       // Kiyish ovozi");
            sb.AppendLine("        () -> Ingredient.EMPTY,                // Ta'mirlash materiali");
            sb.AppendLine($"        List.of(new ArmorMaterial.Layer(MyMod.MOD_ID + \"_custom\")),");

            float toughness = armors.Count > 0 ? armors[0].toughness : 2.0f;
            float knockback = armors.Count > 0 ? armors[0].knockbackResistance : 0.0f;
            sb.AppendLine($"        {F(toughness)}f,                      // Qattiqlik (Toughness)");
            sb.AppendLine($"        {F(knockback)}f                       // Turtki qarshiligi");
            sb.AppendLine("    );");
            sb.AppendLine();

            sb.AppendLine("    // ── Armor Items ──────────────────────────────────────────");
            sb.AppendLine();
            foreach (var armor in armors)
            {
                string uid = armor.armorId.ToUpper();
                string slotEnum = armor.armorSlot.ToString().ToUpper();

                sb.AppendLine($"    // {armor.displayName} ({armor.armorSlot})");
                sb.AppendLine($"    public static final DeferredItem<Item> {uid} =");
                sb.AppendLine($"        ITEMS.registerItem(\"{armor.armorId}\", props -> new ArmorItem(");
                sb.AppendLine($"            CUSTOM_ARMOR_MATERIAL, ArmorItem.Type.{slotEnum},");
                sb.AppendLine($"            props.durability(ArmorItem.Type.{slotEnum}.getDurability(37))");
                sb.AppendLine($"        ));");
                sb.AppendLine();
            }
        }

        // ── Register method ──
        sb.AppendLine("    // ═══════════════════════════════════════════════════════════");
        sb.AppendLine("    // REGISTRATSIYA");
        sb.AppendLine("    // ═══════════════════════════════════════════════════════════");
        sb.AppendLine();
        sb.AppendLine("    public static void register(IEventBus eventBus) {");
        sb.AppendLine("        ITEMS.register(eventBus);");
        sb.AppendLine("    }");
        sb.AppendLine("}");

        return sb.ToString();
    }

    /// <summary>NeoForge tool class nomi: SwordItem, PickaxeItem, etc.</summary>
    private static string GetNeoForgeToolClass(ToolType type)
    {
        switch (type)
        {
            case ToolType.Sword:   return "SwordItem";
            case ToolType.Pickaxe: return "PickaxeItem";
            case ToolType.Axe:     return "AxeItem";
            case ToolType.Shovel:  return "ShovelItem";
            case ToolType.Hoe:     return "HoeItem";
            default:               return "SwordItem";
        }
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
