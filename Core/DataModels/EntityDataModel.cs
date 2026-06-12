using System;

public enum MobCategory
{
    Monster,
    Creature,
    Ambient,
    WaterCreature
}

[System.Serializable]
public class EntityDataModel
{
    public string entityId = "custom_ruby_golem";
    public string displayName = "Ruby Golem";
    public float health = 100.0f;
    public float movementSpeed = 0.25f;
    public float attackDamage = 15.0f;
    public MobCategory mobCategory = MobCategory.Monster;
    public string textureNamespace = "mymod";

    public string GenerateFabricCode()
    {
        string upperId = entityId.ToUpper();
        string spawnGroup = "SpawnGroup." + mobCategory.ToString().ToUpper();
        
        return $@"package net.mymod.entity;

import net.fabricmc.api.ModInitializer;
import net.minecraft.entity.EntityType;
import net.minecraft.entity.SpawnGroup;
import net.minecraft.entity.attribute.DefaultAttributeContainer;
import net.minecraft.entity.attribute.EntityAttributes;
import net.minecraft.entity.mob.HostileEntity;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.util.Identifier;

public class ModEntities implements ModInitializer {{

    // {displayName} elementi deklaratsiyasi
    public static final EntityType<HostileEntity> {upperId} = Registry.register(
        Registries.ENTITY_TYPE,
        new Identifier(""" + textureNamespace + @""", """ + entityId + @"""),
        EntityType.Builder.create(HostileEntity::new, " + spawnGroup + @")
            .setDimensions(1.4f, 2.7f)
            .build(""" + entityId + @""")
    );

    public static DefaultAttributeContainer.Builder create" + entityId.Replace("_", "") + @"Attributes() {{
        return HostileEntity.createHostileAttributes()
            .add(EntityAttributes.GENERIC_MAX_HEALTH, " + health.ToString("0.0") + @")
            .add(EntityAttributes.GENERIC_MOVEMENT_SPEED, " + movementSpeed.ToString("0.00") + @")
            .add(EntityAttributes.GENERIC_ATTACK_DAMAGE, " + attackDamage.ToString("0.0") + @");
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
  ""entity.{textureNamespace}.{entityId}"": ""{displayName}""
}}";
    }
}
