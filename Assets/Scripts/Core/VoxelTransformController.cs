using UnityEngine;

[RequireComponent(typeof(ProceduralCuboid))]
public class VoxelTransformController : MonoBehaviour
{
    [Header("Pivot Point (Minecraft Piksellarida)")]
    [SerializeField] private Vector3 pivotPoint = new Vector3(0f, 0f, 0f);
    [SerializeField] private Vector3 currentRotation = new Vector3(0f, 0f, 0f);

    private ProceduralCuboid _cuboid;
    private Transform _pivotParent;

    public Vector3 PivotPoint
    {
        get => pivotPoint;
        set
        {
            pivotPoint = value;
            ApplyPivotAndTransform();
        }
    }

    public Vector3 CurrentRotation
    {
        get => currentRotation;
        set
        {
            currentRotation = value;
            ApplyPivotAndTransform();
        }
    }

    void Awake()
    {
        _cuboid = GetComponent<ProceduralCuboid>();
        CreatePivotHierarchy();
    }

    // Gibrid ierarxiya yaratish: Kubni Pivot boshqaruvchi Ota (Parent) obyekt ichiga o'raymiz
    private void CreatePivotHierarchy()
    {
        if (transform.parent != null && transform.parent.name.EndsWith("_Pivot"))
        {
            _pivotParent = transform.parent;
            return;
        }

        GameObject pivotGo = new GameObject(gameObject.name + "_Pivot");
        _pivotParent = pivotGo.transform;
        
        // Pozitsiyalarni to'g'rilash
        _pivotParent.position = transform.position;
        _pivotParent.rotation = transform.rotation;
        
        transform.SetParent(_pivotParent);
        transform.localPosition = Vector3.zero;
        transform.localRotation = Quaternion.identity;
    }

    // Blockbench matematikasi asosida Pivot va Transformlarni qo'llash
    public void ApplyPivotAndTransform()
    {
        if (_pivotParent == null || _cuboid == null) return;

        // Minecraft piksellarini Unity o'lchamiga o'tkazish (16 piksel = 1 metr)
        Vector3 unityPivot = pivotPoint / 16f;

        // 1. Ota obyektni yangi Pivot nuqtasiga ko'chiramiz
        Vector3 globalPivotPos = transform.parent.position; // agar asosi bo'lsa
        _pivotParent.position = transform.TransformPoint(unityPivot - transform.localPosition);

        // 2. Kuboidning o'zini esa vizual o'rnidan jilmasligi uchun teskari yo'nalishga suramiz
        transform.localPosition = -unityPivot;

        // 3. Aylanishni faqat Pivot Ota (Parent) obyektiga beramiz
        _pivotParent.localRotation = Quaternion.Euler(currentRotation);
    }
}
