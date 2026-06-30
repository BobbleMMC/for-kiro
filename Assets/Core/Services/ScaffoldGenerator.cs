using System;
using System.IO;
using System.Text;

/// <summary>
/// Fabric va NeoForge uchun to'liq buildable loyiha scaffold fayllarini yaratadi.
/// Bu fayllar: build.gradle, settings.gradle, gradle.properties,
/// fabric.mod.json yoki mods.toml, pack.mcmeta, gradlew, gradlew.bat
/// </summary>
public static class ScaffoldGenerator
{
    // ─── Versiya konstantalari ───────────────────────────────────────────────

    // Fabric 1.20.1
    private const string YARN_1_20_1   = "1.20.1+build.10";
    private const string LOADER_1_20_1 = "0.15.11";
    private const string FAPI_1_20_1   = "0.91.0+1.20.1";

    // Fabric 1.20.4
    private const string YARN_1_20_4   = "1.20.4+build.3";
    private const string LOADER_1_20_4 = "0.15.11";
    private const string FAPI_1_20_4   = "0.95.7+1.20.4";

    // Fabric 1.20.6
    private const string YARN_1_20_6   = "1.20.6+build.1";
    private const string LOADER_1_20_6 = "0.15.11";
    private const string FAPI_1_20_6   = "0.97.8+1.20.6";

    // Fabric 1.21
    private const string YARN_1_21     = "1.21+build.9";
    private const string LOADER_1_21   = "0.16.9";
    private const string FAPI_1_21     = "0.100.4+1.21";

    // Fabric 1.21.1
    private const string YARN_1_21_1   = "1.21.1+build.3";
    private const string LOADER_1_21_1 = "0.16.9";
    private const string FAPI_1_21_1   = "0.105.0+1.21.1";

    // Fabric 1.21.3
    private const string YARN_1_21_3   = "1.21.3+build.2";
    private const string LOADER_1_21_3 = "0.16.9";
    private const string FAPI_1_21_3   = "0.108.0+1.21.3";

    // Fabric 1.21.4
    private const string YARN_1_21_4   = "1.21.4+build.1";
    private const string LOADER_1_21_4 = "0.16.10";
    private const string FAPI_1_21_4   = "0.110.5+1.21.4";

    // Fabric 1.22
    private const string YARN_1_22     = "1.22+build.1";
    private const string LOADER_1_22   = "0.16.14";
    private const string FAPI_1_22     = "0.115.0+1.22";

    // NeoForge versiyalari
    private const string NEOFORGE_1_20_4 = "20.4.237";
    private const string NEOFORGE_1_21   = "21.1.77";
    private const string NEOFORGE_1_21_1 = "21.1.172";
    private const string NEOFORGE_1_21_3 = "21.3.58";
    private const string NEOFORGE_1_21_4 = "21.4.108";
    private const string NEOFORGE_1_22   = "22.0.28";

    // Quilt versiyalari
    private const string QUILT_LOADER    = "0.26.4";
    private const string QSL_1_20_1      = "7.1.2+1.20.1";
    private const string QSL_1_21        = "10.0.0+1.21";
    private const string QSL_1_21_4      = "10.2.0+1.21.4";

    // ─── Asosiy entry point ─────────────────────────────────────────────────

    /// <summary>
    /// Berilgan workspace ma'lumotlariga qarab to'liq loyiha scaffold yaratadi.
    /// </summary>
    public static void GenerateFullScaffold(string projectPath, WorkspaceData ws)
    {
        if (string.IsNullOrEmpty(projectPath) || ws == null) return;

        string modId   = ws.modId.Trim();
        string version = ws.mcVersion;
        string loader  = ws.modloader;

        // Gradle wrapper papkasini yaratamiz
        Directory.CreateDirectory(Path.Combine(projectPath, "gradle", "wrapper"));

        if (loader == "NeoForge")
            GenerateNeoForgeScaffold(projectPath, ws, modId, version);
        else if (loader == "Quilt")
            GenerateQuiltScaffold(projectPath, ws, modId, version);
        else
            GenerateFabricScaffold(projectPath, ws, modId, version);

        // Har ikki loader uchun umumiy fayllar
        WriteGradleWrapper(projectPath, version, loader);
        WriteGradlew(projectPath);
        WriteGradlewBat(projectPath);
        WritePackMcmeta(projectPath, ws);
        WriteGitignore(projectPath);
    }

