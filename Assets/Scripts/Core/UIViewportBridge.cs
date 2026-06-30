// ============================================================
//  UIViewportBridge.cs
//  Joylashuv: Assets/Scripts/UIViewportBridge.cs
//
//  Vazifa: RenderTexture'dan olingan kamera ko'rinishini
//          UI Toolkit VisualElement ichida ko'rsatadi.
//
//  Bog'lanish sxemasi:
//    [Viewport Camera] → RenderTexture → UIDocument → VisualElement
//
//  Qo'shimcha: Sichqoncha VisualElement ustiga kirganida
//              VoxelPreviewRotator ga xabar beradi,
//              tashqariga chiqqanda drag yana yonadi.
// ============================================================

using UnityEngine;
using UnityEngine.UIElements;

/// <summary>
/// Bu skriptni UIDocument bor GameObject ga biriktiring.
/// </summary>
[RequireComponent(typeof(UIDocument))]
public class UIViewportBridge : MonoBehaviour
{
    // ── Inspector ─────────────────────────────────────────────

    [Header("3D Kamera uchun Render Texture")]
    [Tooltip("Kamerada ham shu RenderTexture bo'lishi kerak")]
    public RenderTexture viewportRenderTexture;

    [Header("UI Toolkit — VisualElement nomi (name='...')")]
    [Tooltip("UXML ichidagi 3D viewport uchun konteyner nomi")]
    public string viewportElementName = "viewport-3d-container";

    [Header("VoxelPreviewRotator (sahnada)")]
    public VoxelPreviewRotator rotator;

    [Header("Viewport o'lchami (piksel)")]
    public int viewportWidth  = 400;
    public int viewportHeight = 400;

    // ── Ichki ─────────────────────────────────────────────────

    private UIDocument  _uiDocument;
    private VisualElement _viewportVE;   // Maqsad VisualElement
    private Texture2D   _displayTex;    // RenderTexture → Texture2D

    // ── Unity tsikli ──────────────────────────────────────────

    private void Awake()
    {
        _uiDocument = GetComponent<UIDocument>();
    }

    private void OnEnable()
    {
        // Root tayyor bo'lgunga qadar kuting
        if (_uiDocument.rootVisualElement == null)
        {
            _uiDocument.rootVisualElement.RegisterCallback<GeometryChangedEvent>(OnRootReady);
        }
        else
        {
            InitViewport();
        }
    }

    private void OnRootReady(GeometryChangedEvent evt)
    {
        _uiDocument.rootVisualElement.UnregisterCallback<GeometryChangedEvent>(OnRootReady);
        InitViewport();
    }

    // ── Ishga tushirish ───────────────────────────────────────

    private void InitViewport()
    {
        VisualElement root = _uiDocument.rootVisualElement;

        // 1. VisualElement ni top
        _viewportVE = root.Q<VisualElement>(viewportElementName);

        if (_viewportVE == null)
        {
            // Yo'q bo'lsa — yangi yaratamiz va root ga qo'shamiz
            _viewportVE = CreateDefaultViewportElement(root);
            Debug.LogWarning($"[UIViewportBridge] '{viewportElementName}' topilmadi. " +
                             "Yangi element yaratildi.");
        }

        // 2. Texture2D yaratamiz (RenderTexture dan piksel o'qish uchun)
        _displayTex = new Texture2D(viewportWidth, viewportHeight,
                                    TextureFormat.RGB24, false)
        {
            filterMode = FilterMode.Point // Piksel art uchun!
        };

        // 3. VisualElement ga o'lcham ber
        _viewportVE.style.width  = viewportWidth;
        _viewportVE.style.height = viewportHeight;

        // 4. Sichqoncha hover hodisalarini ulash
        RegisterHoverEvents();

        Debug.Log("[UIViewportBridge ✓] 3D Viewport ulandi.");
    }

    // ── Har kadrda RenderTexture → VisualElement ─────────────

