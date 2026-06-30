using System;
using System.Collections.Generic;

[System.Serializable]
public class WorkspaceData
{
    public string modId = "mymod";
    public string modName = "My Epic Mod";
    public string mcVersion = "1.20.1";
    public string modloader = "Fabric";

    public List<BlockDataModel> blocks = new List<BlockDataModel>();
    public List<ItemDataModel> items = new List<ItemDataModel>();
    public List<ToolDataModel> tools = new List<ToolDataModel>();
    public List<ArmorDataModel> armors = new List<ArmorDataModel>();
    public List<RecipeDataModel> recipes = new List<RecipeDataModel>();
    public List<EntityDataModel> entities = new List<EntityDataModel>();
    public List<BiomeDataModel> biomes = new List<BiomeDataModel>();
    public List<CreativeTabDataModel> creativeTabs = new List<CreativeTabDataModel>();
}
