// ============================================================
//  VoxelViewportSetup.cs
//  Joylashuv: Assets/Editor/VoxelViewportSetup.cs
//
//  Vazifa: Bir marta ishga tushiriladigan "Setup Wizard":
//          Tools → Mod Studio → 3D Viewport'ni Sozla
//          menyusidan sahnaga avtomatik qo'yadi:
//            • Viewport kamerasi + RenderTexture
//            • Voxel Cube (blok preview)
//            • Yoritgich (Directional Light)
//            • VoxelPreviewRotator + UIViewportBridge
//
//  Eslatma: Bu faqat EDITOR skripti — Editor/ papkasida bo'lsin.
// ============================================================

using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering.Universal;

public static class VoxelViewportSetup
{
    private const string RENDER_TEXTURE_PATH = "Assets/RenderTextures/VoxelViewport.renderTexture";
    private const int    RT_WIDTH            = 400;
    private const int    RT_HEIGHT           = 400;

    // ── Menyu elementi ────────────────────────────────────────

    [MenuItem("Tools/Mod Studio/3D Viewport ni Sozla (Avtomatik)")]
    public static void SetupViewport()
    {
        // 1. RenderTexture yaratamiz
        RenderTexture rt = CreateOrLoadRenderTexture();

        // 2. Kamera yaratamiz
        Camera viewportCam = CreateViewportCamera(rt);

        // 3. Voxel Cube yaratamiz
        GameObject cube = CreateVoxelCube();

        // 4. Yoritgich
        EnsureDirectionalLight();

        // 5. VoxelPreviewRotator skriptini Cube ga biriktir
        VoxelPreviewRotator rotator = cube.GetComponent<VoxelPreviewRotator>()
                                   ?? cube.AddComponent<VoxelPreviewRotator>();
        rotator.targetCube = cube.transform;

        // 6. UIViewportBridge ni UIDocument bor GameObject ga biriktir
        SetupUIBridge(rt, rotator);

        // 7. Sahnani saqlash eslatmasi
        Debug.Log("[VoxelViewport ✓] Barcha komponentlar sozlandi!\n" +
                  "Iltimos: File → Save Scene ni bosing.");

        EditorUtility.DisplayDialog(
            "3D Viewport Sozlandi ✓",
            "Quyidagilar yaratildi:\n" +
            "• VoxelViewportCamera (RenderTexture bilan)\n" +
            "• VoxelCube_Preview (VoxelPreviewRotator bilan)\n" +
            "• UIViewportBridge (UIDocument ga bog'landi)\n\n" +
            "Endi sahnani saqlang: File → Save Scene",
            "OK"
        );
    }

    // ── RenderTexture ─────────────────────────────────────────

    private static RenderTexture CreateOrLoadRenderTexture()
    {
        // Mavjud bo'lsa yukla
        RenderTexture existing =
            AssetDatabase.LoadAssetAtPath<RenderTexture>(RENDER_TEXTURE_PATH);
        if (existing != null) return existing;

        // RenderTextures papkasini yaratamiz
        if (!AssetDatabase.IsValidFolder("Assets/RenderTextures"))
            AssetDatabase.CreateFolder("Assets", "RenderTextures");

        RenderTexture rt = new RenderTexture(RT_WIDTH, RT_HEIGHT, 24)
        {
            name        = "VoxelViewport",
            filterMode  = FilterMode.Point,
            antiAliasing = 1
        };
        rt.Create();

        AssetDatabase.CreateAsset(rt, RENDER_TEXTURE_PATH);
        AssetDatabase.SaveAssets();

        Debug.Log($"[VoxelViewport] RenderTexture yaratildi: {RENDER_TEXTURE_PATH}");
        return rt;
    }

    // ── Kamera ───────────────────────────────────────────────

