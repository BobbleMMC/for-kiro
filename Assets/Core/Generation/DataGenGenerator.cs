using System;
using System.Text;
using System.Collections.Generic;
using System.Globalization;

/// <summary>
/// Minecraft Fabric DataGen (Data Generation) Java klass fayllarini yaratadi.
/// DataGen — mod uchun JSON fayllarini (loot tables, recipes, tags, models)
/// qo'lda yozish o'rniga Java orqali avtomatik generatsiya qilish tizimi.
///
/// Yaratiladi:
///   • ModDataGenerators.java   — DataGen entrypoint
///   • ModLootTableProvider.java — Block loot tables
///   • ModRecipeProvider.java   — Recipes (crafting, smelting)
///   • ModBlockTagProvider.java — Block va Item taglar
///   • ModModelProvider.java    — Block va Item model JSON
/// </summary>
public static class DataGenGenerator
{
    // ─── Asosiy entrypoint: barcha DataGen fayllarini generatsiya ─────────

    /// <summary>
    /// WorkspaceData asosida to'liq DataGen Java fayllar to'plamini qaytaradi.
    /// Key = fayl yo'li (relative), Value = Java kod mazmuni.
    /// </summary>
    public static Dictionary<string, string> GenerateAllDataGenFiles(WorkspaceData ws)
    {
        if (ws == null) return new Dictionary<string, string>();

        string modId = ws.modId.Trim();
        if (string.IsNullOrEmpty(modId)) modId = "mymod";

        var files = new Dictionary<string, string>();

        // 1. DataGen entrypoint
        files["datagen/ModDataGenerators.java"] = GenerateDataGenEntrypoint(modId);

        // 2. Block Loot Table Provider
        if (ws.blocks != null && ws.blocks.Count > 0)
            files["datagen/ModLootTableProvider.java"] = GenerateLootTableProvider(ws.blocks, modId);

        // 3. Recipe Provider
        if (ws.recipes != null && ws.recipes.Count > 0)
            files["datagen/ModRecipeProvider.java"] = GenerateRecipeProvider(ws.recipes, ws.blocks, ws.items, modId);

        // 4. Block Tag Provider
        if (ws.blocks != null && ws.blocks.Count > 0)
            files["datagen/ModBlockTagProvider.java"] = GenerateBlockTagProvider(ws.blocks, ws.tools, modId);

        // 5. Model Provider
        files["datagen/ModModelProvider.java"] = GenerateModelProvider(ws.blocks, ws.items, ws.tools, ws.armors, modId);

        return files;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 1. DATAGEN ENTRYPOINT
    // ═══════════════════════════════════════════════════════════════════════

    private static string GenerateDataGenEntrypoint(string modId)
    {
        var sb = new StringBuilder();

        sb.AppendLine($"package net.{modId}.datagen;");
        sb.AppendLine();
        sb.AppendLine("import net.fabricmc.fabric.api.datagen.v1.DataGeneratorEntrypoint;");
        sb.AppendLine("import net.fabricmc.fabric.api.datagen.v1.FabricDataGenerator;");
        sb.AppendLine();
        sb.AppendLine("/**");
        sb.AppendLine(" * DataGen tizimi uchun asosiy kirish nuqtasi.");
        sb.AppendLine(" * fabric.mod.json da 'fabric-datagen' entrypoint sifatida ro'yxatga olinadi.");
        sb.AppendLine(" *");
        sb.AppendLine(" * Ishga tushirish: gradle runDatagen");
        sb.AppendLine(" */");
        sb.AppendLine($"public class ModDataGenerators implements DataGeneratorEntrypoint {{");
        sb.AppendLine();
        sb.AppendLine("    @Override");
        sb.AppendLine("    public void onInitializeDataGenerator(FabricDataGenerator fabricDataGenerator) {");
        sb.AppendLine("        FabricDataGenerator.Pack pack = fabricDataGenerator.createPack();");
        sb.AppendLine();
        sb.AppendLine("        // Loot Tables (Bloklardan nima tushishi)");
        sb.AppendLine("        pack.addProvider(ModLootTableProvider::new);");
        sb.AppendLine();
        sb.AppendLine("        // Recipes (Retseptlar)");
        sb.AppendLine("        pack.addProvider(ModRecipeProvider::new);");
        sb.AppendLine();
        sb.AppendLine("        // Block/Item Tags");
        sb.AppendLine("        pack.addProvider(ModBlockTagProvider::new);");
        sb.AppendLine();
        sb.AppendLine("        // Block va Item Modellari");
        sb.AppendLine("        pack.addProvider(ModModelProvider::new);");
        sb.AppendLine("    }");
        sb.AppendLine("}");

        return sb.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. LOOT TABLE PROVIDER
    // ═══════════════════════════════════════════════════════════════════════

    private static string GenerateLootTableProvider(List<BlockDataModel> blocks, string modId)
    {
        var sb = new StringBuilder();

        sb.AppendLine($"package net.{modId}.datagen;");
        sb.AppendLine();
        sb.AppendLine("import net.fabricmc.fabric.api.datagen.v1.FabricDataOutput;");
        sb.AppendLine("import net.fabricmc.fabric.api.datagen.v1.provider.FabricBlockLootTableProvider;");
        sb.AppendLine("import net.minecraft.registry.RegistryWrapper;");
        sb.AppendLine($"import net.{modId}.block.ModBlocks;");
        sb.AppendLine();
        sb.AppendLine("import java.util.concurrent.CompletableFuture;");
        sb.AppendLine();
        sb.AppendLine("/**");
        sb.AppendLine(" * Blok Loot Table generatori.");
        sb.AppendLine(" * Har bir blok sindirilganda nima tushishini belgilaydi.");
        sb.AppendLine(" */");
        sb.AppendLine($"public class ModLootTableProvider extends FabricBlockLootTableProvider {{");
        sb.AppendLine();
        sb.AppendLine("    public ModLootTableProvider(FabricDataOutput output,");
        sb.AppendLine("                               CompletableFuture<RegistryWrapper.WrapperLookup> registryLookup) {");
        sb.AppendLine("        super(output, registryLookup);");
        sb.AppendLine("    }");
        sb.AppendLine();
        sb.AppendLine("    @Override");
        sb.AppendLine("    public void generate() {");

        foreach (var block in blocks)
        {
            string uid = block.blockId.ToUpper();
            // Standart: blok o'zini o'zi tushiradi (drops self)
            sb.AppendLine($"        // {block.displayName} — o'zini o'zi tushiradi");
            sb.AppendLine($"        addDrop(ModBlocks.{uid});");
            sb.AppendLine();
        }

        sb.AppendLine("        // Qo'shimcha misollar:");
        sb.AppendLine("        // addDrop(ModBlocks.RUBY_ORE, oreDrops(ModBlocks.RUBY_ORE, ModItems.CUSTOM_RUBY));");
        sb.AppendLine("        // addDrop(ModBlocks.CUSTOM_SLAB, slabDrops(ModBlocks.CUSTOM_SLAB));");
        sb.AppendLine("    }");
        sb.AppendLine("}");

        return sb.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. RECIPE PROVIDER
    // ═══════════════════════════════════════════════════════════════════════

    private static string GenerateRecipeProvider(List<RecipeDataModel> recipes,
        List<BlockDataModel> blocks, List<ItemDataModel> items, string modId)
    {
        var sb = new StringBuilder();

        sb.AppendLine($"package net.{modId}.datagen;");
        sb.AppendLine();
        sb.AppendLine("import net.fabricmc.fabric.api.datagen.v1.FabricDataOutput;");
        sb.AppendLine("import net.fabricmc.fabric.api.datagen.v1.provider.FabricRecipeProvider;");
        sb.AppendLine("import net.minecraft.data.server.recipe.RecipeExporter;");
        sb.AppendLine("import net.minecraft.data.server.recipe.ShapedRecipeJsonBuilder;");
        sb.AppendLine("import net.minecraft.data.server.recipe.ShapelessRecipeJsonBuilder;");
        sb.AppendLine("import net.minecraft.item.Items;");
        sb.AppendLine("import net.minecraft.recipe.book.RecipeCategory;");
        sb.AppendLine("import net.minecraft.registry.RegistryWrapper;");
        sb.AppendLine($"import net.{modId}.block.ModBlocks;");
        sb.AppendLine($"import net.{modId}.item.ModItems;");
        sb.AppendLine();
        sb.AppendLine("import java.util.concurrent.CompletableFuture;");
        sb.AppendLine();
        sb.AppendLine("/**");
        sb.AppendLine(" * Retseptlar generatori.");
        sb.AppendLine(" * Shaped, Shapeless, Smelting retseptlarini DataGen orqali yaratadi.");
        sb.AppendLine(" */");
        sb.AppendLine($"public class ModRecipeProvider extends FabricRecipeProvider {{");
        sb.AppendLine();
        sb.AppendLine("    public ModRecipeProvider(FabricDataOutput output,");
        sb.AppendLine("                            CompletableFuture<RegistryWrapper.WrapperLookup> registryLookup) {");
        sb.AppendLine("        super(output, registryLookup);");
        sb.AppendLine("    }");
        sb.AppendLine();
        sb.AppendLine("    @Override");
        sb.AppendLine("    public void generate(RecipeExporter exporter) {");

        // Har bir recipe uchun sample
        int recipeIdx = 0;
        foreach (var recipe in recipes)
        {
            recipeIdx++;
            string resultId = string.IsNullOrEmpty(recipe.resultItem) ? "unknown" : recipe.resultItem;
            string resultUpper = resultId.ToUpper();

            sb.AppendLine();
            sb.AppendLine($"        // Retsept #{recipeIdx}: {resultId}");
            sb.AppendLine($"        // TODO: Quyidagi pattern ni o'z retseptingizga moslashtiring");
            sb.AppendLine($"        ShapedRecipeJsonBuilder.create(RecipeCategory.MISC, ModBlocks.{resultUpper})");
            sb.AppendLine($"            .pattern(\"###\")");
            sb.AppendLine($"            .pattern(\"###\")");
            sb.AppendLine($"            .pattern(\"###\")");
            sb.AppendLine($"            .input('#', Items.DIAMOND) // TODO: Haqiqiy ingredient");
            sb.AppendLine($"            .criterion(hasItem(Items.DIAMOND), conditionsFromItem(Items.DIAMOND))");
            sb.AppendLine($"            .offerTo(exporter);");
        }

        // Shapeless decompression example
        if (blocks != null && blocks.Count > 0 && items != null && items.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("        // Misol: Blok → 9 ta item (decompression)");
            sb.AppendLine($"        // ShapelessRecipeJsonBuilder.create(RecipeCategory.MISC, ModItems.{items[0].itemId.ToUpper()}, 9)");
            sb.AppendLine($"        //     .input(ModBlocks.{blocks[0].blockId.ToUpper()})");
            sb.AppendLine($"        //     .criterion(hasItem(ModBlocks.{blocks[0].blockId.ToUpper()}),");
            sb.AppendLine($"        //         conditionsFromItem(ModBlocks.{blocks[0].blockId.ToUpper()}))");
            sb.AppendLine($"        //     .offerTo(exporter, \"{modId}:{items[0].itemId}_from_{blocks[0].blockId}\");");
        }

        sb.AppendLine("    }");
        sb.AppendLine("}");

        return sb.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. BLOCK TAG PROVIDER
    // ═══════════════════════════════════════════════════════════════════════

    private static string GenerateBlockTagProvider(List<BlockDataModel> blocks,
        List<ToolDataModel> tools, string modId)
    {
        var sb = new StringBuilder();

        sb.AppendLine($"package net.{modId}.datagen;");
        sb.AppendLine();
        sb.AppendLine("import net.fabricmc.fabric.api.datagen.v1.FabricDataOutput;");
        sb.AppendLine("import net.fabricmc.fabric.api.datagen.v1.provider.FabricTagProvider;");
        sb.AppendLine("import net.minecraft.block.Block;");
        sb.AppendLine("import net.minecraft.registry.RegistryKeys;");
        sb.AppendLine("import net.minecraft.registry.RegistryWrapper;");
        sb.AppendLine("import net.minecraft.registry.tag.BlockTags;");
        sb.AppendLine($"import net.{modId}.block.ModBlocks;");
        sb.AppendLine();
        sb.AppendLine("import java.util.concurrent.CompletableFuture;");
        sb.AppendLine();
        sb.AppendLine("/**");
        sb.AppendLine(" * Block Tag generatori.");
        sb.AppendLine(" * Bloklarning qaysi qurol bilan sindirilishini va boshqa xususiyatlarini belgilaydi.");
        sb.AppendLine(" */");
        sb.AppendLine($"public class ModBlockTagProvider extends FabricTagProvider<Block> {{");
        sb.AppendLine();
        sb.AppendLine("    public ModBlockTagProvider(FabricDataOutput output,");
        sb.AppendLine("                              CompletableFuture<RegistryWrapper.WrapperLookup> registryLookup) {");
        sb.AppendLine("        super(output, RegistryKeys.BLOCK, registryLookup);");
        sb.AppendLine("    }");
        sb.AppendLine();
        sb.AppendLine("    @Override");
        sb.AppendLine("    protected void configure(RegistryWrapper.WrapperLookup wrapperLookup) {");

        // Barcha bloklarni MINEABLE_WITH_PICKAXE tagiga qo'shish
        sb.AppendLine();
        sb.AppendLine("        // Barcha custom bloklar pickaxe bilan sindiriladi");
        sb.AppendLine("        getOrCreateTagBuilder(BlockTags.PICKAXE_MINEABLE)");
        foreach (var block in blocks)
        {
            sb.AppendLine($"            .add(ModBlocks.{block.blockId.ToUpper()})");
        }
        sb.AppendLine("        ;");
        sb.AppendLine();

        // Mining level (hardness ga qarab)
        sb.AppendLine("        // Qazish darajasi (Iron level = NEEDS_IRON_TOOL)");
        sb.AppendLine("        getOrCreateTagBuilder(BlockTags.NEEDS_IRON_TOOL)");
        foreach (var block in blocks)
        {
            if (block.hardness >= 5.0f)
            {
                sb.AppendLine($"            .add(ModBlocks.{block.blockId.ToUpper()})");
            }
        }
        sb.AppendLine("        ;");

        // Diamondli bloklar
        bool hasDiamondLevel = false;
        foreach (var block in blocks)
        {
            if (block.hardness >= 10.0f) { hasDiamondLevel = true; break; }
        }
        if (hasDiamondLevel)
        {
            sb.AppendLine();
            sb.AppendLine("        // Qazish darajasi (Diamond level = NEEDS_DIAMOND_TOOL)");
            sb.AppendLine("        getOrCreateTagBuilder(BlockTags.NEEDS_DIAMOND_TOOL)");
            foreach (var block in blocks)
            {
                if (block.hardness >= 10.0f)
                    sb.AppendLine($"            .add(ModBlocks.{block.blockId.ToUpper()})");
            }
            sb.AppendLine("        ;");
        }

        sb.AppendLine("    }");
        sb.AppendLine("}");

        return sb.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. MODEL PROVIDER
    // ═══════════════════════════════════════════════════════════════════════

    private static string GenerateModelProvider(List<BlockDataModel> blocks,
        List<ItemDataModel> items, List<ToolDataModel> tools, List<ArmorDataModel> armors,
        string modId)
    {
        var sb = new StringBuilder();

        sb.AppendLine($"package net.{modId}.datagen;");
        sb.AppendLine();
        sb.AppendLine("import net.fabricmc.fabric.api.datagen.v1.FabricDataOutput;");
        sb.AppendLine("import net.fabricmc.fabric.api.datagen.v1.provider.FabricModelProvider;");
        sb.AppendLine("import net.minecraft.data.client.BlockStateModelGenerator;");
        sb.AppendLine("import net.minecraft.data.client.ItemModelGenerator;");
        sb.AppendLine("import net.minecraft.data.client.Models;");
        sb.AppendLine($"import net.{modId}.block.ModBlocks;");
        sb.AppendLine($"import net.{modId}.item.ModItems;");
        sb.AppendLine();
        sb.AppendLine("/**");
        sb.AppendLine(" * Block va Item Model generatori.");
        sb.AppendLine(" * Blockstate JSON, Block Model JSON, va Item Model JSON fayllarini");
        sb.AppendLine(" * avtomatik yaratadi — qo'lda yozish shart emas!");
        sb.AppendLine(" */");
        sb.AppendLine($"public class ModModelProvider extends FabricModelProvider {{");
        sb.AppendLine();
        sb.AppendLine("    public ModModelProvider(FabricDataOutput output) {");
        sb.AppendLine("        super(output);");
        sb.AppendLine("    }");
        sb.AppendLine();

        // Block Models
        sb.AppendLine("    @Override");
        sb.AppendLine("    public void generateBlockStateModels(BlockStateModelGenerator blockStateModelGenerator) {");
        if (blocks != null)
        {
            foreach (var block in blocks)
            {
                string uid = block.blockId.ToUpper();
                sb.AppendLine($"        // {block.displayName} — Standart kub model (barcha yuzasi bir xil tekstura)");
                sb.AppendLine($"        blockStateModelGenerator.registerSimpleCubeAll(ModBlocks.{uid});");
                sb.AppendLine();
            }
        }
        sb.AppendLine("        // Boshqa model turlari:");
        sb.AppendLine("        // blockStateModelGenerator.registerLog(ModBlocks.CUSTOM_LOG);  // Log blok (top/side)");
        sb.AppendLine("        // blockStateModelGenerator.registerSingleton(ModBlocks.CUSTOM, TexturedModel.CUBE_BOTTOM_TOP);");
        sb.AppendLine("    }");
        sb.AppendLine();

        // Item Models
        sb.AppendLine("    @Override");
        sb.AppendLine("    public void generateItemModels(ItemModelGenerator itemModelGenerator) {");

        if (items != null)
        {
            foreach (var item in items)
            {
                string uid = item.itemId.ToUpper();
                sb.AppendLine($"        // {item.displayName} — Standart 2D item model");
                sb.AppendLine($"        itemModelGenerator.register(ModItems.{uid}, Models.GENERATED);");
            }
        }

        if (tools != null)
        {
            sb.AppendLine();
            foreach (var tool in tools)
            {
                string uid = tool.toolId.ToUpper();
                sb.AppendLine($"        // {tool.displayName} — Handheld (qurol) model");
                sb.AppendLine($"        itemModelGenerator.register(ModItems.{uid}, Models.HANDHELD);");
            }
        }

        if (armors != null)
        {
            sb.AppendLine();
            foreach (var armor in armors)
            {
                string uid = armor.armorId.ToUpper();
                sb.AppendLine($"        // {armor.displayName} — 2D zirh model");
                sb.AppendLine($"        itemModelGenerator.register(ModItems.{uid}, Models.GENERATED);");
            }
        }

        sb.AppendLine("    }");
        sb.AppendLine("}");

        return sb.ToString();
    }
}
