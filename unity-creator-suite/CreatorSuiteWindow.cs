using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

/// <summary>
/// Creator Suite — a polished, Minecraft-themed Mod Studio shell.
/// Built entirely in C# UI Toolkit (no UXML) to avoid the HelpBox/snippet
/// overlap rendering bug seen on some Unity versions.
///
/// Contains three live views:
///   1) Dashboard   — stat cards + element editor cards + recent work
///   2) Texture     — working pixel painter (pencil/eraser/fill/picker,
///                    palette, undo/redo, zoom, PNG export, live preview)
///   3) Block       — property form with live preview + generated Java code
///
/// Open via:  Mod Studio ▸ Creator Suite
/// </summary>
public class CreatorSuiteWindow : EditorWindow
{
    // ---- palette / theme ----------------------------------------------------
    private static Color C(string hex){ ColorUtility.TryParseHtmlString(hex, out var c); return c; }
    private static readonly Color BG    = C("#0e1116");
    private static readonly Color BG2   = C("#141922");
    private static readonly Color PANEL = C("#1a2029");
    private static readonly Color PANEL2= C("#202836");
    private static readonly Color LINE  = C("#2a3340");
    private static readonly Color LINE2 = C("#36424f");
    private static readonly Color TEXT  = C("#e7edf3");
    private static readonly Color MUTED = C("#8a97a6");
    private static readonly Color FAINT = C("#5c6776");
    private static readonly Color GREEN = C("#5fbf4f");
    private static readonly Color GREEND= C("#3d8b34");
    private static readonly Color GRASS = C("#7cc14e");
    private static readonly Color AMBER = C("#e0a93b");
    private static readonly Color VIOLET= C("#9b6cff");
    private static readonly Color CYAN  = C("#46c7d8");
    private static readonly Color RED    = C("#e0564b");

    private VisualElement _content;          // swappable main area
    private readonly List<Button> _navButtons = new List<Button>();

    [MenuItem("Mod Studio/Creator Suite", priority = 1)]
    [MenuItem("Tools/Mod Studio/Creator Suite", priority = 1)]
    public static void Open()
    {
        var w = GetWindow<CreatorSuiteWindow>();
        w.titleContent = new GUIContent("Creator Suite");
        w.minSize = new Vector2(1180, 760);
        w.Show();
    }

    private void CreateGUI()
    {
        var root = rootVisualElement;
        root.Clear();
        root.style.flexGrow = 1;
        root.style.flexDirection = FlexDirection.Row;
        root.style.backgroundColor = BG;

        BuildSidebar(root);

        var main = new VisualElement();
        main.style.flexGrow = 1;
        main.style.flexDirection = FlexDirection.Column;
        root.Add(main);

        BuildTopBar(main);

        _content = new ScrollView();
        _content.style.flexGrow = 1;
        SetPadding(_content, 22);
        main.Add(_content);

        ShowDashboard();
    }

    // =========================================================================
    // SIDEBAR
    // =========================================================================
    private void BuildSidebar(VisualElement root)
    {
        var side = new VisualElement();
        side.style.width = 240;
        side.style.flexShrink = 0;
        side.style.backgroundColor = BG2;
        side.style.borderRightWidth = 1; side.style.borderRightColor = LINE;
        SetPadding(side, 16);
        root.Add(side);

        // brand
        var brand = Row();
        brand.style.alignItems = Align.Center;
        brand.style.marginBottom = 22;
        var cube = new VisualElement();
        cube.style.width = 34; cube.style.height = 34; cube.style.flexShrink = 0;
        cube.style.backgroundColor = GREEN; Round(cube, 8);
        cube.style.borderTopWidth = 3; cube.style.borderTopColor = GRASS;
        cube.style.borderBottomWidth = 3; cube.style.borderBottomColor = GREEND;
        brand.Add(cube);
        var bt = new VisualElement(); bt.style.marginLeft = 11;
        var bn = new Label("MOD STUDIO"); bn.style.color = TEXT; bn.style.unityFontStyleAndWeight = FontStyle.Bold; bn.style.fontSize = 14;
        var bs = new Label("CREATOR SUITE"); bs.style.color = MUTED; bs.style.fontSize = 9; bs.style.letterSpacing = 2;
        bt.Add(bn); bt.Add(bs); brand.Add(bt);
        side.Add(brand);

        // nav
        NavButton(side, "▦  Dashboard", ShowDashboard, true);
        NavButton(side, "🖌  Texture Editor", ShowTexture, false);
        NavButton(side, "🧊  Block Editor", ShowBlock, false);

        var lbl = new Label("ELEMENTS");
        lbl.style.color = FAINT; lbl.style.fontSize = 9; lbl.style.letterSpacing = 1.5f;
        lbl.style.marginTop = 14; lbl.style.marginBottom = 4; lbl.style.marginLeft = 8;
        side.Add(lbl);
        NavButton(side, "⚔  Items", ShowItem, false);
        NavButton(side, "🐺  Entities", ShowEntity, false);
        NavButton(side, "🌲  World", ShowBiome, false);
        NavButton(side, "✦  Effects & FX", ShowParticle, false);

        var spacer = new VisualElement(); spacer.style.flexGrow = 1; side.Add(spacer);

        // project card
        var pc = Panel(); pc.style.marginTop = 10;
        var ptop = new Label("● ACTIVE PROJECT"); ptop.style.color = GREEN; ptop.style.fontSize = 10; ptop.style.letterSpacing = 1;
        var pn = new Label("Twilight Realm"); pn.style.color = TEXT; pn.style.unityFontStyleAndWeight = FontStyle.Bold; pn.style.fontSize = 14; pn.style.marginTop = 6;
        var pm = new Label("NeoForge · 1.20.1"); pm.style.color = MUTED; pm.style.fontSize = 11; pm.style.marginBottom = 8;
        var bar = new VisualElement(); bar.style.height = 6; bar.style.backgroundColor = BG; Round(bar, 4);
        var fill = new VisualElement(); fill.style.height = 6; fill.style.width = Length.Percent(62); fill.style.backgroundColor = GREEN; Round(fill, 4); bar.Add(fill);
        var ps = new Label("62% complete · 148 elements"); ps.style.color = FAINT; ps.style.fontSize = 10; ps.style.marginTop = 6;
        pc.Add(ptop); pc.Add(pn); pc.Add(pm); pc.Add(bar); pc.Add(ps);
        side.Add(pc);
    }

    private void NavButton(VisualElement parent, string text, Action onClick, bool active)
    {
        var b = new Button(onClick){ text = text };
        b.style.unityTextAlign = TextAnchor.MiddleLeft;
        b.style.height = 38; b.style.marginBottom = 2;
        b.style.backgroundColor = active ? PANEL : Color.clear;
        b.style.color = active ? TEXT : MUTED;
        ClearBorder(b); Round(b, 9);
        b.style.fontSize = 13;
        b.RegisterCallback<MouseEnterEvent>(_=> { if(!_navButtons.Contains(b) || b.userData==null) b.style.backgroundColor = PANEL; });
        b.RegisterCallback<MouseLeaveEvent>(_=> { if((bool?)b.userData != true) b.style.backgroundColor = Color.clear; });
        b.userData = active;
        if(active) b.style.backgroundColor = PANEL;
        _navButtons.Add(b);
        parent.Add(b);
    }

    private void SetActiveNav(string label)
    {
        foreach(var b in _navButtons)
        {
            bool on = b.text.Contains(label);
            b.userData = on;
            b.style.backgroundColor = on ? PANEL : Color.clear;
            b.style.color = on ? TEXT : MUTED;
            if(on){ b.style.borderLeftWidth = 2; b.style.borderLeftColor = GREEN; }
            else b.style.borderLeftWidth = 0;
        }
    }

    // =========================================================================
    // TOP BAR
    // =========================================================================
    private Label _title, _sub;
    private void BuildTopBar(VisualElement parent)
    {
        var bar = Row();
        bar.style.height = 64; bar.style.flexShrink = 0;
        bar.style.alignItems = Align.Center;
        bar.style.justifyContent = Justify.SpaceBetween;
        bar.style.paddingLeft = 22; bar.style.paddingRight = 22;
        bar.style.borderBottomWidth = 1; bar.style.borderBottomColor = LINE;
        bar.style.backgroundColor = BG2;
        parent.Add(bar);

        var left = new VisualElement();
        _title = new Label("Dashboard"); _title.style.color = TEXT; _title.style.fontSize = 19; _title.style.unityFontStyleAndWeight = FontStyle.Bold;
        _sub = new Label("Manage every element of your mod"); _sub.style.color = MUTED; _sub.style.fontSize = 12;
        left.Add(_title); left.Add(_sub); bar.Add(left);

        var right = Row(); right.style.alignItems = Align.Center;
        var build = PillButton("⌁ Build", PANEL2, TEXT, ()=> Debug.Log("[Creator Suite] Build"));
        var run = PillButton("▶ Run", GREEN, Color.white, ()=> Debug.Log("[Creator Suite] Run"));
        build.style.marginRight = 8;
        right.Add(build); right.Add(run);
        bar.Add(right);
    }

    private void SetHeader(string t, string s){ _title.text = t; _sub.text = s; }

    // =========================================================================
    // DASHBOARD VIEW
    // =========================================================================
    private struct Ed { public string icon, name, desc; public Color accent; public Action go;
        public Ed(string i,string n,string d,Color a,Action g){icon=i;name=n;desc=d;accent=a;go=g;} }

    private TextField _expModId, _expPkg;

    private class ModElement { public string kind, id, code; public Color[] tex; }
    private readonly List<ModElement> _project = new List<ModElement>();

    private void Upsert(string kind, string id, string code, bool withTex)
    {
        if(string.IsNullOrEmpty(id)) id = kind;
        var el = _project.Find(e => e.kind == kind && e.id == id);
        if(el == null){ el = new ModElement{ kind = kind, id = id }; _project.Add(el); }
        el.code = code;
        if(withTex){ if(_layers == null) SeedTexture(); el.tex = Composite(); }
    }
    private void SaveElement(string kind, string id, string code, bool withTex)
    {
        Upsert(kind, id, code, withTex);
        this.ShowNotification(new GUIContent("Saved " + kind + " \"" + (string.IsNullOrEmpty(id)?kind:id) + "\" to project"));
        if(_projectList != null) RefreshProjectUI();
    }
    private void CaptureOpenEditors()
    {
        if(_codeLabel != null && _bId != null) Upsert("block", _bId.value, _codeLabel.text, true);
        if(_iCode != null && _iId != null)     Upsert("item", _iId.value, _iCode.text, true);
        if(_pCode != null && _pId != null)      Upsert("particle", _pId.value, _pCode.text, false);
        if(_eCode != null && _eId != null)       Upsert("entity", _eId.value, _eCode.text, false);
        if(_enCode != null && _enId != null)      Upsert("enchant", _enId.value, _enCode.text, false);
        if(_biCode != null && _biId != null)       Upsert("biome", _biId.value, _biCode.text, false);
        if(_stCode != null && _stId != null)        Upsert("structure", _stId.value, _stCode.text, false);
        if(_recCode != null){ string rn = (_result>=0 && _result<INGS.Length) ? INGS[_result].id : "result"; rn = rn.Substring(rn.IndexOf(':')+1); Upsert("recipe", rn, _recCode.text, false); }
        if(_ltCode != null && _ltId != null)        Upsert("loot", _ltId.value, _ltCode.text, false);
        if(_adCode != null && _adId != null)         Upsert("advancement", _adId.value, _adCode.text, false);
        if(_soCode != null) Upsert("sound", (_soId != null && !string.IsNullOrEmpty(_soId.value)) ? _soId.value : "sound", _soCode.text, false);
    }

    private VisualElement _projectList;
    private void RefreshProjectUI()
    {
        if(_projectList == null) return;
        _projectList.Clear();
        if(_project.Count == 0){
            var empty = new Label("No elements saved yet. Use 💾 Save in any editor."); empty.style.color = FAINT; empty.style.fontSize = 12; _projectList.Add(empty); return;
        }
        foreach(var e in _project){
            var el = e;
            var row = Row(); row.style.alignItems = Align.Center; row.style.marginBottom = 6; row.style.paddingLeft = 10; row.style.paddingRight = 8; row.style.height = 34; Round(row, 8); row.style.backgroundColor = BG;
            var tag = new Label(el.kind.ToUpper()); tag.style.color = GREEN; tag.style.fontSize = 10; tag.style.width = 86; tag.style.unityFontStyleAndWeight = FontStyle.Bold;
            var nm = new Label(el.id); nm.style.color = TEXT; nm.style.fontSize = 12; nm.style.flexGrow = 1;
            var del = new Button(()=>{ _project.Remove(el); RefreshProjectUI(); }){ text = "✕" }; del.style.width = 24; del.style.height = 24; ClearBorder(del); Round(del,6); del.style.backgroundColor = Color.clear; del.style.color = RED;
            row.Add(tag); row.Add(nm); row.Add(del); _projectList.Add(row);
        }
    }

    private void ShowDashboard()
    {
        SetActiveNav("Dashboard"); SetHeader("Dashboard", "Manage every element of your mod");
        _content.Clear();

        // stat row
        var stats = Row(); stats.style.marginBottom = 22; stats.style.flexWrap = Wrap.Wrap;
        stats.Add(StatCard("🧊", "312", "Blocks", GREEN));
        stats.Add(StatCard("⚔", "148", "Items", AMBER));
        stats.Add(StatCard("🐺", "63", "Entities", VIOLET));
        stats.Add(StatCard("🖼", "207", "Textures", CYAN));
        _content.Add(stats);

        // ---- Mod skeleton export ----
        var exP = Panel(); exP.style.marginBottom = 22;
        exP.Add(PanelHeader("Export Full Mod Project"));
        var exRow = Row(); exRow.style.alignItems = Align.FlexEnd; exRow.style.flexWrap = Wrap.Wrap;
        var f1 = new VisualElement(); f1.style.marginRight = 14; f1.style.minWidth = 200;
        var l1 = new Label("Mod ID"); l1.style.color = MUTED; l1.style.fontSize = 12; l1.style.marginBottom = 5;
        _expModId = new TextField(){ value = "frostmod" }; _expModId.style.minWidth = 200;
        f1.Add(l1); f1.Add(_expModId);
        var f2 = new VisualElement(); f2.style.marginRight = 14; f2.style.minWidth = 240;
        var l2 = new Label("Java Package"); l2.style.color = MUTED; l2.style.fontSize = 12; l2.style.marginBottom = 5;
        _expPkg = new TextField(){ value = "com.example.frostmod" }; _expPkg.style.minWidth = 240;
        f2.Add(l2); f2.Add(_expPkg);
        var exBtn = PillButton("📦 Export Mod Skeleton", GREEN, Color.white, ExportSkeletonPrompt); exBtn.style.height = 36;
        exRow.Add(f1); exRow.Add(f2); exRow.Add(exBtn);
        exP.Add(exRow);
        var exHint = new Label("Generates a complete NeoForge folder structure with registration classes, mods.toml, pack.mcmeta, assets & data folders.");
        exHint.style.color = FAINT; exHint.style.fontSize = 11; exHint.style.marginTop = 10; exHint.style.whiteSpace = WhiteSpace.Normal;
        exP.Add(exHint);
        _content.Add(exP);

        // ---- Project elements ----
        var prP = Panel(); prP.style.marginBottom = 22;
        var prh = Row(); prh.style.justifyContent = Justify.SpaceBetween; prh.style.alignItems = Align.Center; prh.style.marginBottom = 12;
        var prhl = new Label("PROJECT ELEMENTS"); prhl.style.color = MUTED; prhl.style.fontSize = 11; prhl.style.letterSpacing = 1; prhl.style.unityFontStyleAndWeight = FontStyle.Bold;
        var clearBtn = PillButton("Clear All", PANEL2, MUTED, ()=>{ _project.Clear(); RefreshProjectUI(); }); clearBtn.style.height = 26;
        prh.Add(prhl); prh.Add(clearBtn); prP.Add(prh);
        _projectList = new VisualElement(); prP.Add(_projectList);
        RefreshProjectUI();
        _content.Add(prP);

        _content.Add(SectionLabel("CREATE NEW ELEMENT"));

        var grid = new VisualElement();
        grid.style.flexDirection = FlexDirection.Row; grid.style.flexWrap = Wrap.Wrap;
        grid.style.marginBottom = 24;
        var eds = new List<Ed>{
            new Ed("🧊","Block","Full blocks, stairs, slabs, ores", GREEN, ShowBlock),
            new Ed("⚔","Item","Tools, weapons, food, materials", AMBER, ShowItem),
            new Ed("🐺","Entity","Mobs, bosses, animals & AI", VIOLET, ShowEntity),
            new Ed("🖌","Texture","Pixel-perfect painter", CYAN, ShowTexture),
            new Ed("📜","Recipe","Crafting, smelting, smithing", C("#d68a4e"), ShowRecipe),
            new Ed("✨","Enchantment","Custom enchants with effects", C("#7c8cff"), ShowEnchant),
            new Ed("✦","Particle","Sparks, glows & ambient FX", CYAN, ShowParticle),
            new Ed("🌲","Biome","Climate, colors & generation", GREEN, ShowBiome),
            new Ed("🏰","Structure","Dungeons, towers & ruins", C("#b0895e"), ShowStructure),
            new Ed("🏆","Advancement","Goals, triggers & rewards", C("#f5c542"), ShowAdvance),
            new Ed("🎁","Loot Table","Drops, chances & conditions", RED, ShowLoot),
            new Ed("🔊","Sound","SFX, music discs & ambience", CYAN, ShowSound),
        };
        foreach(var e in eds) grid.Add(EditorCard(e));
        _content.Add(grid);

        _content.Add(SectionLabel("RECENT WORK"));
        _content.Add(Recent("🧊","Twilight Mazestone","Block","2m ago"));
        _content.Add(Recent("⚔","Fiery Sword","Item · Weapon","18m ago"));
        _content.Add(Recent("🐺","Frost Wolf","Entity · Monster","1h ago"));
        _content.Add(Recent("🖼","aurora_block.png","Texture · 16×16","3h ago"));
    }

