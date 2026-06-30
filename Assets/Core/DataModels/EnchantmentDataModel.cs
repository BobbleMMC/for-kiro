using System;
using System.Text;
using System.Collections.Generic;
using System.Globalization;

/// <summary>
/// Enchantment qo'llanish maqsadi (target).
/// </summary>
public enum EnchantmentTarget
{
    Armor,
    ArmorHead,
    ArmorChest,
    ArmorLegs,
    ArmorFeet,
    Weapon,
    Digger,       // Pickaxe, Axe, Shovel, Hoe
    FishingRod,
    Trident,
    Bow,
    Crossbow,
    Breakable     // Barcha sinishi mumkin bo'lgan itemlar
}

/// <summary>
/// Enchantment rarity (og'irligi).
/// </summary>
public enum EnchantmentRarity
{
    Common,       // weight = 10
    Uncommon,     // weight = 5
    Rare,         // weight = 2
    VeryRare      // weight = 1
}

[System.Serializable]
public class EnchantmentDataModel
{
    // ── Asosiy xususiyatlar ──
    public string enchantmentId = "custom_flame_aspect";
    public string displayName = "Flame Aspect";
    public string description = "Qilichga olov beradi.";
    public int maxLevel = 3;
    public EnchantmentTarget target = EnchantmentTarget.Weapon;
    public EnchantmentRarity rarity = EnchantmentRarity.Rare;
    public string textureNamespace = "mymod";

    // ── Moslik (compatibility) ──
    public bool isTreasure = false;       // Faqat loot/trading da topiladi
    public bool isCurse = false;          // Lanat — olib tashlab bo'lmaydi
    public bool isTradeable = true;       // Villager trading da chiqadimi
    public bool isDiscoverable = true;    // Enchanting table da topildimi
    public List<string> incompatibleWith = new List<string>(); // Boshqa enchant IDlar

    // ── Effekt (har bir daraja uchun) ──
    public float damagePerLevel = 2.5f;   // Har bir darajada qo'shimcha zarar
    public float durationPerLevel = 0.0f; // Har bir darajada effekt davomiyligi (soniya)
    public string effectType = "fire";    // fire, slowness, poison, wither, etc.

    // ── Narx kalkulyatsiyasi (Anvil uchun) ──
    public int minCostBase = 10;
    public int minCostPerLevel = 8;
    public int maxCostBase = 45;
    public int maxCostPerLevel = 8;

    // ═══════════════════════════════════════════════════════════════════════
    // FABRIC JAVA KOD GENERATSIYASI
    // ═══════════════════════════════════════════════════════════════════════

