using UnityEngine;

public class VoxelRuntimeGizmo : MonoBehaviour
{
    public Transform targetTransform;
    public ProceduralCuboid targetCuboid;
    public Camera viewportCamera;

    [Header("O'qlar Sozlamalari")]
    public float handleLength = 1.5f;
    public float handleDetectionRadius = 0.3f;

    private enum TransformAxis { None, X, Y, Z }
    private TransformAxis _selectedAxis = TransformAxis.None;
    private Vector3 _dragStartMousePos;
    private Vector3 _initialCuboidSize;

    void Update()
    {
        if (targetTransform == null || viewportCamera == null || targetCuboid == null) return;

        HandleInput();
    }

    private void HandleInput()
    {
        // 1. Sichqoncha bosilganda - Raycast orqali rangli o'qqa tekkanini tekshiramiz
        if (Input.GetMouseButtonDown(0))
        {
            Ray ray = viewportCamera.ScreenPointToRay(Input.mousePosition);
            _selectedAxis = DetectAxisClick(ray);

            if (_selectedAxis != TransformAxis.None)
            {
                _dragStartMousePos = Input.mousePosition;
                _initialCuboidSize = targetCuboid.Size;
            }
        }

        // 2. Sichqoncha qo'yib yuborilmasdan sudralsa (Drag) - Kub o'lchamini o'zgartiramiz
        if (Input.GetMouseButton(0) && _selectedAxis != TransformAxis.None)
        {
            Vector3 currentMousePos = Input.mousePosition;
            float deltaDelta = (currentMousePos.x - _dragStartMousePos.x) + (currentMousePos.y - _dragStartMousePos.y);
            float sensitivity = 0.1f; // Sezgirlik (Tezlik)

            Vector3 newSize = _initialCuboidSize;

            switch (_selectedAxis)
            {
                case TransformAxis.X:
                    newSize.x = Mathf.Max(1f, _initialCuboidSize.x + deltaDelta * sensitivity);
                    break;
                case TransformAxis.Y:
                    newSize.y = Mathf.Max(1f, _initialCuboidSize.y + deltaDelta * sensitivity);
                    break;
                case TransformAxis.Z:
                    newSize.z = Mathf.Max(1f, _initialCuboidSize.z + deltaDelta * sensitivity);
                    break;
                }

            targetCuboid.Size = newSize;
        }

        // 3. Sichqoncha qo'yib yuborilganda o'qni bo'shatamiz
        if (Input.GetMouseButtonUp(0))
        {
            _selectedAxis = TransformAxis.None;
        }
    }

    // Sichqoncha nuri qaysi o'qqa yaqin kelganini aniqlovchi matematik algoritm
    private TransformAxis DetectAxisClick(Ray ray)
    {
        Vector3 origin = targetTransform.position;

        Vector3 axisX = targetTransform.right * handleLength;
        Vector3 axisY = targetTransform.up * handleLength;
        Vector3 axisZ = targetTransform.forward * handleLength;

        if (DistanceToLine(ray, origin, origin + axisX) < handleDetectionRadius) return TransformAxis.X;
        if (DistanceToLine(ray, origin, origin + axisY) < handleDetectionRadius) return TransformAxis.Y;
        if (DistanceToLine(ray, origin, origin + axisZ) < handleDetectionRadius) return TransformAxis.Z;

        return TransformAxis.None;
    }

    // Nur va 3D chiziq o'rtasidagi masofani hisoblash
    private float DistanceToLine(Ray ray, Vector3 p1, Vector3 p2)
    {
        Vector3 rayDir = ray.direction;
        Vector3 lineDir = p2 - p1;
        Vector3 p1ToRayOrigin = ray.origin - p1;

        float a = Vector3.Dot(rayDir, rayDir);
        float b = Vector3.Dot(rayDir, lineDir);
        float c = Vector3.Dot(lineDir, lineDir);
        float d = Vector3.Dot(rayDir, p1ToRayOrigin);
        float e = Vector3.Dot(lineDir, p1ToRayOrigin);

        float t = (b * d - a * e) / (b * b - a * c);
        t = Mathf.Clamp01(t);

        Vector3 closestPointOnLine = p1 + t * lineDir;
        Vector3 closestPointOnRay = ray.origin + (Vector3.Dot(closestPointOnLine - ray.origin, rayDir) / a) * rayDir;

        return Vector3.Distance(closestPointOnLine, closestPointOnRay);
    }

    // O'qlarni Unity muhitida vizual chizish (Faqat Editor-da ko'rinadi)
    void OnDrawGizmos()
    {
        if (targetTransform == null) return;

        Vector3 origin = targetTransform.position;

        // X o'qi - Qizil
        Gizmos.color = Color.red;
        Gizmos.DrawLine(origin, origin + targetTransform.right * handleLength);
        Gizmos.DrawWireSphere(origin + targetTransform.right * handleLength, 0.1f);

        // Y o'qi - Yashil
        Gizmos.color = Color.green;
        Gizmos.DrawLine(origin, origin + targetTransform.up * handleLength);
        Gizmos.DrawWireSphere(origin + targetTransform.up * handleLength, 0.1f);

        // Z o'qi - Ko'k
        Gizmos.color = Color.blue;
        Gizmos.DrawLine(origin, origin + targetTransform.forward * handleLength);
        Gizmos.DrawWireSphere(origin + targetTransform.forward * handleLength, 0.1f);
    }
}