    private VisualElement StatCard(string icon, string num, string label, Color accent)
    {
        var c = Panel(); c.style.flexDirection = FlexDirection.Row; c.style.alignItems = Align.Center;
        c.style.marginRight = 14; c.style.marginBottom = 14; c.style.minWidth = 200; c.style.flexGrow = 1;
        var ic = new Label(icon); ic.style.fontSize = 22; ic.style.width = 46; ic.style.height = 46;
        ic.style.unityTextAlign = TextAnchor.MiddleCenter; Round(ic, 11);
        ic.style.backgroundColor = new Color(accent.r, accent.g, accent.b, 0.15f); ic.style.marginRight = 14;
        c.Add(ic);
        var tx = new VisualElement();
        var n = new Label(num); n.style.color = TEXT; n.style.fontSize = 21; n.style.unityFontStyleAndWeight = FontStyle.Bold;
        var l = new Label(label); l.style.color = MUTED; l.style.fontSize = 12;
        tx.Add(n); tx.Add(l); c.Add(tx);
        return c;
    }

    private VisualElement EditorCard(Ed e)
    {
        var card = Panel();
        card.style.width = 195; card.style.marginRight = 14; card.style.marginBottom = 14;
        card.RegisterCallback<MouseEnterEvent>(_=>{ card.style.borderTopColor=card.style.borderBottomColor=card.style.borderLeftColor=card.style.borderRightColor=e.accent; card.style.backgroundColor = PANEL2; });
        card.RegisterCallback<MouseLeaveEvent>(_=>{ card.style.borderTopColor=card.style.borderBottomColor=card.style.borderLeftColor=card.style.borderRightColor=LINE; card.style.backgroundColor = PANEL; });
        card.RegisterCallback<MouseDownEvent>(_=> e.go?.Invoke());

        var ic = new Label(e.icon); ic.style.fontSize = 26; ic.style.width = 52; ic.style.height = 52;
        ic.style.unityTextAlign = TextAnchor.MiddleCenter; Round(ic, 13);
        ic.style.backgroundColor = new Color(e.accent.r, e.accent.g, e.accent.b, 0.14f);
        ic.style.color = e.accent; ic.style.marginBottom = 12;
        card.Add(ic);
        var n = new Label(e.name); n.style.color = TEXT; n.style.fontSize = 15; n.style.unityFontStyleAndWeight = FontStyle.Bold; n.style.marginBottom = 4;
        var d = new Label(e.desc); d.style.color = MUTED; d.style.fontSize = 11; d.style.whiteSpace = WhiteSpace.Normal;
        card.Add(n); card.Add(d);
        return card;
    }

    private VisualElement Recent(string icon, string name, string type, string time)
    {
        var r = Panel(); r.style.flexDirection = FlexDirection.Row; r.style.alignItems = Align.Center;
        r.style.marginBottom = 8; r.style.paddingTop = 11; r.style.paddingBottom = 11;
        var t = new Label(icon); t.style.fontSize = 18; t.style.width = 38; t.style.height = 38; t.style.unityTextAlign = TextAnchor.MiddleCenter;
        t.style.backgroundColor = BG; Round(t, 8); t.style.marginRight = 14; r.Add(t);
        var col = new VisualElement(); col.style.flexGrow = 1;
        var n = new Label(name); n.style.color = TEXT; n.style.fontSize = 13; n.style.unityFontStyleAndWeight = FontStyle.Bold;
        var ty = new Label(type); ty.style.color = MUTED; ty.style.fontSize = 11;
        col.Add(n); col.Add(ty); r.Add(col);
        var tm = new Label(time); tm.style.color = FAINT; tm.style.fontSize = 11; r.Add(tm);
        return r;
    }

    // =========================================================================
    // TEXTURE EDITOR VIEW
    // =========================================================================
    private const int TEX = 16;
    private class TexLayer { public Color[] px = new Color[TEX*TEX]; public bool visible = true; public float opacity = 1f; public string name; public TexLayer(string n){ name = n; } }
    private List<TexLayer> _layers;     // index 0 = top-most
    private int _active;
    private Color[] Px => _layers[_active].px;
    private struct Snap { public int layer; public Color[] px; }
    private readonly List<Snap> _undo = new List<Snap>();
    private readonly List<Snap> _redo = new List<Snap>();
    private VisualElement _layersList;
    private Texture2D _texCanvas, _texPreview;
    private Image _canvasImg, _previewImg;
    private Color _brush = C("#7d7d7d");
    private string _tool = "pencil";
    private int _cell = 22;
    private Color[] _dragSnap; private Vector2Int _dragStart = new Vector2Int(-1,-1); private bool _dragging;
    private VisualElement _swatchActive; private Label _hexLabel;
    private readonly List<Button> _toolButtons = new List<Button>();

    private static readonly string[] PAL = {
        "#000000","#3c3c3c","#7d7d7d","#b8b8b8","#ffffff","#5e3b1e","#9b6a35","#caa472",
        "#7a3b1d","#c0392b","#e0564b","#e0a93b","#f5c542","#3d8b34","#5fbf4f","#7cc14e",
        "#1f6f8b","#46c7d8","#2c4a8c","#5e7ce0","#3a1b6e","#9b6cff","#c060c0","#e08fd0" };

    private void ShowTexture()
    {
        SetActiveNav("Texture"); SetHeader("Texture Editor", "Paint pixel-perfect textures · Blockbench-style");
        _content.Clear();
        if(_layers == null) SeedTexture();

        var shell = Row(); shell.style.flexGrow = 1;

        // tool rail
        var rail = Panel(); rail.style.width = 52; rail.style.flexShrink = 0; rail.style.alignItems = Align.Center; rail.style.marginRight = 14;
        SetPaddingV(rail, 8); _toolButtons.Clear();
        ToolButton(rail, "✏", "pencil"); ToolButton(rail, "⌫", "eraser");
        ToolButton(rail, "🪣", "fill"); ToolButton(rail, "⊙", "picker");
        ToolButton(rail, "╱", "line"); ToolButton(rail, "▭", "rect");
        var sep = new VisualElement(); sep.style.height = 1; sep.style.width = 26; sep.style.backgroundColor = LINE; sep.style.marginTop = 6; sep.style.marginBottom = 6; rail.Add(sep);
        RailAction(rail, "↶", Undo); RailAction(rail, "↷", Redo); RailAction(rail, "🗑", ClearCanvas);
        shell.Add(rail);

        // canvas stage
        var stage = Panel(); stage.style.flexGrow = 1; stage.style.marginRight = 14; SetPadding(stage, 0); stage.style.overflow = Overflow.Hidden;
        var sbar = Row(); sbar.style.alignItems = Align.Center; SetPadding(sbar, 12); sbar.style.borderBottomWidth = 1; sbar.style.borderBottomColor = LINE;
        sbar.Add(Chip("🖼 stone.png", PANEL2, TEXT)); var c2 = Chip("16 × 16", PANEL2, MUTED); c2.style.marginLeft = 8; sbar.Add(c2);
        var sp = new VisualElement(); sp.style.flexGrow = 1; sbar.Add(sp);
        var zoom = new Slider(10, 34){ value = _cell }; zoom.style.width = 130;
        var zlbl = new Label("Zoom"); zlbl.style.color = MUTED; zlbl.style.fontSize = 12; zlbl.style.marginRight = 6; zlbl.style.unityTextAlign = TextAnchor.MiddleCenter;
        zoom.RegisterValueChangedCallback(ev=>{ _cell = Mathf.RoundToInt(ev.newValue); _canvasImg.style.width = TEX*_cell; _canvasImg.style.height = TEX*_cell; });
        sbar.Add(zlbl); sbar.Add(zoom);
        var exp = PillButton("⭳ Export PNG", GREEN, Color.white, ExportPng); exp.style.marginLeft = 8; sbar.Add(exp);
        stage.Add(sbar);

        var wrap = new VisualElement(); wrap.style.flexGrow = 1; wrap.style.alignItems = Align.Center; wrap.style.justifyContent = Justify.Center;
        wrap.style.backgroundColor = C("#0c1014"); SetPadding(wrap, 24);
        _canvasImg = new Image(); _canvasImg.scaleMode = ScaleMode.ScaleToFit;
        _canvasImg.style.width = TEX*_cell; _canvasImg.style.height = TEX*_cell;
        _canvasImg.RegisterCallback<MouseDownEvent>(OnCanvasDown);
        _canvasImg.RegisterCallback<MouseMoveEvent>(OnCanvasMove);
        _canvasImg.RegisterCallback<MouseUpEvent>(OnCanvasUp);
        wrap.Add(_canvasImg); stage.Add(wrap);
        shell.Add(stage);

        // side panels
        var sidep = new VisualElement(); sidep.style.width = 270; sidep.style.flexShrink = 0;
        var palP = Panel(); palP.style.marginBottom = 14;
        palP.Add(PanelHeader("Palette"));
        var palGrid = new VisualElement(); palGrid.style.flexDirection = FlexDirection.Row; palGrid.style.flexWrap = Wrap.Wrap;
        foreach(var hex in PAL){
            var sw = new VisualElement(); sw.style.width = 26; sw.style.height = 26; sw.style.marginRight = 4; sw.style.marginBottom = 4;
            Round(sw, 6); sw.style.backgroundColor = C(hex);
            var captured = C(hex);
            sw.RegisterCallback<MouseDownEvent>(_=> SetBrush(captured));
            palGrid.Add(sw);
        }
        palP.Add(palGrid);
        var crow = Row(); crow.style.alignItems = Align.Center; crow.style.marginTop = 10;
        _swatchActive = new VisualElement(); _swatchActive.style.width = 40; _swatchActive.style.height = 40; Round(_swatchActive, 9); _swatchActive.style.backgroundColor = _brush; _swatchActive.style.marginRight = 10;
        _hexLabel = new Label("#7D7D7D"); _hexLabel.style.color = MUTED; _hexLabel.style.fontSize = 16;
        crow.Add(_swatchActive); crow.Add(_hexLabel); palP.Add(crow);
        sidep.Add(palP);

        // layers panel
        var layP = Panel(); layP.style.marginBottom = 14;
        var lh = Row(); lh.style.justifyContent = Justify.SpaceBetween; lh.style.alignItems = Align.Center; lh.style.marginBottom = 10;
        var lhl = new Label("LAYERS"); lhl.style.color = MUTED; lhl.style.fontSize = 11; lhl.style.letterSpacing = 1; lhl.style.unityFontStyleAndWeight = FontStyle.Bold;
        var lbtns = Row();
        var addL = new Button(AddLayer){ text = "＋" }; addL.style.width = 26; addL.style.height = 24; ClearBorder(addL); Round(addL,7); addL.style.backgroundColor = PANEL2; addL.style.color = TEXT; addL.style.fontSize = 14;
        var delL = new Button(DeleteLayer){ text = "🗑" }; delL.style.width = 26; delL.style.height = 24; delL.style.marginLeft = 5; ClearBorder(delL); Round(delL,7); delL.style.backgroundColor = PANEL2; delL.style.color = TEXT; delL.style.fontSize = 12;
        lbtns.Add(addL); lbtns.Add(delL);
        lh.Add(lhl); lh.Add(lbtns); layP.Add(lh);
        _layersList = new VisualElement(); layP.Add(_layersList);
        sidep.Add(layP);

        var prevP = Panel();
        prevP.Add(PanelHeader("Live Preview"));
        var pwrap = new VisualElement(); pwrap.style.alignItems = Align.Center; pwrap.style.justifyContent = Justify.Center; SetPaddingV(pwrap, 16);
        _previewImg = new Image(); _previewImg.scaleMode = ScaleMode.ScaleToFit; _previewImg.style.width = 120; _previewImg.style.height = 120; Round(_previewImg, 8);
        pwrap.Add(_previewImg); prevP.Add(pwrap);
        var hint = new Label("Block face preview · updates live"); hint.style.color = FAINT; hint.style.fontSize = 11; hint.style.unityTextAlign = TextAnchor.MiddleCenter;
        prevP.Add(hint);
        sidep.Add(prevP);
        shell.Add(sidep);

        _content.Add(shell);
        RebuildTextures();
        RefreshLayersUI();
        SetBrush(_brush);
        HighlightTool();
    }

    private void ToolButton(VisualElement parent, string icon, string tool)
    {
        var b = new Button(()=>{ _tool = tool; HighlightTool(); }){ text = icon };
        b.style.width = 40; b.style.height = 40; b.style.marginBottom = 6; b.style.fontSize = 17;
        ClearBorder(b); Round(b, 10); b.style.backgroundColor = Color.clear; b.style.color = MUTED;
        b.userData = tool; _toolButtons.Add(b); parent.Add(b);
    }
    private void RailAction(VisualElement parent, string icon, Action a)
    {
        var b = new Button(a){ text = icon };
        b.style.width = 40; b.style.height = 40; b.style.marginBottom = 6; b.style.fontSize = 16;
        ClearBorder(b); Round(b, 10); b.style.backgroundColor = Color.clear; b.style.color = MUTED;
        parent.Add(b);
    }
    private void HighlightTool()
    {
        foreach(var b in _toolButtons){
            bool on = (string)b.userData == _tool;
            b.style.backgroundColor = on ? GREEN : Color.clear;
            b.style.color = on ? Color.white : MUTED;
        }
    }

    private void SeedTexture()
    {
        _layers = new List<TexLayer>();
        var baseL = new TexLayer("Base");
        string[] tones = {"#6f6f6f","#7d7d7d","#888888","#717171","#828282","#767676"};
        var rng = new System.Random(7);
        for(int i=0;i<baseL.px.Length;i++) baseL.px[i] = C(tones[rng.Next(tones.Length)]);
        var top = new TexLayer("Layer 1");
        for(int i=0;i<top.px.Length;i++) top.px[i] = new Color(0,0,0,0);
        _layers.Add(top);     // index 0 = top
        _layers.Add(baseL);   // index 1 = bottom
        _active = 0;
    }

