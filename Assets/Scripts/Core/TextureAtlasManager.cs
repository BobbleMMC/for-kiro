using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Tekstura Atlas boshqaruvchisi — bir nechta teksturani bitta atlas ga birlashtiradi.
/// Har bir kuboid yuzasiga alohida tekstura assign qilish imkonini beradi.
/// 
/// Ishlash printsipi:
///   1. Foydalanuvchi 16x16 teksturalarni qo'shadi
///   2. Atlas avtomatik pack qilinadi (masalan: 4x4 = 64x64 atlas)
///   3. Har bir CuboidElement yuzasi atlas ichidagi to'g'ri UV ni oladi
/// </summary>
public class TextureAtlasManager : MonoBehaviour
{
    [Header("Atlas Sozlamalari")]
    public int tileSize = 16;       // Har bir tekstura o'lchami (16x16 px)
    public int atlasColumns = 4;    // Atlas ustunlar soni
    public int atlasRows = 4;       // Atlas qatorlar soni
    
    [Header("Material")]
    public Material atlasMaterial;  // Atlas materiali (barcha cuboidlarga qo'llanadi)
    
    // Atlas teksturasi
    private Texture2D _atlasTexture;
    private List<Texture2D> _tiles = new List<Texture2D>();
    private Dictionary<string, int> _tileNameToIndex = new Dictionary<string, int>();
    
    /// <summary>
    /// Atlas teksturasini qaytaradi.
    /// </summary>
    public Texture2D AtlasTexture => _atlasTexture;
    
    /// <summary>
    /// Atlas o'lchami (pikselda).
    /// </summary>
    public int AtlasWidth => atlasColumns * tileSize;
    public int AtlasHeight => atlasRows * tileSize;
    
    /// <summary>
    /// Jami tile joy soni.
    /// </summary>
    public int MaxTiles => atlasColumns * atlasRows;
    
    /// <summary>
    /// Hozirgi tile soni.
    /// </summary>
    public int TileCount => _tiles.Count;
    
    void Awake()
    {
        CreateEmptyAtlas();
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ATLAS YARATISH VA BOSHQARISH
    // ═══════════════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Bo'sh atlas teksturasi yaratish.
    /// </summary>
    public void CreateEmptyAtlas()
    {
        int width = AtlasWidth;
        int height = AtlasHeight;
        
        _atlasTexture = new Texture2D(width, height, TextureFormat.RGBA32, false);
        _atlasTexture.filterMode = FilterMode.Point; // Pixel art!
        _atlasTexture.wrapMode = TextureWrapMode.Clamp;
        
        // Shaxmat taxtasi pattern bilan to'ldirish (bo'sh joyni ko'rsatish uchun)
        Color darkGray = new Color(0.2f, 0.2f, 0.2f, 1f);
        Color lightGray = new Color(0.3f, 0.3f, 0.3f, 1f);
        
        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                bool isDark = ((x / 4) + (y / 4)) % 2 == 0;
                _atlasTexture.SetPixel(x, y, isDark ? darkGray : lightGray);
            }
        }
        _atlasTexture.Apply();
        
