// ============================================================
//  VoxelPreviewRotator.cs
//  Joylashuv: Assets/Scripts/VoxelPreviewRotator.cs
//
//  Vazifa: Sahnada 3D Voxel (Cube) ni sichqoncha drag orqali
//          X va Y o'qlari bo'ylab aylantiradi.
//          UI Toolkit panellari ustida sichqoncha bo'lsa,
//          drag ISHLAMAYDI — formalarga xalaqit bermaydi.
// ============================================================

using UnityEngine;
using UnityEngine.UIElements;

/// <summary>
/// Bu skriptni 3D Viewport sahnasidagi Camera yoki
/// bo'sh GameObject ga biriktiring.
/// Inspector'dan <see cref="targetCube"/> ga aylantirilishi
/// kerak bo'lgan Cube ni, <see cref="viewportPanel"/> ga esa
/// UI Toolkit VisualElement ni drag-orqali bog'lang.
/// </summary>
public class VoxelPreviewRotator : MonoBehaviour
{
    // ── Inspector maydonlari ──────────────────────────────────

    [Header("Aylantirilishi kerak bo'lgan 3D ob'ekt")]
    [Tooltip("Sahnadagi Cube yoki ixtiyoriy Mesh GameObject")]
    public Transform targetCube;

    [Header("Drag tezligi (sezgirlik)")]
    [Range(0.1f, 10f)]
    public float rotationSpeed = 3.5f;

    [Header("Inertiya - qo'yib yuborganda sekin to'xtash")]
    [Range(0f, 1f)]
    public float dampingFactor = 0.92f;

    // ── Ichki holatlar ────────────────────────────────────────

    private bool   _isDragging      = false;
    private Vector2 _lastMousePos   = Vector2.zero;
    private Vector2 _currentVelocity = Vector2.zero;

    // UI Toolkit panel - bu maydon UIViewportBridge orqali to'ldiriladi
    // (pastda ko'rsatilgan)
    [HideInInspector]
    public bool isPointerOverUI = false;

    // ── Unity voqealar tsikli ─────────────────────────────────

    private void Update()
    {
        if (targetCube == null) return;

        HandleMouseInput();
        ApplyInertia();
    }

    // ── Sichqoncha kiritish mantig'i ──────────────────────────

    private void HandleMouseInput()
    {
        // Agar sichqoncha UI Toolkit elementi ustida bo'lsa — TO'XTAT
        if (isPointerOverUI) 
        {
            _isDragging = false;
            return;
        }

        // Sol tugma bosildi → drag boshlandi
        if (Input.GetMouseButtonDown(0))
        {
            _isDragging  = true;
            _lastMousePos = Input.mousePosition;
            _currentVelocity = Vector2.zero; // inertiyani nolga tushir
        }

        // Sol tugma qo'yib yuborildi → drag tugadi
        if (Input.GetMouseButtonUp(0))
        {
            _isDragging = false;
        }

        // Drag davomida → aylantir
        if (_isDragging && Input.GetMouseButton(0))
        {
            Vector2 currentMousePos = Input.mousePosition;
            Vector2 delta = currentMousePos - _lastMousePos;

            // delta.x → Y o'qi bo'ylab (chap-o'ng)
            // delta.y → X o'qi bo'ylab (yuqori-pastga)
            float rotY =  delta.x * rotationSpeed * Time.deltaTime * 60f;
            float rotX = -delta.y * rotationSpeed * Time.deltaTime * 60f;

            targetCube.Rotate(Vector3.up,   rotY, Space.World);
            targetCube.Rotate(Vector3.right, rotX, Space.World);

            // Inertiya uchun tezlikni yozib qo'yamiz
            _currentVelocity = delta * rotationSpeed * 60f * Time.deltaTime;
            _lastMousePos = currentMousePos;
        }
    }

    // ── Inertiya (qo'yib yuborgandan keyin sekin to'xtash) ───

    private void ApplyInertia()
    {
        if (_isDragging) return;
        if (_currentVelocity.sqrMagnitude < 0.001f) return;

        float rotY =  _currentVelocity.x * Time.deltaTime * 60f;
        float rotX = -_currentVelocity.y * Time.deltaTime * 60f;

        targetCube.Rotate(Vector3.up,    rotY, Space.World);
        targetCube.Rotate(Vector3.right, rotX, Space.World);

        // Her kadrda tezlikni pasaytiramiz
        _currentVelocity *= dampingFactor;
    }

    // ── Tashqi API: UI Bridge'dan chaqiriladi ─────────────────

    /// <summary>
    /// UIViewportBridge bu metoddan foydalanadi.
    /// Sichqoncha UI Toolkit paneli ustiga kirdi → drag o'chir.
    /// </summary>
    public void SetPointerOverUI(bool value)
    {
        isPointerOverUI = value;
    }
}