    // composite all visible layers (top index 0 painted last)
    private Color[] Composite()
    {
        var outp = new Color[TEX*TEX];
        for(int i=0;i<outp.Length;i++) outp[i] = new Color(0,0,0,0);
        for(int l=_layers.Count-1; l>=0; l--){
            if(!_layers[l].visible) continue;
            var px = _layers[l].px; float lop = _layers[l].opacity;
            for(int i=0;i<outp.Length;i++){
                var s = px[i]; float sa = s.a * lop; if(sa <= 0.001f) continue;
                var d = outp[i];
                float a = sa + d.a*(1-sa);
                if(a <= 0.001f){ outp[i] = new Color(0,0,0,0); continue; }
                outp[i] = new Color(
                    (s.r*sa + d.r*d.a*(1-sa))/a,
                    (s.g*sa + d.g*d.a*(1-sa))/a,
                    (s.b*sa + d.b*d.a*(1-sa))/a, a);
            }
        }
        return outp;
    }

    private void RebuildTextures()
    {
        if(_texCanvas == null){ _texCanvas = new Texture2D(TEX, TEX); _texCanvas.filterMode = FilterMode.Point; }
        if(_texPreview == null){ _texPreview = new Texture2D(TEX, TEX); _texPreview.filterMode = FilterMode.Point; }
        var comp = Composite();
        // canvas (flip Y so row 0 is top)
        for(int y=0;y<TEX;y++) for(int x=0;x<TEX;x++) _texCanvas.SetPixel(x, TEX-1-y, comp[y*TEX+x]);
        _texCanvas.Apply();
        // preview = shaded front face (slightly brighter top rows for depth feel)
        for(int y=0;y<TEX;y++) for(int x=0;x<TEX;x++){
            var col = comp[y*TEX+x];
            float shade = Mathf.Lerp(1.08f, 0.86f, y/(float)TEX);
            _texPreview.SetPixel(x, TEX-1-y, new Color(col.r*shade, col.g*shade, col.b*shade, col.a));
        }
        _texPreview.Apply();
        if(_canvasImg != null) _canvasImg.image = _texCanvas;
        if(_previewImg != null) _previewImg.image = _texPreview;
    }

    // ---- layer management ----
    private void AddLayer()
    {
        var l = new TexLayer("Layer " + (_layers.Count+1));
        for(int i=0;i<l.px.Length;i++) l.px[i] = new Color(0,0,0,0);
        _layers.Insert(0, l); _active = 0;
        RefreshLayersUI(); RebuildTextures();
    }
    private void DeleteLayer()
    {
        if(_layers.Count <= 1) return;
        _layers.RemoveAt(_active);
        _active = Mathf.Clamp(_active, 0, _layers.Count-1);
        RefreshLayersUI(); RebuildTextures();
    }
    private int _layerDragFrom = -1;
    private void RefreshLayersUI()
    {
        if(_layersList == null) return;
        _layersList.Clear();
        for(int i=0;i<_layers.Count;i++){
            int idx = i; var lay = _layers[i];
            var row = Row(); row.style.alignItems = Align.Center; row.style.marginBottom = 6;
            row.style.paddingLeft = 6; row.style.paddingRight = 8; row.style.height = 40; Round(row, 9);
            row.style.backgroundColor = (idx==_active) ? PANEL2 : BG;
            if(idx==_active){ row.style.borderLeftWidth = 2; row.style.borderLeftColor = GREEN; }

            var handle = new Label("⋮⋮"); handle.style.color = FAINT; handle.style.width = 16; handle.style.unityTextAlign = TextAnchor.MiddleCenter;
            handle.RegisterCallback<PointerDownEvent>(evt=>{ _layerDragFrom = idx; handle.CapturePointer(evt.pointerId); evt.StopPropagation(); });
            handle.RegisterCallback<PointerUpEvent>(evt=>{ if(handle.HasPointerCapture(evt.pointerId)){ handle.ReleasePointer(evt.pointerId); LayerDrop(evt.position); } });

            var eye = new Button(()=>{ lay.visible = !lay.visible; RefreshLayersUI(); RebuildTextures(); }){ text = lay.visible ? "👁" : "—" };
            eye.style.width = 24; eye.style.height = 24; ClearBorder(eye); eye.style.backgroundColor = Color.clear; eye.style.color = lay.visible ? TEXT : FAINT; eye.style.fontSize = 12;
            var nm = new Label(lay.name); nm.style.color = (idx==_active)?TEXT:MUTED; nm.style.fontSize = 12; nm.style.flexGrow = 1; nm.style.marginLeft = 2;
            nm.RegisterCallback<MouseDownEvent>(_=>{ _active = idx; RefreshLayersUI(); });
            var op = new Slider(0f, 1f){ value = lay.opacity }; op.style.width = 58;
            op.RegisterValueChangedCallback(e=>{ lay.opacity = e.newValue; RebuildTextures(); });
            row.Add(handle); row.Add(eye); row.Add(nm); row.Add(op);
            _layersList.Add(row);
        }
    }
    private void LayerDrop(Vector2 pos)
    {
        if(_layerDragFrom < 0) return;
        int target = _layerDragFrom, idx = 0;
        foreach(var row in _layersList.Children()){ if(row.worldBound.Contains(pos)){ target = idx; break; } idx++; }
        if(target != _layerDragFrom && target >= 0 && target < _layers.Count){
            var el = _layers[_layerDragFrom]; _layers.RemoveAt(_layerDragFrom); _layers.Insert(target, el); _active = target;
        }
        _layerDragFrom = -1; RefreshLayersUI(); RebuildTextures();
    }

    private void OnCanvasDown(MouseDownEvent e){
        var p = LocalToPixel(e.localMousePosition); if(p.x < 0) return;
        PushUndo(); _dragging = true; _dragStart = p; _dragSnap = (Color[])Px.Clone();
        if(_tool=="pencil"||_tool=="eraser"||_tool=="fill"||_tool=="picker") ApplyTool(p.x, p.y);
        RebuildTextures();
    }
    private void OnCanvasMove(MouseMoveEvent e){
        if((e.pressedButtons & 1) == 0) return;
        var p = LocalToPixel(e.localMousePosition); if(p.x < 0) return;
        if(_tool=="pencil"||_tool=="eraser"){ ApplyTool(p.x, p.y); }
        else if((_tool=="line"||_tool=="rect") && _dragSnap != null){
            _layers[_active].px = (Color[])_dragSnap.Clone();
            if(_tool=="line") DrawLine(_dragStart.x,_dragStart.y,p.x,p.y);
            else DrawRect(_dragStart.x,_dragStart.y,p.x,p.y);
        }
        RebuildTextures();
    }
    private void OnCanvasUp(MouseUpEvent e){ _dragging = false; }

    private Vector2Int LocalToPixel(Vector2 local){
        float w = _canvasImg.resolvedStyle.width, h = _canvasImg.resolvedStyle.height;
        if(w <= 0) w = TEX*_cell; if(h <= 0) h = TEX*_cell;
        int px = Mathf.FloorToInt(local.x / (w/TEX));
        int py = Mathf.FloorToInt(local.y / (h/TEX));
        if(px < 0 || py < 0 || px >= TEX || py >= TEX) return new Vector2Int(-1,-1);
        return new Vector2Int(px, py);
    }

    private void ApplyTool(int px, int py){
        int idx = py*TEX + px;
        switch(_tool){
            case "pencil": Px[idx] = _brush; break;
            case "eraser": Px[idx] = new Color(0,0,0,0); break;
            case "picker": SetBrush(Px[idx]); _tool = "pencil"; HighlightTool(); break;
            case "fill": Flood(px, py, Px[idx]); break;
        }
    }

    private void DrawLine(int x0,int y0,int x1,int y1){
        int dx = Mathf.Abs(x1-x0), dy = Mathf.Abs(y1-y0), sx = x0<x1?1:-1, sy = y0<y1?1:-1, err = dx-dy;
        int x = x0, y = y0; var px = Px;
        while(true){
            if(x>=0&&y>=0&&x<TEX&&y<TEX) px[y*TEX+x] = _brush;
            if(x==x1 && y==y1) break;
            int e2 = 2*err; if(e2>-dy){ err-=dy; x+=sx; } if(e2<dx){ err+=dx; y+=sy; }
        }
    }
    private void DrawRect(int x0,int y0,int x1,int y1){
        int xa=Mathf.Min(x0,x1), xb=Mathf.Max(x0,x1), ya=Mathf.Min(y0,y1), yb=Mathf.Max(y0,y1); var px = Px;
        for(int x=xa;x<=xb;x++){ if(ya>=0&&ya<TEX)px[ya*TEX+x]=_brush; if(yb>=0&&yb<TEX)px[yb*TEX+x]=_brush; }
        for(int y=ya;y<=yb;y++){ if(xa>=0&&xa<TEX)px[y*TEX+xa]=_brush; if(xb>=0&&xb<TEX)px[y*TEX+xb]=_brush; }
    }

    private void Flood(int x, int y, Color target)
    {
        if(ApproximatelyEqual(target, _brush)) return;
        var px = Px;
        var stack = new Stack<Vector2Int>(); stack.Push(new Vector2Int(x,y));
        while(stack.Count > 0){
            var p = stack.Pop();
            if(p.x<0||p.y<0||p.x>=TEX||p.y>=TEX) continue;
            int i = p.y*TEX+p.x;
            if(!ApproximatelyEqual(px[i], target)) continue;
            px[i] = _brush;
            stack.Push(new Vector2Int(p.x+1,p.y)); stack.Push(new Vector2Int(p.x-1,p.y));
            stack.Push(new Vector2Int(p.x,p.y+1)); stack.Push(new Vector2Int(p.x,p.y-1));
        }
    }
    private static bool ApproximatelyEqual(Color a, Color b)=>
        Mathf.Abs(a.r-b.r)<0.01f && Mathf.Abs(a.g-b.g)<0.01f && Mathf.Abs(a.b-b.b)<0.01f && Mathf.Abs(a.a-b.a)<0.01f;

    private void SetBrush(Color c){ _brush = c; if(_swatchActive!=null) _swatchActive.style.backgroundColor = c;
        if(_hexLabel!=null) _hexLabel.text = "#" + ColorUtility.ToHtmlStringRGB(c); }

    private void PushUndo(){ _undo.Add(new Snap{ layer=_active, px=(Color[])Px.Clone() }); if(_undo.Count>80) _undo.RemoveAt(0); _redo.Clear(); }
    private void Undo(){ if(_undo.Count==0) return; var s=_undo[_undo.Count-1]; _undo.RemoveAt(_undo.Count-1);
        _redo.Add(new Snap{ layer=s.layer, px=(Color[])_layers[s.layer].px.Clone() });
        _layers[s.layer].px = s.px; _active = s.layer; RefreshLayersUI(); RebuildTextures(); }
    private void Redo(){ if(_redo.Count==0) return; var s=_redo[_redo.Count-1]; _redo.RemoveAt(_redo.Count-1);
        _undo.Add(new Snap{ layer=s.layer, px=(Color[])_layers[s.layer].px.Clone() });
        _layers[s.layer].px = s.px; _active = s.layer; RefreshLayersUI(); RebuildTextures(); }
    private void ClearCanvas(){ PushUndo(); var px = Px; for(int i=0;i<px.Length;i++) px[i] = new Color(0,0,0,0); RebuildTextures(); }

    private void ExportPng()
    {
        string path = EditorUtility.SaveFilePanel("Export Texture", Application.dataPath, "texture", "png");
        if(string.IsNullOrEmpty(path)) return;
        var comp = Composite();
        var outTex = new Texture2D(TEX, TEX);
        for(int y=0;y<TEX;y++) for(int x=0;x<TEX;x++) outTex.SetPixel(x, TEX-1-y, comp[y*TEX+x]);
        outTex.Apply();
        File.WriteAllBytes(path, outTex.EncodeToPNG());
        DestroyImmediate(outTex);
        AssetDatabase.Refresh();
        Debug.Log("[Creator Suite] Exported texture → " + path);
    }

    // =========================================================================
    // BLOCK EDITOR VIEW
    // =========================================================================
    private TextField _bId, _bName; private Slider _bHard, _bRes, _bLight;
    private DropdownField _bSound, _bMap; private Toggle _bEmissive;
    private Label _codeLabel; private Image _blockPreview;

    private void ShowBlock()
    {
        SetActiveNav("Block"); SetHeader("Block Editor", "Design blocks with live preview & code generation");
        _content.Clear();
        if(_layers == null) SeedTexture();
        if(_texCanvas == null) RebuildTextures();

        var shell = Row(); shell.style.flexGrow = 1;

        // form column
        var form = new VisualElement(); form.style.flexGrow = 1; form.style.marginRight = 14;

        var idP = Panel(); idP.style.marginBottom = 14;
        idP.Add(PanelHeader("Identity"));
        _bId = FormText(idP, "Block ID", "ruby_block");
        _bName = FormText(idP, "Display Name", "Block of Ruby");
        form.Add(idP);

        var phP = Panel(); phP.style.marginBottom = 14;
        phP.Add(PanelHeader("Physical Properties"));
        _bHard = FormSlider(phP, "Hardness", 0, 50, 3);
        _bRes  = FormSlider(phP, "Resistance", 0, 1200, 6);
        _bLight= FormSlider(phP, "Light Level", 0, 15, 0);
        _bSound = FormDropdown(phP, "Sound", new List<string>{"Stone","Wood","Metal","Glass","Wool"});
        _bMap = FormDropdown(phP, "Map Color", new List<string>{"Stone","Plant","Metal","Ice","Sand"});
        form.Add(phP);

        var flP = Panel(); flP.style.marginBottom = 14;
        flP.Add(PanelHeader("Behavior Flags"));
        FormToggle(flP, "Requires Tool", true);
        FormToggle(flP, "No Occlusion", false);
        FormToggle(flP, "Ignited by Lava", false);
        FormToggle(flP, "Random Ticks", false);
        _bEmissive = FormToggle(flP, "Emissive Glow", false);
        form.Add(flP);

        var tyP = Panel();
        tyP.Add(PanelHeader("Block Type"));
        var seg = Row(); seg.style.flexWrap = Wrap.Wrap;
        string[] types = {"Full","Stairs","Slab","Fence","Wall","Pillar"};
        var segButtons = new List<Button>();
        foreach(var t in types){
            var b = new Button(){ text = t }; b.style.height = 32; b.style.marginRight = 6; b.style.marginBottom = 6;
            ClearBorder(b); Round(b, 8); b.style.backgroundColor = (t=="Full")?GREEN:BG; b.style.color = (t=="Full")?Color.white:MUTED;
            b.clicked += ()=>{ foreach(var x in segButtons){ x.style.backgroundColor = BG; x.style.color = MUTED; } b.style.backgroundColor = GREEN; b.style.color = Color.white; };
            segButtons.Add(b); seg.Add(b);
        }
        tyP.Add(seg); form.Add(tyP);
        shell.Add(form);

        // preview + code column
        var col = new VisualElement(); col.style.width = 420; col.style.flexShrink = 0;
        var prevP = Panel(); prevP.style.marginBottom = 14;
        prevP.Add(PanelHeader("Block Preview"));
        var pstage = new VisualElement(); pstage.style.height = 220; pstage.style.alignItems = Align.Center; pstage.style.justifyContent = Justify.Center;
        pstage.style.backgroundColor = C("#0d1219"); Round(pstage, 10);
        _blockPreview = new Image(); _blockPreview.scaleMode = ScaleMode.ScaleToFit; _blockPreview.image = _texCanvas;
        _blockPreview.style.width = 120; _blockPreview.style.height = 120; Round(_blockPreview, 4);
        _blockPreview.style.borderTopWidth = 5; _blockPreview.style.borderTopColor = new Color(1,1,1,0.18f);
        _blockPreview.style.borderLeftWidth = 5; _blockPreview.style.borderLeftColor = new Color(0,0,0,0.35f);
        _blockPreview.style.borderRightWidth = 5; _blockPreview.style.borderRightColor = new Color(0,0,0,0.2f);
        _blockPreview.style.borderBottomWidth = 5; _blockPreview.style.borderBottomColor = new Color(0,0,0,0.45f);
        pstage.Add(_blockPreview); prevP.Add(pstage);
        var phint = new Label("Live texture from the Texture Editor"); phint.style.color = FAINT; phint.style.fontSize = 11; phint.style.unityTextAlign = TextAnchor.MiddleCenter; phint.style.marginTop = 8; prevP.Add(phint);
        col.Add(prevP);

        var codeP = Panel();
        codeP.Add(CodeHeader("Java", Pascal(_bId.value), "java", () => _codeLabel.text, "block", () => _bId.value, true));
        _codeLabel = CodeLabel();
        codeP.Add(_codeLabel); col.Add(codeP);
        shell.Add(col);

        _content.Add(shell);

        // wire live updates
        EventCallback<ChangeEvent<string>> sFn = _=>RegenBlock();
        _bId.RegisterValueChangedCallback(sFn); _bName.RegisterValueChangedCallback(sFn);
        _bSound.RegisterValueChangedCallback(_=>RegenBlock()); _bMap.RegisterValueChangedCallback(_=>RegenBlock());
        _bHard.RegisterValueChangedCallback(_=>RegenBlock()); _bRes.RegisterValueChangedCallback(_=>RegenBlock());
        _bLight.RegisterValueChangedCallback(_=>RegenBlock()); _bEmissive.RegisterValueChangedCallback(_=>RegenBlock());
        RegenBlock();
    }