        // Materialga ulash
        if (atlasMaterial != null)
        {
            atlasMaterial.mainTexture = _atlasTexture;
        }
    }
    
    /// <summary>
    /// Yangi tekstura tile qo'shish.
    /// </summary>
    /// <param name="tileName">Tile nomi (identifikator)</param>
    /// <param name="pixels">16x16 piksellar massivi (256 ta Color)</param>
    /// <returns>Tile indeksi (0-based) yoki -1 agar joy yo'q</returns>
    public int AddTile(string tileName, Color[] pixels)
    {
        if (_tiles.Count >= MaxTiles)
        {
            Debug.LogWarning("[Atlas] Atlas to'ldi! Yangi tile qo'shib bo'lmaydi.");
            return -1;
        }
        
        if (pixels == null || pixels.Length != tileSize * tileSize)
        {
            Debug.LogWarning($"[Atlas] Noto'g'ri piksel massivi o'lchami. Kutilgan: {tileSize * tileSize}");
            return -1;
        }
        
        // Yangi Texture2D yaratish
        Texture2D tile = new Texture2D(tileSize, tileSize, TextureFormat.RGBA32, false);
        tile.filterMode = FilterMode.Point;
        tile.SetPixels(pixels);
        tile.Apply();
        
        int index = _tiles.Count;
        _tiles.Add(tile);
        
        if (!string.IsNullOrEmpty(tileName))
            _tileNameToIndex[tileName] = index;
        
        // Atlasga yozish
        WriteTileToAtlas(index, pixels);
        
        return index;
    }
    
    /// <summary>
    /// Mavjud tile ni yangilash (qayta chizish).
    /// </summary>
    public void UpdateTile(int index, Color[] pixels)
    {
        if (index < 0 || index >= _tiles.Count) return;
        if (pixels == null || pixels.Length != tileSize * tileSize) return;
        
        _tiles[index].SetPixels(pixels);
        _tiles[index].Apply();
        
        WriteTileToAtlas(index, pixels);
    }
    
    /// <summary>
    /// Tile nomi bo'yicha indeks olish.
    /// </summary>
    public int GetTileIndex(string tileName)
    {
        if (_tileNameToIndex.TryGetValue(tileName, out int index))
            return index;
        return -1;
    }
    
    /// <summary>
    /// Tile indeksi asosida atlas ichidagi UV Rect ni hisoblash.
    /// CuboidElement.uvXxx maydonlariga qo'yish uchun.
    /// </summary>
    /// <param name="tileIndex">Tile indeksi</param>
    /// <returns>Rect (pikselda, atlas ichida)</returns>
    public Rect GetTileUVRect(int tileIndex)
    {
        if (tileIndex < 0 || tileIndex >= MaxTiles)
            return new Rect(0, 0, tileSize, tileSize);
        
        int col = tileIndex % atlasColumns;
        int row = tileIndex / atlasColumns;
        
        float x = col * tileSize;
        float y = row * tileSize;
        
        return new Rect(x, y, tileSize, tileSize);
    }
    
    /// <summary>
    /// CuboidElement ning barcha yuzalariga bitta tile assign qilish.
    /// </summary>
    public void AssignTileToAllFaces(CuboidElement element, int tileIndex)
    {
        Rect uv = GetTileUVRect(tileIndex);
        element.uvNorth = uv;
        element.uvSouth = uv;
        element.uvEast = uv;
        element.uvWest = uv;
        element.uvUp = uv;
        element.uvDown = uv;
        element.textureIndex = 0; // Atlas doim texture 0
    }
    
    /// <summary>
    /// CuboidElement ning alohida yuzasiga tile assign qilish.
    /// </summary>
    public void AssignTileToFace(CuboidElement element, string face, int tileIndex)
    {
        Rect uv = GetTileUVRect(tileIndex);
        
        switch (face.ToLower())
        {
            case "north": element.uvNorth = uv; break;
            case "south": element.uvSouth = uv; break;
            case "east":  element.uvEast = uv; break;
            case "west":  element.uvWest = uv; break;
            case "up":    element.uvUp = uv; break;
            case "down":  element.uvDown = uv; break;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ICHKI METODLAR
    // ═══════════════════════════════════════════════════════════════════════
    
    private void WriteTileToAtlas(int tileIndex, Color[] pixels)
    {
        int col = tileIndex % atlasColumns;
        int row = tileIndex / atlasColumns;
        
        int startX = col * tileSize;
        int startY = (atlasRows - 1 - row) * tileSize; // Y teskari (Unity texture Y = pastdan yuqoriga)
        
        for (int y = 0; y < tileSize; y++)
        {
            for (int x = 0; x < tileSize; x++)
            {
                _atlasTexture.SetPixel(startX + x, startY + y, pixels[y * tileSize + x]);
            }
        }
        _atlasTexture.Apply();
        
        // Material yangilash
        if (atlasMaterial != null)
            atlasMaterial.mainTexture = _atlasTexture;
    }
    
    void OnDestroy()
    {
        if (_atlasTexture != null)
            Destroy(_atlasTexture);
            
        foreach (var tile in _tiles)
        {
            if (tile != null) Destroy(tile);
        }
    }
}
