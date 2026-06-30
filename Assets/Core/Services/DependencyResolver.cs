using System;
using System.Text;
using System.Collections.Generic;

/// <summary>
/// Mod Dependency Resolver — boshqa modlarga bog'liqlikni boshqarish.
/// 
/// Funksiyalar:
///   • Dependency qo'shish/o'chirish
///   • Version conflict detection
///   • Gradle dependency inject (build.gradle ga qo'shish)
///   • Dependency tree vizualizatsiya
/// </summary>
public static class DependencyResolver
{
    // ═══════════════════════════════════════════════════════════════════════
    // DATA MODELLARI
    // ═══════════════════════════════════════════════════════════════════════

    [System.Serializable]
    public class ModDependency
    {
        public string modId;                 // "fabric-api", "rei", "jei"
        public string displayName;           // "Fabric API"
        public string versionRange;          // ">=0.100.0", "~0.91.0"
        public DependencyType type;          // Required, Optional, Incompatible
        public string mavenCoordinate;       // Gradle dependency uchun
        public string repositoryUrl;         // Maven repo URL
        public string curseforgeSlug;        // CurseForge uchun
        public string modrinthSlug;          // Modrinth uchun
    }

    public enum DependencyType
    {
        Required,        // Modsiz ishlamaydi
        Optional,        // Bor bo'lsa yaxshi, yo'q bo'lsa ham OK
        Incompatible,    // Bir vaqtda ishlay olmaydi
        Embedded         // Mod ichiga kiritilgan (jar-in-jar)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MASHHUR MODLAR BAZASI
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Eng ko'p ishlatiladigan modlar ro'yxati (quick-add uchun).
    /// </summary>
    public static List<ModDependency> GetPopularDependencies()
    {
        return new List<ModDependency>
        {
            new ModDependency { modId = "fabric-api", displayName = "Fabric API", versionRange = "*", type = DependencyType.Required,
                mavenCoordinate = "net.fabricmc.fabric-api:fabric-api", modrinthSlug = "fabric-api" },
            new ModDependency { modId = "modmenu", displayName = "Mod Menu", versionRange = "*", type = DependencyType.Optional,
                mavenCoordinate = "com.terraformersmc:modmenu", modrinthSlug = "modmenu" },
            new ModDependency { modId = "rei", displayName = "Roughly Enough Items (REI)", versionRange = "*", type = DependencyType.Optional,
                modrinthSlug = "rei" },
            new ModDependency { modId = "jei", displayName = "Just Enough Items (JEI)", versionRange = "*", type = DependencyType.Optional,
                modrinthSlug = "jei" },
            new ModDependency { modId = "cloth-config", displayName = "Cloth Config", versionRange = "*", type = DependencyType.Optional,
                mavenCoordinate = "me.shedaniel.cloth:cloth-config-fabric", modrinthSlug = "cloth-config" },
            new ModDependency { modId = "geckolib", displayName = "GeckoLib (Animatsiya)", versionRange = "*", type = DependencyType.Optional,
                mavenCoordinate = "software.bernie.geckolib:geckolib-fabric", modrinthSlug = "geckolib" },
            new ModDependency { modId = "patchouli", displayName = "Patchouli (Guidebook)", versionRange = "*", type = DependencyType.Optional,
                modrinthSlug = "patchouli" },
            new ModDependency { modId = "trinkets", displayName = "Trinkets (Aksessuarlar)", versionRange = "*", type = DependencyType.Optional,
                mavenCoordinate = "dev.emi:trinkets", modrinthSlug = "trinkets" }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GRADLE DEPENDENCY INJECT
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Dependencies ni Gradle build.gradle formatida qaytaradi.
    /// </summary>
    public static string GenerateGradleDependencies(List<ModDependency> dependencies)
    {
        StringBuilder sb = new StringBuilder();
        sb.AppendLine();
        sb.AppendLine("    // ── Mod Dependencies ────────────────────────────────────────");

        foreach (var dep in dependencies)
        {
            if (string.IsNullOrEmpty(dep.mavenCoordinate)) continue;
            if (dep.type == DependencyType.Incompatible) continue;

            string config = dep.type == DependencyType.Embedded ? "include" : "modImplementation";
            sb.AppendLine($"    {config} \"{dep.mavenCoordinate}\"  // {dep.displayName}");
        }

        return sb.ToString();
    }

    /// <summary>
    /// Dependencies ni fabric.mod.json "depends"/"suggests"/"breaks" formatida qaytaradi.
    /// </summary>
    public static string GenerateFabricModJsonDependencies(List<ModDependency> dependencies)
    {
        StringBuilder sb = new StringBuilder();

        // Required
        var required = dependencies.FindAll(d => d.type == DependencyType.Required);
        if (required.Count > 0)
        {
            sb.AppendLine("  \"depends\": {");
            for (int i = 0; i < required.Count; i++)
            {
                string comma = i < required.Count - 1 ? "," : "";
                sb.AppendLine($"    \"{required[i].modId}\": \"{required[i].versionRange}\"{comma}");
            }
            sb.AppendLine("  },");
        }

        // Optional
        var optional = dependencies.FindAll(d => d.type == DependencyType.Optional);
        if (optional.Count > 0)
        {
            sb.AppendLine("  \"suggests\": {");
            for (int i = 0; i < optional.Count; i++)
            {
                string comma = i < optional.Count - 1 ? "," : "";
                sb.AppendLine($"    \"{optional[i].modId}\": \"{optional[i].versionRange}\"{comma}");
            }
            sb.AppendLine("  },");
        }

        // Incompatible
        var incompatible = dependencies.FindAll(d => d.type == DependencyType.Incompatible);
        if (incompatible.Count > 0)
        {
            sb.AppendLine("  \"breaks\": {");
            for (int i = 0; i < incompatible.Count; i++)
            {
                string comma = i < incompatible.Count - 1 ? "," : "";
                sb.AppendLine($"    \"{incompatible[i].modId}\": \"{incompatible[i].versionRange}\"{comma}");
            }
            sb.AppendLine("  },");
        }

        return sb.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VERSION CONFLICT DETECTION
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Dependencies orasida conflict borligini tekshiradi.
    /// </summary>
    public static List<string> DetectConflicts(List<ModDependency> dependencies)
    {
        var conflicts = new List<string>();

        for (int i = 0; i < dependencies.Count; i++)
        {
            for (int j = i + 1; j < dependencies.Count; j++)
            {
                // Bir xil modId — dublikat
                if (dependencies[i].modId == dependencies[j].modId)
                {
                    conflicts.Add($"Dublikat: '{dependencies[i].modId}' ikki marta qo'shilgan.");
                }

                // Incompatible + Required conflict
                if (dependencies[i].type == DependencyType.Incompatible && dependencies[j].type == DependencyType.Required)
                {
                    if (dependencies[i].modId == dependencies[j].modId)
                        conflicts.Add($"Conflict: '{dependencies[i].modId}' ham required ham incompatible.");
                }
            }
        }

        // Mashhur conflict lar
        bool hasREI = dependencies.Exists(d => d.modId == "rei");
        bool hasJEI = dependencies.Exists(d => d.modId == "jei");
        if (hasREI && hasJEI)
        {
            conflicts.Add("Ogohlantirish: REI va JEI bir vaqtda o'rnatilmasligi kerak (bir xil funksiya).");
        }

        return conflicts;
    }
}
