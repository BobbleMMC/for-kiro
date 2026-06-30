using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using UnityEngine;

/// <summary>
/// GitHub integatsiyasi — mod loyihasini GitHub ga push qilish.
/// 
/// Funksiyalar:
///   • Git repository yaratish (git init)
///   • README.md avtomatik generatsiya
///   • .gitignore yaratish (Minecraft mod uchun optimallashtirilgan)
///   • Commit va push
///   • GitHub CLI orqali remote repo yaratish (agar gh o'rnatilgan bo'lsa)
/// </summary>
public static class GitHubPublisher
{
    // ═══════════════════════════════════════════════════════════════════════
    // GIT REPOSITORY YARATISH
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Loyiha papkasida git repo yaratadi va birinchi commit qiladi.
    /// </summary>
    public static bool InitializeRepository(string projectPath, WorkspaceData workspace)
    {
        if (string.IsNullOrEmpty(projectPath) || workspace == null) return false;

        try
        {
            // 1. git init
            RunGitCommand(projectPath, "init");

            // 2. README.md yaratish
            string readme = GenerateReadme(workspace);
            File.WriteAllText(Path.Combine(projectPath, "README.md"), readme, Encoding.UTF8);

            // 3. .gitignore yaratish (agar mavjud bo'lmasa)
            string gitignorePath = Path.Combine(projectPath, ".gitignore");
            if (!File.Exists(gitignorePath))
            {
                File.WriteAllText(gitignorePath, GenerateGitignore(), Encoding.UTF8);
            }

            // 4. LICENSE fayli
            File.WriteAllText(Path.Combine(projectPath, "LICENSE"), GenerateMITLicense(workspace.modName), Encoding.UTF8);

            // 5. Birinchi commit
            RunGitCommand(projectPath, "add -A");
            RunGitCommand(projectPath, $"commit -m \"Initial commit: {workspace.modName} mod project\"");

            StudioLogger.Log($"[GitHub] Git repository muvaffaqiyatli yaratildi: {projectPath}");
            return true;
        }
        catch (Exception ex)
        {
            StudioLogger.LogError($"[GitHub] Repository yaratishda xatolik: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Mavjud o'zgarishlarni commit qiladi.
    /// </summary>
    public static bool CommitChanges(string projectPath, string message)
    {
        if (string.IsNullOrEmpty(projectPath)) return false;

        try
        {
            RunGitCommand(projectPath, "add -A");
            RunGitCommand(projectPath, $"commit -m \"{message}\"");
            StudioLogger.Log($"[GitHub] Commit: {message}");
            return true;
        }
        catch (Exception ex)
        {
            StudioLogger.LogError($"[GitHub] Commit xatolik: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Remote repository ga push qiladi.
    /// </summary>
    public static bool PushToRemote(string projectPath, string remoteName = "origin", string branch = "main")
    {
        try
        {
            string result = RunGitCommand(projectPath, $"push -u {remoteName} {branch}");
            StudioLogger.Log($"[GitHub] Push muvaffaqiyatli: {remoteName}/{branch}");
            return true;
        }
        catch (Exception ex)
        {
            StudioLogger.LogError($"[GitHub] Push xatolik: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// GitHub CLI orqali yangi remote repo yaratadi.
    /// gh CLI o'rnatilgan bo'lishi kerak.
    /// </summary>
    public static bool CreateRemoteRepository(string projectPath, string repoName, string description, bool isPrivate = false)
    {
        try
        {
            string visibility = isPrivate ? "--private" : "--public";
            string cmd = $"repo create {repoName} {visibility} --description \"{description}\" --source . --remote origin --push";
            string result = RunCommand(projectPath, "gh", cmd);
            StudioLogger.Log($"[GitHub] Remote repo yaratildi: {repoName}");
            return true;
        }
        catch (Exception ex)
        {
            StudioLogger.LogError($"[GitHub] Remote repo yaratishda xatolik (gh CLI o'rnatilganmi?): {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Remote URL ni qo'lda o'rnatish.
    /// </summary>
    public static void SetRemoteUrl(string projectPath, string url)
    {
        try
        {
            RunGitCommand(projectPath, $"remote add origin {url}");
        }
        catch
        {
            // remote allaqachon mavjud bo'lsa
            RunGitCommand(projectPath, $"remote set-url origin {url}");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // README GENERATSIYASI
    // ═══════════════════════════════════════════════════════════════════════

    public static string GenerateReadme(WorkspaceData workspace)
    {
        string modId = workspace.modId;
        string modName = workspace.modName;
        string mcVersion = workspace.mcVersion;
        string loader = workspace.modloader;

        StringBuilder sb = new StringBuilder();
        sb.AppendLine($"# {modName}");
        sb.AppendLine();
        sb.AppendLine($"A Minecraft {mcVersion} mod built with {loader}, created using **Mod Studio Desktop**.");
        sb.AppendLine();
        sb.AppendLine("## Features");
        sb.AppendLine();
        if (workspace.blocks.Count > 0) sb.AppendLine($"- **{workspace.blocks.Count}** custom blocks");
        if (workspace.items.Count > 0) sb.AppendLine($"- **{workspace.items.Count}** custom items");
        if (workspace.tools.Count > 0) sb.AppendLine($"- **{workspace.tools.Count}** custom tools");
        if (workspace.armors.Count > 0) sb.AppendLine($"- **{workspace.armors.Count}** armor pieces");
        if (workspace.entities.Count > 0) sb.AppendLine($"- **{workspace.entities.Count}** custom entities");
        if (workspace.recipes.Count > 0) sb.AppendLine($"- **{workspace.recipes.Count}** recipes");
        if (workspace.biomes.Count > 0) sb.AppendLine($"- **{workspace.biomes.Count}** custom biomes");
        sb.AppendLine();
        sb.AppendLine("## Requirements");
        sb.AppendLine();
        sb.AppendLine($"- Minecraft **{mcVersion}**");
        sb.AppendLine($"- {loader} Loader");

        var vData = StudioDatabase.GetVersionData(mcVersion);
        if (vData != null)
            sb.AppendLine($"- Java **{vData.requiredJavaVersion}**+");

        sb.AppendLine();
        sb.AppendLine("## Building");
        sb.AppendLine();
        sb.AppendLine("```bash");
        sb.AppendLine("./gradlew build");
        sb.AppendLine("```");
        sb.AppendLine();
        sb.AppendLine("The built jar will be in `build/libs/`.");
        sb.AppendLine();
        sb.AppendLine("## Development");
        sb.AppendLine();
        sb.AppendLine("```bash");
        sb.AppendLine("./gradlew runClient    # Run Minecraft with the mod");
        sb.AppendLine("./gradlew runDatagen   # Generate data files");
        sb.AppendLine("```");
        sb.AppendLine();
        sb.AppendLine("## License");
        sb.AppendLine();
        sb.AppendLine("MIT License — see [LICENSE](LICENSE) for details.");
        sb.AppendLine();
        sb.AppendLine("---");
        sb.AppendLine("*Generated with [Mod Studio Desktop](https://github.com/BobbleMMC/for-kiro)*");

        return sb.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════════════════════

    private static string GenerateGitignore()
    {
        return @"# Gradle
.gradle/
build/
!gradle/wrapper/gradle-wrapper.jar

# IDE
.idea/
*.iml
.vscode/
.eclipse/
.classpath
.project
.settings/

# OS
.DS_Store
Thumbs.db

# Mod Studio
*.mstudio.bak

# Runtime
run/
logs/
";
    }

    private static string GenerateMITLicense(string projectName)
    {
        int year = DateTime.Now.Year;
        return $@"MIT License

Copyright (c) {year} {projectName}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the ""Software""), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.";
    }

    private static string RunGitCommand(string workDir, string args)
    {
        return RunCommand(workDir, "git", args);
    }

    private static string RunCommand(string workDir, string command, string args)
    {
        ProcessStartInfo psi = new ProcessStartInfo
        {
            FileName = command,
            Arguments = args,
            WorkingDirectory = workDir,
            CreateNoWindow = true,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };

        using (Process p = Process.Start(psi))
        {
            string output = p.StandardOutput.ReadToEnd();
            string error = p.StandardError.ReadToEnd();
            p.WaitForExit(30000);

            if (p.ExitCode != 0 && !string.IsNullOrEmpty(error))
                throw new Exception(error);

            return output;
        }
    }
}
