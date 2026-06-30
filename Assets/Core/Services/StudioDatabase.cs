using System;
using System.IO;
using System.Collections.Generic;
using UnityEngine;

// --- ASOSIY MA'LUMOTLAR BAZASI MOTORI ---

public static class StudioDatabase
{
    private static List<MinecraftVersionData> _versions = new List<MinecraftVersionData>();
    private static bool _initialized = false;
    private static readonly object _lock = new object();

    // UI Dropdown'lar avtomatik ro'yxatni bazadan dinamik olishi uchun yangi xususiyatlar (Gibrid ulanish)
    public static List<string> AvailableVersions
    {
        get
        {
            List<string> list = new List<string>();
            foreach (var v in Versions)
            {
                if (!list.Contains(v.gameVersion)) list.Add(v.gameVersion);
            }
            return list;
        }
    }

    public static List<string> Modloaders
    {
        get
        {
            List<string> list = new List<string>();
            foreach (var v in Versions)
            {
                foreach (var m in v.supportedModloaders)
                {
                    if (!list.Contains(m)) list.Add(m);
                }
            }
            // Agar baza bo'sh bo'lsa, fallback standart qiymat qaytaradi
            if (list.Count == 0) list.AddRange(new string[] { "Fabric", "NeoForge" });
            return list;
        }
    }

    public static List<MinecraftVersionData> Versions
    {
        get
        {
            lock (_lock)
            {
                if (!_initialized) Initialize();
                return _versions;
            }
        }
    }

