using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Bitta kuboid element ma'lumotlari — Blockbench element formatiga mos.
/// Pozitsiya, o'lcham, aylanish, pivot va UV koordinatalari saqlaydi.
/// </summary>
[System.Serializable]
public class CuboidElement
{
    public string name = "cube";
    
    // Pozitsiya va o'lcham (Minecraft piksellarida: 16px = 1 blok)
    public Vector3 from = new Vector3(0, 0, 0);   // Pastki-chap-orqa burchak
    public Vector3 to = new Vector3(16, 16, 16);   // Yuqori-o'ng-oldi burchak
    
    // Aylanish (Blockbench uslubida)
    public Vector3 rotation = Vector3.zero;
    public Vector3 pivot = new Vector3(8, 8, 8); // Aylanish markazi
    
    // Har bir yuza uchun UV (pikselda, atlas ichida)
    public Rect uvNorth = new Rect(0, 0, 16, 16);
    public Rect uvSouth = new Rect(0, 0, 16, 16);
    public Rect uvEast  = new Rect(0, 0, 16, 16);
    public Rect uvWest  = new Rect(0, 0, 16, 16);
    public Rect uvUp    = new Rect(0, 0, 16, 16);
    public Rect uvDown  = new Rect(0, 0, 16, 16);
    
    // Texture index (atlas da qaysi tekstura)
    public int textureIndex = 0;
    
    // Ko'rinish
    public bool visible = true;
    public Color tintColor = Color.white;
    
    /// <summary>
    /// O'lchamni hisoblash (to - from).
    /// </summary>
    public Vector3 Size => to - from;
    
    /// <summary>
    /// Markaziy nuqta.
    /// </summary>
    public Vector3 Center => (from + to) * 0.5f;
}

/// <summary>
/// Ko'p elementli 3D model — Blockbench uslubida.
/// Bir nechta CuboidElement ni birlashtirib, murakkab shakllarni yaratadi.
/// Entity modellari, custom bloklar, va furniture uchun ishlatiladi.
/// </summary>
[System.Serializable]
public class MultiCuboidModelData
{
    public string modelName = "custom_model";
    public List<CuboidElement> elements = new List<CuboidElement>();
    
    // Tekstura atlas ma'lumotlari
    public int textureWidth = 64;
    public int textureHeight = 64;
    public List<string> texturePaths = new List<string>(); // Atlas tekstura yo'llari
    
    // Display sozlamalari (qo'lda, boshda, yerda ko'rinish)
    public Vector3 displayGuiRotation = new Vector3(30, 225, 0);
    public Vector3 displayGuiTranslation = Vector3.zero;
    public Vector3 displayGuiScale = Vector3.one;
    
    public Vector3 displayHandRotation = new Vector3(0, 45, 0);
    public Vector3 displayHandTranslation = new Vector3(0, 2, 0);
    public Vector3 displayHandScale = new Vector3(0.5f, 0.5f, 0.5f);
    
    /// <summary>
    /// Yangi element qo'shish (standart 8x8x8 kuboid).
    /// </summary>
    public CuboidElement AddElement(string name = null)
    {
        var element = new CuboidElement
        {
            name = name ?? $"cube_{elements.Count}",
            from = new Vector3(4, 0, 4),
            to = new Vector3(12, 8, 12)
        };
        elements.Add(element);
        return element;
    }
    
    /// <summary>
    /// Elementni o'chirish.
    /// </summary>
    public void RemoveElement(int index)
    {
        if (index >= 0 && index < elements.Count)
            elements.RemoveAt(index);
    }
    
    /// <summary>
    /// Elementni nusxalash.
    /// </summary>
    public CuboidElement DuplicateElement(int index)
    {
        if (index < 0 || index >= elements.Count) return null;
        
        var original = elements[index];
        var copy = new CuboidElement
        {
            name = original.name + "_copy",
            from = original.from + Vector3.right * 2, // Biroz siljitish
            to = original.to + Vector3.right * 2,
            rotation = original.rotation,
            pivot = original.pivot,
            uvNorth = original.uvNorth,
            uvSouth = original.uvSouth,
            uvEast = original.uvEast,
            uvWest = original.uvWest,
            uvUp = original.uvUp,
            uvDown = original.uvDown,
            textureIndex = original.textureIndex,
            visible = original.visible
        };
        elements.Add(copy);
        return copy;
    }
}

/// <summary>
/// Multi-Cuboid Model MonoBehaviour — sahnada bir nechta kuboidni boshqaradi.
/// Har bir CuboidElement uchun alohida child GameObject yaratadi.
/// </summary>
public class MultiCuboidModel : MonoBehaviour
{
    [Header("Model Ma'lumotlari")]
    public MultiCuboidModelData modelData = new MultiCuboidModelData();
    
