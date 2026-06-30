using System;
using System.Text;
using System.Collections.Generic;
using System.Globalization;

public enum MobCategory
{
    Monster,
    Creature,
    Ambient,
    WaterCreature,
    Boss
}

/// <summary>
/// AI Goal turlari — entity xatti-harakati.
/// </summary>
public enum AIGoalType
{
    MeleeAttack,         // Yaqin masofada hujum qilish
    RangedAttack,        // Uzoq masofadan hujum (o'q, sehrgarlik)
    LookAtPlayer,        // O'yinchiga qarab turish
    WanderAround,        // Tasodifiy yurish
    SwimGoal,            // Suvda suzish
    FloatGoal,           // Suvda cho'kmaslik
    FollowOwner,         // Egasiga ergashish (tamed)
    AvoidEntity,         // Ma'lum entitydan qochish
    PanicGoal,           // Zarar olganda qochish
    BreedGoal,           // Ko'payish
    TemptGoal,           // Ovqat bilan jalb qilish
    TargetNearestPlayer, // Eng yaqin o'yinchini maqsad qilish
    HurtByTarget,        // Zarba berganga javob
    LeapAtTarget         // Maqsadga sakrab hujum
}

/// <summary>
/// Entity loot drop elementi.
/// </summary>
[System.Serializable]
public class EntityLootDrop
{
    public string itemId = "minecraft:rotten_flesh";
    public int minCount = 0;
    public int maxCount = 2;
    public float chance = 1.0f; // 0.0 - 1.0
    public bool requiresPlayerKill = false; // Faqat o'yinchi o'ldirganda
}

/// <summary>
/// Spawn rule konfiguratsiyasi.
/// </summary>
[System.Serializable]
public class EntitySpawnRule
{
    public bool naturalSpawn = true;
    public bool spawnEgg = true;
    public int spawnWeight = 80;
    public int minGroup = 1;
    public int maxGroup = 3;
    public int minY = 0;
    public int maxY = 256;
    public bool requiresDarkness = false;  // Monster uchun
    public bool onlyOnGrass = false;       // Creature uchun
}

[System.Serializable]
public class EntityDataModel
{
    // ── Asosiy xususiyatlar ──
    public string entityId = "custom_ruby_golem";
    public string displayName = "Ruby Golem";
    public float health = 100.0f;
    public float movementSpeed = 0.25f;
    public float attackDamage = 15.0f;
    public float attackSpeed = 1.0f;
    public float followRange = 35.0f;
    public float knockbackResistance = 0.0f;
    public float armor = 0.0f;
    public float width = 1.4f;
    public float height = 2.7f;
    public MobCategory mobCategory = MobCategory.Monster;
    public string textureNamespace = "mymod";

    // ── AI Goals ──
    public List<AIGoalType> aiGoals = new List<AIGoalType>
    {
        AIGoalType.SwimGoal,
        AIGoalType.MeleeAttack,
        AIGoalType.WanderAround,
        AIGoalType.LookAtPlayer,
        AIGoalType.TargetNearestPlayer,
        AIGoalType.HurtByTarget
    };

    // ── Spawn Rules ──
    public EntitySpawnRule spawnRule = new EntitySpawnRule();

    // ── Loot Drops ──
    public List<EntityLootDrop> lootDrops = new List<EntityLootDrop>
    {
        new EntityLootDrop { itemId = "minecraft:rotten_flesh", minCount = 0, maxCount = 2, chance = 1.0f }
    };

    // ── Experience ──
    public int experienceReward = 5;

    // ═══════════════════════════════════════════════════════════════════════
    // JAVA KOD GENERATSIYASI
    // ═══════════════════════════════════════════════════════════════════════

