using System;

public enum MobCategory
{
    Monster,
    Creature,
    Ambient,
    WaterCreature,
    Boss
}

[System.Serializable]
public class EntityDataModel
{
    public string entityId = "custom_ruby_golem";
    public string displayName = "Ruby Golem";
    public float health = 100.0f;
    public float movementSpeed = 0.25f;
    public float attackDamage = 15.0f;
    public float width = 1.4f;
    public float height = 2.7f;
    public MobCategory mobCategory = MobCategory.Monster;
    public string textureNamespace = "mymod";

    // MobCategory ga mos Java base class
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

    // MobCategory ga mos import satrlari
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

    // MobCategory ga mos attribute builder metod nomi
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

    // MobCategory ga mos SpawnGroup
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

        // Creature (AnimalEntity) uchun createChild metodi kerak
        string animalExtras = mobCategory == MobCategory.Creature
            ? $@"

    // AnimalEntity uchun zarur: bolalar yaratish
    @Nullable
    @Override
    public PassiveEntity createChild(ServerWorld world, PassiveEntity entity) {{
        return null; // TODO: O'z breed logikangizni qo'shing
    }}"
            : "";

        return $@"package net.{textureNamespace}.entity;

import net.fabricmc.api.ModInitializer;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.SpawnGroup;
import net.minecraft.entity.attribute.DefaultAttributeContainer;
import net.minecraft.entity.attribute.EntityAttributes;
{imports}
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.util.Identifier;

public class ModEntities implements ModInitializer {{

    // {displayName} ({mobCategory}) elementi deklaratsiyasi
    public static final EntityType<{baseClass}> {upperId} = Registry.register(
        Registries.ENTITY_TYPE,
        new Identifier(""{textureNamespace}"", ""{entityId}""),
        EntityType.Builder.create({baseClass}::new, {spawnGroup})
            .setDimensions({width.ToString("0.0")}f, {height.ToString("0.0")}f)
            .build(""{entityId}"")
    );

    // Entity atributlarini ro'yxatga olish
    public static DefaultAttributeContainer.Builder create{safeClassName}Attributes() {{
        return {attributeBuilder}
            .add(EntityAttributes.GENERIC_MAX_HEALTH, {health.ToString("0.0")})
            .add(EntityAttributes.GENERIC_MOVEMENT_SPEED, {movementSpeed.ToString("0.00")})
            .add(EntityAttributes.GENERIC_ATTACK_DAMAGE, {attackDamage.ToString("0.0")}){bossAttributes};
    }}{animalExtras}

    @Override
    public void onInitialize() {{
        // {displayName} o'yinga muvaffaqiyatli yuklandi
        // FabricDefaultAttributeRegistry.register({upperId}, create{safeClassName}Attributes());
    }}
}}";
    }

    public string GenerateLanguageJson()
    {
        return $@"{{
  ""entity.{textureNamespace}.{entityId}"": ""{displayName}""
}}";
    }

    // snake_case → PascalCase: "custom_ruby_golem" → "CustomRubyGolem"
    private string ToPascalCase(string snakeCase)
    {
        if (string.IsNullOrEmpty(snakeCase)) return "CustomEntity";
        
        string[] parts = snakeCase.Split('_');
        string result = "";
        foreach (string part in parts)
        {
            if (part.Length > 0)
            {
                result += char.ToUpper(part[0]) + (part.Length > 1 ? part.Substring(1).ToLower() : "");
            }
        }
        return result;
    }
}