    private static Camera CreateViewportCamera(RenderTexture rt)
    {
        // Mavjud kamera bormi?
        GameObject existingCamGO = GameObject.Find("VoxelViewportCamera");
        if (existingCamGO != null)
        {
            Camera existingCam = existingCamGO.GetComponent<Camera>();
            if (existingCam != null) existingCam.targetTexture = rt;
            return existingCam;
        }

        // Yangi kamera
        GameObject camGO = new GameObject("VoxelViewportCamera");
        Camera cam = camGO.AddComponent<Camera>();

        // Kamera sozlamalari
        cam.targetTexture    = rt;
        cam.clearFlags       = CameraClearFlags.SolidColor;
        cam.backgroundColor  = new Color(0.12f, 0.12f, 0.12f, 1f); // Qoramtir fon
        cam.fieldOfView      = 50f;
        cam.nearClipPlane    = 0.1f;
        cam.farClipPlane     = 100f;
        cam.orthographic     = false;

        // Kamera pozitsiyasi: Cube dan biroz uzoqroq
        camGO.transform.position = new Vector3(0f, 1.2f, -4f);
        camGO.transform.LookAt(Vector3.zero + Vector3.up * 0.2f);

        // URP uchun Camera Data (agar URP o'rnatilgan bo'lsa)
        var urpData = camGO.GetComponent<UniversalAdditionalCameraData>();
        if (urpData == null) urpData = camGO.AddComponent<UniversalAdditionalCameraData>();
        urpData.renderType = CameraRenderType.Overlay;

        // Sahnada belgilansin (Editor Gizmo)
        GameObjectUtility.SetStaticEditorFlags(camGO, 0);

        Debug.Log("[VoxelViewport] Kamera yaratildi: VoxelViewportCamera");
        return cam;
    }

    // ── Voxel Cube ────────────────────────────────────────────

    private static GameObject CreateVoxelCube()
    {
        GameObject existing = GameObject.Find("VoxelCube_Preview");
        if (existing != null) return existing;

        // Standart Unity kubi
        GameObject cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cube.name = "VoxelCube_Preview";
        cube.transform.position = Vector3.zero;
        cube.transform.rotation = Quaternion.Euler(25f, 35f, 0f); // Isometric ko'rinish

        // Collider kerak emas
        Object.DestroyImmediate(cube.GetComponent<BoxCollider>());

        // Standart material (keyinroq Pixel Art tekstura qo'shiladi)
        Renderer rend = cube.GetComponent<Renderer>();
        if (rend != null)
        {
            // URP Lit material
            Material mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            if (mat.shader.name == "Universal Render Pipeline/Lit")
            {
                mat.SetFloat("_Smoothness", 0f);  // Matt ko'rinish
                mat.SetFloat("_Metallic", 0f);
            }
            rend.sharedMaterial = mat;
        }

        Debug.Log("[VoxelViewport] VoxelCube_Preview yaratildi.");
        return cube;
    }

    // ── Yoritgich ─────────────────────────────────────────────

    private static void EnsureDirectionalLight()
    {
        // Agar sahnada Directional Light yo'q bo'lsa qo'shamiz
        Light[] lights = Object.FindObjectsByType<Light>(FindObjectsSortMode.None);
        foreach (Light l in lights)
            if (l.type == LightType.Directional) return;

        GameObject lightGO = new GameObject("VoxelViewport_Light");
        Light light = lightGO.AddComponent<Light>();
        light.type       = LightType.Directional;
        light.intensity  = 1.2f;
        light.color      = new Color(1f, 0.97f, 0.9f);
        lightGO.transform.rotation = Quaternion.Euler(45f, 45f, 0f);

        Debug.Log("[VoxelViewport] Directional Light qo'shildi.");
    }

    // ── UIViewportBridge ──────────────────────────────────────

    private static void SetupUIBridge(RenderTexture rt, VoxelPreviewRotator rotator)
    {
        // UIDocument bor GameObject ni qidirish
        var uiDoc = Object.FindFirstObjectByType<UnityEngine.UIElements.UIDocument>();

        if (uiDoc == null)
        {
            Debug.LogWarning("[VoxelViewport] Sahnada UIDocument topilmadi! " +
                             "UIViewportBridge ni qo'lda sozlang.");
            return;
        }

        UIViewportBridge bridge = uiDoc.GetComponent<UIViewportBridge>()
                                ?? uiDoc.gameObject.AddComponent<UIViewportBridge>();

        bridge.viewportRenderTexture = rt;
        bridge.rotator               = rotator;
        bridge.viewportWidth         = RT_WIDTH;
        bridge.viewportHeight        = RT_HEIGHT;

        Debug.Log("[VoxelViewport] UIViewportBridge UIDocument ga bog'landi.");
    }
}