    public string GenerateFabricCode()
    {
        string upperId = entityId.ToUpper();
        string safeClassName = ToPascalCase(entityId);
        string baseClass = GetBaseEntityClass();
        string imports = GetEntityImports();
        string spawnGroup = GetSpawnGroup();
        string attributeBuilder = GetAttributeBuilderBase();

        // Boss uchun qo'shimcha atributlar
        string bossAttributes = mobCategory == MobCategory.Boss
            ? $"\n            .add(EntityAttributes.GENERIC_KNOCKBACK_RESISTANCE, 1.0)\n" +
              $"            .add(EntityAttributes.GENERIC_ARMOR, 10.0)"
            : "";

        // AI Goals generatsiyasi
        string goalsCode = GenerateAIGoalsCode(safeClassName);

        // Creature (AnimalEntity) uchun createChild metodi
        string animalExtras = mobCategory == MobCategory.Creature
            ? $@"

    @Nullable
    @Override
    public PassiveEntity createChild(ServerWorld world, PassiveEntity entity) {{
        return null; // TODO: O'z breed logikangizni qo'shing
    }}"
            : "";

        return $@"package net.{textureNamespace}.entity;

import net.minecraft.entity.EntityType;
import net.minecraft.entity.SpawnGroup;
import net.minecraft.entity.ai.goal.*;
import net.minecraft.entity.attribute.DefaultAttributeContainer;
import net.minecraft.entity.attribute.EntityAttributes;
import net.minecraft.entity.player.PlayerEntity;
{imports}
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.util.Identifier;
import net.minecraft.world.World;

/**
 * {displayName} — {mobCategory} entity.
 * Sog'liq: {health}, Hujum: {attackDamage}, Tezlik: {movementSpeed}
 */
public class {safeClassName}Entity extends {baseClass} {{

    public {safeClassName}Entity(EntityType<? extends {baseClass}> entityType, World world) {{
        super(entityType, world);
        this.experiencePoints = {experienceReward};
    }}

    // ── AI Goals (xatti-harakat) ─────────────────────────────────────────
{goalsCode}

    // ── Atributlar ───────────────────────────────────────────────────────

    public static DefaultAttributeContainer.Builder createAttributes() {{
        return {attributeBuilder}
            .add(EntityAttributes.GENERIC_MAX_HEALTH, {F(health)})
            .add(EntityAttributes.GENERIC_MOVEMENT_SPEED, {F(movementSpeed)})
            .add(EntityAttributes.GENERIC_ATTACK_DAMAGE, {F(attackDamage)})
            .add(EntityAttributes.GENERIC_FOLLOW_RANGE, {F(followRange)})
            .add(EntityAttributes.GENERIC_KNOCKBACK_RESISTANCE, {F(knockbackResistance)})
            .add(EntityAttributes.GENERIC_ARMOR, {F(armor)}){bossAttributes};
    }}{animalExtras}
}}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRATSIYA (ModEntities.java ga qo'shing)
// ═══════════════════════════════════════════════════════════════════════════
//
// public static final EntityType<{safeClassName}Entity> {upperId} = Registry.register(
//     Registries.ENTITY_TYPE,
//     new Identifier(""{textureNamespace}"", ""{entityId}""),
//     EntityType.Builder.create({safeClassName}Entity::new, {spawnGroup})
//         .setDimensions({F(width)}f, {F(height)}f)
//         .build(""{entityId}"")
// );
//
// FabricDefaultAttributeRegistry.register({upperId}, {safeClassName}Entity.createAttributes());
";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AI GOALS GENERATSIYASI
    // ═══════════════════════════════════════════════════════════════════════

    private string GenerateAIGoalsCode(string className)
    {
        StringBuilder sb = new StringBuilder();
        sb.AppendLine();
        sb.AppendLine("    @Override");
        sb.AppendLine("    protected void initGoals() {");

        int priority = 0;
        foreach (var goal in aiGoals)
        {
            string goalCode = GetGoalCode(goal, priority, className);
            if (!string.IsNullOrEmpty(goalCode))
            {
                sb.AppendLine($"        {goalCode}");
                priority++;
            }
        }

        sb.AppendLine("    }");
        return sb.ToString();
    }

    private string GetGoalCode(AIGoalType goal, int priority, string className)
    {
        switch (goal)
        {
            case AIGoalType.SwimGoal:
                return $"this.goalSelector.add({priority}, new SwimGoal(this));";
            case AIGoalType.FloatGoal:
                return $"this.goalSelector.add({priority}, new SwimGoal(this));";
            case AIGoalType.MeleeAttack:
                return $"this.goalSelector.add({priority}, new MeleeAttackGoal(this, 1.0D, false));";
            case AIGoalType.RangedAttack:
                return $"// this.goalSelector.add({priority}, new ProjectileAttackGoal(this, 1.0D, 40, 20.0F));";
            case AIGoalType.WanderAround:
                return $"this.goalSelector.add({priority}, new WanderAroundFarGoal(this, 0.8D));";
            case AIGoalType.LookAtPlayer:
                return $"this.goalSelector.add({priority}, new LookAtEntityGoal(this, PlayerEntity.class, 8.0F));";
            case AIGoalType.FollowOwner:
                return $"// this.goalSelector.add({priority}, new FollowOwnerGoal(this, 1.0D, 10.0F, 2.0F, false));";
            case AIGoalType.AvoidEntity:
                return $"// this.goalSelector.add({priority}, new FleeEntityGoal<>(this, PlayerEntity.class, 6.0F, 1.0D, 1.2D));";
            case AIGoalType.PanicGoal:
                return $"this.goalSelector.add({priority}, new EscapeDangerGoal(this, 1.4D));";
            case AIGoalType.BreedGoal:
                return $"this.goalSelector.add({priority}, new AnimalMateGoal(this, 1.0D));";
            case AIGoalType.TemptGoal:
                return $"// this.goalSelector.add({priority}, new TemptGoal(this, 1.2D, Ingredient.ofItems(Items.CARROT), false));";
            case AIGoalType.TargetNearestPlayer:
                return $"this.targetSelector.add({priority}, new ActiveTargetGoal<>(this, PlayerEntity.class, true));";
            case AIGoalType.HurtByTarget:
                return $"this.targetSelector.add({priority}, new RevengeGoal(this));";
            case AIGoalType.LeapAtTarget:
                return $"this.goalSelector.add({priority}, new PounceAtTargetGoal(this, 0.4F));";
            default:
                return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SPAWN RULES JSON (Fabric biome modifications)
    // ═══════════════════════════════════════════════════════════════════════

    public string GenerateSpawnRulesCode()
    {
        string upperId = entityId.ToUpper();
        string category = GetSpawnGroup().Replace("SpawnGroup.", "");

        StringBuilder sb = new StringBuilder();
        sb.AppendLine("// Spawn Rules — ModEntities.onInitialize() ichiga qo'shing:");
        sb.AppendLine();

        if (spawnRule.naturalSpawn)
        {
            sb.AppendLine("// Natural spawning (biome-based)");
            sb.AppendLine($"BiomeModifications.addSpawn(");
            sb.AppendLine($"    BiomeSelectors.foundInOverworld(),");
            sb.AppendLine($"    {GetSpawnGroup()},");
            sb.AppendLine($"    {upperId},");
            sb.AppendLine($"    {spawnRule.spawnWeight}, {spawnRule.minGroup}, {spawnRule.maxGroup}");
            sb.AppendLine($");");
            sb.AppendLine();

            // Spawn restrictions
            if (spawnRule.requiresDarkness)
            {
                sb.AppendLine($"// Faqat qorong'ulikda paydo bo'ladi");
                sb.AppendLine($"SpawnRestriction.register({upperId},");
                sb.AppendLine($"    SpawnRestriction.Location.ON_GROUND,");
                sb.AppendLine($"    Heightmap.Type.MOTION_BLOCKING_NO_LEAVES,");
                sb.AppendLine($"    HostileEntity::canSpawnInDark);");
            }
            else if (spawnRule.onlyOnGrass)
            {
                sb.AppendLine($"// Faqat o'tda paydo bo'ladi (hayvonlar uchun)");
                sb.AppendLine($"SpawnRestriction.register({upperId},");
                sb.AppendLine($"    SpawnRestriction.Location.ON_GROUND,");
                sb.AppendLine($"    Heightmap.Type.MOTION_BLOCKING_NO_LEAVES,");
                sb.AppendLine($"    AnimalEntity::isValidNaturalSpawn);");
            }
        }

        if (spawnRule.spawnEgg)
        {
            sb.AppendLine();
            sb.AppendLine("// Spawn Egg yaratish");
            sb.AppendLine($"public static final Item {upperId}_SPAWN_EGG = new SpawnEggItem(");
            sb.AppendLine($"    {upperId}, 0x7A0000, 0xFF0000, // Asosiy va ikkinchi rang");
            sb.AppendLine($"    new Item.Settings()");
            sb.AppendLine($");");
        }

        return sb.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOOT TABLE JSON GENERATSIYASI
    // ═══════════════════════════════════════════════════════════════════════

    public string GenerateLootTableJson()
    {
        StringBuilder json = new StringBuilder();
        json.AppendLine("{");
        json.AppendLine("  \"type\": \"minecraft:entity\",");
        json.AppendLine("  \"pools\": [");

        for (int p = 0; p < lootDrops.Count; p++)
        {
            var drop = lootDrops[p];
            string itemId = drop.itemId.Contains(":") ? drop.itemId : $"{textureNamespace}:{drop.itemId}";
            string poolComma = p < lootDrops.Count - 1 ? "," : "";

            json.AppendLine("    {");
            json.AppendLine("      \"rolls\": 1,");

            // Conditions
            if (drop.requiresPlayerKill)
            {
                json.AppendLine("      \"conditions\": [");
                json.AppendLine("        { \"condition\": \"minecraft:killed_by_player\" }");
                json.AppendLine("      ],");
            }

            json.AppendLine("      \"entries\": [");
            json.AppendLine("        {");
            json.AppendLine("          \"type\": \"minecraft:item\",");
            json.AppendLine($"          \"name\": \"{itemId}\",");

            // Functions (count va chance)
            json.AppendLine("          \"functions\": [");

            // Count function
            if (drop.minCount != drop.maxCount)
            {
                json.AppendLine("            {");
                json.AppendLine("              \"function\": \"minecraft:set_count\",");
                json.AppendLine("              \"count\": {");
                json.AppendLine("                \"type\": \"minecraft:uniform\",");
                json.AppendLine($"                \"min\": {drop.minCount},");
                json.AppendLine($"                \"max\": {drop.maxCount}");
                json.AppendLine("              }");
                json.AppendLine("            },");
            }

            // Looting enchant bonus
            json.AppendLine("            {");
            json.AppendLine("              \"function\": \"minecraft:looting_enchant\",");
            json.AppendLine("              \"count\": { \"type\": \"minecraft:uniform\", \"min\": 0, \"max\": 1 }");
            json.AppendLine("            }");

            json.AppendLine("          ]");
            json.AppendLine("        }");
            json.AppendLine("      ]");
            json.AppendLine($"    }}{poolComma}");
        }

        // Experience pool
        json.AppendLine("  ]");
        json.AppendLine("}");

        return json.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private string GetBaseEntityClass()
    {
        switch (mobCategory)
        {
            case MobCategory.Monster:       return "HostileEntity";
            case MobCategory.Creature:      return "AnimalEntity";
            case MobCategory.Ambient:       return "AmbientEntity";
            case MobCategory.WaterCreature: return "WaterCreatureEntity";
            case MobCategory.Boss:          return "HostileEntity";
            default:                        return "HostileEntity";
        }
    }

    private string GetEntityImports()
    {
        switch (mobCategory)
        {
            case MobCategory.Monster:
            case MobCategory.Boss:
                return "import net.minecraft.entity.mob.HostileEntity;";
            case MobCategory.Creature:
                return "import net.minecraft.entity.passive.AnimalEntity;\n" +
                       "import net.minecraft.entity.passive.PassiveEntity;\n" +
                       "import net.minecraft.server.world.ServerWorld;\n" +
                       "import org.jetbrains.annotations.Nullable;";
            case MobCategory.Ambient:
                return "import net.minecraft.entity.passive.AmbientEntity;";
            case MobCategory.WaterCreature:
                return "import net.minecraft.entity.passive.WaterCreatureEntity;";
            default:
                return "import net.minecraft.entity.mob.HostileEntity;";
        }
    }

    private string GetAttributeBuilderBase()
    {
        switch (mobCategory)
        {
            case MobCategory.Monster:
            case MobCategory.Boss:
                return "HostileEntity.createHostileAttributes()";
            case MobCategory.Creature:
                return "AnimalEntity.createMobAttributes()";
            case MobCategory.Ambient:
                return "AmbientEntity.createMobAttributes()";
            case MobCategory.WaterCreature:
                return "WaterCreatureEntity.createMobAttributes()";
            default:
                return "HostileEntity.createHostileAttributes()";
        }
    }

    private string GetSpawnGroup()
    {
        switch (mobCategory)
        {
            case MobCategory.Monster:
            case MobCategory.Boss:
                return "SpawnGroup.MONSTER";
            case MobCategory.Creature:
                return "SpawnGroup.CREATURE";
            case MobCategory.Ambient:
                return "SpawnGroup.AMBIENT";
            case MobCategory.WaterCreature:
                return "SpawnGroup.WATER_CREATURE";
            default:
                return "SpawnGroup.MONSTER";
        }
    }

    public string GenerateLanguageJson()
    {
        return $@"{{
  ""entity.{textureNamespace}.{entityId}"": ""{displayName}""
}}";
    }

    private string ToPascalCase(string snakeCase)
    {
        if (string.IsNullOrEmpty(snakeCase)) return "CustomEntity";
        string[] parts = snakeCase.Split('_');
        string result = "";
        foreach (string part in parts)
        {
            if (part.Length > 0)
                result += char.ToUpper(part[0]) + (part.Length > 1 ? part.Substring(1).ToLower() : "");
        }
        return result;
    }

    private string F(float v) => v.ToString("0.0", CultureInfo.InvariantCulture);
}
