using System;
using System.Collections.Generic;

/// <summary>
/// Mod Template/Preset tizimi — tayyor mod starterlar.
/// Foydalanuvchi bitta tugma bilan to'liq ishlaydigan mod skeletini oladi.
///
/// Mavjud templatelar:
///   • BasicMod — 1 blok, 1 item, 1 recipe (boshlang'ich)
///   • OresMod — Custom ore + gem + tools + armor set
///   • MobsMod — 2 ta entity (hostile + passive) + spawn egg + loot
///   • FoodMod — 5 ta ovqat item + crop blok + farm retseptlar
///   • DimensionMod — Custom biome + portal blok + unique mobs
///   • ToolSetMod — To'liq qurol va zirh to'plami
/// </summary>
public static class ModTemplateManager
{
    // ═══════════════════════════════════════════════════════════════════════
    // TEMPLATE RO'YXATI
    // ═══════════════════════════════════════════════════════════════════════

    public static List<ModTemplate> GetAllTemplates()
    {
        return new List<ModTemplate>
        {
            CreateBasicModTemplate(),
            CreateOresModTemplate(),
            CreateMobsModTemplate(),
            CreateFoodModTemplate(),
            CreateDimensionModTemplate(),
            CreateToolSetModTemplate()
        };
    }

    public static ModTemplate GetTemplate(string templateId)
    {
        foreach (var t in GetAllTemplates())
        {
            if (t.templateId == templateId) return t;
        }
        return null;
    }