    public string GenerateFabricCode()
    {
        string upperId = enchantmentId.ToUpper();
        string className = ToPascalCase(enchantmentId);
        string targetEnum = GetFabricTarget();
        string rarityEnum = GetFabricRarity();

        StringBuilder sb = new StringBuilder();

        sb.AppendLine($"package net.{textureNamespace}.enchantment;");
        sb.AppendLine();
        sb.AppendLine("import net.minecraft.enchantment.Enchantment;");
        sb.AppendLine("import net.minecraft.enchantment.EnchantmentTarget;");
        sb.AppendLine("import net.minecraft.entity.Entity;");
        sb.AppendLine("import net.minecraft.entity.EquipmentSlot;");
        sb.AppendLine("import net.minecraft.entity.LivingEntity;");
        sb.AppendLine("import net.minecraft.entity.effect.StatusEffectInstance;");
        sb.AppendLine("import net.minecraft.entity.effect.StatusEffects;");
        sb.AppendLine("import net.minecraft.registry.Registries;");
        sb.AppendLine("import net.minecraft.registry.Registry;");
        sb.AppendLine("import net.minecraft.util.Identifier;");
        sb.AppendLine();
        sb.AppendLine("/**");
        sb.AppendLine($" * {displayName} — Custom Enchantment");
        sb.AppendLine($" * {description}");
        sb.AppendLine($" * Maqsad: {target}, Rarity: {rarity}, Max: {maxLevel}");
        sb.AppendLine(" */");
        sb.AppendLine($"public class {className}Enchantment extends Enchantment {{");
        sb.AppendLine();
        sb.AppendLine($"    public {className}Enchantment() {{");
        sb.AppendLine($"        super(Enchantment.Rarity.{rarityEnum},");
        sb.AppendLine($"              EnchantmentTarget.{targetEnum},");
        sb.AppendLine($"              new EquipmentSlot[]{{ {GetEquipmentSlots()} }});");
        sb.AppendLine("    }");
        sb.AppendLine();

        // getMaxLevel
        sb.AppendLine("    @Override");
        sb.AppendLine($"    public int getMaxLevel() {{ return {maxLevel}; }}");
        sb.AppendLine();

        // getMinPower & getMaxPower (narx)
        sb.AppendLine("    @Override");
        sb.AppendLine($"    public int getMinPower(int level) {{ return {minCostBase} + (level - 1) * {minCostPerLevel}; }}");
        sb.AppendLine();
        sb.AppendLine("    @Override");
        sb.AppendLine($"    public int getMaxPower(int level) {{ return {maxCostBase} + level * {maxCostPerLevel}; }}");
        sb.AppendLine();

        // isTreasure
        if (isTreasure)
        {
            sb.AppendLine("    @Override");
            sb.AppendLine("    public boolean isTreasure() { return true; }");
            sb.AppendLine();
        }

        // isCurse
        if (isCurse)
        {
            sb.AppendLine("    @Override");
            sb.AppendLine("    public boolean isCursed() { return true; }");
            sb.AppendLine();
        }

        // isAvailableForEnchantedBookOffer
        if (!isTradeable)
        {
            sb.AppendLine("    @Override");
            sb.AppendLine("    public boolean isAvailableForEnchantedBookOffer() { return false; }");
            sb.AppendLine();
        }

        // isAvailableForRandomSelection
        if (!isDiscoverable)
        {
            sb.AppendLine("    @Override");
            sb.AppendLine("    public boolean isAvailableForRandomSelection() { return false; }");
            sb.AppendLine();
        }

        // onTargetDamaged (effekt qo'llash)
        sb.AppendLine("    @Override");
        sb.AppendLine("    public void onTargetDamaged(LivingEntity user, Entity target, int level) {");
        sb.AppendLine("        super.onTargetDamaged(user, target, level);");
        sb.AppendLine();
        sb.AppendLine("        if (target instanceof LivingEntity livingTarget) {");
        sb.AppendLine(GenerateEffectCode());
        sb.AppendLine("        }");
        sb.AppendLine("    }");

        // Incompatible enchantments
        if (incompatibleWith != null && incompatibleWith.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("    @Override");
            sb.AppendLine("    protected boolean canAccept(Enchantment other) {");
            foreach (string incomp in incompatibleWith)
            {
                sb.AppendLine($"        // Mos kelmaydi: {incomp}");
            }
            sb.AppendLine("        return super.canAccept(other);");
            sb.AppendLine("    }");
        }

        sb.AppendLine("}");
        sb.AppendLine();

        // Registratsiya kodi
        sb.AppendLine("// ═══════════════════════════════════════════════════════════════════════");
        sb.AppendLine("// REGISTRATSIYA (ModEnchantments.java yoki onInitialize ichiga):");
        sb.AppendLine("// ═══════════════════════════════════════════════════════════════════════");
        sb.AppendLine($"// public static final Enchantment {upperId} = Registry.register(");
        sb.AppendLine($"//     Registries.ENCHANTMENT,");
        sb.AppendLine($"//     new Identifier(\"{textureNamespace}\", \"{enchantmentId}\"),");
        sb.AppendLine($"//     new {className}Enchantment()");
        sb.AppendLine($"// );");

        return sb.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EFFEKT KODI GENERATSIYASI
    // ═══════════════════════════════════════════════════════════════════════

    private string GenerateEffectCode()
    {
        switch (effectType.ToLower())
        {
            case "fire":
                return "            // Maqsadni yoqish (level * 4 soniya)\n" +
                       "            livingTarget.setOnFireFor(level * 4);";
            case "slowness":
                return "            // Sekinlashtirish effekti\n" +
                       "            livingTarget.addStatusEffect(\n" +
                       "                new StatusEffectInstance(StatusEffects.SLOWNESS, level * 40, level - 1));";
            case "poison":
                return "            // Zaharlanish effekti\n" +
                       "            livingTarget.addStatusEffect(\n" +
                       "                new StatusEffectInstance(StatusEffects.POISON, level * 60, level - 1));";
            case "wither":
                return "            // Wither effekti\n" +
                       "            livingTarget.addStatusEffect(\n" +
                       "                new StatusEffectInstance(StatusEffects.WITHER, level * 40, level - 1));";
            case "weakness":
                return "            // Zaiflashtirish effekti\n" +
                       "            livingTarget.addStatusEffect(\n" +
                       "                new StatusEffectInstance(StatusEffects.WEAKNESS, level * 60, level - 1));";
            case "blindness":
                return "            // Ko'rlik effekti\n" +
                       "            livingTarget.addStatusEffect(\n" +
                       "                new StatusEffectInstance(StatusEffects.BLINDNESS, level * 30, 0));";
            case "levitation":
                return "            // Havoga ko'tarish\n" +
                       "            livingTarget.addStatusEffect(\n" +
                       "                new StatusEffectInstance(StatusEffects.LEVITATION, level * 20, level - 1));";
            default:
                return $"            // Custom effekt: {effectType}\n" +
                       $"            livingTarget.setOnFireFor(level * 2); // TODO: O'z effektingizni qo'shing";
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private string GetFabricTarget()
    {
        switch (target)
        {
            case EnchantmentTarget.Armor:      return "ARMOR";
            case EnchantmentTarget.ArmorHead:  return "ARMOR_HEAD";
            case EnchantmentTarget.ArmorChest: return "ARMOR_CHEST";
            case EnchantmentTarget.ArmorLegs:  return "ARMOR_LEGS";
            case EnchantmentTarget.ArmorFeet:  return "ARMOR_FEET";
            case EnchantmentTarget.Weapon:     return "WEAPON";
            case EnchantmentTarget.Digger:     return "DIGGER";
            case EnchantmentTarget.FishingRod: return "FISHING_ROD";
            case EnchantmentTarget.Trident:    return "TRIDENT";
            case EnchantmentTarget.Bow:        return "BOW";
            case EnchantmentTarget.Crossbow:   return "CROSSBOW";
            case EnchantmentTarget.Breakable:  return "BREAKABLE";
            default:                           return "WEAPON";
        }
    }

    private string GetFabricRarity()
    {
        switch (rarity)
        {
            case EnchantmentRarity.Common:   return "COMMON";
            case EnchantmentRarity.Uncommon: return "UNCOMMON";
            case EnchantmentRarity.Rare:     return "RARE";
            case EnchantmentRarity.VeryRare: return "VERY_RARE";
            default:                         return "RARE";
        }
    }

    private string GetEquipmentSlots()
    {
        switch (target)
        {
            case EnchantmentTarget.Armor:
            case EnchantmentTarget.ArmorHead:
            case EnchantmentTarget.ArmorChest:
            case EnchantmentTarget.ArmorLegs:
            case EnchantmentTarget.ArmorFeet:
                return "EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET";
            default:
                return "EquipmentSlot.MAINHAND";
        }
    }

    public string GenerateLanguageJson()
    {
        return $@"{{
  ""enchantment.{textureNamespace}.{enchantmentId}"": ""{displayName}""
}}";
    }

    private string ToPascalCase(string snakeCase)
    {
        if (string.IsNullOrEmpty(snakeCase)) return "Custom";
        string[] parts = snakeCase.Split('_');
        string result = "";
        foreach (string part in parts)
        {
            if (part.Length > 0)
                result += char.ToUpper(part[0]) + (part.Length > 1 ? part.Substring(1).ToLower() : "");
        }
        return result;
    }
}
