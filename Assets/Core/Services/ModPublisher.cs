using System;
using System.Text;
using System.Collections.Generic;

/// <summary>
/// CurseForge va Modrinth publish konfiguratsiyasi.
/// Mod faylini (.jar) platformalarga yuklash uchun kerakli metadatani yaratadi.
///
/// Bu servis haqiqiy API chaqiruv qilmaydi — faqat konfiguratsiya va
/// publish skriptlarini generatsiya qiladi (Gradle plugin orqali).
/// </summary>
public static class ModPublisher
{
    // ═══════════════════════════════════════════════════════════════════════
    // PUBLISH KONFIGURATSIYASI
    // ═══════════════════════════════════════════════════════════════════════

    [System.Serializable]
    public class PublishConfig
    {
        // Umumiy
        public string projectSlug = "";          // masalan: "ruby-ores-mod"
        public string versionNumber = "1.0.0";
        public string versionTitle = "";         // masalan: "v1.0.0 - Initial Release"
        public string changelog = "";
        public string releaseType = "release";   // release, beta, alpha

        // CurseForge
        public string curseforgeProjectId = "";
        public string curseforgeApiToken = "";   // Environmentdan olinadi

        // Modrinth
        public string modrinthProjectId = "";
        public string modrinthApiToken = "";     // Environmentdan olinadi

        // Minecraft moslik
        public List<string> gameVersions = new List<string>();
        public List<string> loaders = new List<string>();

        // Dependencies
        public List<PublishDependency> dependencies = new List<PublishDependency>();
    }

    [System.Serializable]
    public class PublishDependency
    {
        public string projectId;     // CurseForge/Modrinth project ID
        public string slug;          // masalan: "fabric-api"
        public string type;          // required, optional, incompatible
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GRADLE PUBLISH PLUGIN KONFIGURATSIYASI
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// CurseForge va Modrinth uchun Gradle publish konfiguratsiyasini generatsiya qiladi.
    /// Bu build.gradle oxiriga qo'shiladi.
    /// </summary>
    public static string GeneratePublishGradleConfig(PublishConfig config, WorkspaceData workspace)
    {
        StringBuilder sb = new StringBuilder();

        sb.AppendLine();
        sb.AppendLine("// ═══════════════════════════════════════════════════════════════════");
        sb.AppendLine("// MOD PUBLISHING (CurseForge + Modrinth)");
        sb.AppendLine("// ═══════════════════════════════════════════════════════════════════");
        sb.AppendLine();

        // Minotaur (CurseForge Gradle plugin)
        if (!string.IsNullOrEmpty(config.curseforgeProjectId))
        {
            sb.AppendLine("// CurseForge (Minotaur plugin)");
            sb.AppendLine("// plugins { id 'com.modrinth.minotaur' version '2.+' }");
            sb.AppendLine("curseforge {");
            sb.AppendLine($"    apiKey = System.getenv('CURSEFORGE_TOKEN') ?: ''");
            sb.AppendLine($"    project {{");
            sb.AppendLine($"        id = '{config.curseforgeProjectId}'");
            sb.AppendLine($"        releaseType = '{config.releaseType}'");
            sb.AppendLine($"        changelog = '''{config.changelog}'''");

            foreach (string ver in config.gameVersions)
                sb.AppendLine($"        addGameVersion '{ver}'");
            foreach (string loader in config.loaders)
                sb.AppendLine($"        addGameVersion '{loader}'");

            sb.AppendLine($"        mainArtifact(remapJar)");
            sb.AppendLine($"    }}");
            sb.AppendLine("}");
            sb.AppendLine();
        }

        // Modrinth (minotaur plugin)
        if (!string.IsNullOrEmpty(config.modrinthProjectId))
        {
            sb.AppendLine("// Modrinth");
            sb.AppendLine("modrinth {");
            sb.AppendLine($"    token = System.getenv('MODRINTH_TOKEN') ?: ''");
            sb.AppendLine($"    projectId = '{config.modrinthProjectId}'");
            sb.AppendLine($"    versionNumber = '{config.versionNumber}'");

            if (!string.IsNullOrEmpty(config.versionTitle))
                sb.AppendLine($"    versionName = '{config.versionTitle}'");

            sb.AppendLine($"    versionType = '{config.releaseType}'");
            sb.AppendLine($"    uploadFile = remapJar");
            sb.AppendLine($"    changelog = '''{config.changelog}'''");

            sb.Append("    gameVersions = [");
            sb.Append(string.Join(", ", config.gameVersions.ConvertAll(v => $"'{v}'")));
            sb.AppendLine("]");

            sb.Append("    loaders = [");
            sb.Append(string.Join(", ", config.loaders.ConvertAll(l => $"'{l.ToLower()}'")));
            sb.AppendLine("]");

            // Dependencies
            if (config.dependencies.Count > 0)
            {
                sb.AppendLine("    dependencies {");
                foreach (var dep in config.dependencies)
                {
                    sb.AppendLine($"        {dep.type}.project('{dep.slug}')");
                }
                sb.AppendLine("    }");
            }

            sb.AppendLine("}");
        }

        return sb.ToString();
    }

    /// <summary>
    /// Standart publish konfiguratsiyasini workspace asosida yaratadi.
    /// </summary>
    public static PublishConfig CreateDefaultConfig(WorkspaceData workspace)
    {
        var config = new PublishConfig
        {
            projectSlug = workspace.modId.Replace("_", "-"),
            versionNumber = "1.0.0",
            versionTitle = $"v1.0.0 - {workspace.modName} Initial Release",
            changelog = $"Initial release of {workspace.modName}.\n\nFeatures:\n- {workspace.blocks.Count} custom blocks\n- {workspace.items.Count} custom items\n- {workspace.tools.Count} tools\n- {workspace.armors.Count} armor pieces",
            releaseType = "release",
            gameVersions = new List<string> { workspace.mcVersion },
            loaders = new List<string> { workspace.modloader.ToLower() }
        };

        // Fabric API dependency
        if (workspace.modloader == "Fabric" || workspace.modloader == "Quilt")
        {
            config.dependencies.Add(new PublishDependency { slug = "fabric-api", type = "required" });
        }

        return config;
    }
}