    // ─── FABRIC ─────────────────────────────────────────────────────────────

    private static void GenerateFabricScaffold(string projectPath, WorkspaceData ws, string modId, string version)
    {
        string yarn, fabricLoader, fabricApi;
        int    javaVersion;

        switch (version)
        {
            case "1.20.1":
                yarn = YARN_1_20_1; fabricLoader = LOADER_1_20_1; fabricApi = FAPI_1_20_1; javaVersion = 17; break;
            case "1.20.4":
                yarn = YARN_1_20_4; fabricLoader = LOADER_1_20_4; fabricApi = FAPI_1_20_4; javaVersion = 17; break;
            case "1.20.6":
                yarn = YARN_1_20_6; fabricLoader = LOADER_1_20_6; fabricApi = FAPI_1_20_6; javaVersion = 21; break;
            case "1.21":
                yarn = YARN_1_21;   fabricLoader = LOADER_1_21;   fabricApi = FAPI_1_21;   javaVersion = 21; break;
            case "1.21.1":
                yarn = YARN_1_21_1; fabricLoader = LOADER_1_21_1; fabricApi = FAPI_1_21_1; javaVersion = 21; break;
            case "1.21.3":
                yarn = YARN_1_21_3; fabricLoader = LOADER_1_21_3; fabricApi = FAPI_1_21_3; javaVersion = 21; break;
            case "1.21.4":
                yarn = YARN_1_21_4; fabricLoader = LOADER_1_21_4; fabricApi = FAPI_1_21_4; javaVersion = 21; break;
            default: // 1.22+
                yarn = YARN_1_22;   fabricLoader = LOADER_1_22;   fabricApi = FAPI_1_22;   javaVersion = 21; break;
        }

        WriteFabricBuildGradle(projectPath, modId);
        WriteSettingsGradle(projectPath, modId);
        WriteFabricGradleProperties(projectPath, version, yarn, fabricLoader, fabricApi, javaVersion);
        WriteFabricModJson(projectPath, ws, javaVersion, fabricLoader);
    }

    // ─── NEOFORGE ───────────────────────────────────────────────────────────

    private static void GenerateNeoForgeScaffold(string projectPath, WorkspaceData ws, string modId, string version)
    {
        string neoForgeVer;
        int javaVersion;

        switch (version)
        {
            case "1.20.4":
                neoForgeVer = NEOFORGE_1_20_4; javaVersion = 17; break;
            case "1.21":
                neoForgeVer = NEOFORGE_1_21;   javaVersion = 21; break;
            case "1.21.1":
                neoForgeVer = NEOFORGE_1_21_1; javaVersion = 21; break;
            case "1.21.3":
                neoForgeVer = NEOFORGE_1_21_3; javaVersion = 21; break;
            case "1.21.4":
                neoForgeVer = NEOFORGE_1_21_4; javaVersion = 21; break;
            default: // 1.22+
                neoForgeVer = NEOFORGE_1_22;   javaVersion = 21; break;
        }

        WriteNeoForgeBuildGradle(projectPath, modId, neoForgeVer, javaVersion);
        WriteSettingsGradle(projectPath, modId);
        WriteNeoForgeGradleProperties(projectPath, version, neoForgeVer, javaVersion);
        WriteNeoForgeModsToml(projectPath, ws, neoForgeVer);
        WriteNeoForgeMixinsJson(projectPath, modId);

        // NeoForge: META-INF papkasini yaratamiz
        Directory.CreateDirectory(Path.Combine(projectPath, "src", "main", "resources", "META-INF"));
    }

    // ─── QUILT ──────────────────────────────────────────────────────────────