    private void RegenBlock()
    {
        string id = string.IsNullOrEmpty(_bId.value) ? "my_block" : _bId.value;
        float hard = _bHard.value, res = _bRes.value; int light = Mathf.RoundToInt(_bLight.value);
        string sound = _bSound.value.ToUpper(), map = _bMap.value.ToUpper();
        bool emis = _bEmissive.value;

        // light glow on preview
        float g = light/15f;
        _blockPreview.style.borderTopColor = Color.Lerp(new Color(1,1,1,0.18f), C("#fff1a8"), g);

        string ID = id.ToUpper();
        string code =
$@"public static final DeferredBlock<Block> {ID} =
    register(""{id}"", () -> new Block(
        BlockBehaviour.Properties.of()
            .mapColor(MapColor.{map})
            .strength({hard:0.0}F, {res:0.0}F)
            .sound(SoundType.{sound})"
        + (light>0 ? $"\n            .lightLevel(s -> {light})" : "")
        + (emis ? "\n            .emissiveRendering((s,l,p) -> true)" : "")
        + "\n            .requiresCorrectToolForDrops()\n    ));";
        _codeLabel.text = code;
    }

    // =========================================================================
    // RECIPE EDITOR VIEW
    // =========================================================================
    private struct Ing { public string id, icon; public Color col; public Ing(string i,string ic,Color c){ id=i; icon=ic; col=c; } }
    private static readonly Ing[] INGS = {
        new Ing("minecraft:diamond","💎", C("#46c7d8")),
        new Ing("minecraft:stick","/", C("#9b6a35")),
        new Ing("minecraft:iron_ingot","⛓", C("#b8b8b8")),
        new Ing("minecraft:gold_ingot","▮", C("#f5c542")),
        new Ing("minecraft:redstone","●", C("#e0564b")),
        new Ing("minecraft:emerald","◆", C("#5fbf4f")),
        new Ing("minecraft:oak_planks","▦", C("#9b6a35")),
        new Ing("mymod:ruby","▲", C("#c0392b")),
    };
    private int[] _grid;            // 9 slots, ingredient index or -1
    private Label[] _slots = new Label[9];
    private int _sel = 0;          // last-picked ingredient (palette highlight)
    private int _result = 7;       // result ingredient index
    private Label _resultBtn; private DropdownField _recType; private Slider _recCount;
    private Label _recCode; private VisualElement _ingPalette;
    // drag-and-drop state
    private const int SRC_PALETTE = -1;
    private const int SRC_RESULT = 100;
    private bool _dragging; private int _dragIng; private int _dragFromSlot; private VisualElement _dragGhost;

    private void ShowRecipe()
    {
        SetActiveNav("Recipe"); SetHeader("Recipe Editor", "Craft, smelt & cook · 3×3 grid");
        _content.Clear();
        if(_grid == null) _grid = new int[]{0,-1,0, 0,1,0, -1,1,-1}; // sample sword-ish

        var shell = Row(); shell.style.flexGrow = 1;

        // form column
        var form = new VisualElement(); form.style.flexGrow = 1; form.style.marginRight = 14;

        var tP = Panel(); tP.style.marginBottom = 14; tP.Add(PanelHeader("Recipe Type"));
        _recType = FormDropdown(tP, "Type", new List<string>{"Shaped Crafting","Shapeless Crafting","Smelting","Blasting","Smoking"});
        form.Add(tP);

        var ingP = Panel(); ingP.style.marginBottom = 14; ingP.Add(PanelHeader("Ingredients · drag onto the grid"));
        _ingPalette = new VisualElement(); _ingPalette.style.flexDirection = FlexDirection.Row; _ingPalette.style.flexWrap = Wrap.Wrap;
        ingP.Add(_ingPalette);
        form.Add(ingP);

        var gP = Panel(); gP.Add(PanelHeader("Crafting Grid"));
        var craftRow = Row(); craftRow.style.alignItems = Align.Center; craftRow.style.justifyContent = Justify.Center; SetPaddingV(craftRow, 10);
        // 3x3 grid
        var gridBox = new VisualElement(); gridBox.style.backgroundColor = C("#0d1219"); SetPadding(gridBox, 8); Round(gridBox, 10);
        for(int r=0;r<3;r++){
            var gr = Row();
            for(int c=0;c<3;c++){
                int idx = r*3+c;
                var slot = MakeSlot();
                MakeDraggable(slot, () => _grid[idx], idx);
                _slots[idx] = slot; gr.Add(slot);
            }
            gridBox.Add(gr);
        }
        craftRow.Add(gridBox);
        var arrow = new Label("➜"); arrow.style.fontSize = 30; arrow.style.color = MUTED; SetPaddingH(arrow, 22); craftRow.Add(arrow);
        // result
        var resBox = new VisualElement(); resBox.style.alignItems = Align.Center;
        _resultBtn = MakeSlot(); _resultBtn.style.width = 60; _resultBtn.style.height = 60;
        MakeDraggable(_resultBtn, () => _result, SRC_RESULT);
        resBox.Add(_resultBtn);
        var cwrap = Row(); cwrap.style.alignItems = Align.Center; cwrap.style.marginTop = 8;
        var cl = new Label("×"); cl.style.color = MUTED; cl.style.fontSize = 16; cl.style.marginRight = 4;
        _recCount = new Slider(1, 64){ value = 1 }; _recCount.style.width = 90;
        var cval = new Label("1"); cval.style.color = GREEN; cval.style.marginLeft = 6; cval.style.unityFontStyleAndWeight = FontStyle.Bold;
        _recCount.RegisterValueChangedCallback(e=>{ cval.text = Mathf.RoundToInt(e.newValue).ToString(); RegenRecipe(); });
        cwrap.Add(cl); cwrap.Add(_recCount); cwrap.Add(cval); resBox.Add(cwrap);
        craftRow.Add(resBox);
        gP.Add(craftRow); form.Add(gP);
        shell.Add(form);

        // code column
        var col = new VisualElement(); col.style.width = 420; col.style.flexShrink = 0;
        var codeP = Panel(); codeP.Add(CodeHeader("JSON", "recipe", "json", ()=> _recCode.text, "recipe", null));
        _recCode = CodeLabel(); codeP.Add(_recCode); col.Add(codeP);
        shell.Add(col);
        _content.Add(shell);

        _recType.RegisterValueChangedCallback(_=>RegenRecipe());
        BuildIngPalette();
        for(int i=0;i<9;i++) PaintSlot(_slots[i], _grid[i]);
        PaintSlot(_resultBtn, _result);
        RegenRecipe();
    }

    private Label MakeSlot()
    {
        var b = new Label(); b.style.width = 46; b.style.height = 46; b.style.marginRight = 4; b.style.marginBottom = 4;
        b.style.unityTextAlign = TextAnchor.MiddleCenter; b.style.fontSize = 20;
        ClearBorder(b); Round(b, 8); b.style.backgroundColor = C("#1a2029");
        b.style.borderTopWidth = b.style.borderBottomWidth = b.style.borderLeftWidth = b.style.borderRightWidth = 1;
        b.style.borderTopColor = b.style.borderBottomColor = b.style.borderLeftColor = b.style.borderRightColor = LINE2;
        return b;
    }
    private void PaintSlot(Label slot, int ing)
    {
        if(ing < 0){ slot.text = ""; slot.style.backgroundColor = C("#1a2029"); slot.style.color = TEXT; }
        else { slot.text = INGS[ing].icon; var c = INGS[ing].col; slot.style.backgroundColor = new Color(c.r,c.g,c.b,0.22f); slot.style.color = c; }
    }
    private void BuildIngPalette()
    {
        _ingPalette.Clear();
        _ingPalette.Add(MakeIngSwatch(-1, "✕", FAINT));   // erase
        for(int i=0;i<INGS.Length;i++) _ingPalette.Add(MakeIngSwatch(i, INGS[i].icon, INGS[i].col));
        HighlightIng();
    }
    private VisualElement MakeIngSwatch(int idx, string icon, Color col)
    {
        var b = new Label(icon);
        b.style.width = 42; b.style.height = 42; b.style.marginRight = 5; b.style.marginBottom = 5; b.style.fontSize = 18;
        b.style.unityTextAlign = TextAnchor.MiddleCenter;
        ClearBorder(b); Round(b, 8); b.style.backgroundColor = new Color(col.r,col.g,col.b,0.18f); b.style.color = col;
        b.userData = idx;
        MakeDraggable(b, () => idx, SRC_PALETTE);
        return b;
    }
    private void HighlightIng()
    {
        foreach(var child in _ingPalette.Children()){
            if(child is Label b && b.userData is int){
                bool on = (int)b.userData == _sel;
                b.style.borderTopWidth = b.style.borderBottomWidth = b.style.borderLeftWidth = b.style.borderRightWidth = on ? 2 : 0;
                b.style.borderTopColor = b.style.borderBottomColor = b.style.borderLeftColor = b.style.borderRightColor = GREEN;
            }
        }
    }

    // ---- drag & drop engine ----
    private void MakeDraggable(VisualElement el, Func<int> getIng, int sourceKind)
    {
        el.RegisterCallback<PointerDownEvent>(evt=>{
            int ing = getIng();
            if((sourceKind >= 0 || sourceKind == SRC_RESULT) && ing < 0) return; // empty slot, nothing to grab
            _dragIng = ing; _dragFromSlot = sourceKind; _dragging = true;
            if(sourceKind == SRC_PALETTE){ _sel = ing; HighlightIng(); }
            ShowGhost(ing, evt.position);
            el.CapturePointer(evt.pointerId);
            evt.StopPropagation();
        });
        el.RegisterCallback<PointerMoveEvent>(evt=>{ if(_dragging && el.HasPointerCapture(evt.pointerId)) MoveGhost(evt.position); });
        el.RegisterCallback<PointerUpEvent>(evt=>{
            if(_dragging && el.HasPointerCapture(evt.pointerId)){ el.ReleasePointer(evt.pointerId); ResolveDrop(evt.position); }
        });
    }

    private void ResolveDrop(Vector2 pos)
    {
        HideGhost(); _dragging = false;
        int targetGrid = -1;
        for(int i=0;i<9;i++) if(_slots[i].worldBound.Contains(pos)){ targetGrid = i; break; }
        bool targetResult = targetGrid < 0 && _resultBtn.worldBound.Contains(pos);

        if(targetGrid >= 0){
            _grid[targetGrid] = _dragIng; PaintSlot(_slots[targetGrid], _dragIng);
            if(_dragFromSlot >= 0 && _dragFromSlot < 9 && _dragFromSlot != targetGrid){ _grid[_dragFromSlot] = -1; PaintSlot(_slots[_dragFromSlot], -1); }
        }
        else if(targetResult){
            _result = _dragIng; PaintSlot(_resultBtn, _result);
            if(_dragFromSlot >= 0 && _dragFromSlot < 9){ _grid[_dragFromSlot] = -1; PaintSlot(_slots[_dragFromSlot], -1); }
        }
        else { // dropped outside any slot -> remove from source
            if(_dragFromSlot >= 0 && _dragFromSlot < 9){ _grid[_dragFromSlot] = -1; PaintSlot(_slots[_dragFromSlot], -1); }
            else if(_dragFromSlot == SRC_RESULT){ _result = -1; PaintSlot(_resultBtn, -1); }
        }
        RegenRecipe();
    }

    private void EnsureGhost()
    {
        if(_dragGhost != null) return;
        _dragGhost = new Label(); _dragGhost.style.position = Position.Absolute; _dragGhost.pickingMode = PickingMode.Ignore;
        _dragGhost.style.width = 46; _dragGhost.style.height = 46; Round(_dragGhost, 8);
        _dragGhost.style.unityTextAlign = TextAnchor.MiddleCenter; _dragGhost.style.fontSize = 22;
        _dragGhost.style.display = DisplayStyle.None;
        rootVisualElement.Add(_dragGhost);
    }
    private void ShowGhost(int ing, Vector2 pos)
    {
        EnsureGhost();
        if(ing < 0){ _dragGhost.text = "✕"; _dragGhost.style.color = TEXT; _dragGhost.style.backgroundColor = new Color(0,0,0,0.5f); }
        else { _dragGhost.text = INGS[ing].icon; var c = INGS[ing].col; _dragGhost.style.color = Color.white; _dragGhost.style.backgroundColor = new Color(c.r,c.g,c.b,0.9f); }
        _dragGhost.style.display = DisplayStyle.Flex;
        _dragGhost.BringToFront();
        MoveGhost(pos);
    }
    private void MoveGhost(Vector2 pos)
    {
        if(_dragGhost == null) return;
        var local = rootVisualElement.WorldToLocal(pos);
        _dragGhost.style.left = local.x - 23; _dragGhost.style.top = local.y - 23;
    }
    private void HideGhost(){ if(_dragGhost != null) _dragGhost.style.display = DisplayStyle.None; }

    private void RegenRecipe()
    {
        string type = _recType.value;
        string resId = (_result>=0) ? INGS[_result].id : "mymod:result";
        int count = Mathf.RoundToInt(_recCount.value);

        if(type.StartsWith("Shaped")) _recCode.text = GenShaped(resId, count);
        else if(type.StartsWith("Shapeless")) _recCode.text = GenShapeless(resId, count);
        else _recCode.text = GenCooking(type, resId);
    }

    private string GenShaped(string resId, int count)
    {
        int minR=3,maxR=-1,minC=3,maxC=-1;
        for(int r=0;r<3;r++) for(int c=0;c<3;c++) if(_grid[r*3+c]>=0){ minR=Mathf.Min(minR,r); maxR=Mathf.Max(maxR,r); minC=Mathf.Min(minC,c); maxC=Mathf.Max(maxC,c); }
        if(maxR<0) return "// place ingredients in the grid";
        var keyMap = new Dictionary<string,char>(); char next='A';
        var rows = new List<string>();
        for(int r=minR;r<=maxR;r++){
            string row="";
            for(int c=minC;c<=maxC;c++){
                int ing=_grid[r*3+c];
                if(ing<0){ row+=" "; }
                else { var id=INGS[ing].id; if(!keyMap.ContainsKey(id)) keyMap[id]=next++; row+=keyMap[id]; }
            }
            rows.Add(row);
        }
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("{");
        sb.AppendLine("  \"type\": \"minecraft:crafting_shaped\",");
        sb.AppendLine("  \"pattern\": [");
        for(int i=0;i<rows.Count;i++) sb.AppendLine($"    \"{rows[i]}\"{(i<rows.Count-1?",":"")}");
        sb.AppendLine("  ],");
        sb.AppendLine("  \"key\": {");
        int k=0;
        foreach(var kv in keyMap){ sb.AppendLine($"    \"{kv.Value}\": {{ \"item\": \"{kv.Key}\" }}{(++k<keyMap.Count?",":"")}"); }
        sb.AppendLine("  },");
        sb.AppendLine($"  \"result\": {{ \"item\": \"{resId}\", \"count\": {count} }}");
        sb.Append("}");
        return sb.ToString();
    }

    private string GenShapeless(string resId, int count)
    {
        var items = new List<string>();
        for(int i=0;i<9;i++) if(_grid[i]>=0) items.Add(INGS[_grid[i]].id);
        if(items.Count==0) return "// place ingredients in the grid";
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("{");
        sb.AppendLine("  \"type\": \"minecraft:crafting_shapeless\",");
        sb.AppendLine("  \"ingredients\": [");
        for(int i=0;i<items.Count;i++) sb.AppendLine($"    {{ \"item\": \"{items[i]}\" }}{(i<items.Count-1?",":"")}");
        sb.AppendLine("  ],");
        sb.AppendLine($"  \"result\": {{ \"item\": \"{resId}\", \"count\": {count} }}");
        sb.Append("}");
        return sb.ToString();
    }

    private string GenCooking(string type, string resId)
    {
        int input=-1; for(int i=0;i<9;i++) if(_grid[i]>=0){ input=_grid[i]; break; }
        string inId = input>=0 ? INGS[input].id : "minecraft:raw_iron";
        string t = type=="Smelting" ? "minecraft:smelting" : type=="Blasting" ? "minecraft:blasting" : "minecraft:smoking";
        int time = type=="Smelting" ? 200 : 100;
        return
$@"{{
  ""type"": ""{t}"",
  ""ingredient"": {{ ""item"": ""{inId}"" }},
  ""result"": ""{resId}"",
  ""experience"": 0.7,
  ""cookingtime"": {time}
}}";
    }

