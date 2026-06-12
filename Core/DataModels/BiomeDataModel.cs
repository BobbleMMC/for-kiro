using System;

[System.Serializable]
public class BiomeDataModel
{
    public string biomeId = "ruby_plains";
    public string displayName = "Ruby Plains";
    public bool precipitation = true;
    public float temperature = 0.8f;
    public string skyColor = "#78A2FF";
    public string grassColor = "#91FF8A";
    public string waterColor = "#3F76E4";
    public string fogColor = "#C0D8FF";
    public string textureNamespace = "mymod";

    private int HexToDecimal(string hex)
    {
        hex = hex.Replace("#", "").Trim();
        try
        {
            return Convert.ToInt32(hex, 16);
        }
        catch
        {
            return 0;
        }
    }

    public string GenerateFabricCode()
    {
        string precValue = precipitation ? "rain" : "none";
        int skyDec = HexToDecimal(skyColor);
        int grassDec = HexToDecimal(grassColor);
        int waterDec = HexToDecimal(waterColor);
        int fogDec = HexToDecimal(fogColor);

        return $@"{{
  ""precipitation"": ""{precValue}"",
  ""temperature"": {temperature.ToString("0.0")},
  ""downfall"": 0.4,
  ""effects"": {{
    ""sky_color"": {skyDec},
    ""fog_color"": {fogDec},
    ""water_color"": {waterDec},
    ""water_fog_color"": {waterDec},
    ""grass_color"": {grassDec}
  }}
}}";
    }

    public string GenerateLanguageJson()
    {
        return $@"{{
  ""biome.{textureNamespace}.{biomeId}"": ""{displayName}""
}}";
    }
}