    /// <summary>
    /// Templateni WorkspaceData ga qo'llash.
    /// Mavjud ma'lumotlarni TOZALAB, template elementlarini qo'yadi.
    /// </summary>
    public static void ApplyTemplate(ModTemplate template, WorkspaceData workspace)
    {
        if (template == null || workspace == null) return;

        // Metadata
        workspace.modId = template.defaultModId;
        workspace.modName = template.defaultModName;
        workspace.mcVersion = template.recommendedVersion;
        workspace.modloader = template.recommendedLoader;

        // Elementlarni qo'llash
        workspace.blocks = new List<BlockDataModel>(template.blocks);
        workspace.items = new List<ItemDataModel>(template.items);
        workspace.tools = new List<ToolDataModel>(template.tools);
        workspace.armors = new List<ArmorDataModel>(template.armors);
        workspace.recipes = new List<RecipeDataModel>(template.recipes);
        workspace.entities = new List<EntityDataModel>(template.entities);
        workspace.biomes = new List<BiomeDataModel>(template.biomes);
        workspace.creativeTabs = new List<CreativeTabDataModel>(template.creativeTabs);

        StudioLogger.Log($"[Template] '{template.displayName}' muvaffaqiyatli qo'llanildi ({template.TotalElements} element).");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEMPLATE YARATUVCHILAR
    // ═══════════════════════════════════════════════════════════════════════

    private static ModTemplate CreateBasicModTemplate()
    {
        var t = new ModTemplate
        {
            templateId = "basic_mod",
            displayName = "Oddiy Mod (Boshlang'ich)",
            description = "1 ta blok, 1 ta item, 1 ta retsept. Modding ni o'rganish uchun ideal.",
            icon = "📦",
            difficulty = TemplateDifficulty.Beginner,
            defaultModId = "mymod",
            defaultModName = "My First Mod",
            recommendedVersion = "1.21.1",
            recommendedLoader = "Fabric"
        };

        t.blocks.Add(new BlockDataModel { blockId = "custom_block", displayName = "Custom Block", hardness = 3.0f, resistance = 6.0f });
        t.items.Add(new ItemDataModel { itemId = "custom_gem", displayName = "Custom Gem", stackSize = 64 });
        t.recipes.Add(new RecipeDataModel
        {
            recipeType = RecipeType.CraftingShaped,
            resultItem = "custom_block",
            resultCount = 1,
            grid = new string[] { "custom_gem", "custom_gem", "custom_gem", "custom_gem", "custom_gem", "custom_gem", "custom_gem", "custom_gem", "custom_gem" }
        });
        t.creativeTabs.Add(new CreativeTabDataModel { tabId = "mymod_tab", displayName = "My Mod", iconItemId = "custom_gem" });

        return t;
    }

    private static ModTemplate CreateOresModTemplate()
    {
        var t = new ModTemplate
        {
            templateId = "ores_mod",
            displayName = "Rudalar va Minerallar",
            description = "Custom ore blok, gem item, to'liq qurol seti va zirh. Mining-focused mod.",
            icon = "💎",
            difficulty = TemplateDifficulty.Intermediate,
            defaultModId = "oresmod",
            defaultModName = "Ruby Ores & Gear",
            recommendedVersion = "1.21.1",
            recommendedLoader = "Fabric"
        };

        // Blocks
        t.blocks.Add(new BlockDataModel { blockId = "ruby_ore", displayName = "Ruby Ore", hardness = 4.5f, resistance = 3.0f });
        t.blocks.Add(new BlockDataModel { blockId = "deepslate_ruby_ore", displayName = "Deepslate Ruby Ore", hardness = 6.0f, resistance = 3.0f });
        t.blocks.Add(new BlockDataModel { blockId = "ruby_block", displayName = "Ruby Block", hardness = 5.0f, resistance = 6.0f, lightLevel = 4 });

        // Items
        t.items.Add(new ItemDataModel { itemId = "ruby", displayName = "Ruby", stackSize = 64 });
        t.items.Add(new ItemDataModel { itemId = "raw_ruby", displayName = "Raw Ruby", stackSize = 64 });

        // Tools
        t.tools.Add(new ToolDataModel { toolId = "ruby_sword", displayName = "Ruby Sword", toolType = ToolType.Sword, attackDamage = 7, durability = 1800, miningLevel = 3 });
        t.tools.Add(new ToolDataModel { toolId = "ruby_pickaxe", displayName = "Ruby Pickaxe", toolType = ToolType.Pickaxe, attackDamage = 5, durability = 1800, miningLevel = 3 });
        t.tools.Add(new ToolDataModel { toolId = "ruby_axe", displayName = "Ruby Axe", toolType = ToolType.Axe, attackDamage = 9, durability = 1800, miningLevel = 3 });

        // Armor
        t.armors.Add(new ArmorDataModel { armorId = "ruby_helmet", displayName = "Ruby Helmet", armorSlot = ArmorSlot.Helmet, defense = 4, toughness = 2.5f });
        t.armors.Add(new ArmorDataModel { armorId = "ruby_chestplate", displayName = "Ruby Chestplate", armorSlot = ArmorSlot.Chestplate, defense = 9, toughness = 2.5f });
        t.armors.Add(new ArmorDataModel { armorId = "ruby_leggings", displayName = "Ruby Leggings", armorSlot = ArmorSlot.Leggings, defense = 7, toughness = 2.5f });
        t.armors.Add(new ArmorDataModel { armorId = "ruby_boots", displayName = "Ruby Boots", armorSlot = ArmorSlot.Boots, defense = 4, toughness = 2.5f });

        // Recipes
        t.recipes.Add(new RecipeDataModel { recipeType = RecipeType.Smelting, smeltingInput = "ruby_ore", resultItem = "ruby", experience = 1.0f, cookingTime = 200 });
        t.recipes.Add(new RecipeDataModel
        {
            recipeType = RecipeType.CraftingShaped, resultItem = "ruby_block", resultCount = 1,
            grid = new string[] { "ruby", "ruby", "ruby", "ruby", "ruby", "ruby", "ruby", "ruby", "ruby" }
        });

        t.creativeTabs.Add(new CreativeTabDataModel { tabId = "ruby_tab", displayName = "Ruby Gear", iconItemId = "ruby" });
        return t;
    }

    private static ModTemplate CreateMobsModTemplate()
    {
        var t = new ModTemplate
        {
            templateId = "mobs_mod",
            displayName = "Custom Moblar",
            description = "2 ta yangi mob: hostile golem va passive forest spirit. Spawn egg va loot bilan.",
            icon = "👾",
            difficulty = TemplateDifficulty.Advanced,
            defaultModId = "mobsmod",
            defaultModName = "Mystical Creatures",
            recommendedVersion = "1.21.1",
            recommendedLoader = "Fabric"
        };

        t.entities.Add(new EntityDataModel
        {
            entityId = "stone_golem", displayName = "Stone Golem",
            health = 80, attackDamage = 12, movementSpeed = 0.2f,
            width = 1.8f, height = 2.9f, mobCategory = MobCategory.Monster
        });
        t.entities.Add(new EntityDataModel
        {
            entityId = "forest_spirit", displayName = "Forest Spirit",
            health = 20, attackDamage = 0, movementSpeed = 0.35f,
            width = 0.6f, height = 1.2f, mobCategory = MobCategory.Creature
        });

        t.items.Add(new ItemDataModel { itemId = "golem_heart", displayName = "Golem Heart", stackSize = 16 });
        t.items.Add(new ItemDataModel { itemId = "spirit_dust", displayName = "Spirit Dust", stackSize = 64 });
        t.creativeTabs.Add(new CreativeTabDataModel { tabId = "creatures_tab", displayName = "Mystical Creatures", iconItemId = "golem_heart" });

        return t;
    }

    private static ModTemplate CreateFoodModTemplate()
    {
        var t = new ModTemplate
        {
            templateId = "food_mod",
            displayName = "Ovqatlar va Farming",
            description = "5 ta yangi ovqat item, crop blok, va pishirish retseptlari.",
            icon = "🍎",
            difficulty = TemplateDifficulty.Beginner,
            defaultModId = "foodmod",
            defaultModName = "Tasty Foods",
            recommendedVersion = "1.21.1",
            recommendedLoader = "Fabric"
        };

        t.items.Add(new ItemDataModel { itemId = "tomato", displayName = "Tomato", stackSize = 64, isFood = true });
        t.items.Add(new ItemDataModel { itemId = "cheese", displayName = "Cheese", stackSize = 64, isFood = true });
        t.items.Add(new ItemDataModel { itemId = "pizza_slice", displayName = "Pizza Slice", stackSize = 64, isFood = true });
        t.items.Add(new ItemDataModel { itemId = "burger", displayName = "Burger", stackSize = 64, isFood = true });
        t.items.Add(new ItemDataModel { itemId = "chocolate", displayName = "Chocolate", stackSize = 64, isFood = true });

        t.recipes.Add(new RecipeDataModel { recipeType = RecipeType.CraftingShapeless, resultItem = "pizza_slice", resultCount = 4,
            shapelessIngredients = new List<string> { "tomato", "cheese", "wheat" } });
        t.recipes.Add(new RecipeDataModel { recipeType = RecipeType.Smoking, smeltingInput = "beef", resultItem = "burger", experience = 0.5f, cookingTime = 100 });

        t.creativeTabs.Add(new CreativeTabDataModel { tabId = "food_tab", displayName = "Tasty Foods", iconItemId = "pizza_slice" });
        return t;
    }

    private static ModTemplate CreateDimensionModTemplate()
    {
        var t = new ModTemplate
        {
            templateId = "dimension_mod",
            displayName = "Yangi Dunyo (Biome)",
            description = "Custom biome + unique moblar + maxsus bloklar. Dunyoni kengaytirish uchun.",
            icon = "🌲",
            difficulty = TemplateDifficulty.Advanced,
            defaultModId = "worldmod",
            defaultModName = "Crystal Realm",
            recommendedVersion = "1.21.1",
            recommendedLoader = "Fabric"
        };

        t.blocks.Add(new BlockDataModel { blockId = "crystal_stone", displayName = "Crystal Stone", hardness = 3.5f, resistance = 6.0f });
        t.blocks.Add(new BlockDataModel { blockId = "glowing_crystal", displayName = "Glowing Crystal", hardness = 2.0f, resistance = 3.0f, lightLevel = 12 });
        t.blocks.Add(new BlockDataModel { blockId = "crystal_grass", displayName = "Crystal Grass", hardness = 0.5f, resistance = 0.5f });

        t.biomes.Add(new BiomeDataModel
        {
            biomeId = "crystal_plains", displayName = "Crystal Plains",
            temperature = 0.5f, precipitation = false,
            skyColor = "#9933FF", grassColor = "#66FFCC", waterColor = "#3366FF", fogColor = "#CC99FF"
        });

        t.entities.Add(new EntityDataModel
        {
            entityId = "crystal_wisp", displayName = "Crystal Wisp",
            health = 10, attackDamage = 0, movementSpeed = 0.4f,
            width = 0.5f, height = 0.5f, mobCategory = MobCategory.Ambient
        });

        t.items.Add(new ItemDataModel { itemId = "crystal_shard", displayName = "Crystal Shard", stackSize = 64 });
        t.creativeTabs.Add(new CreativeTabDataModel { tabId = "crystal_tab", displayName = "Crystal Realm", iconItemId = "crystal_shard" });

        return t;
    }

    private static ModTemplate CreateToolSetModTemplate()
    {
        var t = new ModTemplate
        {
            templateId = "toolset_mod",
            displayName = "To'liq Qurol Seti",
            description = "5 ta qurol (sword, pickaxe, axe, shovel, hoe) + 4 ta zirh + material retseptlari.",
            icon = "⚔️",
            difficulty = TemplateDifficulty.Intermediate,
            defaultModId = "toolmod",
            defaultModName = "Emerald Tools",
            recommendedVersion = "1.21.1",
            recommendedLoader = "Fabric"
        };

        t.items.Add(new ItemDataModel { itemId = "emerald_ingot", displayName = "Emerald Ingot", stackSize = 64 });
        t.blocks.Add(new BlockDataModel { blockId = "emerald_ore", displayName = "Emerald Ore (Custom)", hardness = 4.0f, resistance = 3.0f });

        t.tools.Add(new ToolDataModel { toolId = "emerald_sword", displayName = "Emerald Sword", toolType = ToolType.Sword, attackDamage = 8, attackSpeed = -2.4f, durability = 2000, miningLevel = 3 });
        t.tools.Add(new ToolDataModel { toolId = "emerald_pickaxe", displayName = "Emerald Pickaxe", toolType = ToolType.Pickaxe, attackDamage = 5, attackSpeed = -2.8f, durability = 2000, miningLevel = 4 });
        t.tools.Add(new ToolDataModel { toolId = "emerald_axe", displayName = "Emerald Axe", toolType = ToolType.Axe, attackDamage = 10, attackSpeed = -3.0f, durability = 2000, miningLevel = 4 });
        t.tools.Add(new ToolDataModel { toolId = "emerald_shovel", displayName = "Emerald Shovel", toolType = ToolType.Shovel, attackDamage = 4, attackSpeed = -3.0f, durability = 2000, miningLevel = 3 });
        t.tools.Add(new ToolDataModel { toolId = "emerald_hoe", displayName = "Emerald Hoe", toolType = ToolType.Hoe, attackDamage = 1, attackSpeed = -1.0f, durability = 2000, miningLevel = 3 });

        t.armors.Add(new ArmorDataModel { armorId = "emerald_helmet", displayName = "Emerald Helmet", armorSlot = ArmorSlot.Helmet, defense = 4, toughness = 3.0f });
        t.armors.Add(new ArmorDataModel { armorId = "emerald_chestplate", displayName = "Emerald Chestplate", armorSlot = ArmorSlot.Chestplate, defense = 9, toughness = 3.0f });
        t.armors.Add(new ArmorDataModel { armorId = "emerald_leggings", displayName = "Emerald Leggings", armorSlot = ArmorSlot.Leggings, defense = 7, toughness = 3.0f });
        t.armors.Add(new ArmorDataModel { armorId = "emerald_boots", displayName = "Emerald Boots", armorSlot = ArmorSlot.Boots, defense = 4, toughness = 3.0f });

        t.recipes.Add(new RecipeDataModel { recipeType = RecipeType.Smelting, smeltingInput = "emerald_ore", resultItem = "emerald_ingot", experience = 1.2f });
        t.creativeTabs.Add(new CreativeTabDataModel { tabId = "emerald_tab", displayName = "Emerald Gear", iconItemId = "emerald_ingot" });

        return t;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA CLASSES
// ═══════════════════════════════════════════════════════════════════════════

public enum TemplateDifficulty { Beginner, Intermediate, Advanced, Expert }

[System.Serializable]
public class ModTemplate
{
    public string templateId;
    public string displayName;
    public string description;
    public string icon;
    public TemplateDifficulty difficulty;
    public string defaultModId;
    public string defaultModName;
    public string recommendedVersion;
    public string recommendedLoader;

    // Elementlar
    public List<BlockDataModel> blocks = new List<BlockDataModel>();
    public List<ItemDataModel> items = new List<ItemDataModel>();
    public List<ToolDataModel> tools = new List<ToolDataModel>();
    public List<ArmorDataModel> armors = new List<ArmorDataModel>();
    public List<RecipeDataModel> recipes = new List<RecipeDataModel>();
    public List<EntityDataModel> entities = new List<EntityDataModel>();
    public List<BiomeDataModel> biomes = new List<BiomeDataModel>();
    public List<CreativeTabDataModel> creativeTabs = new List<CreativeTabDataModel>();

    public int TotalElements => blocks.Count + items.Count + tools.Count + armors.Count +
                                 recipes.Count + entities.Count + biomes.Count + creativeTabs.Count;
}
