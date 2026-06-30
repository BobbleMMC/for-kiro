using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Custom block shakllari uchun mesh generatsiyasi.
/// Minecraft standart shakllarini (stairs, slabs, walls, fences) 
/// prosedural ravishda yaratadi.
///
/// Har bir shakl — bir nechta CuboidElement dan tashkil topadi.
/// MultiCuboidModelData formatida qaytariladi.
/// </summary>
public static class BlockShapeGenerator
{
    // ═══════════════════════════════════════════════════════════════════════
    // SLAB (Yarim blok — pastki yoki yuqori)
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Slab yaratish (yarim blok).
    /// </summary>
    /// <param name="isTop">true = yuqori slab, false = pastki slab</param>
    public static MultiCuboidModelData GenerateSlab(string name, bool isTop = false)
    {
        var model = new MultiCuboidModelData { modelName = name + "_slab" };
        
        float yFrom = isTop ? 8 : 0;
        float yTo = isTop ? 16 : 8;
        
        model.elements.Add(new CuboidElement
        {
            name = "slab",
            from = new Vector3(0, yFrom, 0),
            to = new Vector3(16, yTo, 16)
        });
        
        return model;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STAIRS (Zinapoya)
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Stairs yaratish (2 ta kuboiddan tashkil topgan zinapoya).
    /// </summary>
    public static MultiCuboidModelData GenerateStairs(string name)
    {
        var model = new MultiCuboidModelData { modelName = name + "_stairs" };
        
        // Pastki yarim (to'liq kenglikda)
        model.elements.Add(new CuboidElement
        {
            name = "bottom",
            from = new Vector3(0, 0, 0),
            to = new Vector3(16, 8, 16)
        });
        
        // Yuqori yarim (faqat orqa yarmi)
        model.elements.Add(new CuboidElement
        {
            name = "top",
            from = new Vector3(0, 8, 8),
            to = new Vector3(16, 16, 16)
        });
        
        return model;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WALL (Devor)
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Wall yaratish (markaziy ustun + ulanish qo'llari).
    /// </summary>
    public static MultiCuboidModelData GenerateWall(string name, bool north = false, bool south = false, bool east = false, bool west = false)
    {
        var model = new MultiCuboidModelData { modelName = name + "_wall" };
        
        // Markaziy ustun (doim mavjud)
        model.elements.Add(new CuboidElement
        {
            name = "post",
            from = new Vector3(4, 0, 4),
            to = new Vector3(12, 16, 12)
        });
        
        // Shimoliy ulanish
        if (north)
        {
            model.elements.Add(new CuboidElement
            {
                name = "wall_north",
                from = new Vector3(5, 0, 0),
                to = new Vector3(11, 14, 4)
            });
        }
        
        // Janubiy ulanish
        if (south)
        {
            model.elements.Add(new CuboidElement
            {
                name = "wall_south",
                from = new Vector3(5, 0, 12),
                to = new Vector3(11, 14, 16)
            });
        }
        
        // Sharqiy ulanish
        if (east)
        {
            model.elements.Add(new CuboidElement
            {
                name = "wall_east",
                from = new Vector3(12, 0, 5),
                to = new Vector3(16, 14, 11)
            });
        }
        
        // G'arbiy ulanish
        if (west)
        {
            model.elements.Add(new CuboidElement
            {
                name = "wall_west",
                from = new Vector3(0, 0, 5),
                to = new Vector3(4, 14, 11)
            });
        }
        
        return model;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FENCE (Panjara)
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Fence yaratish (ingichka ustun + gorizontal tayoqlar).
    /// </summary>
    public static MultiCuboidModelData GenerateFence(string name, bool north = false, bool south = false, bool east = false, bool west = false)
    {
        var model = new MultiCuboidModelData { modelName = name + "_fence" };
        
        // Markaziy ustun (ingichka)
        model.elements.Add(new CuboidElement
        {
            name = "post",
            from = new Vector3(6, 0, 6),
            to = new Vector3(10, 16, 10)
        });
        
        // Ulanish tayoqlari (2 ta gorizontal bar per side)
        if (north) AddFenceBars(model, "north", new Vector3(7, 6, 0), new Vector3(9, 9, 6), new Vector3(7, 12, 0), new Vector3(9, 15, 6));
        if (south) AddFenceBars(model, "south", new Vector3(7, 6, 10), new Vector3(9, 9, 16), new Vector3(7, 12, 10), new Vector3(9, 15, 16));
        if (east) AddFenceBars(model, "east", new Vector3(10, 6, 7), new Vector3(16, 9, 9), new Vector3(10, 12, 7), new Vector3(16, 15, 9));
        if (west) AddFenceBars(model, "west", new Vector3(0, 6, 7), new Vector3(6, 9, 9), new Vector3(0, 12, 7), new Vector3(6, 15, 9));
        
        return model;
    }

    private static void AddFenceBars(MultiCuboidModelData model, string dir, 
        Vector3 barLowFrom, Vector3 barLowTo, Vector3 barHighFrom, Vector3 barHighTo)
    {
        model.elements.Add(new CuboidElement
        {
            name = $"bar_low_{dir}",
            from = barLowFrom,
            to = barLowTo
        });
        model.elements.Add(new CuboidElement
        {
            name = $"bar_high_{dir}",
            from = barHighFrom,
            to = barHighTo
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TRAPDOOR (Tuynuk qopqog'i)
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Trapdoor yaratish (yupqa panel — ochiq yoki yopiq).
    /// </summary>
    public static MultiCuboidModelData GenerateTrapdoor(string name, bool isOpen = false, bool isTop = false)
    {
        var model = new MultiCuboidModelData { modelName = name + "_trapdoor" };
        
        if (isOpen)
        {
            // Ochiq holat — vertikal (devorga yopishgan)
            model.elements.Add(new CuboidElement
            {
                name = "trapdoor_open",
                from = new Vector3(0, 0, 13),
                to = new Vector3(16, 16, 16)
            });
        }
        else
        {
            // Yopiq holat — gorizontal
            float yFrom = isTop ? 13 : 0;
            float yTo = isTop ? 16 : 3;
            
            model.elements.Add(new CuboidElement
            {
                name = "trapdoor_closed",
                from = new Vector3(0, yFrom, 0),
                to = new Vector3(16, yTo, 16)
            });
        }
        
        return model;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BUTTON (Tugma)
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Button yaratish (kichik kuboid — devorga yopishgan).
    /// </summary>
    public static MultiCuboidModelData GenerateButton(string name, bool pressed = false)
    {
        var model = new MultiCuboidModelData { modelName = name + "_button" };
        
        float depth = pressed ? 1 : 2;
        
        model.elements.Add(new CuboidElement
        {
            name = "button",
            from = new Vector3(5, 0, 6),
            to = new Vector3(11, depth, 10)
        });
        
        return model;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRESSURE PLATE (Bosim plitasi)
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Pressure Plate yaratish (yupqa plita).
    /// </summary>
    public static MultiCuboidModelData GeneratePressurePlate(string name, bool pressed = false)
    {
        var model = new MultiCuboidModelData { modelName = name + "_pressure_plate" };
        
        float height = pressed ? 0.5f : 1;
        
        model.elements.Add(new CuboidElement
        {
            name = "plate",
            from = new Vector3(1, 0, 1),
            to = new Vector3(15, height, 15)
        });
        
        return model;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PILLAR (Ustun blok — log, quartz pillar)
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Pillar yaratish (markaziy silindr uslubida).
    /// </summary>
    public static MultiCuboidModelData GeneratePillar(string name)
    {
        var model = new MultiCuboidModelData { modelName = name + "_pillar" };
        
        // Asosiy tanasi
        model.elements.Add(new CuboidElement
        {
            name = "pillar_body",
            from = new Vector3(2, 0, 2),
            to = new Vector3(14, 16, 14)
        });
        
        // Pastki baza (kengayish)
        model.elements.Add(new CuboidElement
        {
            name = "pillar_base",
            from = new Vector3(1, 0, 1),
            to = new Vector3(15, 2, 15)
        });
        
        // Yuqori qalpoq
        model.elements.Add(new CuboidElement
        {
            name = "pillar_cap",
            from = new Vector3(1, 14, 1),
            to = new Vector3(15, 16, 15)
        });
        
        return model;
    }
}