    [Header("Render Sozlamalari")]
    public Material baseMaterial;
    public bool wireframeOverlay = false;
    public Color wireframeColor = new Color(0, 1, 0.5f, 0.4f);
    
    // Ichki boshqaruv
    private List<GameObject> _elementObjects = new List<GameObject>();
    private int _selectedElementIndex = -1;
    
    /// <summary>
    /// Tanlangan element indeksi.
    /// </summary>
    public int SelectedElementIndex
    {
        get => _selectedElementIndex;
        set
        {
            _selectedElementIndex = Mathf.Clamp(value, -1, modelData.elements.Count - 1);
            HighlightSelectedElement();
        }
    }
    
    /// <summary>
    /// Modelni noldan qayta qurish (rebuild).
    /// Barcha child obiektlarni o'chirib, yangilarini yaratadi.
    /// </summary>
    public void RebuildModel()
    {
        // Eski obiektlarni tozalash
        ClearChildren();
        _elementObjects.Clear();
        
        if (modelData == null || modelData.elements == null) return;
        
        // Har bir element uchun yangi kuboid yaratish
        for (int i = 0; i < modelData.elements.Count; i++)
        {
            var element = modelData.elements[i];
            if (!element.visible) continue;
            
            GameObject elementGO = CreateCuboidGameObject(element, i);
            _elementObjects.Add(elementGO);
        }
    }
    
    /// <summary>
    /// Yangi element qo'shish va sahnada yaratish.
    /// </summary>
    public CuboidElement AddElement(string name = null)
    {
        var element = modelData.AddElement(name);
        RebuildModel();
        return element;
    }
    
    /// <summary>
    /// Elementni o'chirish.
    /// </summary>
    public void RemoveElement(int index)
    {
        modelData.RemoveElement(index);
        RebuildModel();
    }
    