    private void LateUpdate()
    {
        if (_viewportVE == null || viewportRenderTexture == null) return;

        // RenderTexture ni faol qilib piksellarni o'qi
        RenderTexture prev = RenderTexture.active;
        RenderTexture.active = viewportRenderTexture;

        _displayTex.ReadPixels(
            new Rect(0, 0, viewportRenderTexture.width, viewportRenderTexture.height),
            0, 0
        );
        _displayTex.Apply();

        RenderTexture.active = prev;

        // VisualElement background sifatida chiz
        _viewportVE.style.backgroundImage = new StyleBackground(_displayTex);
    }

    // ── UI hover hodisalari ───────────────────────────────────

    private void RegisterHoverEvents()
    {
        // Sichqoncha viewport ichiga kirdi → drag TO'XTAT
        _viewportVE.RegisterCallback<MouseEnterEvent>(evt =>
        {
            // Viewport ustida drag ishlaydi — UI bloklari EMAS
            if (rotator != null) rotator.SetPointerOverUI(false);
        });

        // Viewport dan chiqdi → Agar boshqa UI ustida bo'lsa to'xtat
        _viewportVE.RegisterCallback<MouseLeaveEvent>(evt =>
        {
            // Viewport tashqarisiga chiqdi — boshqa UI elementlar bormi?
            // (UIBlocker panel — pastda ko'rsatilgan)
        });

        // Agar boshqa UI panellari (right-panel, toolbar) ustida bo'lsa
        // o'sha panellarga ham qo'shish kerak:
        RegisterBlockerPanel("right-panel");
        RegisterBlockerPanel("toolbar-container");
        RegisterBlockerPanel("code-panel");
    }

    /// <summary>
    /// Berilgan nomdagi panel ustida sichqoncha bo'lsa
    /// rotatorni bloklaydi.
    /// </summary>
    private void RegisterBlockerPanel(string panelName)
    {
        var panel = _uiDocument.rootVisualElement.Q<VisualElement>(panelName);
        if (panel == null) return;

        panel.RegisterCallback<MouseEnterEvent>(evt =>
        {
            if (rotator != null) rotator.SetPointerOverUI(true);
        });

        panel.RegisterCallback<MouseLeaveEvent>(evt =>
        {
            if (rotator != null) rotator.SetPointerOverUI(false);
        });
    }

    // ── Standart viewport element (UXML da yo'q bo'lsa) ──────

    private VisualElement CreateDefaultViewportElement(VisualElement root)
    {
        // Mavjud project-tree-container ichiga qo'shamiz
        VisualElement container = root.Q<VisualElement>("project-tree-container")
                                  ?? root; // Topilmasa root ga

        var ve = new VisualElement
        {
            name = viewportElementName,
            style =
            {
                width            = viewportWidth,
                height           = viewportHeight,
                borderTopWidth   = 2,
                borderBottomWidth= 2,
                borderLeftWidth  = 2,
                borderRightWidth = 2,
                borderTopColor   = new StyleColor(new Color(0.2f, 0.8f, 0.4f, 0.7f)),
                borderBottomColor= new StyleColor(new Color(0.2f, 0.8f, 0.4f, 0.7f)),
                borderLeftColor  = new StyleColor(new Color(0.2f, 0.8f, 0.4f, 0.7f)),
                borderRightColor = new StyleColor(new Color(0.2f, 0.8f, 0.4f, 0.7f)),
                marginBottom     = 8,
                marginTop        = 8,
            }
        };

        // Label qo'sh
        var label = new Label("3D Viewport")
        {
            style =
            {
                color          = new StyleColor(Color.white),
                unityFontStyleAndWeight = FontStyle.Bold,
                position       = Position.Absolute,
                top            = 4,
                left           = 8,
                fontSize       = 11
            }
        };
        ve.Add(label);

        container.Insert(0, ve); // Konteynerning birinchi elementi bo'lsin
        return ve;
    }

    // ── Tozalash ──────────────────────────────────────────────

    private void OnDestroy()
    {
        if (_displayTex != null)
            Destroy(_displayTex);
    }
}