    // =========================================================================
    // ITEM EDITOR VIEW
    // =========================================================================
    private TextField _iId, _iName; private Slider _iStack, _iDur; private DropdownField _iRarity;
    private Toggle _iFood, _iFire; private Slider _iNut, _iSat; private Label _iCode; private VisualElement _iFoodBox;

    private void ShowItem()
    {
        SetActiveNav("Items"); SetHeader("Item Editor", "Create tools, weapons, food & materials");
        _content.Clear();
        var shell = Row(); shell.style.flexGrow = 1;

        var form = new VisualElement(); form.style.flexGrow = 1; form.style.marginRight = 14;
        var idP = Panel(); idP.style.marginBottom = 14; idP.Add(PanelHeader("Identity"));
        _iId = FormText(idP, "Item ID", "ruby");
        _iName = FormText(idP, "Display Name", "Ruby");
        _iRarity = FormDropdown(idP, "Rarity", new List<string>{"Common","Uncommon","Rare","Epic"});
        form.Add(idP);

        var pP = Panel(); pP.style.marginBottom = 14; pP.Add(PanelHeader("Properties"));
        _iStack = FormSlider(pP, "Max Stack Size", 1, 64, 64);
        _iDur = FormSlider(pP, "Durability (0 = none)", 0, 2031, 0);
        _iFire = FormToggle(pP, "Fire Resistant", false);
        form.Add(pP);

        var fP = Panel(); fP.Add(PanelHeader("Food"));
        _iFood = FormToggle(fP, "Is Edible", false);
        _iFoodBox = new VisualElement();
        _iNut = FormSlider(_iFoodBox, "Nutrition", 0, 20, 4);
        _iSat = FormSlider(_iFoodBox, "Saturation", 0, 2, 0.3f);
        fP.Add(_iFoodBox);
        form.Add(fP);
        shell.Add(form);

        var col = new VisualElement(); col.style.width = 420; col.style.flexShrink = 0;
        var prevP = Panel(); prevP.style.marginBottom = 14; prevP.Add(PanelHeader("Preview"));
        var stg = new VisualElement(); stg.style.height = 200; stg.style.alignItems = Align.Center; stg.style.justifyContent = Justify.Center; stg.style.backgroundColor = C("#0d1219"); Round(stg, 10);
        var ic = new Label("⚔"); ic.style.fontSize = 72; ic.style.color = AMBER; stg.Add(ic); prevP.Add(stg); col.Add(prevP);
        var codeP = Panel(); codeP.Add(CodeHeader("Java", Pascal(_iId.value), "java", ()=> _iCode.text, "item", ()=> _iId.value, true));
        _iCode = CodeLabel(); codeP.Add(_iCode); col.Add(codeP);
        shell.Add(col);
        _content.Add(shell);

        _iId.RegisterValueChangedCallback(_=>RegenItem()); _iName.RegisterValueChangedCallback(_=>RegenItem());
        _iRarity.RegisterValueChangedCallback(_=>RegenItem());
        _iStack.RegisterValueChangedCallback(_=>RegenItem()); _iDur.RegisterValueChangedCallback(_=>RegenItem());
        _iFire.RegisterValueChangedCallback(_=>RegenItem());
        _iFood.RegisterValueChangedCallback(_=>{ _iFoodBox.style.display = _iFood.value ? DisplayStyle.Flex : DisplayStyle.None; RegenItem(); });
        _iNut.RegisterValueChangedCallback(_=>RegenItem()); _iSat.RegisterValueChangedCallback(_=>RegenItem());
        _iFoodBox.style.display = DisplayStyle.None;
        RegenItem();
    }

    private void RegenItem()
    {
        string id = string.IsNullOrEmpty(_iId.value) ? "my_item" : _iId.value;
        string ID = id.ToUpper();
        int stack = Mathf.RoundToInt(_iStack.value), dur = Mathf.RoundToInt(_iDur.value);
        string props = "new Item.Properties()";
        if(stack != 64 && dur == 0) props += $".stacksTo({stack})";
        if(dur > 0) props += $".durability({dur})";
        if(_iFire.value) props += ".fireResistant()";
        if(_iRarity.value != "Common") props += $".rarity(Rarity.{_iRarity.value.ToUpper()})";
        if(_iFood.value){
            props += $"\n        .food(new FoodProperties.Builder()" +
                     $".nutrition({Mathf.RoundToInt(_iNut.value)}).saturationModifier({_iSat.value:0.0}F).build())";
        }
        _iCode.text =
$@"public static final DeferredItem<Item> {ID} =
    ITEMS.register(""{id}"", () -> new Item(
        {props}
    ));";
    }

    // =========================================================================
    // ENTITY EDITOR VIEW
    // =========================================================================
    private TextField _eId; private DropdownField _eCat; private Slider _eW,_eH,_eHp,_eSpd,_eDmg,_eRange;
    private Toggle _eFire; private Label _eCode;

    private void ShowEntity()
    {
        SetActiveNav("Entities"); SetHeader("Entity Editor", "Design mobs, bosses & animals with attributes");
        _content.Clear();
        var shell = Row(); shell.style.flexGrow = 1;

        var form = new VisualElement(); form.style.flexGrow = 1; form.style.marginRight = 14;
        var idP = Panel(); idP.style.marginBottom = 14; idP.Add(PanelHeader("Identity"));
        _eId = FormText(idP, "Entity ID", "frost_wolf");
        _eCat = FormDropdown(idP, "Category", new List<string>{"MONSTER","CREATURE","AMBIENT","WATER_CREATURE","MISC"});
        form.Add(idP);
        var szP = Panel(); szP.style.marginBottom = 14; szP.Add(PanelHeader("Hitbox"));
        _eW = FormSlider(szP, "Width", 0.2f, 16, 0.6f);
        _eH = FormSlider(szP, "Height", 0.2f, 18, 0.85f);
        form.Add(szP);
        var atP = Panel(); atP.Add(PanelHeader("Attributes"));
        _eHp = FormSlider(atP, "Max Health", 1, 300, 20);
        _eSpd = FormSlider(atP, "Movement Speed", 0, 1, 0.3f);
        _eDmg = FormSlider(atP, "Attack Damage", 0, 50, 4);
        _eRange = FormSlider(atP, "Follow Range", 4, 100, 16);
        _eFire = FormToggle(atP, "Fire Immune", false);
        form.Add(atP);
        shell.Add(form);

        var col = new VisualElement(); col.style.width = 420; col.style.flexShrink = 0;
        var prevP = Panel(); prevP.style.marginBottom = 14; prevP.Add(PanelHeader("Preview"));
        var stg = new VisualElement(); stg.style.height = 200; stg.style.alignItems = Align.Center; stg.style.justifyContent = Justify.Center; stg.style.backgroundColor = C("#0d1219"); Round(stg, 10);
        var ic = new Label("🐺"); ic.style.fontSize = 72; stg.Add(ic); prevP.Add(stg); col.Add(prevP);
        var codeP = Panel(); codeP.Add(CodeHeader("Java", Pascal(_eId.value), "java", ()=> _eCode.text, "entity", ()=> _eId.value));
        _eCode = CodeLabel(); codeP.Add(_eCode); col.Add(codeP);
        shell.Add(col);
        _content.Add(shell);

        foreach(var s in new Slider[]{_eW,_eH,_eHp,_eSpd,_eDmg,_eRange}) s.RegisterValueChangedCallback(_=>RegenEntity());
        _eId.RegisterValueChangedCallback(_=>RegenEntity()); _eCat.RegisterValueChangedCallback(_=>RegenEntity());
        _eFire.RegisterValueChangedCallback(_=>RegenEntity());
        RegenEntity();
    }

    private void RegenEntity()
    {
        string id = string.IsNullOrEmpty(_eId.value) ? "my_mob" : _eId.value;
        string ID = id.ToUpper();
        string fire = _eFire.value ? "true" : "false";
        _eCode.text =
$@"public static final DeferredHolder<EntityType<?>, EntityType<{Pascal(id)}>> {ID} =
    make(""{id}"", {Pascal(id)}::new, MobCategory.{_eCat.value},
        {_eW.value:0.0}F, {_eH.value:0.0}F, {fire});

public static AttributeSupplier.Builder registerAttributes() {{
    return Monster.createMonsterAttributes()
        .add(Attributes.MAX_HEALTH, {_eHp.value:0})
        .add(Attributes.MOVEMENT_SPEED, {_eSpd.value:0.00})
        .add(Attributes.ATTACK_DAMAGE, {_eDmg.value:0.0})
        .add(Attributes.FOLLOW_RANGE, {_eRange.value:0});
}}";
    }
    private static string Pascal(string s){
        if(string.IsNullOrEmpty(s)) return "MyMob";
        var parts = s.Split('_'); var sb = new System.Text.StringBuilder();
        foreach(var p in parts){ if(p.Length>0) sb.Append(char.ToUpper(p[0])).Append(p.Substring(1)); }
        return sb.ToString();
    }

    // =========================================================================
    // PARTICLE EDITOR VIEW
    // =========================================================================
    private TextField _pId; private Toggle _pAlways; private Slider _pAge,_pGrav,_pSize; private Color _pColor = C("#46c7d8");
    private Label _pCode; private VisualElement _pSwatch, _pDot;

    private void ShowParticle()
    {
        SetActiveNav("Effects"); SetHeader("Particle Editor", "Sparks, glows & ambient effects");
        _content.Clear();
        var shell = Row(); shell.style.flexGrow = 1;

        var form = new VisualElement(); form.style.flexGrow = 1; form.style.marginRight = 14;
        var idP = Panel(); idP.style.marginBottom = 14; idP.Add(PanelHeader("Identity"));
        _pId = FormText(idP, "Particle ID", "magic_spark");
        _pAlways = FormToggle(idP, "Always Show (override limiter)", false);
        form.Add(idP);
        var beP = Panel(); beP.style.marginBottom = 14; beP.Add(PanelHeader("Behavior"));
        _pAge = FormSlider(beP, "Max Age (ticks)", 1, 200, 40);
        _pGrav = FormSlider(beP, "Gravity", 0, 1, 0);
        _pSize = FormSlider(beP, "Base Size", 0.1f, 2, 0.5f);
        form.Add(beP);
        var coP = Panel(); coP.Add(PanelHeader("Color"));
        var crow = Row(); crow.style.alignItems = Align.Center;
        _pSwatch = new VisualElement(); _pSwatch.style.width = 40; _pSwatch.style.height = 40; Round(_pSwatch,9); _pSwatch.style.backgroundColor = _pColor; _pSwatch.style.marginRight = 10; crow.Add(_pSwatch);
        var palRow = new VisualElement(); palRow.style.flexDirection = FlexDirection.Row; palRow.style.flexWrap = Wrap.Wrap;
        foreach(var hex in new[]{"#f5c542","#e0a93b","#5fbf4f","#46c7d8","#9b6cff","#e0564b","#ffffff","#7c8cff"}){
            var sw = new VisualElement(); sw.style.width=24; sw.style.height=24; sw.style.marginRight=4; sw.style.marginBottom=4; Round(sw,6); sw.style.backgroundColor=C(hex);
            var cc = C(hex); sw.RegisterCallback<MouseDownEvent>(_=>{ _pColor=cc; _pSwatch.style.backgroundColor=cc; if(_pDot!=null)_pDot.style.backgroundColor=cc; RegenParticle(); });
            palRow.Add(sw);
        }
        crow.Add(palRow); coP.Add(crow); form.Add(coP);
        shell.Add(form);

        var col = new VisualElement(); col.style.width = 420; col.style.flexShrink = 0;
        var prevP = Panel(); prevP.style.marginBottom = 14; prevP.Add(PanelHeader("Preview"));
        var stg = new VisualElement(); stg.style.height = 200; stg.style.alignItems = Align.Center; stg.style.justifyContent = Justify.Center; stg.style.backgroundColor = C("#0d1219"); Round(stg, 10);
        _pDot = new VisualElement(); _pDot.style.width = 26; _pDot.style.height = 26; Round(_pDot, 13); _pDot.style.backgroundColor = _pColor; stg.Add(_pDot); prevP.Add(stg); col.Add(prevP);
        var codeP = Panel(); codeP.Add(CodeHeader("Java", Pascal(_pId.value), "java", ()=> _pCode.text, "particle", ()=> _pId.value));
        _pCode = CodeLabel(); codeP.Add(_pCode); col.Add(codeP);
        shell.Add(col);
        _content.Add(shell);

        _pId.RegisterValueChangedCallback(_=>RegenParticle()); _pAlways.RegisterValueChangedCallback(_=>RegenParticle());
        foreach(var s in new Slider[]{_pAge,_pGrav,_pSize}) s.RegisterValueChangedCallback(_=>RegenParticle());
        RegenParticle();
    }

    private void RegenParticle()
    {
        string id = string.IsNullOrEmpty(_pId.value) ? "my_particle" : _pId.value;
        string ID = id.ToUpper();
        string always = _pAlways.value ? "true" : "false";
        _pCode.text =
$@"public static final DeferredHolder<ParticleType<?>, SimpleParticleType> {ID} =
    PARTICLE_TYPES.register(""{id}"",
        () -> new SimpleParticleType({always}));

// client factory hints:
//   maxAge   = {Mathf.RoundToInt(_pAge.value)} ticks
//   gravity  = {_pGrav.value:0.00}
//   size     = {_pSize.value:0.00}
//   tint     = #{ColorUtility.ToHtmlStringRGB(_pColor)}";
    }

    // =========================================================================
    // ENCHANTMENT EDITOR VIEW
    // =========================================================================
    private TextField _enId; private Slider _enMax; private DropdownField _enRarity, _enCat;
    private Toggle _enTreasure, _enCurse; private Label _enCode;

