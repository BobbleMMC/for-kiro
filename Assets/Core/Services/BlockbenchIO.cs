using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using UnityEngine;

/// <summary>
/// Blockbench JSON model formatini import va export qiladi.
/// Blockbench — eng mashhur Minecraft model editor.
/// 
/// Format qo'llab-quvvatlash:
///   • .bbmodel (Blockbench native — to'liq metadata bilan)
///   • Minecraft Java Edition block/item model JSON (export only)
///   
/// Import: Blockbench JSON → MultiCuboidModelData
/// Export: MultiCuboidModelData → Blockbench JSON / MC Model JSON
/// </summary>
public static class BlockbenchIO
{
    // ═══════════════════════════════════════════════════════════════════════
    // IMPORT: Blockbench JSON → MultiCuboidModelData
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Blockbench .bbmodel JSON ni parse qilib MultiCuboidModelData ga aylantiradi.
    /// </summary>
    public static MultiCuboidModelData ImportFromBlockbench(string jsonText)
    {
        if (string.IsNullOrEmpty(jsonText)) return null;

        try
        {
            var model = new MultiCuboidModelData();

            // Unity JsonUtility Blockbench formatini to'g'ridan-to'g'ri parse qila olmaydi,
            // shuning uchun qo'lda lightweight parsing ishlatamiz.

            // Model nomi
            model.modelName = ExtractStringValue(jsonText, "name") ?? "imported_model";

            // Tekstura o'lchami
            model.textureWidth = ExtractIntValue(jsonText, "resolution", "width", 64);
            model.textureHeight = ExtractIntValue(jsonText, "resolution", "height", 64);

            // Elementlarni parse qilish
            string elementsBlock = ExtractArrayBlock(jsonText, "elements");
            if (!string.IsNullOrEmpty(elementsBlock))
            {
                var elementJsons = SplitJsonObjects(elementsBlock);
                foreach (string elemJson in elementJsons)
                {
                    var element = ParseElement(elemJson, model.textureWidth, model.textureHeight);
                    if (element != null)
                        model.elements.Add(element);
                }
            }

            // Tekstura yo'llarini parse qilish
            string texturesBlock = ExtractArrayBlock(jsonText, "textures");
            if (!string.IsNullOrEmpty(texturesBlock))
            {
                var textureJsons = SplitJsonObjects(texturesBlock);
                foreach (string texJson in textureJsons)
                {
                    string texName = ExtractStringValue(texJson, "name");
                    if (!string.IsNullOrEmpty(texName))
                        model.texturePaths.Add(texName);
                }
            }

            // Display sozlamalarini parse qilish
            ParseDisplaySettings(jsonText, model);

            StudioLogger.Log($"[Blockbench] Import muvaffaqiyatli: {model.modelName} ({model.elements.Count} element)");
            return model;
        }
        catch (Exception ex)
        {
            StudioLogger.LogError($"[Blockbench] Import xatolik: {ex.Message}");
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EXPORT: MultiCuboidModelData → Blockbench .bbmodel JSON
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// MultiCuboidModelData ni Blockbench .bbmodel JSON formatiga export qiladi.
    /// </summary>
    public static string ExportToBlockbench(MultiCuboidModelData model)
    {
        if (model == null) return "{}";

        StringBuilder sb = new StringBuilder();
        sb.AppendLine("{");
        sb.AppendLine($"  \"meta\": {{");
        sb.AppendLine($"    \"format_version\": \"4.5\",");
        sb.AppendLine($"    \"model_format\": \"java_block\",");
        sb.AppendLine($"    \"box_uv\": false");
        sb.AppendLine($"  }},");
        sb.AppendLine($"  \"name\": \"{model.modelName}\",");

        // Resolution
        sb.AppendLine($"  \"resolution\": {{");
        sb.AppendLine($"    \"width\": {model.textureWidth},");
        sb.AppendLine($"    \"height\": {model.textureHeight}");
        sb.AppendLine($"  }},");

        // Elements
        sb.AppendLine($"  \"elements\": [");
        for (int i = 0; i < model.elements.Count; i++)
        {
            var elem = model.elements[i];
            string comma = i < model.elements.Count - 1 ? "," : "";

            sb.AppendLine($"    {{");
            sb.AppendLine($"      \"name\": \"{elem.name}\",");
            sb.AppendLine($"      \"from\": [{F(elem.from.x)}, {F(elem.from.y)}, {F(elem.from.z)}],");
            sb.AppendLine($"      \"to\": [{F(elem.to.x)}, {F(elem.to.y)}, {F(elem.to.z)}],");

            // Rotation (agar bor bo'lsa)
            if (elem.rotation != Vector3.zero)
            {
                string axis = "y";
                float angle = elem.rotation.y;
                if (Mathf.Abs(elem.rotation.x) > 0.01f) { axis = "x"; angle = elem.rotation.x; }
                else if (Mathf.Abs(elem.rotation.z) > 0.01f) { axis = "z"; angle = elem.rotation.z; }

                sb.AppendLine($"      \"rotation\": {{");
                sb.AppendLine($"        \"angle\": {F(angle)},");
                sb.AppendLine($"        \"axis\": \"{axis}\",");
                sb.AppendLine($"        \"origin\": [{F(elem.pivot.x)}, {F(elem.pivot.y)}, {F(elem.pivot.z)}]");
                sb.AppendLine($"      }},");
            }

            // Faces
            sb.AppendLine($"      \"faces\": {{");
            sb.AppendLine($"        \"north\": {{ \"uv\": [{F(elem.uvNorth.x)}, {F(elem.uvNorth.y)}, {F(elem.uvNorth.xMax)}, {F(elem.uvNorth.yMax)}], \"texture\": {elem.textureIndex} }},");
            sb.AppendLine($"        \"south\": {{ \"uv\": [{F(elem.uvSouth.x)}, {F(elem.uvSouth.y)}, {F(elem.uvSouth.xMax)}, {F(elem.uvSouth.yMax)}], \"texture\": {elem.textureIndex} }},");
            sb.AppendLine($"        \"east\":  {{ \"uv\": [{F(elem.uvEast.x)}, {F(elem.uvEast.y)}, {F(elem.uvEast.xMax)}, {F(elem.uvEast.yMax)}], \"texture\": {elem.textureIndex} }},");
            sb.AppendLine($"        \"west\":  {{ \"uv\": [{F(elem.uvWest.x)}, {F(elem.uvWest.y)}, {F(elem.uvWest.xMax)}, {F(elem.uvWest.yMax)}], \"texture\": {elem.textureIndex} }},");
            sb.AppendLine($"        \"up\":    {{ \"uv\": [{F(elem.uvUp.x)}, {F(elem.uvUp.y)}, {F(elem.uvUp.xMax)}, {F(elem.uvUp.yMax)}], \"texture\": {elem.textureIndex} }},");
            sb.AppendLine($"        \"down\":  {{ \"uv\": [{F(elem.uvDown.x)}, {F(elem.uvDown.y)}, {F(elem.uvDown.xMax)}, {F(elem.uvDown.yMax)}], \"texture\": {elem.textureIndex} }}");
            sb.AppendLine($"      }}");
            sb.AppendLine($"    }}{comma}");
        }
        sb.AppendLine($"  ],");

        // Textures
        sb.AppendLine($"  \"textures\": [");
        for (int i = 0; i < model.texturePaths.Count; i++)
        {
            string comma = i < model.texturePaths.Count - 1 ? "," : "";
            sb.AppendLine($"    {{ \"name\": \"{model.texturePaths[i]}\", \"id\": \"{i}\" }}{comma}");
        }
        sb.AppendLine($"  ]");

        sb.AppendLine("}");
        return sb.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EXPORT: MultiCuboidModelData → Minecraft Java Model JSON
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Minecraft Java Edition block/item model JSON formatida export qiladi.
    /// Bu format o'yinda to'g'ridan-to'g'ri ishlatiladi.
    /// </summary>
    public static string ExportToMinecraftModelJson(MultiCuboidModelData model, string textureNamespace, string parentModel = "block/block")
    {
        if (model == null) return "{}";

        StringBuilder sb = new StringBuilder();
        sb.AppendLine("{");
        sb.AppendLine($"  \"parent\": \"{parentModel}\",");

        // Textures
        sb.AppendLine($"  \"textures\": {{");
        if (model.texturePaths.Count > 0)
        {
            for (int i = 0; i < model.texturePaths.Count; i++)
            {
                string texName = model.texturePaths[i].Replace(".png", "");
                string comma = i < model.texturePaths.Count - 1 ? "," : "";
                sb.AppendLine($"    \"{i}\": \"{textureNamespace}:block/{texName}\"{comma}");
            }
        }
        else
        {
            sb.AppendLine($"    \"0\": \"{textureNamespace}:block/{model.modelName}\"");
        }
        sb.AppendLine($"  }},");

        // Elements
        sb.AppendLine($"  \"elements\": [");
        for (int i = 0; i < model.elements.Count; i++)
        {
            var elem = model.elements[i];
            string comma = i < model.elements.Count - 1 ? "," : "";

            sb.AppendLine($"    {{");
            sb.AppendLine($"      \"from\": [{F(elem.from.x)}, {F(elem.from.y)}, {F(elem.from.z)}],");
            sb.AppendLine($"      \"to\": [{F(elem.to.x)}, {F(elem.to.y)}, {F(elem.to.z)}],");

            // Rotation
            if (elem.rotation != Vector3.zero)
            {
                string axis = "y";
                float angle = elem.rotation.y;
                if (Mathf.Abs(elem.rotation.x) > 0.01f) { axis = "x"; angle = elem.rotation.x; }
                else if (Mathf.Abs(elem.rotation.z) > 0.01f) { axis = "z"; angle = elem.rotation.z; }

                sb.AppendLine($"      \"rotation\": {{");
                sb.AppendLine($"        \"angle\": {F(angle)},");
                sb.AppendLine($"        \"axis\": \"{axis}\",");
                sb.AppendLine($"        \"origin\": [{F(elem.pivot.x)}, {F(elem.pivot.y)}, {F(elem.pivot.z)}]");
                sb.AppendLine($"      }},");
            }

            // Faces
            string texIdx = $"#{elem.textureIndex}";
            sb.AppendLine($"      \"faces\": {{");
            sb.AppendLine($"        \"north\": {{ \"uv\": [{F(elem.uvNorth.x)}, {F(elem.uvNorth.y)}, {F(elem.uvNorth.xMax)}, {F(elem.uvNorth.yMax)}], \"texture\": \"{texIdx}\" }},");
            sb.AppendLine($"        \"south\": {{ \"uv\": [{F(elem.uvSouth.x)}, {F(elem.uvSouth.y)}, {F(elem.uvSouth.xMax)}, {F(elem.uvSouth.yMax)}], \"texture\": \"{texIdx}\" }},");
            sb.AppendLine($"        \"east\":  {{ \"uv\": [{F(elem.uvEast.x)}, {F(elem.uvEast.y)}, {F(elem.uvEast.xMax)}, {F(elem.uvEast.yMax)}], \"texture\": \"{texIdx}\" }},");
            sb.AppendLine($"        \"west\":  {{ \"uv\": [{F(elem.uvWest.x)}, {F(elem.uvWest.y)}, {F(elem.uvWest.xMax)}, {F(elem.uvWest.yMax)}], \"texture\": \"{texIdx}\" }},");
            sb.AppendLine($"        \"up\":    {{ \"uv\": [{F(elem.uvUp.x)}, {F(elem.uvUp.y)}, {F(elem.uvUp.xMax)}, {F(elem.uvUp.yMax)}], \"texture\": \"{texIdx}\" }},");
            sb.AppendLine($"        \"down\":  {{ \"uv\": [{F(elem.uvDown.x)}, {F(elem.uvDown.y)}, {F(elem.uvDown.xMax)}, {F(elem.uvDown.yMax)}], \"texture\": \"{texIdx}\" }}");
            sb.AppendLine($"      }}");
            sb.AppendLine($"    }}{comma}");
        }
        sb.AppendLine($"  ],");

        // Display
        sb.AppendLine($"  \"display\": {{");
        sb.AppendLine($"    \"gui\": {{");
        sb.AppendLine($"      \"rotation\": [{F(model.displayGuiRotation.x)}, {F(model.displayGuiRotation.y)}, {F(model.displayGuiRotation.z)}],");
        sb.AppendLine($"      \"translation\": [{F(model.displayGuiTranslation.x)}, {F(model.displayGuiTranslation.y)}, {F(model.displayGuiTranslation.z)}],");
        sb.AppendLine($"      \"scale\": [{F(model.displayGuiScale.x)}, {F(model.displayGuiScale.y)}, {F(model.displayGuiScale.z)}]");
        sb.AppendLine($"    }},");
        sb.AppendLine($"    \"thirdperson_righthand\": {{");
        sb.AppendLine($"      \"rotation\": [{F(model.displayHandRotation.x)}, {F(model.displayHandRotation.y)}, {F(model.displayHandRotation.z)}],");
        sb.AppendLine($"      \"translation\": [{F(model.displayHandTranslation.x)}, {F(model.displayHandTranslation.y)}, {F(model.displayHandTranslation.z)}],");
        sb.AppendLine($"      \"scale\": [{F(model.displayHandScale.x)}, {F(model.displayHandScale.y)}, {F(model.displayHandScale.z)}]");
        sb.AppendLine($"    }}");
        sb.AppendLine($"  }}");

        sb.AppendLine("}");
        return sb.ToString();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LIGHTWEIGHT JSON PARSER HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private static CuboidElement ParseElement(string json, int texW, int texH)
    {
        var elem = new CuboidElement();

        elem.name = ExtractStringValue(json, "name") ?? "cube";

        // from/to
        float[] fromArr = ExtractFloatArray(json, "from");
        float[] toArr = ExtractFloatArray(json, "to");

        if (fromArr != null && fromArr.Length >= 3)
            elem.from = new Vector3(fromArr[0], fromArr[1], fromArr[2]);
        if (toArr != null && toArr.Length >= 3)
            elem.to = new Vector3(toArr[0], toArr[1], toArr[2]);

        // rotation
        string rotBlock = ExtractObjectBlock(json, "rotation");
        if (!string.IsNullOrEmpty(rotBlock))
        {
            float angle = ExtractFloatValue(rotBlock, "angle");
            string axis = ExtractStringValue(rotBlock, "axis") ?? "y";
            float[] origin = ExtractFloatArray(rotBlock, "origin");

            if (origin != null && origin.Length >= 3)
                elem.pivot = new Vector3(origin[0], origin[1], origin[2]);

            switch (axis)
            {
                case "x": elem.rotation = new Vector3(angle, 0, 0); break;
                case "y": elem.rotation = new Vector3(0, angle, 0); break;
                case "z": elem.rotation = new Vector3(0, 0, angle); break;
            }
        }

        // faces UV
        string facesBlock = ExtractObjectBlock(json, "faces");
        if (!string.IsNullOrEmpty(facesBlock))
        {
            elem.uvNorth = ParseFaceUV(facesBlock, "north");
            elem.uvSouth = ParseFaceUV(facesBlock, "south");
            elem.uvEast = ParseFaceUV(facesBlock, "east");
            elem.uvWest = ParseFaceUV(facesBlock, "west");
            elem.uvUp = ParseFaceUV(facesBlock, "up");
            elem.uvDown = ParseFaceUV(facesBlock, "down");
        }
        else
        {
            // Auto UV (element o'lchamiga qarab)
            Vector3 size = elem.to - elem.from;
            elem.uvNorth = new Rect(0, 0, size.x, size.y);
            elem.uvSouth = new Rect(0, 0, size.x, size.y);
            elem.uvEast = new Rect(0, 0, size.z, size.y);
            elem.uvWest = new Rect(0, 0, size.z, size.y);
            elem.uvUp = new Rect(0, 0, size.x, size.z);
            elem.uvDown = new Rect(0, 0, size.x, size.z);
        }

        return elem;
    }

    private static Rect ParseFaceUV(string facesBlock, string faceName)
    {
        string faceBlock = ExtractObjectBlock(facesBlock, faceName);
        if (string.IsNullOrEmpty(faceBlock)) return new Rect(0, 0, 16, 16);

        float[] uv = ExtractFloatArray(faceBlock, "uv");
        if (uv != null && uv.Length >= 4)
            return new Rect(uv[0], uv[1], uv[2] - uv[0], uv[3] - uv[1]);

        return new Rect(0, 0, 16, 16);
    }

    private static void ParseDisplaySettings(string json, MultiCuboidModelData model)
    {
        string displayBlock = ExtractObjectBlock(json, "display");
        if (string.IsNullOrEmpty(displayBlock)) return;

        string guiBlock = ExtractObjectBlock(displayBlock, "gui");
        if (!string.IsNullOrEmpty(guiBlock))
        {
            float[] rot = ExtractFloatArray(guiBlock, "rotation");
            float[] trans = ExtractFloatArray(guiBlock, "translation");
            float[] scale = ExtractFloatArray(guiBlock, "scale");

            if (rot != null && rot.Length >= 3)
                model.displayGuiRotation = new Vector3(rot[0], rot[1], rot[2]);
            if (trans != null && trans.Length >= 3)
                model.displayGuiTranslation = new Vector3(trans[0], trans[1], trans[2]);
            if (scale != null && scale.Length >= 3)
                model.displayGuiScale = new Vector3(scale[0], scale[1], scale[2]);
        }
    }

    // ── Minimal JSON extraction utilities ─────────────────────────────────

    private static string ExtractStringValue(string json, string key)
    {
        string pattern = $"\"{key}\"";
        int idx = json.IndexOf(pattern);
        if (idx < 0) return null;

        idx = json.IndexOf(":", idx + pattern.Length);
        if (idx < 0) return null;

        int start = json.IndexOf("\"", idx + 1);
        if (start < 0) return null;

        int end = json.IndexOf("\"", start + 1);
        if (end < 0) return null;

        return json.Substring(start + 1, end - start - 1);
    }

    private static float ExtractFloatValue(string json, string key)
    {
        string pattern = $"\"{key}\"";
        int idx = json.IndexOf(pattern);
        if (idx < 0) return 0;

        idx = json.IndexOf(":", idx + pattern.Length);
        if (idx < 0) return 0;

        StringBuilder numSb = new StringBuilder();
        for (int i = idx + 1; i < json.Length; i++)
        {
            char c = json[i];
            if (c == '-' || c == '.' || char.IsDigit(c))
                numSb.Append(c);
            else if (numSb.Length > 0)
                break;
        }

        if (float.TryParse(numSb.ToString(), NumberStyles.Float, CultureInfo.InvariantCulture, out float result))
            return result;
        return 0;
    }

    private static int ExtractIntValue(string json, string outerKey, string innerKey, int defaultVal)
    {
        string block = ExtractObjectBlock(json, outerKey);
        if (string.IsNullOrEmpty(block)) return defaultVal;

        float val = ExtractFloatValue(block, innerKey);
        return val > 0 ? (int)val : defaultVal;
    }

    private static float[] ExtractFloatArray(string json, string key)
    {
        string pattern = $"\"{key}\"";
        int idx = json.IndexOf(pattern);
        if (idx < 0) return null;

        int arrStart = json.IndexOf("[", idx);
        int arrEnd = json.IndexOf("]", arrStart);
        if (arrStart < 0 || arrEnd < 0) return null;

        string arrContent = json.Substring(arrStart + 1, arrEnd - arrStart - 1);
        string[] parts = arrContent.Split(',');

        List<float> result = new List<float>();
        foreach (string part in parts)
        {
            if (float.TryParse(part.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out float val))
                result.Add(val);
        }

        return result.Count > 0 ? result.ToArray() : null;
    }

    private static string ExtractObjectBlock(string json, string key)
    {
        string pattern = $"\"{key}\"";
        int idx = json.IndexOf(pattern);
        if (idx < 0) return null;

        int braceStart = json.IndexOf("{", idx + pattern.Length);
        if (braceStart < 0) return null;

        int depth = 0;
        for (int i = braceStart; i < json.Length; i++)
        {
            if (json[i] == '{') depth++;
            else if (json[i] == '}') depth--;
            if (depth == 0) return json.Substring(braceStart, i - braceStart + 1);
        }
        return null;
    }

    private static string ExtractArrayBlock(string json, string key)
    {
        string pattern = $"\"{key}\"";
        int idx = json.IndexOf(pattern);
        if (idx < 0) return null;

        int arrStart = json.IndexOf("[", idx + pattern.Length);
        if (arrStart < 0) return null;

        int depth = 0;
        for (int i = arrStart; i < json.Length; i++)
        {
            if (json[i] == '[') depth++;
            else if (json[i] == ']') depth--;
            if (depth == 0) return json.Substring(arrStart + 1, i - arrStart - 1);
        }
        return null;
    }

    private static List<string> SplitJsonObjects(string arrayContent)
    {
        var objects = new List<string>();
        int depth = 0;
        int start = -1;

        for (int i = 0; i < arrayContent.Length; i++)
        {
            if (arrayContent[i] == '{')
            {
                if (depth == 0) start = i;
                depth++;
            }
            else if (arrayContent[i] == '}')
            {
                depth--;
                if (depth == 0 && start >= 0)
                {
                    objects.Add(arrayContent.Substring(start, i - start + 1));
                    start = -1;
                }
            }
        }
        return objects;
    }

    private static string F(float v) => v.ToString("0.##", CultureInfo.InvariantCulture);
}