    private static void GenerateQuiltScaffold(string projectPath, WorkspaceData ws, string modId, string version)
    {
        // Quilt Fabric'ning fork'i — Fabric Yarn mappings va Quilt Loader ishlatadi
        string yarn, fabricLoader, qsl;
        int javaVersion;

        switch (version)
        {
            case "1.20.1":
                yarn = YARN_1_20_1; fabricLoader = LOADER_1_20_1; qsl = QSL_1_20_1; javaVersion = 17; break;
            case "1.21":
            case "1.21.1":
                yarn = YARN_1_21_1; fabricLoader = LOADER_1_21_1; qsl = QSL_1_21; javaVersion = 21; break;
            case "1.21.4":
            default:
                yarn = YARN_1_21_4; fabricLoader = LOADER_1_21_4; qsl = QSL_1_21_4; javaVersion = 21; break;
        }

        WriteQuiltBuildGradle(projectPath, modId);
        WriteSettingsGradle(projectPath, modId);
        WriteQuiltGradleProperties(projectPath, version, yarn, qsl, javaVersion);
        WriteQuiltModJson(projectPath, ws, javaVersion);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // FABRIC FILE WRITERS
    // ═════════════════════════════════════════════════════════════════════════

    private static void WriteFabricBuildGradle(string projectPath, string modId)
    {
        string content =
$@"plugins {{
    id 'fabric-loom' version '1.6-SNAPSHOT'
    id 'maven-publish'
}}

version = project.mod_version
group = project.maven_group

base {{
    archivesName = project.archives_base_name
}}

repositories {{
    // Qo'shimcha repositorylar shu yerga qo'shiladi
}}

loom {{
    splitEnvironmentSourceSets()

    mods {{
        ""{modId}"" {{
            sourceSet sourceSets.main
        }}
    }}

    // DataGen konfiguratsiyasi
    runs {{
        datagen {{
            inherit client
            name ""Data Generation""
            vmArg ""-Dfabric-api.datagen""
            vmArg ""-Dfabric-api.datagen.output-dir=${{file(""src/main/generated"")}}""
            vmArg ""-Dfabric-api.datagen.modid={modId}""
            runDir ""build/datagen""
        }}
    }}
}}

// DataGen orqali yaratilgan fayllarni resource sifatida qo'shish
sourceSets {{
    main {{
        resources {{
            srcDirs += [""src/main/generated""]
        }}
    }}
}}

dependencies {{
    minecraft ""com.mojang:minecraft:${{project.minecraft_version}}""
    mappings ""net.fabricmc:yarn:${{project.yarn_mappings}}:v2""
    modImplementation ""net.fabricmc:fabric-loader:${{project.loader_version}}""
    modImplementation ""net.fabricmc.fabric-api:fabric-api:${{project.fabric_version}}""
}}

processResources {{
    inputs.property ""version"", project.version

    filesMatching(""fabric.mod.json"") {{
        expand project.properties
    }}
}}

tasks.withType(JavaCompile).configureEach {{
    it.options.release = ${{project.java_version}}
}}

java {{
    withSourcesJar()

    sourceCompatibility = JavaVersion.VERSION_${{project.java_version}}
    targetCompatibility = JavaVersion.VERSION_${{project.java_version}}
}}

jar {{
    from(""LICENSE"") {{
        rename {{ ""${{it}}_${{project.archives_base_name}}"" }}
    }}
}}

publishing {{
    publications {{
        create(""mavenJava"", MavenPublication) {{
            from components.java
        }}
    }}
}}
";
        SafeWrite(Path.Combine(projectPath, "build.gradle"), content);
    }

    private static void WriteFabricGradleProperties(string projectPath, string mcVersion,
        string yarn, string loader, string fabricApi, int javaVersion)
    {
        string content =
$@"# Done to increase the memory available to gradle.
org.gradle.jvmargs=-Xmx2G -XX:MaxMetaspaceSize=512m

# Fabric Properties
minecraft_version={mcVersion}
yarn_mappings={yarn}
loader_version={loader}

# Mod Properties
mod_version=1.0.0
maven_group=net.mymod
archives_base_name=mymod

# Dependencies
fabric_version={fabricApi}

# Java version
java_version={javaVersion}
";
        SafeWrite(Path.Combine(projectPath, "gradle.properties"), content);
    }

    private static void WriteFabricModJson(string projectPath, WorkspaceData ws, int javaVersion, string loaderVersion)
    {
        string resourcesDir = Path.Combine(projectPath, "src", "main", "resources");
        Directory.CreateDirectory(resourcesDir);

        string content =
$@"{{
  ""schemaVersion"": 1,
  ""id"": ""{ws.modId}"",
  ""version"": ""${{version}}"",
  ""name"": ""{ws.modName}"",
  ""description"": ""A Minecraft mod generated using Mod Studio Desktop."",
  ""authors"": [
    ""ModStudio User""
  ],
  ""contact"": {{
    ""homepage"": ""https://example.com"",
    ""sources"": ""https://github.com/example/{ws.modId}""
  }},
  ""license"": ""MIT"",
  ""icon"": ""assets/{ws.modId}/icon.png"",
  ""environment"": ""*"",
  ""entrypoints"": {{
    ""main"": [
      ""net.{ws.modId}.MyMod""
    ],
    ""fabric-datagen"": [
      ""net.{ws.modId}.datagen.ModDataGenerators""
    ]
  }},
  ""mixins"": [
    ""{ws.modId}.mixins.json""
  ],
  ""depends"": {{
    ""fabricloader"": "">={loaderVersion}"",
    ""fabric-api"": ""*"",
    ""minecraft"": ""~{ws.mcVersion}"",
    ""java"": "">={javaVersion}""
  }},
  ""suggests"": {{
    ""another-mod"": ""*""
  }}
}}
";
        SafeWrite(Path.Combine(resourcesDir, "fabric.mod.json"), content);

        // Mixins JSON
        string mixinsContent =