    private void ShowEnchant()
    {
        SetActiveNav("Effects"); SetHeader("Enchantment Editor", "Custom enchantments with effects");
        _content.Clear();
        var shell = Row(); shell.style.flexGrow = 1;

        var form = new VisualElement(); form.style.flexGrow = 1; form.style.marginRight = 14;
        var idP = Panel(); idP.style.marginBottom = 14; idP.Add(PanelHeader("Identity"));
        _enId = FormText(idP, "Enchantment ID", "frost_aspect");
        _enCat = FormDropdown(idP, "Supported Items", new List<string>{"WEAPON","ARMOR","DIGGER","BOW","TRIDENT","WEARABLE","BREAKABLE"});
        form.Add(idP);
        var pP = Panel(); pP.style.marginBottom = 14; pP.Add(PanelHeader("Properties"));
        _enMax = FormSlider(pP, "Max Level", 1, 5, 3);
        _enRarity = FormDropdown(pP, "Rarity (weight)", new List<string>{"COMMON","UNCOMMON","RARE","VERY_RARE"});
        form.Add(pP);
        var fP = Panel(); fP.Add(PanelHeader("Flags"));
        _enTreasure = FormToggle(fP, "Treasure (not from enchant table)", false);
        _enCurse = FormToggle(fP, "Is Curse", false);
        form.Add(fP);
        shell.Add(form);

        var col = new VisualElement(); col.style.width = 420; col.style.flexShrink = 0;
        var prevP = Panel(); prevP.style.marginBottom = 14; prevP.Add(PanelHeader("Preview"));
        var stg = new VisualElement(); stg.style.height = 160; stg.style.alignItems = Align.Center; stg.style.justifyContent = Justify.Center; stg.style.backgroundColor = C("#0d1219"); Round(stg, 10);
        var ic = new Label("✨"); ic.style.fontSize = 64; ic.style.color = C("#7c8cff"); stg.Add(ic); prevP.Add(stg); col.Add(prevP);
        var codeP = Panel(); codeP.Add(CodeHeader("Java", Pascal(_enId.value), "java", ()=> _enCode.text, "enchant", ()=> _enId.value));
        _enCode = CodeLabel(); codeP.Add(_enCode); col.Add(codeP);
        shell.Add(col);
        _content.Add(shell);

        _enId.RegisterValueChangedCallback(_=>RegenEnchant()); _enCat.RegisterValueChangedCallback(_=>RegenEnchant());
        _enRarity.RegisterValueChangedCallback(_=>RegenEnchant()); _enMax.RegisterValueChangedCallback(_=>RegenEnchant());
        _enTreasure.RegisterValueChangedCallback(_=>RegenEnchant()); _enCurse.RegisterValueChangedCallback(_=>RegenEnchant());
        RegenEnchant();
    }

    private void RegenEnchant()
    {
        string id = string.IsNullOrEmpty(_enId.value) ? "my_enchant" : _enId.value;
        string ID = id.ToUpper(); int max = Mathf.RoundToInt(_enMax.value);
        _enCode.text =
$@"public static final DeferredHolder<Enchantment, Enchantment> {ID} =
    ENCHANTMENTS.register(""{id}"",
        () -> new {Pascal(id)}Enchantment({max}));

// rarity    = {_enRarity.value}
// category  = {_enCat.value}
// treasure  = {(_enTreasure.value ? "true" : "false")}
// curse     = {(_enCurse.value ? "true" : "false")}";
    }

    // =========================================================================
    // BIOME EDITOR VIEW
    // =========================================================================
    private TextField _biId; private Slider _biTemp, _biDown; private Toggle _biPrecip;
    private Color _biSky = C("#80A0FF"), _biFog = C("#C0D8FF"), _biWater = C("#3F76E4"), _biGrass = C("#6FBF4F");
    private Label _biCode;

    private void ShowBiome()
    {
        SetActiveNav("World"); SetHeader("Biome Editor", "Climate, colors & ambience");
        _content.Clear();
        var shell = Row(); shell.style.flexGrow = 1;

        var form = new VisualElement(); form.style.flexGrow = 1; form.style.marginRight = 14;
        var idP = Panel(); idP.style.marginBottom = 14; idP.Add(PanelHeader("Identity & Climate"));
        _biId = FormText(idP, "Biome ID", "frost_forest");
        _biTemp = FormSlider(idP, "Temperature", -1, 2, 0.3f);
        _biDown = FormSlider(idP, "Downfall", 0, 1, 0.8f);
        _biPrecip = FormToggle(idP, "Has Precipitation", true);
        form.Add(idP);
        var cP = Panel(); cP.Add(PanelHeader("Colors"));
        ColorPicker(cP, "Sky", _biSky, c=>{ _biSky=c; RegenBiome(); });
        ColorPicker(cP, "Fog", _biFog, c=>{ _biFog=c; RegenBiome(); });
        ColorPicker(cP, "Water", _biWater, c=>{ _biWater=c; RegenBiome(); });
        ColorPicker(cP, "Grass", _biGrass, c=>{ _biGrass=c; RegenBiome(); });
        form.Add(cP);
        shell.Add(form);

        var col = new VisualElement(); col.style.width = 420; col.style.flexShrink = 0;
        var prevP = Panel(); prevP.style.marginBottom = 14; prevP.Add(PanelHeader("Preview"));
        var stg = new VisualElement(); stg.style.height = 160; Round(stg, 10); stg.style.overflow = Overflow.Hidden;
        var sky = new VisualElement(); sky.style.height = Length.Percent(60); sky.style.backgroundColor = _biSky; stg.Add(sky);
        var grass = new VisualElement(); grass.style.height = Length.Percent(40); grass.style.backgroundColor = _biGrass; stg.Add(grass);
        _biSkyBox = sky; _biGrassBox = grass;
        prevP.Add(stg); col.Add(prevP);
        var codeP = Panel(); codeP.Add(CodeHeader("Java", Pascal(_biId.value), "java", ()=> _biCode.text, "biome", ()=> _biId.value));
        _biCode = CodeLabel(); codeP.Add(_biCode); col.Add(codeP);
        shell.Add(col);
        _content.Add(shell);

        _biId.RegisterValueChangedCallback(_=>RegenBiome());
        _biTemp.RegisterValueChangedCallback(_=>RegenBiome()); _biDown.RegisterValueChangedCallback(_=>RegenBiome());
        _biPrecip.RegisterValueChangedCallback(_=>RegenBiome());
        RegenBiome();
    }
    private VisualElement _biSkyBox, _biGrassBox;

