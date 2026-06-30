using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Tekstura painter uchun Undo/Redo tizimi.
/// Har bir chizish amalini saqlaydi va Ctrl+Z/Y bilan qaytarish imkonini beradi.
/// 
/// Ishlash printsipi:
///   • Har bir "stroke" (sichqoncha bosilishi → qo'yilishi) bitta UndoAction
///   • UndoAction: o'zgartirilgan piksellar ro'yxati (oldingi va yangi ranglar)
///   • Stack asosida: undo → pop from undoStack, push to redoStack
/// </summary>
[System.Serializable]
public class PixelChange
{
    public int index;           // Piksel indeksi (0-255 for 16x16)
    public Color oldColor;      // Eski rang (undo uchun)
    public Color newColor;      // Yangi rang (redo uchun)
    
    public PixelChange(int idx, Color oldCol, Color newCol)
    {
        index = idx;
        oldColor = oldCol;
        newColor = newCol;
    }
}

[System.Serializable]
public class UndoAction
{
    public string actionName;              // "Pencil Stroke", "Bucket Fill", etc.
    public List<PixelChange> changes;      // Bu amaldagi barcha piksel o'zgarishlari
    public long timestamp;                 // Vaqt belgisi
    
    public UndoAction(string name)
    {
        actionName = name;
        changes = new List<PixelChange>();
        timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    }
}

/// <summary>
/// Undo/Redo stack boshqaruvchisi.
/// Texture painter bilan integratsiya qilinadi.
/// </summary>
public class PainterUndoSystem
{
    // Stack lar
    private Stack<UndoAction> _undoStack = new Stack<UndoAction>();
    private Stack<UndoAction> _redoStack = new Stack<UndoAction>();
    
    // Joriy "stroke" — sichqoncha bosilganidan qo'yilguncha
    private UndoAction _currentAction = null;
    
    // Sozlamalar
    private int _maxUndoLevels = 50;
    
    // Piksel massiviga reference (tashqaridan beriladi)
    private Color[] _pixels;
    
    /// <summary>
    /// Undo stack dagi amallar soni.
    /// </summary>
    public int UndoCount => _undoStack.Count;
    
    /// <summary>
    /// Redo stack dagi amallar soni.
    /// </summary>
    public int RedoCount => _redoStack.Count;
    
    /// <summary>
    /// Undo mumkinmi?
    /// </summary>
    public bool CanUndo => _undoStack.Count > 0;
    
    /// <summary>
    /// Redo mumkinmi?
    /// </summary>
    public bool CanRedo => _redoStack.Count > 0;
    