$@"{{
  ""required"": true,
  ""minVersion"": ""0.8"",
  ""package"": ""net.{ws.modId}.mixin"",
  ""compatibilityLevel"": ""JAVA_{javaVersion}"",
  ""mixins"": [
  ],
  ""client"": [
  ],
  ""injectors"": {{
    ""defaultRequire"": 1
  }}
}}
";
        SafeWrite(Path.Combine(resourcesDir, $"{ws.modId}.mixins.json"), mixinsContent);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // NEOFORGE FILE WRITERS
    // ═════════════════════════════════════════════════════════════════════════

    private static void WriteNeoForgeBuildGradle(string projectPath, string modId, string neoForgeVer, int javaVersion)
    {
        string content =
$@"plugins {{
    id 'net.neoforged.gradle.userdev' version '7.0.145'
    id 'maven-publish'
}}

version = project.mod_version
group = project.maven_group

repositories {{
    // Qo'shimcha repositorylar shu yerga qo'shiladi
}}

base {{
    archivesName = project.archives_base_name
}}

java {{
    toolchain.languageVersion = JavaLanguageVersion.of({javaVersion})
}}

runs {{
    configureEach {{
        systemProperty 'forge.logging.markers', 'REGISTRIES'
        systemProperty 'forge.logging.console.level', 'debug'
        modSource project.sourceSets.main
    }}

    client {{
        systemProperty 'forge.enabledGameTestNamespaces', project.mod_id
    }}

    server {{
        systemProperty 'forge.enabledGameTestNamespaces', project.mod_id
        programArgument '--nogui'
    }}

    gameTestServer {{
        systemProperty 'forge.enabledGameTestNamespaces', project.mod_id
    }}

    data {{
        programArguments.addAll '--mod', project.mod_id, '--all',
                '--output', file('src/generated/resources/').getAbsolutePath(),
                '--existing', file('src/main/resources/').getAbsolutePath()
    }}
}}

sourceSets.main.resources {{ srcDir 'src/generated/resources' }}

dependencies {{
    implementation ""net.neoforged:neoforge:${{project.neoforge_version}}""
}}

