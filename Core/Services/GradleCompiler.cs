using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;

public class GradleCompiler
{
    private Process _gradleProcess;
    private Action<string> _onLogReceived;
    private Action<string> _onErrorReceived;

    public GradleCompiler(Action<string> onLogReceived, Action<string> onErrorReceived)
    {
        _onLogReceived = onLogReceived;
        _onErrorReceived = onErrorReceived;
    }

    public void RunMinecraftClient(string projectPath, int targetJavaVersion)
    {
        // Loyiha papkasi mavjudligini tekshiramiz
        if (!Directory.Exists(projectPath))
        {
            _onErrorReceived?.Invoke($"[Xato] Loyiha papkasi topilmadi: {projectPath}");
            return;
        }

        // Operatsion tizimga mos Gradle faylini tanlaymiz
        string gradleExecutable = Application.platform == RuntimePlatform.WindowsEditor || 
                                   Application.platform == RuntimePlatform.WindowsPlayer 
                                   ? "gradlew.bat" : "./gradlew";

        string fullPathToGradle = Path.Combine(projectPath, gradleExecutable);

        if (!File.Exists(fullPathToGradle))
        {
            _onErrorReceived?.Invoke($"[Xato] Gradle fayli ({gradleExecutable}) topilmadi! Bu o'zi tayyor Minecraft Fabric loyihasimi?");
            return;
        }

        // Agar jarayon ishlayotgan bo'lsa, qayta ishga tushirmaymiz
        if (_gradleProcess != null && !_gradleProcess.HasExited)
        {
            _onLogReceived?.Invoke("[Tizim] Minecraft allaqachon ishlayapti yoki yuklanyapti...");
            return;
        }

        try
        {
            _gradleProcess = new Process();
            
            // Terminal sozlamalari
            _gradleProcess.StartInfo.FileName = Application.platform == RuntimePlatform.WindowsEditor || 
                                                 Application.platform == RuntimePlatform.WindowsPlayer 
                                                 ? "cmd.exe" : "/bin/bash";

            string arguments = Application.platform == RuntimePlatform.WindowsEditor || 
                               Application.platform == RuntimePlatform.WindowsPlayer
                               ? $"/c {gradleExecutable} runClient" 
                               : $"-c \"{gradleExecutable} runClient\"";

            _gradleProcess.StartInfo.Arguments = arguments;
            _gradleProcess.StartInfo.WorkingDirectory = projectPath;
            
            _gradleProcess.StartInfo.CreateNoWindow = true;
            _gradleProcess.StartInfo.UseShellExecute = false;

            // Stream loglarini yo'naltirish
            _gradleProcess.StartInfo.RedirectStandardOutput = true;
            _gradleProcess.StartInfo.RedirectStandardError = true;
            _gradleProcess.StartInfo.StandardOutputEncoding = Encoding.UTF8;
            _gradleProcess.StartInfo.StandardErrorEncoding = Encoding.UTF8;

            // Dinamik JAVA_HOME sozlash
            string javaPath = FindJavaPath(targetJavaVersion);
            if (!string.IsNullOrEmpty(javaPath))
            {
                _gradleProcess.StartInfo.EnvironmentVariables["JAVA_HOME"] = javaPath;
                _onLogReceived?.Invoke($"[Tizim] JAVA_HOME o'rnatildi: {javaPath} (Java {targetJavaVersion})");
            }
            else
            {
                _onLogReceived?.Invoke($"[Ogohlantirish] Java {targetJavaVersion} topilmadi. Tizim standart Java versiyasidan foydalanadi.");
            }

            // Log qabul qilish voqealari
            _gradleProcess.OutputDataReceived += (sender, args) => {
                if (!string.IsNullOrEmpty(args.Data)) _onLogReceived?.Invoke(args.Data);
            };
            
            _gradleProcess.ErrorDataReceived += (sender, args) => {
                if (!string.IsNullOrEmpty(args.Data)) _onErrorReceived?.Invoke(args.Data);
            };

            // Ishga tushirish
            _gradleProcess.Start();
            
            _gradleProcess.BeginOutputReadLine();
            _gradleProcess.BeginErrorReadLine();

            _onLogReceived?.Invoke("[Tizim] Gradle jarayoni boshlandi. Minecraft yuklanmoqda...");
        }
        catch (Exception ex)
        {
            _onErrorReceived?.Invoke($"[Xato] Terminalni ishga tushirishda kutilmagan xatolik: {ex.Message}");
        }
    }

    public void StopProcess()
    {
        if (_gradleProcess != null && !_gradleProcess.HasExited)
        {
            _gradleProcess.Kill();
            _onLogReceived?.Invoke("[Tizim] Minecraft jarayoni majburiy to'xtatildi.");
        }
    }

    public static string FindJavaPath(int version)
    {
        // 1. Ekologik maxsus o'zgaruvchini tekshiramiz (masalan: JAVA_HOME_21)
        string envName = $"JAVA_HOME_{version}";
        string path = Environment.GetEnvironmentVariable(envName);
        if (!string.IsNullOrEmpty(path) && Directory.Exists(path))
        {
            return path;
        }

        // 2. Standart JAVA_HOME o'zgaruvchisi versiyaga mos kelishini tekshiramiz
        string stdJavaHome = Environment.GetEnvironmentVariable("JAVA_HOME");
        if (!string.IsNullOrEmpty(stdJavaHome) && Directory.Exists(stdJavaHome))
        {
            if (stdJavaHome.ToLower().Contains(version.ToString()))
            {
                return stdJavaHome;
            }
        }

        // 3. Tizimdagi odatiy o'rnatish papkalarini qidiramiz
        if (Application.platform == RuntimePlatform.WindowsEditor || Application.platform == RuntimePlatform.WindowsPlayer)
        {
            string[] searchPaths = {
                @"C:\Program Files\Java",
                @"C:\Program Files\Eclipse Adoptium",
                @"C:\Program Files\Semeru",
                @"C:\Program Files (x86)\Java"
            };

            foreach (var searchPath in searchPaths)
            {
                if (Directory.Exists(searchPath))
                {
                    var dirs = Directory.GetDirectories(searchPath);
                    foreach (var dir in dirs)
                    {
                        string name = Path.GetFileName(dir).ToLower();
                        if (name.Contains(version.ToString()) || name.Contains($"jdk-{version}") || name.Contains($"jdk{version}"))
                        {
                            return dir;
                        }
                    }
                }
            }
        }
        else // macOS va Linux uchun yo'laklar
        {
            string[] macPaths = {
                $"/Library/Java/JavaVirtualMachines/openjdk-{version}.jdk/Contents/Home",
                $"/Library/Java/JavaVirtualMachines/adoptopenjdk-{version}.jdk/Contents/Home",
                $"/Library/Java/JavaVirtualMachines/zulu-{version}.jdk/Contents/Home"
            };
            foreach (var p in macPaths)
            {
                if (Directory.Exists(p)) return p;
            }

            string linuxPath = $"/usr/lib/jvm/java-{version}-openjdk-amd64";
            if (Directory.Exists(linuxPath)) return linuxPath;
        }

        return stdJavaHome; // Topilmasa tizim standartini qaytaramiz
    }
}