    // ═══════════════════════════════════════════════════════════════════════
    // KONSTRUKTOR
    // ═══════════════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Undo tizimini yaratish.
    /// </summary>
    /// <param name="pixels">Painter dagi piksel massiviga reference</param>
    /// <param name="maxLevels">Maksimal undo darajasi (standart: 50)</param>
    public PainterUndoSystem(Color[] pixels, int maxLevels = 50)
    {
        _pixels = pixels;
        _maxUndoLevels = maxLevels;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // STROKE BOSHQARUVI
    // ═══════════════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Yangi chizish amalini boshlash (sichqoncha bosildi).
    /// </summary>
    public void BeginStroke(string actionName = "Paint")
    {
        _currentAction = new UndoAction(actionName);
    }
    
    /// <summary>
    /// Piksel o'zgarishini qayd etish (stroke davomida).
    /// </summary>
    public void RecordPixelChange(int index, Color oldColor, Color newColor)
    {
        if (_currentAction == null)
        {
            // Agar BeginStroke chaqirilmagan bo'lsa, avtomatik boshlash
            BeginStroke("Quick Paint");
        }
        
        // Faqat haqiqiy o'zgarishlarni saqlash
        if (!ColorsEqual(oldColor, newColor))
        {
            _currentAction.changes.Add(new PixelChange(index, oldColor, newColor));
        }
    }
    
    /// <summary>
    /// Chizish amalini tugatish (sichqoncha qo'yib yuborildi).
    /// </summary>
    public void EndStroke()
    {
        if (_currentAction == null) return;
        
        // Faqat haqiqiy o'zgarishlar bo'lsa saqlash
        if (_currentAction.changes.Count > 0)
        {
            _undoStack.Push(_currentAction);
            
            // Redo stack ni tozalash (yangi amal qilinganda redo bekor bo'ladi)
            _redoStack.Clear();
            
            // Maksimal darajadan oshsa, eng eski amalni o'chirish
            TrimStack();
        }
        
        _currentAction = null;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // UNDO / REDO
    // ═══════════════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Oxirgi amalni bekor qilish (Ctrl+Z).
    /// Piksel massivini o'zgartiradi.
    /// </summary>
    /// <returns>O'zgartirilgan piksel indekslari (UI yangilash uchun)</returns>
    public List<int> Undo()
    {
        var changedIndices = new List<int>();
        
        if (!CanUndo) return changedIndices;
        
        UndoAction action = _undoStack.Pop();
        
        // Barcha o'zgarishlarni teskari tartibda qo'llash
        for (int i = action.changes.Count - 1; i >= 0; i--)
        {
            var change = action.changes[i];
            _pixels[change.index] = change.oldColor;
            changedIndices.Add(change.index);
        }
        
        // Redo stackga qo'shish
        _redoStack.Push(action);
        
        return changedIndices;
    }
    
    /// <summary>
    /// Bekor qilingan amalni qaytarish (Ctrl+Y / Ctrl+Shift+Z).
    /// Piksel massivini o'zgartiradi.
    /// </summary>
    /// <returns>O'zgartirilgan piksel indekslari (UI yangilash uchun)</returns>
    public List<int> Redo()
    {
        var changedIndices = new List<int>();
        
        if (!CanRedo) return changedIndices;
        
        UndoAction action = _redoStack.Pop();
        
        // Barcha o'zgarishlarni to'g'ri tartibda qo'llash
        foreach (var change in action.changes)
        {
            _pixels[change.index] = change.newColor;
            changedIndices.Add(change.index);
        }
        
        // Undo stackga qaytarish
        _undoStack.Push(action);
        
        return changedIndices;
    }
    
    /// <summary>
    /// Barcha tarixni tozalash.
    /// </summary>
    public void Clear()
    {
        _undoStack.Clear();
        _redoStack.Clear();
        _currentAction = null;
    }
    
    /// <summary>
    /// Oxirgi undo amal nomini olish (UI uchun: "Undo: Bucket Fill").
    /// </summary>
    public string GetUndoActionName()
    {
        if (!CanUndo) return "";
        return _undoStack.Peek().actionName;
    }
    
    /// <summary>
    /// Oxirgi redo amal nomini olish.
    /// </summary>
    public string GetRedoActionName()
    {
        if (!CanRedo) return "";
        return _redoStack.Peek().actionName;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // BATCH OPERATIONS (Bucket Fill, Copy/Paste)
    // ═══════════════════════════════════════════════════════════════════════
    
    /// <summary>
    /// Bir nechta pikselni bir vaqtda o'zgartirish (batch).
    /// Bucket Fill, Paste, va Clear uchun ishlatiladi.
    /// </summary>
    public void RecordBatchChange(string actionName, Dictionary<int, Color> oldColors, Dictionary<int, Color> newColors)
    {
        var action = new UndoAction(actionName);
        
        foreach (var kvp in newColors)
        {
            int index = kvp.Key;
            Color newColor = kvp.Value;
            Color oldColor = oldColors.ContainsKey(index) ? oldColors[index] : Color.clear;
            
            if (!ColorsEqual(oldColor, newColor))
            {
                action.changes.Add(new PixelChange(index, oldColor, newColor));
                _pixels[index] = newColor;
            }
        }
        
        if (action.changes.Count > 0)
        {
            _undoStack.Push(action);
            _redoStack.Clear();
            TrimStack();
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════════════════════
    
    private void TrimStack()
    {
        // Stack ni List ga aylantirish va kesish
        if (_undoStack.Count > _maxUndoLevels)
        {
            var temp = new List<UndoAction>(_undoStack);
            _undoStack.Clear();
            
            // Faqat oxirgi N ta amalni saqlash
            for (int i = 0; i < _maxUndoLevels && i < temp.Count; i++)
            {
                _undoStack.Push(temp[temp.Count - 1 - i]);
            }
        }
    }
    
    private bool ColorsEqual(Color a, Color b)
    {
        return Mathf.Abs(a.r - b.r) < 0.001f &&
               Mathf.Abs(a.g - b.g) < 0.001f &&
               Mathf.Abs(a.b - b.b) < 0.001f &&
               Mathf.Abs(a.a - b.a) < 0.001f;
    }
}
