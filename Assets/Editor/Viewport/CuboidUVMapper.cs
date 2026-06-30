using UnityEngine;

[RequireComponent(typeof(MeshFilter), typeof(MeshRenderer))]
public class CuboidUVMapper : MonoBehaviour
{
    private MeshFilter _meshFilter;

    // Tekstura atlasining umumiy o'lchami (standart 16x16 yoki 64x64)
    private float atlasWidth = 16f;
    private float atlasHeight = 16f;

    void Awake()
    {
        _meshFilter = GetComponent<MeshFilter>();
    }

    // Minecraft JSON formatidagi UV koordinatalarni Unity Mesh'ga qo'llash
    // To'rtta koordinata: [u1, v1, u2, v2] (Piksellarda, masalan: 0, 0, 16, 16)
    public void ApplyBlockUVs(Rect front, Rect back, Rect top, Rect bottom, Rect right, Rect left, float textureWidth = 16f, float textureHeight = 16f)
    {
        Mesh mesh = _meshFilter.sharedMesh;
        if (mesh == null) return;

        atlasWidth = textureWidth;
        atlasHeight = textureHeight;

        // 6 ta yuza uchun 24 ta nuqta koordinatasi (Vector2 massivi)
        Vector2[] uvs = new Vector2[24];

        // Har bir yuza uchun UV hisoblash tartibi (Front, Back, Top, Bottom, Right, Left)
        int index = 0;
        AssignFaceUVs(uvs, ref index, front);  // Front
        AssignFaceUVs(uvs, ref index, back);   // Back
        AssignFaceUVs(uvs, ref index, top);    // Top
        AssignFaceUVs(uvs, ref index, bottom); // Bottom
        AssignFaceUVs(uvs, ref index, right);  // Right
        AssignFaceUVs(uvs, ref index, left);   // Left

        // Yangi UV koordinatalarini Meshga yuboramiz
        mesh.uv = uvs;
    }

    // Har bir individual yuzaning 4 ta nuqtasiga piksellarni to'g'ri bog'lash
    private void AssignFaceUVs(Vector2[] uvs, ref int index, Rect pixelRect)
    {
        // Piksellarni Unity-ning 0.0 dan 1.0 gacha bo'lgan standart nisbatiga o'giramiz
        float uMin = pixelRect.x / atlasWidth;
        float vMin = (atlasHeight - pixelRect.yMax) / atlasHeight; // Minecraft va Unity'da Y o'qi teskari
        float uMax = pixelRect.xMax / atlasWidth;
        float vMax = (atlasHeight - pixelRect.y) / atlasHeight;

        // 4 ta nuqtaning aylanish tartibi bo'yicha UV berish (Mesh tuzilishiga mos)
        uvs[index]   = new Vector2(uMin, vMin);
        uvs[index+1] = new Vector2(uMax, vMin);
        uvs[index+2] = new Vector2(uMax, vMax);
        uvs[index+3] = new Vector2(uMin, vMax);

        index += 4;
    }
}