tasks.withType(ProcessResources).configureEach {{
    var replaceProperties = [
        minecraft_version: minecraft_version,
        minecraft_version_range: minecraft_version_range,
        neoforge_version: neoforge_version,
        neoforge_version_range: neoforge_version_range,
        loader_version_range: loader_version_range,
        mod_id: mod_id,
        mod_name: mod_name,
        mod_license: mod_license,
        mod_version: mod_version,
        mod_authors: mod_authors,
        mod_description: mod_description,
    ]
    inputs.properties replaceProperties
    filesMatching(['META-INF/mods.toml']) {{
        expand replaceProperties
    }}
}}
";
        SafeWrite(Path.Combine(projectPath, "build.gradle"), content);
    }

    private static void WriteNeoForgeGradleProperties(string projectPath, string mcVersion, string neoForgeVer, int javaVersion)
    {
        // mc versiya range
        string[] parts   = mcVersion.Split('.');
        string verRange  = parts.Length >= 2 ? $"[{parts[0]}.{parts[1]},)" : $"[{mcVersion},)";

        string content =
$@"# Environment Properties
org.gradle.jvmargs=-Xmx3G
org.gradle.daemon=false

# Mod Properties
mod_id=mymod
mod_name=My Epic Mod
mod_license=MIT
mod_version=1.0.0
mod_group_id=net.mymod
mod_authors=ModStudio User
mod_description=A Minecraft mod generated using Mod Studio Desktop.

# NeoForge Properties
minecraft_version={mcVersion}
minecraft_version_range={verRange}
neoforge_version={neoForgeVer}
neoforge_version_range=[{neoForgeVer},)
loader_version_range=[1,)

maven_group=net.mymod
archives_base_name=mymod
java_version={javaVersion}
";
        SafeWrite(Path.Combine(projectPath, "gradle.properties"), content);
    }

    private static void WriteNeoForgeModsToml(string projectPath, WorkspaceData ws, string neoForgeVer)
    {
        string metaInfDir = Path.Combine(projectPath, "src", "main", "resources", "META-INF");
        Directory.CreateDirectory(metaInfDir);

        string content =
$@"modLoader=""javafml""
loaderVersion=""[${{loader_version_range}}]""
license=""${{mod_license}}""

[[mods]]
    modId=""${{mod_id}}""
    version=""${{mod_version}}""
    displayName=""${{mod_name}}""
    description='''
        ${{mod_description}}
    '''

[[dependencies.{ws.modId}]]
    modId=""neoforge""
    type=""required""
    versionRange=""[${{neoforge_version_range}}]""
    ordering=""NONE""
    side=""BOTH""

[[dependencies.{ws.modId}]]
    modId=""minecraft""
    type=""required""
    versionRange=""[${{minecraft_version_range}}]""
    ordering=""NONE""
    side=""BOTH""
";
        SafeWrite(Path.Combine(metaInfDir, "mods.toml"), content);
    }

    private static void WriteNeoForgeMixinsJson(string projectPath, string modId)
    {
        string resourcesDir = Path.Combine(projectPath, "src", "main", "resources");
        Directory.CreateDirectory(resourcesDir);
        string content =
$@"{{
  ""required"": true,
  ""minVersion"": ""0.8"",
  ""package"": ""net.{modId}.mixin"",
  ""compatibilityLevel"": ""JAVA_21"",
  ""mixins"": [],
  ""client"": [],
  ""injectors"": {{ ""defaultRequire"": 1 }}
}}
";
        SafeWrite(Path.Combine(resourcesDir, $"{modId}.mixins.json"), content);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // UMUMIY FAYLLAR (Fabric & NeoForge)
    // ═════════════════════════════════════════════════════════════════════════

    private static void WriteSettingsGradle(string projectPath, string modId)
    {
        string content =
$@"pluginManagement {{
    repositories {{
        maven {{ url = 'https://maven.fabricmc.net/' }}
        maven {{ url = 'https://maven.neoforged.net/releases' }}
        gradlePluginPortal()
    }}
}}