    public static void Initialize()
    {
        if (_initialized) return;

        string dir = Application.streamingAssetsPath;
        string jsonPath = Path.Combine(dir, "version_database.json");

        if (File.Exists(jsonPath))
        {
            try
            {
                string jsonText = File.ReadAllText(jsonPath);
                VersionDatabaseWrapper wrapper = JsonUtility.FromJson<VersionDatabaseWrapper>(jsonText);
                if (wrapper != null && wrapper.versions != null && wrapper.versions.Count > 0)
                {
                    _versions = wrapper.versions;
                    _initialized = true;
                    return;
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[StudioDatabase] JSON yuklashda xatolik: {ex.Message}");
            }
        }

        // Fallback static data
        PopulateDefaultData();
        _initialized = true;
    }

    private static void PopulateDefaultData()
    {
        _versions = new List<MinecraftVersionData>
        {
            new MinecraftVersionData 
            { 
                gameVersion = "1.20.1", 
                supportedModloaders = new List<string> { "Fabric", "NeoForge", "Forge", "Quilt" }, 
                requiredJavaVersion = 17, 
                versionChangelog = "• Fabric API ro'yxatga olish standartlari barqaror.\n• Java 17 talab qilinadi.\n• NeoForge birinchi eksperimental versiyasi qo'llab-quvvatlanadi.\n• Quilt to'liq mos.", 
                baseItemStats = new BaseItemStats { maxStackSize = 64, defaultToolDamage = 2.0f, defaultBlockHardness = 1.5f, defaultBlockResistance = 6.0f } 
            },
            new MinecraftVersionData 
            { 
                gameVersion = "1.20.4", 
                supportedModloaders = new List<string> { "Fabric", "NeoForge" }, 
                requiredJavaVersion = 17, 
                versionChangelog = "• NeoForge modloader barqaror o'tishni boshladi.\n• Java 17 talab qilinadi.\n• Mojang ba'zi ichki klasslarni o'zgartirdi.", 
                baseItemStats = new BaseItemStats { maxStackSize = 64, defaultToolDamage = 2.5f, defaultBlockHardness = 2.0f, defaultBlockResistance = 8.0f } 
            },
            new MinecraftVersionData 
            { 
                gameVersion = "1.20.6", 
                supportedModloaders = new List<string> { "Fabric", "NeoForge" }, 
                requiredJavaVersion = 21, 
                versionChangelog = "• DIQQAT: Java 21 talab qilinadi!\n• Item Components tizimi debyut qildi (eski NBT o'rniga).\n• Yangi atributlar va API yangilanishlari.", 
                baseItemStats = new BaseItemStats { maxStackSize = 99, defaultToolDamage = 3.0f, defaultBlockHardness = 2.5f, defaultBlockResistance = 10.0f } 
            },
            new MinecraftVersionData 
            { 
                gameVersion = "1.21", 
                supportedModloaders = new List<string> { "Fabric", "NeoForge", "Quilt" }, 
                requiredJavaVersion = 21, 
                versionChangelog = "• DIQQAT: Java 21 talab qilinadi!\n• Trial Chambers bloklari va Trial Spawner tizimi qo'shildi.\n• NeoForge API modloader to'liq barqarorlashdi.\n• Item model JSON tuzilishi yangilandi.", 
                baseItemStats = new BaseItemStats { maxStackSize = 99, defaultToolDamage = 3.5f, defaultBlockHardness = 3.0f, defaultBlockResistance = 12.0f } 
            },
            new MinecraftVersionData 
            { 
                gameVersion = "1.21.1", 
                supportedModloaders = new List<string> { "Fabric", "NeoForge", "Quilt" }, 
                requiredJavaVersion = 21, 
                versionChangelog = "• 1.21 ning barqaror xotira tuzatishlari.\n• NeoForge 21.1.x seriyasi.\n• Trial Chamber loot jadvallari yangilandi.\n• Fabric API barqaror.", 
                baseItemStats = new BaseItemStats { maxStackSize = 99, defaultToolDamage = 3.5f, defaultBlockHardness = 3.0f, defaultBlockResistance = 12.0f } 
            },
            new MinecraftVersionData 
            { 
                gameVersion = "1.21.3", 
                supportedModloaders = new List<string> { "Fabric", "NeoForge" }, 
                requiredJavaVersion = 21, 
                versionChangelog = "• Pale Garden biomi va Creaking mob qo'shildi.\n• Yangi bloklar: Pale Oak, Eyeblossom.\n• Rendering tizimi optimizatsiya qilindi.\n• Data Pack format yangilandi.", 
                baseItemStats = new BaseItemStats { maxStackSize = 99, defaultToolDamage = 3.5f, defaultBlockHardness = 3.0f, defaultBlockResistance = 12.0f } 
            },
            new MinecraftVersionData 
            { 
                gameVersion = "1.21.4", 
                supportedModloaders = new List<string> { "Fabric", "NeoForge", "Quilt" }, 
                requiredJavaVersion = 21, 
                versionChangelog = "• Item model tizimi to'liq qayta yozildi (JSON model format v2).\n• Yangi rendering pipeline.\n• Equipment modeli qo'shildi.\n• Server-side optimizatsiyalar.\n• Pack format 46.", 
                baseItemStats = new BaseItemStats { maxStackSize = 99, defaultToolDamage = 4.0f, defaultBlockHardness = 3.0f, defaultBlockResistance = 12.0f } 
            },
            new MinecraftVersionData 
            { 
                gameVersion = "1.22", 
                supportedModloaders = new List<string> { "Fabric", "NeoForge" }, 
                requiredJavaVersion = 21, 
                versionChangelog = "• Yangi dunyolar va biomlar kengaytmasi.\n• Yangi AI va pathfinding tizimi.\n• Data-driven enchantments.\n• Performance yaxshilanishlari.\n• Pack format 48.", 
                baseItemStats = new BaseItemStats { maxStackSize = 99, defaultToolDamage = 4.0f, defaultBlockHardness = 3.5f, defaultBlockResistance = 14.0f } 
            }
        };
        WriteDefaultJson();
    }

    private static void WriteDefaultJson()
    {
        try
        {
            string dir = Application.streamingAssetsPath;
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            string jsonPath = Path.Combine(dir, "version_database.json");
            if (!File.Exists(jsonPath))
            {
                VersionDatabaseWrapper wrapper = new VersionDatabaseWrapper { versions = _versions };
                string jsonText = JsonUtility.ToJson(wrapper, true);
                File.WriteAllText(jsonPath, jsonText);
                Debug.Log($"[StudioDatabase] Standart JSON yaratildi: {jsonPath}");
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"[StudioDatabase] JSON yozishda xatolik: {ex.Message}");
        }
    }

    public static MinecraftVersionData GetVersionData(string version)
    {
        return Versions.Find(v => v.gameVersion == version);
    }
}