    private void RegenBiome()
    {
        if(_biSkyBox != null) _biSkyBox.style.backgroundColor = _biSky;
        if(_biGrassBox != null) _biGrassBox.style.backgroundColor = _biGrass;
        string id = string.IsNullOrEmpty(_biId.value) ? "my_biome" : _biId.value;
        string ID = id.ToUpper();
        string sky = ColorUtility.ToHtmlStringRGB(_biSky), fog = ColorUtility.ToHtmlStringRGB(_biFog);
        string water = ColorUtility.ToHtmlStringRGB(_biWater), grass = ColorUtility.ToHtmlStringRGB(_biGrass);
        _biCode.text =
$@"context.register({ID}, biomeWithDefaults(
    defaultAmbientBuilder()
        .skyColor(0x{sky})
        .fogColor(0x{fog})
        .waterColor(0x{water})
        .grassColorOverride(0x{grass}),
    defaultMobSpawning(),
    {Pascal(id)}Gen(featureGetter, carverGetter))
    .temperature({_biTemp.value:0.00}F).downfall({_biDown.value:0.00}F)
    .hasPrecipitation({(_biPrecip.value ? "true" : "false")}).build());";
    }

    private void ColorPicker(VisualElement parent, string label, Color init, Action<Color> onChange)
    {
        var wrap = new VisualElement(); wrap.style.marginBottom = 10;
        var l = new Label(label); l.style.color = MUTED; l.style.fontSize = 12; l.style.marginBottom = 5; wrap.Add(l);
        var row = Row(); row.style.alignItems = Align.Center;
        var sw = new VisualElement(); sw.style.width = 32; sw.style.height = 32; Round(sw, 7); sw.style.backgroundColor = init; sw.style.marginRight = 10; row.Add(sw);
        string[] presets = {"#80A0FF","#C0D8FF","#3F76E4","#6FBF4F","#A0D060","#5C694E","#FF8501","#46C7D8","#FFFFFF","#1B380B"};
        foreach(var hex in presets){
            var s = new VisualElement(); s.style.width = 22; s.style.height = 22; s.style.marginRight = 3; Round(s, 5); s.style.backgroundColor = C(hex);
            var cc = C(hex); s.RegisterCallback<MouseDownEvent>(_=>{ sw.style.backgroundColor = cc; onChange(cc); });
            row.Add(s);
        }
        wrap.Add(row); parent.Add(wrap);
    }

    // =========================================================================
    // STRUCTURE EDITOR VIEW
    // =========================================================================
    private TextField _stId, _stBiome; private DropdownField _stStep, _stTerrain;
    private Slider _stSize, _stSpacing, _stSep, _stSalt; private Label _stCode;

    private void ShowStructure()
    {
        SetActiveNav("World"); SetHeader("Structure Editor", "Dungeons, towers & ruins · placement");
        _content.Clear();
        var shell = Row(); shell.style.flexGrow = 1;
        var form = new VisualElement(); form.style.flexGrow = 1; form.style.marginRight = 14;

        var idP = Panel(); idP.style.marginBottom = 14; idP.Add(PanelHeader("Definition"));
        _stId = FormText(idP, "Structure ID", "frost_tower");
        _stBiome = FormText(idP, "Biome Tag", "mymod:has_structure/frost_tower");
        _stStep = FormDropdown(idP, "Generation Step", new List<string>{"surface_structures","underground_structures","strongholds"});
        _stTerrain = FormDropdown(idP, "Terrain Adaptation", new List<string>{"none","beard_thin","beard_box","bury","encapsulate"});
        _stSize = FormSlider(idP, "Jigsaw Size (depth)", 1, 7, 4);
        form.Add(idP);
        var plP = Panel(); plP.Add(PanelHeader("Placement (Structure Set)"));
        _stSpacing = FormSlider(plP, "Spacing (chunks)", 4, 64, 32);
        _stSep = FormSlider(plP, "Separation", 1, 16, 8);
        _stSalt = FormSlider(plP, "Salt (seed)", 0, 999999, 165745);
        form.Add(plP);
        shell.Add(form);

        var col = new VisualElement(); col.style.width = 420; col.style.flexShrink = 0;
        var prevP = Panel(); prevP.style.marginBottom = 14; prevP.Add(PanelHeader("Preview"));
        var stg = new VisualElement(); stg.style.height = 150; stg.style.alignItems = Align.Center; stg.style.justifyContent = Justify.Center; stg.style.backgroundColor = C("#0d1219"); Round(stg, 10);
        var ic = new Label("🏰"); ic.style.fontSize = 64; stg.Add(ic); prevP.Add(stg); col.Add(prevP);
        var codeP = Panel(); codeP.Add(CodeHeader("JSON", "structure_set", "json", ()=> _stCode.text, "structure", ()=> _stId.value));
        _stCode = CodeLabel(); codeP.Add(_stCode); col.Add(codeP);
        shell.Add(col); _content.Add(shell);

        _stId.RegisterValueChangedCallback(_=>RegenStructure()); _stBiome.RegisterValueChangedCallback(_=>RegenStructure());
        _stStep.RegisterValueChangedCallback(_=>RegenStructure()); _stTerrain.RegisterValueChangedCallback(_=>RegenStructure());
        foreach(var s in new Slider[]{_stSize,_stSpacing,_stSep,_stSalt}) s.RegisterValueChangedCallback(_=>RegenStructure());
        RegenStructure();
    }

    private void RegenStructure()
    {
        string id = string.IsNullOrEmpty(_stId.value) ? "my_structure" : _stId.value;
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("{");
        sb.AppendLine("  \"structures\": [");
        sb.AppendLine("    { \"structure\": \"mymod:" + id + "\", \"weight\": 1 }");
        sb.AppendLine("  ],");
        sb.AppendLine("  \"placement\": {");
        sb.AppendLine("    \"type\": \"minecraft:random_spread\",");
        sb.AppendLine("    \"salt\": " + Mathf.RoundToInt(_stSalt.value) + ",");
        sb.AppendLine("    \"spacing\": " + Mathf.RoundToInt(_stSpacing.value) + ",");
        sb.AppendLine("    \"separation\": " + Mathf.RoundToInt(_stSep.value));
        sb.AppendLine("  }");
        sb.AppendLine("}");
        sb.AppendLine("");
        sb.AppendLine("// structure def -> step=" + _stStep.value + ", terrainAdaptation=" + _stTerrain.value);
        sb.AppendLine("//   size=" + Mathf.RoundToInt(_stSize.value) + ", biomes=#" + _stBiome.value);
        _stCode.text = sb.ToString();
    }

    // =========================================================================
    // LOOT TABLE EDITOR VIEW
    // =========================================================================
    private TextField _ltId; private DropdownField _ltType, _ltItem; private Slider _ltRolls, _ltMin, _ltMax;
    private Toggle _ltExplosion, _ltPlayer; private Label _ltCode;

    private void ShowLoot()
    {
        SetActiveNav("Items"); SetHeader("Loot Table Editor", "Drops, chances & conditions");
        _content.Clear();
        var shell = Row(); shell.style.flexGrow = 1;
        var form = new VisualElement(); form.style.flexGrow = 1; form.style.marginRight = 14;

        var idP = Panel(); idP.style.marginBottom = 14; idP.Add(PanelHeader("Table"));
        _ltId = FormText(idP, "Loot Table ID", "blocks/ruby_ore");
        _ltType = FormDropdown(idP, "Type", new List<string>{"block","entity","chest"});
        form.Add(idP);
        var poolP = Panel(); poolP.style.marginBottom = 14; poolP.Add(PanelHeader("Pool · Entry"));
        var items = new List<string>(); foreach(var ing in INGS) items.Add(ing.id);
        _ltItem = FormDropdown(poolP, "Item", items);
        _ltRolls = FormSlider(poolP, "Rolls", 1, 5, 1);
        _ltMin = FormSlider(poolP, "Count Min", 1, 16, 1);
        _ltMax = FormSlider(poolP, "Count Max", 1, 16, 1);
        form.Add(poolP);
        var cP = Panel(); cP.Add(PanelHeader("Conditions"));
        _ltExplosion = FormToggle(cP, "Survives Explosion (block)", true);
        _ltPlayer = FormToggle(cP, "Killed by Player (entity)", false);
        form.Add(cP);
        shell.Add(form);

        var col = new VisualElement(); col.style.width = 420; col.style.flexShrink = 0;
        var codeP = Panel(); codeP.Add(CodeHeader("JSON", "loot_table", "json", ()=> _ltCode.text, "loot", ()=> _ltId.value));
        _ltCode = CodeLabel(); codeP.Add(_ltCode); col.Add(codeP);
        shell.Add(col); _content.Add(shell);

        _ltId.RegisterValueChangedCallback(_=>RegenLoot()); _ltType.RegisterValueChangedCallback(_=>RegenLoot());
        _ltItem.RegisterValueChangedCallback(_=>RegenLoot());
        foreach(var s in new Slider[]{_ltRolls,_ltMin,_ltMax}) s.RegisterValueChangedCallback(_=>RegenLoot());
        _ltExplosion.RegisterValueChangedCallback(_=>RegenLoot()); _ltPlayer.RegisterValueChangedCallback(_=>RegenLoot());
        RegenLoot();
    }

    private void RegenLoot()
    {
        string t = _ltType.value;
        int rolls = Mathf.RoundToInt(_ltRolls.value), mn = Mathf.RoundToInt(_ltMin.value), mx = Mathf.Max(mn, Mathf.RoundToInt(_ltMax.value));
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("{");
        sb.AppendLine("  \"type\": \"minecraft:" + t + "\",");
        sb.AppendLine("  \"pools\": [");
        sb.AppendLine("    {");
        sb.AppendLine("      \"rolls\": " + rolls + ",");
        sb.AppendLine("      \"entries\": [");
        sb.AppendLine("        {");
        sb.AppendLine("          \"type\": \"minecraft:item\",");
        sb.AppendLine("          \"name\": \"" + _ltItem.value + "\",");
        sb.AppendLine("          \"functions\": [");
        sb.AppendLine("            { \"function\": \"minecraft:set_count\", \"count\": { \"type\": \"minecraft:uniform\", \"min\": " + mn + ", \"max\": " + mx + " } }");
        sb.AppendLine("          ]");
        sb.AppendLine("        }");
        sb.AppendLine("      ],");
        sb.AppendLine("      \"conditions\": [");
        var conds = new List<string>();
        if(t == "block" && _ltExplosion.value) conds.Add("        { \"condition\": \"minecraft:survives_explosion\" }");
        if(t == "entity" && _ltPlayer.value) conds.Add("        { \"condition\": \"minecraft:killed_by_player\" }");
        for(int i=0;i<conds.Count;i++) sb.AppendLine(conds[i] + (i<conds.Count-1?",":""));
        sb.AppendLine("      ]");
        sb.AppendLine("    }");
        sb.AppendLine("  ]");
        sb.AppendLine("}");
        _ltCode.text = sb.ToString();
    }

    // =========================================================================
    // ADVANCEMENT EDITOR VIEW
    // =========================================================================
    private TextField _adId, _adParent, _adTitle; private DropdownField _adIcon, _adFrame, _adTrigger;
    private Toggle _adToast, _adChat, _adHidden; private Slider _adExp; private Label _adCode;

    private void ShowAdvance()
    {
        SetActiveNav("Effects"); SetHeader("Advancement Editor", "Goals, triggers & rewards");
        _content.Clear();
        var shell = Row(); shell.style.flexGrow = 1;
        var form = new VisualElement(); form.style.flexGrow = 1; form.style.marginRight = 14;

        var idP = Panel(); idP.style.marginBottom = 14; idP.Add(PanelHeader("Display"));
        _adId = FormText(idP, "Advancement ID", "enter_frost_realm");
        _adTitle = FormText(idP, "Title", "Frosty Beginnings");
        _adParent = FormText(idP, "Parent", "minecraft:story/root");
        _adIcon = FormDropdown(idP, "Icon Item", new List<string>{"minecraft:diamond","minecraft:iron_ingot","minecraft:nether_star","mymod:ruby","minecraft:emerald"});
        _adFrame = FormDropdown(idP, "Frame", new List<string>{"task","goal","challenge"});
        form.Add(idP);
        var trP = Panel(); trP.style.marginBottom = 14; trP.Add(PanelHeader("Trigger & Rewards"));
        _adTrigger = FormDropdown(trP, "Trigger", new List<string>{"minecraft:inventory_changed","minecraft:player_killed_entity","minecraft:location","minecraft:enter_block","minecraft:consume_item"});
        _adExp = FormSlider(trP, "Experience Reward", 0, 1000, 100);
        form.Add(trP);
        var fP = Panel(); fP.Add(PanelHeader("Flags"));
        _adToast = FormToggle(fP, "Show Toast", true);
        _adChat = FormToggle(fP, "Announce to Chat", true);
        _adHidden = FormToggle(fP, "Hidden", false);
        form.Add(fP);
        shell.Add(form);

        var col = new VisualElement(); col.style.width = 420; col.style.flexShrink = 0;
        var codeP = Panel(); codeP.Add(CodeHeader("JSON", "advancement", "json", ()=> _adCode.text, "advancement", ()=> _adId.value));
        _adCode = CodeLabel(); codeP.Add(_adCode); col.Add(codeP);
        shell.Add(col); _content.Add(shell);

        _adId.RegisterValueChangedCallback(_=>RegenAdvance()); _adTitle.RegisterValueChangedCallback(_=>RegenAdvance());
        _adParent.RegisterValueChangedCallback(_=>RegenAdvance()); _adIcon.RegisterValueChangedCallback(_=>RegenAdvance());
        _adFrame.RegisterValueChangedCallback(_=>RegenAdvance()); _adTrigger.RegisterValueChangedCallback(_=>RegenAdvance());
        _adExp.RegisterValueChangedCallback(_=>RegenAdvance());
        _adToast.RegisterValueChangedCallback(_=>RegenAdvance()); _adChat.RegisterValueChangedCallback(_=>RegenAdvance()); _adHidden.RegisterValueChangedCallback(_=>RegenAdvance());
        RegenAdvance();
    }

    private void RegenAdvance()
    {
        string title = string.IsNullOrEmpty(_adTitle.value) ? "My Advancement" : _adTitle.value;
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("{");
        sb.AppendLine("  \"parent\": \"" + _adParent.value + "\",");
        sb.AppendLine("  \"display\": {");
        sb.AppendLine("    \"icon\": { \"id\": \"" + _adIcon.value + "\" },");
        sb.AppendLine("    \"title\": { \"text\": \"" + title + "\" },");
        sb.AppendLine("    \"description\": { \"text\": \"\" },");
        sb.AppendLine("    \"frame\": \"" + _adFrame.value + "\",");
        sb.AppendLine("    \"show_toast\": " + (_adToast.value?"true":"false") + ",");
        sb.AppendLine("    \"announce_to_chat\": " + (_adChat.value?"true":"false") + ",");
        sb.AppendLine("    \"hidden\": " + (_adHidden.value?"true":"false"));
        sb.AppendLine("  },");
        sb.AppendLine("  \"criteria\": {");
        sb.AppendLine("    \"requirement_0\": { \"trigger\": \"" + _adTrigger.value + "\" }");
        sb.AppendLine("  },");
        sb.AppendLine("  \"rewards\": { \"experience\": " + Mathf.RoundToInt(_adExp.value) + " }");
        sb.AppendLine("}");
        _adCode.text = sb.ToString();
    }

    // =========================================================================
    // SOUND EVENT EDITOR VIEW
    // =========================================================================
    private TextField _soId, _soSubtitle, _soPath; private DropdownField _soCat;
    private Slider _soVariants, _soVolume, _soPitch, _soWeight; private Toggle _soStream; private Label _soCode;

    private void ShowSound()
    {
        SetActiveNav("Effects"); SetHeader("Sound Editor", "SFX, music discs & ambience · sounds.json");
        _content.Clear();
        var shell = Row(); shell.style.flexGrow = 1;
        var form = new VisualElement(); form.style.flexGrow = 1; form.style.marginRight = 14;

        var idP = Panel(); idP.style.marginBottom = 14; idP.Add(PanelHeader("Event"));
        _soCat = FormDropdown(idP, "Category", new List<string>{"entity","block","item","ambient","music","weather","player","hostile","neutral"});
        _soId = FormText(idP, "Sound Event ID", "entity.frost_wolf.howl");
        _soSubtitle = FormText(idP, "Subtitle Key", "subtitles.frost_wolf.howl");
        form.Add(idP);
        var fP = Panel(); fP.style.marginBottom = 14; fP.Add(PanelHeader("Sound Files"));
        _soPath = FormText(fP, "Base File Path", "frost_wolf/howl");
        _soVariants = FormSlider(fP, "Variants (file count)", 1, 5, 2);
        form.Add(fP);
        var pP = Panel(); pP.Add(PanelHeader("Playback"));
        _soVolume = FormSlider(pP, "Volume", 0, 1, 1);
        _soPitch = FormSlider(pP, "Pitch", 0.5f, 2, 1);
        _soWeight = FormSlider(pP, "Weight", 1, 10, 1);
        _soStream = FormToggle(pP, "Stream (long music)", false);
        form.Add(pP);
        shell.Add(form);

        var col = new VisualElement(); col.style.width = 420; col.style.flexShrink = 0;
        var prevP = Panel(); prevP.style.marginBottom = 14; prevP.Add(PanelHeader("Preview"));
        var stg = new VisualElement(); stg.style.height = 130; stg.style.alignItems = Align.Center; stg.style.justifyContent = Justify.Center; stg.style.backgroundColor = C("#0d1219"); Round(stg, 10);
        var wave = Row(); wave.style.alignItems = Align.Center; wave.style.height = 60;
        var rng = new System.Random(3);
        for(int i=0;i<22;i++){ var bar = new VisualElement(); bar.style.width = 5; bar.style.marginLeft = 2; bar.style.marginRight = 2;
            float h = 8 + rng.Next(48); bar.style.height = h; Round(bar, 3); bar.style.backgroundColor = CYAN; wave.Add(bar); }
        stg.Add(wave); prevP.Add(stg);
        var sIco = new Label("🔊"); sIco.style.fontSize = 22; sIco.style.unityTextAlign = TextAnchor.MiddleCenter; sIco.style.marginTop = 8; prevP.Add(sIco);
        col.Add(prevP);
        var codeP = Panel(); codeP.Add(CodeHeader("JSON", "sounds", "json", ()=> _soCode.text, "sound", ()=> _soId.value));
        _soCode = CodeLabel(); codeP.Add(_soCode); col.Add(codeP);
        shell.Add(col); _content.Add(shell);

        _soCat.RegisterValueChangedCallback(_=>RegenSound()); _soId.RegisterValueChangedCallback(_=>RegenSound());
        _soSubtitle.RegisterValueChangedCallback(_=>RegenSound()); _soPath.RegisterValueChangedCallback(_=>RegenSound());
        foreach(var s in new Slider[]{_soVariants,_soVolume,_soPitch,_soWeight}) s.RegisterValueChangedCallback(_=>RegenSound());
        _soStream.RegisterValueChangedCallback(_=>RegenSound());
        RegenSound();
    }

    private void RegenSound()
    {
        string id = string.IsNullOrEmpty(_soId.value) ? "entity.my_mob.sound" : _soId.value;
        string path = string.IsNullOrEmpty(_soPath.value) ? "my_mob/sound" : _soPath.value;
        int variants = Mathf.RoundToInt(_soVariants.value);
        float vol = _soVolume.value, pit = _soPitch.value; int weight = Mathf.RoundToInt(_soWeight.value);
        string stream = _soStream.value ? "true" : "false";
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("{");
        sb.AppendLine("  \"" + id + "\": {");
        sb.AppendLine("    \"subtitle\": \"" + _soSubtitle.value + "\",");
        sb.AppendLine("    \"sounds\": [");
        for(int i=1;i<=variants;i++){
            string entry = "      { \"name\": \"mymod:" + path + i + "\", \"volume\": " + vol.ToString("0.0")
                + ", \"pitch\": " + pit.ToString("0.0") + ", \"weight\": " + weight + ", \"stream\": " + stream + " }";
            sb.AppendLine(entry + (i<variants?",":""));
        }
        sb.AppendLine("    ]");
        sb.AppendLine("  }");
        sb.AppendLine("}");
        _soCode.text = sb.ToString();
    }

    private Label CodeLabel(){
        var l = new Label(); l.style.whiteSpace = WhiteSpace.Normal; l.style.color = C("#cdd6e0");
        l.style.fontSize = 12; l.style.backgroundColor = BG; SetPadding(l, 12); Round(l, 9);
        return l;
    }

    // code panel header with an Export button on the right
    private VisualElement CodeHeader(string lang, string defaultName, string ext, Func<string> getContent, string kind = null, Func<string> getId = null, bool withTex = false)
    {
        var ch = Row(); ch.style.justifyContent = Justify.SpaceBetween; ch.style.alignItems = Align.Center; ch.style.marginBottom = 12;
        var chl = new Label("GENERATED CODE · " + lang.ToUpper()); chl.style.color = MUTED; chl.style.fontSize = 11; chl.style.letterSpacing = 1; chl.style.unityFontStyleAndWeight = FontStyle.Bold;
        var btns = Row(); btns.style.alignItems = Align.Center;
        if(kind != null){
            var save = PillButton("💾 Save", PANEL2, TEXT, ()=> SaveElement(kind, getId != null ? getId() : defaultName, getContent(), withTex));
            save.style.height = 28; save.style.marginRight = 8; btns.Add(save);
        }
        var btn = PillButton("⭳ Export ." + ext, GREEN, Color.white, ()=> ExportCode(defaultName, ext, getContent())); btn.style.height = 28;
        btns.Add(btn);
        ch.Add(chl); ch.Add(btns);
        return ch;
    }

    private void ExportCode(string defaultName, string ext, string content)
    {
        if(string.IsNullOrEmpty(defaultName)) defaultName = "Generated";
        string path = EditorUtility.SaveFilePanel("Export " + ext.ToUpper(), Application.dataPath, defaultName, ext);
        if(string.IsNullOrEmpty(path)) return;
        File.WriteAllText(path, content);
        AssetDatabase.Refresh();
        Debug.Log("[Creator Suite] Exported → " + path);
    }

    // =========================================================================
    // FULL MOD SKELETON EXPORT
    // =========================================================================
    private void ExportSkeletonPrompt()
    {
        string modId = string.IsNullOrEmpty(_expModId.value) ? "examplemod" : _expModId.value.Trim().ToLower().Replace(' ','_');
        string pkg = string.IsNullOrEmpty(_expPkg.value) ? "com.example." + modId : _expPkg.value.Trim();
        string root = EditorUtility.SaveFolderPanel("Choose output folder for the mod project", Application.dataPath, "");
        if(string.IsNullOrEmpty(root)) return;
        try {
            string dir = ExportSkeleton(modId, pkg, root);
            AssetDatabase.Refresh();
            EditorUtility.DisplayDialog("Mod Studio", "Mod skeleton generated:\n\n" + dir, "Great!");
            Debug.Log("[Creator Suite] Mod skeleton → " + dir);
        } catch(Exception e){
            Debug.LogError("[Creator Suite] Skeleton export failed: " + e);
            EditorUtility.DisplayDialog("Mod Studio", "Export failed: " + e.Message, "OK");
        }
    }

    private string ExportSkeleton(string modId, string pkg, string root)
    {
        string main = Pascal(modId);
        string pkgPath = pkg.Replace('.', '/');
        string baseDir = Path.Combine(root, modId);
        string javaDir = Path.Combine(baseDir, "src/main/java/" + pkgPath);
        string initDir = Path.Combine(javaDir, "init");
        string resDir  = Path.Combine(baseDir, "src/main/resources");

        Directory.CreateDirectory(initDir);
        Directory.CreateDirectory(Path.Combine(resDir, "META-INF"));
        foreach(var d in new[]{
            "assets/"+modId+"/textures/block", "assets/"+modId+"/textures/item",
            "assets/"+modId+"/models/block", "assets/"+modId+"/models/item",
            "assets/"+modId+"/blockstates", "assets/"+modId+"/lang", "assets/"+modId+"/particles",
            "data/"+modId+"/recipe", "data/"+modId+"/loot_table",
            "data/"+modId+"/advancement", "data/"+modId+"/tags" })
            Directory.CreateDirectory(Path.Combine(resDir, d));

        Func<string,string> T = s => s.Replace("%MODID%",modId).Replace("%PKG%",pkg).Replace("%MAIN%",main).Replace("%NAME%",main);
        Func<string,string> NS = s => s == null ? null : s.Replace("mymod:", modId + ":");

        // bake in everything created this session (saved + currently-open editors)
        CaptureOpenEditors();
        var blocks = _project.FindAll(e => e.kind == "block");
        var items  = _project.FindAll(e => e.kind == "item");
        var parts  = _project.FindAll(e => e.kind == "particle");

        string blockExtra = ""; foreach(var b in blocks) if(b.code != null) blockExtra += Indent(NS(b.code)) + "\n";
        string itemExtra  = ""; foreach(var it in items) if(it.code != null) itemExtra += Indent(NS(it.code)) + "\n";
        string partExtra  = ""; foreach(var p in parts) if(p.code != null) partExtra += Indent(p.code.Replace("PARTICLE_TYPES","PARTICLES")) + "\n";

        // --- registration classes (inject all compile-safe elements) ---
        File.WriteAllText(Path.Combine(javaDir, main + ".java"), T(TPL_MAIN));
        File.WriteAllText(Path.Combine(initDir, "ModBlocks.java"),       T(TPL_BLOCKS).Replace("%EXTRA%", blockExtra.TrimEnd()));
        File.WriteAllText(Path.Combine(initDir, "ModItems.java"),        T(TPL_ITEMS).Replace("%EXTRA%", itemExtra.TrimEnd()));
        File.WriteAllText(Path.Combine(initDir, "ModEntities.java"),     T(TPL_ENTITIES));
        File.WriteAllText(Path.Combine(initDir, "ModParticles.java"),    T(TPL_PARTICLES).Replace("%EXTRA%", partExtra.TrimEnd()));
        File.WriteAllText(Path.Combine(initDir, "ModEnchantments.java"), T(TPL_ENCHANTS));
        File.WriteAllText(Path.Combine(initDir, "ModCreativeTabs.java"), T(TPL_TABS));
        File.WriteAllText(Path.Combine(resDir, "META-INF/neoforge.mods.toml"), T(TPL_TOML));
        File.WriteAllText(Path.Combine(resDir, "pack.mcmeta"), T(TPL_PACK));
        File.WriteAllText(Path.Combine(baseDir, "gradle.properties"), T(TPL_GRADLE));

        // --- textures + models per block/item (fallback example uses current canvas) ---
        if(_layers == null) SeedTexture();
        var cur = Composite();
        var langBlocks = new List<string>(); var langItems = new List<string>();
        if(blocks.Count == 0){ WriteBlockAssets("example_block", cur, modId, resDir); langBlocks.Add("example_block"); }
        else foreach(var b in blocks){ WriteBlockAssets(b.id, b.tex ?? cur, modId, resDir); langBlocks.Add(b.id); }
        if(items.Count == 0){ WriteItemAssets("example_item", cur, modId, resDir); langItems.Add("example_item"); }
        else foreach(var it in items){ WriteItemAssets(it.id, it.tex ?? cur, modId, resDir); langItems.Add(it.id); }

        // --- data files & reference snippets per element ---
        foreach(var e in _project){
            switch(e.kind){
                case "recipe":      WriteText(Path.Combine(resDir, "data/"+modId+"/recipe/"+e.id+".json"), NS(e.code)); break;
                case "loot":        WriteText(Path.Combine(resDir, "data/"+modId+"/loot_table/"+e.id+".json"), NS(e.code)); break;
                case "advancement": WriteText(Path.Combine(resDir, "data/"+modId+"/advancement/"+e.id+".json"), NS(e.code)); break;
                case "structure":   WriteText(Path.Combine(resDir, "data/"+modId+"/worldgen/structure_set/"+e.id+".json"), StripComments(NS(e.code))); break;
                case "biome":       WriteText(Path.Combine(baseDir, "generated_reference/biome/"+e.id+".txt"), NS(e.code)); break;
                case "entity":      WriteText(Path.Combine(baseDir, "generated_reference/entity/"+e.id+".txt"), e.code); break;
                case "enchant":     WriteText(Path.Combine(baseDir, "generated_reference/enchant/"+e.id+".txt"), e.code); break;
            }
        }
        var sounds = _project.FindAll(e => e.kind == "sound");
        if(sounds.Count > 0) WriteText(Path.Combine(resDir, "assets/"+modId+"/sounds.json"), MergeSounds(sounds, NS));

        // --- lang (all blocks + items) ---
        var lang = new System.Text.StringBuilder();
        lang.Append("{\n  \"itemGroup."+modId+"\": \""+main+"\"");
        foreach(var b in langBlocks) lang.Append(",\n  \"block."+modId+"."+b+"\": \""+Titleize(b)+"\"");
        foreach(var it in langItems) lang.Append(",\n  \"item."+modId+"."+it+"\": \""+Titleize(it)+"\"");
        lang.Append("\n}\n");
        WriteText(Path.Combine(resDir, "assets/"+modId+"/lang/en_us.json"), lang.ToString());
        return baseDir;
    }

    private void WriteBlockAssets(string id, Color[] tex, string modId, string resDir)
    {
        WritePng(tex, Path.Combine(resDir, "assets/"+modId+"/textures/block/"+id+".png"));
        WriteText(Path.Combine(resDir, "assets/"+modId+"/blockstates/"+id+".json"),
            "{\n  \"variants\": {\n    \"\": { \"model\": \""+modId+":block/"+id+"\" }\n  }\n}\n");
        WriteText(Path.Combine(resDir, "assets/"+modId+"/models/block/"+id+".json"),
            "{\n  \"parent\": \"minecraft:block/cube_all\",\n  \"textures\": { \"all\": \""+modId+":block/"+id+"\" }\n}\n");
        WriteText(Path.Combine(resDir, "assets/"+modId+"/models/item/"+id+".json"),
            "{\n  \"parent\": \""+modId+":block/"+id+"\"\n}\n");
    }
    private void WriteItemAssets(string id, Color[] tex, string modId, string resDir)
    {
        WritePng(tex, Path.Combine(resDir, "assets/"+modId+"/textures/item/"+id+".png"));
        WriteText(Path.Combine(resDir, "assets/"+modId+"/models/item/"+id+".json"),
            "{\n  \"parent\": \"minecraft:item/generated\",\n  \"textures\": { \"layer0\": \""+modId+":item/"+id+"\" }\n}\n");
    }
    private static string StripComments(string s)
    {
        if(s == null) return "";
        var sb = new System.Text.StringBuilder();
        foreach(var ln in s.Split('\n')){ if(ln.TrimStart().StartsWith("//")) continue; sb.Append(ln).Append('\n'); }
        return sb.ToString().Trim() + "\n";
    }
    private string MergeSounds(List<ModElement> snds, Func<string,string> ns)
    {
        var inner = new List<string>();
        foreach(var s in snds){
            string c = ns(s.code); if(c == null) continue; c = c.Trim();
            int a = c.IndexOf('{'), b = c.LastIndexOf('}');
            if(a >= 0 && b > a){ string mid = c.Substring(a+1, b-a-1).Trim(); if(mid.Length > 0) inner.Add(mid); }
        }
        return "{\n" + string.Join(",\n", inner) + "\n}\n";
    }

    private void WritePng(Color[] comp, string path)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path));
        var t = new Texture2D(TEX, TEX);
        for(int y=0;y<TEX;y++) for(int x=0;x<TEX;x++) t.SetPixel(x, TEX-1-y, comp[y*TEX+x]);
        t.Apply();
        File.WriteAllBytes(path, t.EncodeToPNG());
        DestroyImmediate(t);
    }
    private void WriteText(string path, string content){ Directory.CreateDirectory(Path.GetDirectoryName(path)); File.WriteAllText(path, content); }
    private static string Indent(string code){ return "    " + code.Replace("\n", "\n    "); }
    private static string Titleize(string s){
        var parts = s.Replace('/','_').Split('_'); var sb = new System.Text.StringBuilder();
        foreach(var w in parts){ if(w.Length>0){ sb.Append(char.ToUpper(w[0])).Append(w.Substring(1)).Append(' '); } }
        return sb.ToString().Trim();
    }

    private const string TPL_MAIN = @"package %PKG%;