rootProject.name = '{modId}'
";
        SafeWrite(Path.Combine(projectPath, "settings.gradle"), content);
    }

    private static void WriteGradleWrapper(string projectPath, string mcVersion, string loader)
    {
        // Gradle versiyasi: 8.6 -> 1.20.x, 8.8 -> 1.21, 8.10 -> 1.21.3+, 8.12 -> 1.22+
        bool isNew = mcVersion.StartsWith("1.21") || mcVersion.StartsWith("1.22") || mcVersion == "1.20.6";
        string gradleVer;
        if (mcVersion.StartsWith("1.22")) gradleVer = "8.12";
        else if (mcVersion == "1.21.3" || mcVersion == "1.21.4") gradleVer = "8.10";
        else if (isNew) gradleVer = "8.8";
        else gradleVer = "8.6";

        string content =
$@"distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-{gradleVer}-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
";
        SafeWrite(Path.Combine(projectPath, "gradle", "wrapper", "gradle-wrapper.properties"), content);
    }

    private static void WriteGradlew(string projectPath)
    {
        // Use StringBuilder to avoid C# parser issues with shell special chars
        var sb = new StringBuilder();
        sb.AppendLine("#!/usr/bin/env sh");
        sb.AppendLine("# Gradle startup script for UN*X");
        sb.AppendLine();
        sb.AppendLine("APP_NAME=\"Gradle\"");
        sb.AppendLine("APP_HOME=\"$(cd \"$(dirname \"$0\")\" && pwd)\"");
        sb.AppendLine();
        sb.AppendLine("exec \"$APP_HOME/gradle/wrapper/gradle-wrapper.jar\" \"$@\"");
        sb.AppendLine("# Fallback: use system gradle");
        sb.AppendLine("command -v gradle > /dev/null 2>&1 && exec gradle \"$@\"");
        SafeWrite(Path.Combine(projectPath, "gradlew"), sb.ToString());
    }

    private static void WriteGradlewBat(string projectPath)
    {
        // Use StringBuilder to avoid C# parser issues with %, backslash, colon in bat scripts
        var sb = new StringBuilder();
        sb.AppendLine("@rem Gradle startup script for Windows");
        sb.AppendLine("@if \"%DEBUG%\" == \"\" @echo off");
        sb.AppendLine();
        sb.AppendLine("set DIRNAME=%~dp0");
        sb.AppendLine("if \"%DIRNAME%\" == \"\" set DIRNAME=.");
        sb.AppendLine("set APP_BASE_NAME=%~n0");
        sb.AppendLine("set APP_HOME=%DIRNAME%");
        sb.AppendLine();
        sb.AppendLine("if defined JAVA_HOME goto findJavaFromJavaHome");
        sb.AppendLine("set JAVA_EXE=java.exe");
        sb.AppendLine("goto execute");
        sb.AppendLine(":findJavaFromJavaHome");
        // JAVA_HOME colon-strip — written as concatenated string to avoid C# parse issues
        sb.AppendLine("set JAVA_HOME=" + "%JAVA_HOME:" + "\"=" + "%");
        sb.AppendLine("set JAVA_EXE=%JAVA_HOME%/bin/java.exe");
        sb.AppendLine(":execute");
        sb.AppendLine("\"%JAVA_EXE%\" -classpath \"%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar\" org.gradle.wrapper.GradleWrapperMain %*");
        sb.AppendLine(":omega");
        SafeWrite(Path.Combine(projectPath, "gradlew.bat"), sb.ToString());
    }

    private static void WritePackMcmeta(string projectPath, WorkspaceData ws)
    {
        // Pack format: 15 = 1.20.1, 22 = 1.20.4, 32 = 1.20.6, 34 = 1.21, 34 = 1.21.1, 35 = 1.21.3, 46 = 1.21.4, 48 = 1.22
        int packFormat;
        switch (ws.mcVersion)
        {
            case "1.20.1": packFormat = 15; break;
            case "1.20.4": packFormat = 22; break;
            case "1.20.6": packFormat = 32; break;
            case "1.21":   packFormat = 34; break;
            case "1.21.1": packFormat = 34; break;
            case "1.21.3": packFormat = 35; break;
            case "1.21.4": packFormat = 46; break;
            case "1.22":   packFormat = 48; break;
            default:       packFormat = 48; break;
        }

        string resourcesDir = Path.Combine(projectPath, "src", "main", "resources");
        Directory.CreateDirectory(resourcesDir);

        string content =
$@"{{
  ""pack"": {{
    ""pack_format"": {packFormat},
    ""description"": ""{ws.modName} Resources""
  }}
}}
";
        SafeWrite(Path.Combine(resourcesDir, "pack.mcmeta"), content);
    }

    private static void WriteGitignore(string projectPath)
    {
        string content =
@"# Gradle
.gradle/
build/
!gradle/wrapper/gradle-wrapper.jar
!**/src/main/**/build/
!**/src/test/**/build/

# IDE
*.idea/
*.iml
*.ipr
*.eclipse
.classpath
.project
.settings/

# OS
.DS_Store
Thumbs.db

# Mod Studio
*.mstudio.bak
";
        SafeWrite(Path.Combine(projectPath, ".gitignore"), content);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // QUILT FILE WRITERS
    // ═════════════════════════════════════════════════════════════════════════

    private static void WriteQuiltBuildGradle(string projectPath, string modId)
    {
        string content =
$@"plugins {{
    id 'org.quiltmc.loom' version '1.7-SNAPSHOT'
    id 'maven-publish'
}}

version = project.mod_version
group = project.maven_group

base {{
    archivesName = project.archives_base_name
}}

repositories {{
    maven {{ url = 'https://maven.quiltmc.org/repository/release/' }}
    maven {{ url = 'https://maven.fabricmc.net/' }}
}}

loom {{
    mods {{
        ""{modId}"" {{
            sourceSet sourceSets.main
        }}
    }}
}}

