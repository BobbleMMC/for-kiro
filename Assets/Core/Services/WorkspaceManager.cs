using System;
using System.IO;
using System.Text;
using System.Collections.Generic;
using UnityEngine;

public static class WorkspaceManager
{
    public static WorkspaceData workspace = new WorkspaceData();

    public static void SaveWorkspace(string folderPath)
    {
        if (string.IsNullOrEmpty(folderPath)) return;

        try
        {
            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath);
            }

            string filePath = Path.Combine(folderPath, "project.mstudio");
            string jsonText = JsonUtility.ToJson(workspace, true);
            File.WriteAllText(filePath, jsonText);
            
            StudioLogger.Log($"[Workspace] Loyiha saqlandi: {filePath}");
        }
        catch (Exception ex)
        {
            StudioLogger.LogError($"[Workspace] Saqlashda xatolik: {ex.Message}");
        }
    }

    public static bool LoadWorkspace(string folderPath)
    {
        if (string.IsNullOrEmpty(folderPath)) return false;

        string filePath = Path.Combine(folderPath, "project.mstudio");
        if (!File.Exists(filePath))
        {
            StudioLogger.LogWarning($"[Workspace] Konfiguratsiya fayli topilmadi: {filePath}");
            return false;
        }

        try
        {
            string jsonText = File.ReadAllText(filePath);
            WorkspaceData data = JsonUtility.FromJson<WorkspaceData>(jsonText);
            if (data != null)
            {
                workspace = data;
                StudioLogger.Log($"[Workspace] Loyiha yuklandi: {filePath}");
                return true;
            }
        }
        catch (Exception ex)
        {
            StudioLogger.LogError($"[Workspace] Yuklashda xatolik: {ex.Message}");
        }
        return false;
    }

    public static void CompileAndExportAll(string folderPath)
    {
        if (string.IsNullOrEmpty(folderPath)) return;

        try
        {
            string modId   = workspace.modId.Trim();
            string loader  = workspace.modloader;
            if (string.IsNullOrEmpty(modId)) modId = "mymod";

            // 0. TO'LIQ BUILDABLE LOYIHA SCAFFOLD ni yaratish
            //    (build.gradle, settings.gradle, gradle.properties,
            //     fabric.mod.json/mods.toml, pack.mcmeta, gradlew, gradlew.bat)
            ScaffoldGenerator.GenerateFullScaffold(folderPath, workspace);
            StudioLogger.Log($"[Scaffold] Build fayllar muvaffaqiyatli yaratildi: {loader} {workspace.mcVersion}");

            // 1. Minecraft Loyiha Papkalarining tuzilishini yaratish
            string mainJavaPath  = Path.Combine(folderPath, "src/main/java/net", modId);
            string resourcesPath = Path.Combine(folderPath, "src/main/resources");
            string assetsPath    = Path.Combine(resourcesPath, "assets", modId);
            string dataPath      = Path.Combine(resourcesPath, "data",   modId);

            Directory.CreateDirectory(mainJavaPath);
            Directory.CreateDirectory(Path.Combine(mainJavaPath, "block"));
            Directory.CreateDirectory(Path.Combine(mainJavaPath, "item"));
            Directory.CreateDirectory(Path.Combine(mainJavaPath, "recipe"));
            Directory.CreateDirectory(Path.Combine(mainJavaPath, "mixin"));
            
            Directory.CreateDirectory(Path.Combine(assetsPath, "blockstates"));
            Directory.CreateDirectory(Path.Combine(assetsPath, "models/block"));
            Directory.CreateDirectory(Path.Combine(assetsPath, "models/item"));
            Directory.CreateDirectory(Path.Combine(assetsPath, "textures/block"));
            Directory.CreateDirectory(Path.Combine(assetsPath, "textures/item"));
            Directory.CreateDirectory(Path.Combine(assetsPath, "lang"));
            
            Directory.CreateDirectory(Path.Combine(dataPath, "recipes"));

            // 2. Birlashtirilgan Java fayllarini yozish
            // ModBlocks.java
            string blocksCode = JavaCodeGenerator.GenerateModBlocksCode(workspace.blocks, modId, loader, workspace.mcVersion);
            File.WriteAllText(Path.Combine(mainJavaPath, "block/ModBlocks.java"), blocksCode);

            // ModItems.java
            string itemsCode = JavaCodeGenerator.GenerateModItemsCode(workspace.items, workspace.tools, workspace.armors, modId, loader, workspace.mcVersion);
            File.WriteAllText(Path.Combine(mainJavaPath, "item/ModItems.java"), itemsCode);

            // MyMod.java — Fabric vs NeoForge entrypoint
            string mainModCode;
            if (loader == "NeoForge")
                mainModCode = GenerateNeoForgeMainMod(modId);
            else if (loader == "Quilt")
                mainModCode = GenerateQuiltMainMod(modId);
            else
                mainModCode = GenerateFabricMainMod(modId);
            File.WriteAllText(Path.Combine(mainJavaPath, "MyMod.java"), mainModCode);

            // 3. Blok modellari va holat JSON fayllarini eksport qilish
            foreach (var block in workspace.blocks)
            {
                // Texture namespace o'rnatish
                block.textureNamespace = modId;
                
                File.WriteAllText(Path.Combine(assetsPath, "blockstates", $"{block.blockId}.json"), block.GenerateBlockstatesJson());
                File.WriteAllText(Path.Combine(assetsPath, "models/block", $"{block.blockId}.json"), block.GenerateBlockModelJson());
                File.WriteAllText(Path.Combine(assetsPath, "models/item", $"{block.blockId}.json"), block.GenerateItemModelJson());
            }

            // 4. Buyumlar modellari JSON fayllarini yozish
            foreach (var item in workspace.items)
            {
                item.textureNamespace = modId;
                File.WriteAllText(Path.Combine(assetsPath, "models/item", $"{item.itemId}.json"), item.GenerateItemModelJson());
            }
            foreach (var tool in workspace.tools)
            {
                tool.textureNamespace = modId;
                File.WriteAllText(Path.Combine(assetsPath, "models/item", $"{tool.toolId}.json"), tool.GenerateItemModelJson());
            }
            foreach (var armor in workspace.armors)
            {
                armor.textureNamespace = modId;
                File.WriteAllText(Path.Combine(assetsPath, "models/item", $"{armor.armorId}.json"), armor.GenerateItemModelJson());
            }

            // 5. Retsept fayllarini JSON shaklida yozish
            foreach (var recipe in workspace.recipes)
            {
                recipe.textureNamespace = modId;
                string filename = string.IsNullOrEmpty(recipe.resultItem) ? "unknown_recipe" : recipe.resultItem;
                File.WriteAllText(Path.Combine(dataPath, "recipes", $"{filename}_recipe.json"), recipe.GenerateRecipeJson());
            }

            // 6. Barcha elementlar uchun til bog'lash faylini (en_us.json) birlashtirib yaratish
            Dictionary<string, string> langKeys = new Dictionary<string, string>();
            foreach (var block in workspace.blocks) langKeys[$"block.{modId}.{block.blockId}"] = block.displayName;
            foreach (var item in workspace.items) langKeys[$"item.{modId}.{item.itemId}"] = item.displayName;
            foreach (var tool in workspace.tools) langKeys[$"item.{modId}.{tool.toolId}"] = tool.displayName;
            foreach (var armor in workspace.armors) langKeys[$"item.{modId}.{armor.armorId}"] = armor.displayName;
            foreach (var entity in workspace.entities) langKeys[$"entity.{modId}.{entity.entityId}"] = entity.displayName;
            foreach (var biome in workspace.biomes) langKeys[$"biome.{modId}.{biome.biomeId}"] = biome.displayName;
            foreach (var tab in workspace.creativeTabs) langKeys[$"itemGroup.{modId}.{tab.tabId}"] = tab.displayName;

            StringBuilder langJson = new StringBuilder();
            langJson.AppendLine("{");
            int count = 0;
            foreach (var pair in langKeys)
            {
                string comma = (count < langKeys.Count - 1) ? "," : "";
                langJson.AppendLine($"  \"{pair.Key}\": \"{pair.Value}\"{comma}");
                count++;
            }
            langJson.AppendLine("}");
            File.WriteAllText(Path.Combine(assetsPath, "lang/en_us.json"), langJson.ToString());

            // 7. DataGen Java fayllarini eksport qilish (Fabric DataProvider pattern)
            if (loader != "NeoForge") // DataGen asosan Fabric/Quilt uchun
            {
                var dataGenFiles = DataGenGenerator.GenerateAllDataGenFiles(workspace);
                string datagenJavaPath = Path.Combine(folderPath, "src/main/java/net", modId);

                foreach (var entry in dataGenFiles)
                {
                    string filePath = Path.Combine(datagenJavaPath, entry.Key);
                    Directory.CreateDirectory(Path.GetDirectoryName(filePath));
                    File.WriteAllText(filePath, entry.Value);
                }

                StudioLogger.Log($"[DataGen] {dataGenFiles.Count} ta DataProvider Java fayli yaratildi.");
            }

            // 8. Loot Table JSON fayllarini eksport qilish
            string lootBlockPath = Path.Combine(dataPath, "loot_tables", "blocks");
            string lootEntityPath = Path.Combine(dataPath, "loot_tables", "entities");
            Directory.CreateDirectory(lootBlockPath);
            Directory.CreateDirectory(lootEntityPath);

            var blockLootTables = LootTableGenerator.GenerateAllBlockLootTables(workspace.blocks, modId);
            foreach (var entry in blockLootTables)
            {
                File.WriteAllText(Path.Combine(lootBlockPath, entry.Key), entry.Value);
            }

            var entityLootTables = LootTableGenerator.GenerateAllEntityLootTables(workspace.entities, modId);
            foreach (var entry in entityLootTables)
            {
                File.WriteAllText(Path.Combine(lootEntityPath, entry.Key), entry.Value);
            }

            StudioLogger.Log($"[LootTable] {blockLootTables.Count + entityLootTables.Count} ta loot table yaratildi.");

            // 9. Tag JSON fayllarini eksport qilish
            var tagFiles = TagGenerator.GenerateAllTags(workspace);
            string dataRootPath = Path.Combine(folderPath, "src/main/resources/data");

            foreach (var entry in tagFiles)
            {
                string tagFilePath = Path.Combine(dataRootPath, entry.Key);
                Directory.CreateDirectory(Path.GetDirectoryName(tagFilePath));
                File.WriteAllText(tagFilePath, entry.Value);
            }

            StudioLogger.Log($"[Tags] {tagFiles.Count} ta tag fayli yaratildi.");

            StudioLogger.Log($"[Workspace ✓] Barcha mod elementlari muvaffaqiyatli eksport qilindi: {folderPath}");
        }
        catch (Exception ex)
        {
            StudioLogger.LogError($"[Workspace] Eksport qilishda xatolik: {ex.Message}");
        }
    }

    // ── Loader-aware entrypoint generators ──────────────────────────────────

    private static string GenerateFabricMainMod(string modId)
    {
        return
$@"package net.{modId};

import net.fabricmc.api.ModInitializer;
import net.{modId}.block.ModBlocks;
import net.{modId}.item.ModItems;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MyMod implements ModInitializer {{
    public static final String MOD_ID = ""{modId}"";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    @Override
    public void onInitialize() {{
        ModBlocks.initialize();
        ModItems.initialize();
        LOGGER.info(""{modId} muvaffaqiyatli yuklandi!"");
    }}
}}";
    }

    private static string GenerateNeoForgeMainMod(string modId)
    {
        return
$@"package net.{modId};

import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;
import net.{modId}.block.ModBlocks;
import net.{modId}.item.ModItems;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

@Mod(""{modId}"")
public class MyMod {{
    public static final String MOD_ID = ""{modId}"";
    public static final Logger LOGGER = LogManager.getLogger();

    public MyMod(IEventBus modEventBus) {{
        ModBlocks.register(modEventBus);
        ModItems.register(modEventBus);
        LOGGER.info(""{modId} NeoForge muvaffaqiyatli yuklandi!"");
    }}
}}";
    }

    private static string GenerateQuiltMainMod(string modId)
    {
        return
$@"package net.{modId};

import org.quiltmc.loader.api.ModContainer;
import org.quiltmc.qsl.base.api.entrypoint.ModInitializer;
import net.{modId}.block.ModBlocks;
import net.{modId}.item.ModItems;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MyMod implements ModInitializer {{
    public static final String MOD_ID = ""{modId}"";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    @Override
    public void onInitialize(ModContainer mod) {{
        ModBlocks.initialize();
        ModItems.initialize();
        LOGGER.info(""{modId} Quilt modloader orqali muvaffaqiyatli yuklandi!"");
    }}
}}";
    }
}