import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;
import %PKG%.init.*;

@Mod(%MAIN%.MOD_ID)
public class %MAIN% {
    public static final String MOD_ID = ""%MODID%"";

    public %MAIN%(IEventBus bus) {
        ModBlocks.BLOCKS.register(bus);
        ModItems.ITEMS.register(bus);
        ModEntities.ENTITIES.register(bus);
        ModParticles.PARTICLES.register(bus);
        ModEnchantments.ENCHANTMENTS.register(bus);
        ModCreativeTabs.TABS.register(bus);
    }
}
";

    private const string TPL_BLOCKS = @"package %PKG%.init;

import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.neoforged.neoforge.registries.DeferredBlock;
import net.neoforged.neoforge.registries.DeferredRegister;
import %PKG%.%MAIN%;

import java.util.function.Supplier;

public class ModBlocks {
    public static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks(%MAIN%.MOD_ID);

    public static final DeferredBlock<Block> EXAMPLE_BLOCK = register(""example_block"",
        () -> new Block(BlockBehaviour.Properties.of().strength(3.0F, 6.0F)));
%EXTRA%
    public static <T extends Block> DeferredBlock<T> register(String name, Supplier<T> block) {
        DeferredBlock<T> ret = BLOCKS.register(name, block);
        ModItems.ITEMS.register(name, () -> new BlockItem(ret.get(), new Item.Properties()));
        return ret;
    }
}
";

    private const string TPL_ITEMS = @"package %PKG%.init;

import net.minecraft.world.item.Item;
import net.minecraft.world.item.Rarity;
import net.minecraft.world.food.FoodProperties;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;
import %PKG%.%MAIN%;

public class ModItems {
    public static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(%MAIN%.MOD_ID);

    public static final DeferredItem<Item> EXAMPLE_ITEM = ITEMS.register(""example_item"",
        () -> new Item(new Item.Properties()));
%EXTRA%
}
";

    private const string TPL_ENTITIES = @"package %PKG%.init;

import net.minecraft.core.registries.Registries;
import net.minecraft.world.entity.EntityType;
import net.neoforged.neoforge.registries.DeferredRegister;
import %PKG%.%MAIN%;

public class ModEntities {
    public static final DeferredRegister<EntityType<?>> ENTITIES =
        DeferredRegister.create(Registries.ENTITY_TYPE, %MAIN%.MOD_ID);
}
";

    private const string TPL_PARTICLES = @"package %PKG%.init;

import net.minecraft.core.particles.ParticleType;
import net.minecraft.core.particles.SimpleParticleType;
import net.minecraft.core.registries.Registries;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;
import %PKG%.%MAIN%;

public class ModParticles {
    public static final DeferredRegister<ParticleType<?>> PARTICLES =
        DeferredRegister.create(Registries.PARTICLE_TYPE, %MAIN%.MOD_ID);
%EXTRA%
}
";

    private const string TPL_ENCHANTS = @"package %PKG%.init;

import net.minecraft.core.registries.Registries;
import net.minecraft.world.item.enchantment.Enchantment;
import net.neoforged.neoforge.registries.DeferredRegister;
import %PKG%.%MAIN%;

public class ModEnchantments {
    public static final DeferredRegister<Enchantment> ENCHANTMENTS =
        DeferredRegister.create(Registries.ENCHANTMENT, %MAIN%.MOD_ID);
}
";

    private const string TPL_TABS = @"package %PKG%.init;

import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;
import %PKG%.%MAIN%;

public class ModCreativeTabs {
    public static final DeferredRegister<CreativeModeTab> TABS =
        DeferredRegister.create(Registries.CREATIVE_MODE_TAB, %MAIN%.MOD_ID);

    public static final DeferredHolder<CreativeModeTab, CreativeModeTab> MAIN_TAB =
        TABS.register(""main"", () -> CreativeModeTab.builder()
            .title(Component.translatable(""itemGroup.%MODID%""))
            .icon(() -> new ItemStack(ModItems.EXAMPLE_ITEM.get()))
            .displayItems((params, output) -> {
                output.accept(ModItems.EXAMPLE_ITEM.get());
                output.accept(ModBlocks.EXAMPLE_BLOCK.get());
            }).build());
}
";

    private const string TPL_TOML = @"modLoader=""javafml""
loaderVersion=""[1,)""
license=""MIT""

[[mods]]
modId=""%MODID%""
version=""1.0.0""
displayName=""%NAME%""
description=""Generated by Mod Studio Creator Suite.""

[[dependencies.%MODID%]]
modId=""neoforge""
type=""required""
versionRange=""[20,)""
ordering=""NONE""
side=""BOTH""

[[dependencies.%MODID%]]
modId=""minecraft""
type=""required""
versionRange=""[1.20,)""
ordering=""NONE""
side=""BOTH""
";

    private const string TPL_PACK = @"{
  ""pack"": {
    ""pack_format"": 15,
    ""description"": ""%NAME% resources""
  }
}
";

    private const string TPL_GRADLE = @"# Generated by Mod Studio Creator Suite
mod_id=%MODID%
mod_name=%NAME%
mod_version=1.0.0
minecraft_version=1.20.1
neoforge_version=47.1.0
";

    // =========================================================================
    // SMALL UI HELPERS
    // =========================================================================
    private VisualElement Row(){ var v = new VisualElement(); v.style.flexDirection = FlexDirection.Row; return v; }
    private VisualElement Panel(){ var v = new VisualElement(); v.style.backgroundColor = PANEL; Round(v,14);
        v.style.borderTopWidth=v.style.borderBottomWidth=v.style.borderLeftWidth=v.style.borderRightWidth=1;
        v.style.borderTopColor=v.style.borderBottomColor=v.style.borderLeftColor=v.style.borderRightColor=LINE;
        SetPadding(v, 16); return v; }
    private Label SectionLabel(string t){ var l = new Label(t); l.style.color = MUTED; l.style.fontSize = 12; l.style.letterSpacing = 1.2f; l.style.marginBottom = 14; l.style.unityFontStyleAndWeight = FontStyle.Bold; return l; }
    private Label PanelHeader(string t){ var l = new Label(t); l.style.color = MUTED; l.style.fontSize = 11; l.style.letterSpacing = 1; l.style.marginBottom = 12; l.style.unityFontStyleAndWeight = FontStyle.Bold; return l; }
    private Label Chip(string t, Color bg, Color fg){ var l = new Label(t); l.style.color = fg; l.style.fontSize = 12; SetPaddingH(l,11); SetPaddingV(l,5); l.style.backgroundColor = bg; Round(l,8); return l; }

    private Button PillButton(string text, Color bg, Color fg, Action a){
        var b = new Button(a){ text = text }; b.style.height = 34; SetPaddingH(b,15); b.style.fontSize = 13;
        b.style.unityFontStyleAndWeight = FontStyle.Bold; ClearBorder(b); Round(b,10);
        b.style.backgroundColor = bg; b.style.color = fg; return b; }

    private TextField FormText(VisualElement parent, string label, string val){
        var f = new TextField(label){ value = val }; StyleForm(f); parent.Add(f); return f; }
    private Slider FormSlider(VisualElement parent, string label, float min, float max, float val){
        var wrap = new VisualElement(); wrap.style.marginBottom = 10;
        var head = Row(); head.style.justifyContent = Justify.SpaceBetween;
        var l = new Label(label); l.style.color = MUTED; l.style.fontSize = 12;
        var v = new Label(val.ToString("0.0")); v.style.color = GREEN; v.style.fontSize = 13; v.style.unityFontStyleAndWeight = FontStyle.Bold;
        head.Add(l); head.Add(v); wrap.Add(head);
        var s = new Slider(min, max){ value = val }; s.RegisterValueChangedCallback(e=> v.text = e.newValue.ToString("0.0"));
        wrap.Add(s); parent.Add(wrap); return s; }
    private DropdownField FormDropdown(VisualElement parent, string label, List<string> choices){
        var f = new DropdownField(label, choices, 0); StyleForm(f); parent.Add(f); return f; }
    private Toggle FormToggle(VisualElement parent, string label, bool val){
        var f = new Toggle(label){ value = val }; f.style.marginBottom = 6; f.style.color = MUTED; parent.Add(f); return f; }
    private void StyleForm(VisualElement f){ f.style.marginBottom = 10;
        foreach(var lab in f.Query<Label>().ToList()) lab.style.color = MUTED; }

    private static void Round(VisualElement v, float r){ v.style.borderTopLeftRadius=r; v.style.borderTopRightRadius=r; v.style.borderBottomLeftRadius=r; v.style.borderBottomRightRadius=r; }
    private static void ClearBorder(VisualElement v){ v.style.borderTopWidth=v.style.borderBottomWidth=v.style.borderLeftWidth=v.style.borderRightWidth=0;
        v.style.marginLeft=0; v.style.marginRight=0; v.style.marginTop=0; }
    private static void SetPadding(VisualElement v, float p){ v.style.paddingLeft=p; v.style.paddingRight=p; v.style.paddingTop=p; v.style.paddingBottom=p; }
    private static void SetPaddingH(VisualElement v, float p){ v.style.paddingLeft=p; v.style.paddingRight=p; }
    private static void SetPaddingV(VisualElement v, float p){ v.style.paddingTop=p; v.style.paddingBottom=p; }
}