    /// <summary>
    /// Bitta elementni yangilash (to'liq rebuild emas).
    /// </summary>
    public void UpdateElement(int index)
    {
        if (index < 0 || index >= _elementObjects.Count) return;
        if (index >= modelData.elements.Count) return;
        
        var element = modelData.elements[index];
        var go = _elementObjects[index];
        
        if (go == null) return;
        
        // Pozitsiya va o'lcham yangilash
        ApplyElementTransform(go, element);
        
        // Meshni qayta qurish
        var meshFilter = go.GetComponent<MeshFilter>();
        if (meshFilter != null)
        {
            RebuildElementMesh(meshFilter, element);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ICHKI METODLAR
    // ═══════════════════════════════════════════════════════════════════════
    
    private GameObject CreateCuboidGameObject(CuboidElement element, int index)
    {
        GameObject go = new GameObject($"Element_{index}_{element.name}");
        go.transform.SetParent(transform);
        
        // Mesh yaratish
        MeshFilter meshFilter = go.AddComponent<MeshFilter>();
        MeshRenderer renderer = go.AddComponent<MeshRenderer>();
        
        // Material
        if (baseMaterial != null)
            renderer.material = new Material(baseMaterial);
        else
            renderer.material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
        
        renderer.material.color = element.tintColor;
        
        // Mesh geometriyasini qurish
        RebuildElementMesh(meshFilter, element);
        
        // Transform qo'llash
        ApplyElementTransform(go, element);
        
        return go;
    }
    
    private void RebuildElementMesh(MeshFilter meshFilter, CuboidElement element)
    {
        Mesh mesh = new Mesh();
        mesh.name = $"Cuboid_{element.name}";
        
        Vector3 size = element.Size;
        
        // Minecraft piksellarini Unity birliklarga o'tkazish (16px = 1 unit)
        float extX = (size.x / 16f) * 0.5f;
        float extY = (size.y / 16f) * 0.5f;
        float extZ = (size.z / 16f) * 0.5f;
        
        // 24 ta vertex (6 yuza * 4 vertex)
        Vector3[] vertices = new Vector3[24]
        {
            // North (Z-)
            new Vector3(-extX, -extY, -extZ), new Vector3( extX, -extY, -extZ),
            new Vector3( extX,  extY, -extZ), new Vector3(-extX,  extY, -extZ),
            // South (Z+)
            new Vector3( extX, -extY,  extZ), new Vector3(-extX, -extY,  extZ),
            new Vector3(-extX,  extY,  extZ), new Vector3( extX,  extY,  extZ),
            // Up (Y+)
            new Vector3(-extX,  extY, -extZ), new Vector3( extX,  extY, -extZ),
            new Vector3( extX,  extY,  extZ), new Vector3(-extX,  extY,  extZ),
            // Down (Y-)
            new Vector3(-extX, -extY,  extZ), new Vector3( extX, -extY,  extZ),
            new Vector3( extX, -extY, -extZ), new Vector3(-extX, -extY, -extZ),
            // East (X+)
            new Vector3( extX, -extY, -extZ), new Vector3( extX, -extY,  extZ),
            new Vector3( extX,  extY,  extZ), new Vector3( extX,  extY, -extZ),
            // West (X-)
            new Vector3(-extX, -extY,  extZ), new Vector3(-extX, -extY, -extZ),
            new Vector3(-extX,  extY, -extZ), new Vector3(-extX,  extY,  extZ)
        };
        
        int[] triangles = new int[36]
        {
            0,1,2,  0,2,3,   // North
            4,5,6,  4,6,7,   // South
            8,9,10, 8,10,11, // Up
            12,13,14, 12,14,15, // Down
            16,17,18, 16,18,19, // East
            20,21,22, 20,22,23  // West
        };
        
        // UV koordinatalari (har bir yuza uchun alohida)
        float tw = modelData.textureWidth;
        float th = modelData.textureHeight;
        
        Vector2[] uvs = new Vector2[24];
        AssignFaceUV(uvs, 0, element.uvNorth, tw, th);
        AssignFaceUV(uvs, 4, element.uvSouth, tw, th);
        AssignFaceUV(uvs, 8, element.uvUp, tw, th);
        AssignFaceUV(uvs, 12, element.uvDown, tw, th);
        AssignFaceUV(uvs, 16, element.uvEast, tw, th);
        AssignFaceUV(uvs, 20, element.uvWest, tw, th);
        
        mesh.vertices = vertices;
        mesh.triangles = triangles;
        mesh.uv = uvs;
        mesh.RecalculateNormals();
        mesh.RecalculateBounds();
        
        meshFilter.mesh = mesh;
    }
    
    private void AssignFaceUV(Vector2[] uvs, int startIdx, Rect pixelRect, float atlasW, float atlasH)
    {
        float uMin = pixelRect.x / atlasW;
        float vMin = (atlasH - pixelRect.yMax) / atlasH;
        float uMax = pixelRect.xMax / atlasW;
        float vMax = (atlasH - pixelRect.y) / atlasH;
        
        uvs[startIdx]     = new Vector2(uMin, vMin);
        uvs[startIdx + 1] = new Vector2(uMax, vMin);
        uvs[startIdx + 2] = new Vector2(uMax, vMax);
        uvs[startIdx + 3] = new Vector2(uMin, vMax);
    }
    
    private void ApplyElementTransform(GameObject go, CuboidElement element)
    {
        // Markaziy pozitsiya hisoblash
        Vector3 center = element.Center / 16f; // Pikseldan Unity birliklarga
        Vector3 pivotOffset = element.pivot / 16f;
        
        // Pozitsiya — model markaziga nisbatan
        go.transform.localPosition = center - new Vector3(0.5f, 0.5f, 0.5f); // Blok markazi = (0.5, 0.5, 0.5)
        
        // Aylanish (pivot asosida)
        if (element.rotation != Vector3.zero)
        {
            // Pivot nuqtasida aylantirish
            go.transform.RotateAround(
                transform.position + pivotOffset - new Vector3(0.5f, 0.5f, 0.5f),
                Vector3.up, element.rotation.y
            );
            go.transform.RotateAround(
                transform.position + pivotOffset - new Vector3(0.5f, 0.5f, 0.5f),
                Vector3.right, element.rotation.x
            );
            go.transform.RotateAround(
                transform.position + pivotOffset - new Vector3(0.5f, 0.5f, 0.5f),
                Vector3.forward, element.rotation.z
            );
        }
    }
    
    private void HighlightSelectedElement()
    {
        for (int i = 0; i < _elementObjects.Count; i++)
        {
            var go = _elementObjects[i];
            if (go == null) continue;
            
            var renderer = go.GetComponent<MeshRenderer>();
            if (renderer == null) continue;
            
            if (i == _selectedElementIndex)
            {
                // Tanlangan element — yorqin border
                renderer.material.SetColor("_EmissionColor", wireframeColor * 0.3f);
                renderer.material.EnableKeyword("_EMISSION");
            }
            else
            {
                renderer.material.SetColor("_EmissionColor", Color.black);
                renderer.material.DisableKeyword("_EMISSION");
            }
        }
    }
    
    private void ClearChildren()
    {
        // Barcha child obiektlarni o'chirish
        for (int i = transform.childCount - 1; i >= 0; i--)
        {
            var child = transform.GetChild(i).gameObject;
            if (Application.isPlaying)
                Destroy(child);
            else
                DestroyImmediate(child);
        }
    }
    
    void OnValidate()
    {
        // Inspector da o'zgartirish bo'lganda qayta qurish
        if (Application.isPlaying)
            RebuildModel();
    }
}
