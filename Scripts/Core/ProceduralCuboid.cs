using UnityEngine;

[RequireComponent(typeof(MeshFilter), typeof(MeshRenderer))]
public class ProceduralCuboid : MonoBehaviour
{
    [Header("Kuboid O'lchamlari (Minecraft Piksellarida)")]
    [SerializeField] private Vector3 size = new Vector3(16f, 16f, 16f); // 16x16x16 - standart to'liq blok

    private MeshFilter _meshFilter;
    private Mesh _mesh;

    // Tashqaridan (UI orqali) o'lchamni o'zgartirish uchun Xususiyat (Property)
    public Vector3 Size
    {
        get => size;
        set
        {
            size = value;
            RebuildMesh();
        }
    }

    void Awake()
    {
        _meshFilter = GetComponent<MeshFilter>();
        _mesh = new Mesh();
        _mesh.name = "ProceduralCuboidMesh";
        _meshFilter.mesh = _mesh;
    }

    void Start()
    {
        RebuildMesh();
    }

    // Kuboidni noldan geometrik chizuvchi asosiy motor
    public void RebuildMesh()
    {
        _mesh.Clear();

        // Minecraft o'lchamini Unity o'lchamiga o'tkazish (16 piksel = 1 metr Unity'da)
        float extentX = (size.x / 16f) * 0.5f;
        float extentY = (size.y / 16f) * 0.5f;
        float extentZ = (size.z / 16f) * 0.5f;

        // 1. Nuqtalar (Vertices) - 6 ta yuza uchun 24 ta mustaqil nuqta (UV xatolik bermasligi uchun)
        Vector3[] vertices = new Vector3[24]
        {
            // Oldi Yuza (Front Face)
            new Vector3(-extentX, -extentY,  extentZ), new Vector3( extentX, -extentY,  extentZ),
            new Vector3( extentX,  extentY,  extentZ), new Vector3(-extentX,  extentY,  extentZ),

            // Orqa Yuza (Back Face)
            new Vector3( extentX, -extentY, -extentZ), new Vector3(-extentX, -extentY, -extentZ),
            new Vector3(-extentX,  extentY, -extentZ), new Vector3( extentX,  extentY, -extentZ),

            // Tepa Yuza (Top Face)
            new Vector3(-extentX,  extentY,  extentZ), new Vector3( extentX,  extentY,  extentZ),
            new Vector3( extentX,  extentY, -extentZ), new Vector3(-extentX,  extentY, -extentZ),

            // Pastki Yuza (Bottom Face)
            new Vector3(-extentX, -extentY, -extentZ), new Vector3( extentX, -extentY, -extentZ),
            new Vector3( extentX, -extentY,  extentZ), new Vector3(-extentX, -extentY,  extentZ),

            // O'ng Yuza (Right Face)
            new Vector3( extentX, -extentY,  extentZ), new Vector3( extentX, -extentY, -extentZ),
            new Vector3( extentX,  extentY, -extentZ), new Vector3( extentX,  extentY,  extentZ),

            // Chap Yuza (Left Face)
            new Vector3(-extentX, -extentY, -extentZ), new Vector3(-extentX, -extentY,  extentZ),
            new Vector3(-extentX,  extentY,  extentZ), new Vector3(-extentX,  extentY, -extentZ)
        };

        // 2. Uchburchaklar (Triangles) - 12 ta uchburchak (har bir yuzaga 2 tadan)
        int[] triangles = new int[36]
        {
            0, 1, 2,     0, 2, 3,     // Front
            4, 5, 6,     4, 6, 7,     // Back
            8, 9, 10,    8, 10, 11,   // Top
            12, 13, 14,  12, 14, 15,  // Bottom
            16, 17, 18,  16, 18, 19,  // Right
            20, 21, 22,  20, 22, 23   // Left
        };

        // 3. Standart va vaqtinchalik UV koordinatalari (Keyingi darsda Atlasga bog'laymiz)
        Vector2[] uvs = new Vector2[24];
        for (int i = 0; i < 24; i += 4)
        {
            uvs[i]   = new Vector2(0, 0);
            uvs[i+1] = new Vector2(1, 0);
            uvs[i+2] = new Vector2(1, 1);
            uvs[i+3] = new Vector2(0, 1);
        }

        // Ma'lumotlarni Meshga yuklash
        _mesh.vertices = vertices;
        _mesh.triangles = triangles;
        _mesh.uv = uvs;

        // Soyalar va yorug'lik to'g'ri tushishi uchun normal va chegaralarni avtomatik hisoblash
        _mesh.RecalculateNormals();
        _mesh.RecalculateBounds();
    }
}