dependencies {{
    minecraft ""com.mojang:minecraft:${{project.minecraft_version}}""
    mappings ""net.fabricmc:yarn:${{project.yarn_mappings}}:v2""
    modImplementation ""org.quiltmc:quilt-loader:${{project.quilt_loader_version}}""
    modImplementation ""org.quiltmc.quilted-fabric-api:quilted-fabric-api:${{project.qsl_version}}""
}}

processResources {{
    inputs.property ""version"", project.version
    filesMatching(""quilt.mod.json"") {{
        expand project.properties
    }}
}}

tasks.withType(JavaCompile).configureEach {{
    it.options.release = ${{project.java_version}}
}}

java {{
    withSourcesJar()
    sourceCompatibility = JavaVersion.VERSION_${{project.java_version}}
    targetCompatibility = JavaVersion.VERSION_${{project.java_version}}
}}
";
        SafeWrite(Path.Combine(projectPath, "build.gradle"), content);
    }

    private static void WriteQuiltGradleProperties(string projectPath, string mcVersion,
        string yarn, string qsl, int javaVersion)
    {
        string content =
$@"# Done to increase the memory available to gradle.
org.gradle.jvmargs=-Xmx2G -XX:MaxMetaspaceSize=512m

# Quilt Properties
minecraft_version={mcVersion}
yarn_mappings={yarn}
quilt_loader_version={QUILT_LOADER}

# Mod Properties
mod_version=1.0.0
maven_group=net.mymod
archives_base_name=mymod

# Dependencies
qsl_version={qsl}

# Java version
java_version={javaVersion}
";
        SafeWrite(Path.Combine(projectPath, "gradle.properties"), content);
    }

    private static void WriteQuiltModJson(string projectPath, WorkspaceData ws, int javaVersion)
    {
        string resourcesDir = Path.Combine(projectPath, "src", "main", "resources");
        Directory.CreateDirectory(resourcesDir);

        string content =
$@"{{
  ""schema_version"": 1,
  ""quilt_loader"": {{
    ""group"": ""net.{ws.modId}"",
    ""id"": ""{ws.modId}"",
    ""version"": ""${{version}}"",
    ""metadata"": {{
      ""name"": ""{ws.modName}"",
      ""description"": ""A Minecraft mod generated using Mod Studio Desktop."",
      ""contributors"": {{
        ""ModStudio User"": ""Owner""
      }},
      ""contact"": {{
        ""homepage"": ""https://example.com"",
        ""sources"": ""https://github.com/example/{ws.modId}""
      }},
      ""icon"": ""assets/{ws.modId}/icon.png""
    }},
    ""intermediate_mappings"": ""net.fabricmc:intermediary"",
    ""entrypoints"": {{
      ""init"": ""net.{ws.modId}.MyMod""
    }},
    ""depends"": [
      {{
        ""id"": ""quilt_loader"",
        ""versions"": "">={QUILT_LOADER}""
      }},
      {{
        ""id"": ""quilted_fabric_api"",
        ""versions"": ""*""
      }},
      {{
        ""id"": ""minecraft"",
        ""versions"": ""~{ws.mcVersion}""
      }},
      {{
        ""id"": ""java"",
        ""versions"": "">={javaVersion}""
      }}
    ]
  }},
  ""mixin"": ""{ws.modId}.mixins.json""
}}
";
        SafeWrite(Path.Combine(resourcesDir, "quilt.mod.json"), content);

        // Mixins JSON (Quilt Fabric bilan mos)
        string mixinsContent =
$@"{{
  ""required"": true,
  ""minVersion"": ""0.8"",
  ""package"": ""net.{ws.modId}.mixin"",
  ""compatibilityLevel"": ""JAVA_{javaVersion}"",
  ""mixins"": [],
  ""client"": [],
  ""injectors"": {{ ""defaultRequire"": 1 }}
}}
";
        SafeWrite(Path.Combine(resourcesDir, $"{ws.modId}.mixins.json"), mixinsContent);
    }

    // ─── Utility ────────────────────────────────────────────────────────────

    private static void SafeWrite(string path, string content)
    {
        try
        {
            // Mavjud bo'lmagan papkalarni yaratamiz
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            File.WriteAllText(path, content, Encoding.UTF8);
        }
        catch (Exception ex)
        {
            StudioLogger.LogError($"[Scaffold] Fayl yozishda xatolik ({path}): {ex.Message}");
        }
    }
}
