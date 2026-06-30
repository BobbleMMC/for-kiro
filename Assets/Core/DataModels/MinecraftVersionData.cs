using System;
using System.Collections.Generic;

[System.Serializable]
public class BaseItemStats
{
    public int maxStackSize = 64;
    public float defaultToolDamage = 1.0f;
    public float defaultBlockHardness = 1.5f;
    public float defaultBlockResistance = 6.0f;
}

[System.Serializable]
public class MinecraftVersionData
{
    public string gameVersion;
    public List<string> supportedModloaders;
    public int requiredJavaVersion;
    public string versionChangelog;
    public BaseItemStats baseItemStats;
}

[System.Serializable]
public class VersionDatabaseWrapper
{
    public List<MinecraftVersionData> versions;
}
