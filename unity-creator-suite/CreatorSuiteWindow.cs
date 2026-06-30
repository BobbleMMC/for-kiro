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
        NavButton(side, "🌲  World", ShowDashboard, false);
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
            new Ed("✨","Enchantment","Custom enchants with effects", C("#7c8cff"), ()=>ShowBlock()),
            new Ed("✦","Particle","Sparks, glows & ambient FX", CYAN, ShowParticle),
            new Ed("🌲","Biome","Climate, colors & generation", GREEN, ()=>ShowBlock()),
            new Ed("🏰","Structure","Dungeons, towers & ruins", C("#b0895e"), ()=>ShowBlock()),
            new Ed("🏆","Advancement","Goals, triggers & rewards", C("#f5c542"), ()=>ShowBlock()),
            new Ed("🎁","Loot Table","Drops, chances & conditions", RED, ()=>ShowBlock()),
            new Ed("🔊","Sound","SFX, music discs & ambience", CYAN, ()=>ShowBlock()),
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
    private class TexLayer { public Color[] px = new Color[TEX*TEX]; public bool visible = true; public string name; public TexLayer(string n){ name = n; } }
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
            var px = _layers[l].px;
            for(int i=0;i<outp.Length;i++){
                var s = px[i]; if(s.a <= 0.001f) continue;
                var d = outp[i];
                float a = s.a + d.a*(1-s.a);
                if(a <= 0.001f){ outp[i] = new Color(0,0,0,0); continue; }
                outp[i] = new Color(
                    (s.r*s.a + d.r*d.a*(1-s.a))/a,
                    (s.g*s.a + d.g*d.a*(1-s.a))/a,
                    (s.b*s.a + d.b*d.a*(1-s.a))/a, a);
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
    private void RefreshLayersUI()
    {
        if(_layersList == null) return;
        _layersList.Clear();
        for(int i=0;i<_layers.Count;i++){
            int idx = i; var lay = _layers[i];
            var row = Row(); row.style.alignItems = Align.Center; row.style.marginBottom = 6;
            row.style.paddingLeft = 9; row.style.paddingRight = 9; row.style.height = 36; Round(row, 9);
            row.style.backgroundColor = (idx==_active) ? PANEL2 : BG;
            if(idx==_active){ row.style.borderLeftWidth = 2; row.style.borderLeftColor = GREEN; }
            var eye = new Button(()=>{ lay.visible = !lay.visible; RefreshLayersUI(); RebuildTextures(); }){ text = lay.visible ? "👁" : "—" };
            eye.style.width = 26; eye.style.height = 26; ClearBorder(eye); eye.style.backgroundColor = Color.clear; eye.style.color = lay.visible ? TEXT : FAINT; eye.style.fontSize = 13;
            var nm = new Label(lay.name); nm.style.color = (idx==_active)?TEXT:MUTED; nm.style.fontSize = 13; nm.style.flexGrow = 1; nm.style.marginLeft = 4;
            row.Add(eye); row.Add(nm);
            row.RegisterCallback<MouseDownEvent>(_=>{ _active = idx; RefreshLayersUI(); });
            _layersList.Add(row);
        }
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
    private Label _codeLabel; private VisualElement _blockPreview;

    private void ShowBlock()
    {
        SetActiveNav("Block"); SetHeader("Block Editor", "Design blocks with live preview & code generation");
        _content.Clear();

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
        _blockPreview = new VisualElement(); _blockPreview.style.width = 110; _blockPreview.style.height = 110; Round(_blockPreview, 6);
        _blockPreview.style.backgroundColor = C("#c0392b");
        _blockPreview.style.borderTopWidth = 6; _blockPreview.style.borderTopColor = C("#e0564b");
        _blockPreview.style.borderLeftWidth = 6; _blockPreview.style.borderLeftColor = C("#7a3b1d");
        _blockPreview.style.borderRightWidth = 6; _blockPreview.style.borderRightColor = C("#9a2c20");
        _blockPreview.style.borderBottomWidth = 6; _blockPreview.style.borderBottomColor = C("#5e2018");
        pstage.Add(_blockPreview); prevP.Add(pstage);
        col.Add(prevP);

        var codeP = Panel();
        codeP.Add(PanelHeader("Generated Code · Java"));
        _codeLabel = new Label(); _codeLabel.style.whiteSpace = WhiteSpace.Normal; _codeLabel.style.color = C("#cdd6e0");
        _codeLabel.style.fontSize = 12; _codeLabel.style.backgroundColor = BG; SetPadding(_codeLabel, 12); Round(_codeLabel, 9);
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
        _blockPreview.style.borderTopColor = Color.Lerp(C("#e0564b"), C("#fff1a8"), g);

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
        var codeP = Panel(); codeP.Add(PanelHeader("Generated Recipe · JSON"));
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
        var codeP = Panel(); codeP.Add(PanelHeader("Generated Code · Java"));
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
        var codeP = Panel(); codeP.Add(PanelHeader("Generated Code · Java"));
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
        var codeP = Panel(); codeP.Add(PanelHeader("Generated Code · Java"));
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

    private Label CodeLabel(){
        var l = new Label(); l.style.whiteSpace = WhiteSpace.Normal; l.style.color = C("#cdd6e0");
        l.style.fontSize = 12; l.style.backgroundColor = BG; SetPadding(l, 12); Round(l, 9);
        return l;
    }

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
