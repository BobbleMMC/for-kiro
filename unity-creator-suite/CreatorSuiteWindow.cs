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
        NavButton(side, "⚔  Items", ShowDashboard, false);
        NavButton(side, "🐺  Entities", ShowDashboard, false);
        NavButton(side, "🌲  World", ShowDashboard, false);
        NavButton(side, "✦  Effects & FX", ShowDashboard, false);

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
            new Ed("⚔","Item","Tools, weapons, food, materials", AMBER, ()=>ShowBlock()),
            new Ed("🐺","Entity","Mobs, bosses, animals & AI", VIOLET, ()=>ShowBlock()),
            new Ed("🖌","Texture","Pixel-perfect painter", CYAN, ShowTexture),
            new Ed("📜","Recipe","Crafting, smelting, smithing", C("#d68a4e"), ()=>ShowBlock()),
            new Ed("✨","Enchantment","Custom enchants with effects", C("#7c8cff"), ()=>ShowBlock()),
            new Ed("✦","Particle","Sparks, glows & ambient FX", CYAN, ()=>ShowBlock()),
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
    private Color[] _pixels;
    private readonly List<Color[]> _undo = new List<Color[]>();
    private readonly List<Color[]> _redo = new List<Color[]>();
    private Texture2D _texCanvas, _texPreview;
    private Image _canvasImg, _previewImg;
    private Color _brush = C("#7d7d7d");
    private string _tool = "pencil";
    private int _cell = 22;
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
        if(_pixels == null) SeedTexture();

        var shell = Row(); shell.style.flexGrow = 1;

        // tool rail
        var rail = Panel(); rail.style.width = 52; rail.style.flexShrink = 0; rail.style.alignItems = Align.Center; rail.style.marginRight = 14;
        SetPaddingV(rail, 8); _toolButtons.Clear();
        ToolButton(rail, "✏", "pencil"); ToolButton(rail, "⌫", "eraser");
        ToolButton(rail, "🪣", "fill"); ToolButton(rail, "⊙", "picker");
        var sep = new VisualElement(); sep.style.height = 1; sep.style.width = 26; sep.style.backgroundColor = LINE; sep.style.marginTop = 6; sep.style.marginBottom = 6; rail.Add(sep);
        RailAction(rail, "↶", Undo); RailAction(rail, "↷", Redo); RailAction(rail, "🗑", ClearCanvas);
        shell.Add(rail);

        // canvas stage
        var stage = Panel(); stage.style.flexGrow = 1; stage.style.marginRight = 14; SetPadding(stage, 0); stage.style.overflow = Overflow.Hidden;
        var sbar = Row(); sbar.style.alignItems = Align.Center; SetPadding(sbar, 12); sbar.style.borderBottomWidth = 1; sbar.style.borderBottomColor = LINE;
        sbar.Add(Chip("🖼 stone.png", PANEL2, TEXT)); var c2 = Chip("16 × 16", PANEL2, MUTED); c2.style.marginLeft = 8; sbar.Add(c2);
        var sp = new VisualElement(); sp.style.flexGrow = 1; sbar.Add(sp);
        var exp = PillButton("⭳ Export PNG", GREEN, Color.white, ExportPng); sbar.Add(exp);
        stage.Add(sbar);

        var wrap = new VisualElement(); wrap.style.flexGrow = 1; wrap.style.alignItems = Align.Center; wrap.style.justifyContent = Justify.Center;
        wrap.style.backgroundColor = C("#0c1014"); SetPadding(wrap, 24);
        _canvasImg = new Image(); _canvasImg.scaleMode = ScaleMode.ScaleToFit;
        _canvasImg.style.width = TEX*_cell; _canvasImg.style.height = TEX*_cell;
        _canvasImg.RegisterCallback<MouseDownEvent>(OnCanvasDown);
        _canvasImg.RegisterCallback<MouseMoveEvent>(OnCanvasMove);
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
        _pixels = new Color[TEX*TEX];
        string[] tones = {"#6f6f6f","#7d7d7d","#888888","#717171","#828282","#767676"};
        var rng = new System.Random(7);
        for(int i=0;i<_pixels.Length;i++) _pixels[i] = C(tones[rng.Next(tones.Length)]);
    }

    private void RebuildTextures()
    {
        if(_texCanvas == null){ _texCanvas = new Texture2D(TEX, TEX); _texCanvas.filterMode = FilterMode.Point; }
        if(_texPreview == null){ _texPreview = new Texture2D(TEX, TEX); _texPreview.filterMode = FilterMode.Point; }
        // canvas (flip Y so row 0 is top)
        for(int y=0;y<TEX;y++) for(int x=0;x<TEX;x++) _texCanvas.SetPixel(x, TEX-1-y, _pixels[y*TEX+x]);
        _texCanvas.Apply();
        // preview = shaded front face (slightly brighter top rows for depth feel)
        for(int y=0;y<TEX;y++) for(int x=0;x<TEX;x++){
            var col = _pixels[y*TEX+x];
            float shade = Mathf.Lerp(1.08f, 0.86f, y/(float)TEX);
            _texPreview.SetPixel(x, TEX-1-y, new Color(col.r*shade, col.g*shade, col.b*shade, col.a));
        }
        _texPreview.Apply();
        if(_canvasImg != null) _canvasImg.image = _texCanvas;
        if(_previewImg != null) _previewImg.image = _texPreview;
    }

    private void OnCanvasDown(MouseDownEvent e){ PushUndo(); PaintAt(e.localMousePosition); }
    private void OnCanvasMove(MouseMoveEvent e){ if((e.pressedButtons & 1) != 0) PaintAt(e.localMousePosition); }

    private void PaintAt(Vector2 local)
    {
        float w = _canvasImg.resolvedStyle.width, h = _canvasImg.resolvedStyle.height;
        if(w <= 0) w = TEX*_cell; if(h <= 0) h = TEX*_cell;
        int px = Mathf.FloorToInt(local.x / (w/TEX));
        int py = Mathf.FloorToInt(local.y / (h/TEX));
        if(px < 0 || py < 0 || px >= TEX || py >= TEX) return;
        int idx = py*TEX + px;
        switch(_tool){
            case "pencil": _pixels[idx] = _brush; break;
            case "eraser": _pixels[idx] = new Color(0,0,0,0); break;
            case "picker": SetBrush(_pixels[idx]); _tool = "pencil"; HighlightTool(); break;
            case "fill": Flood(px, py, _pixels[idx]); break;
        }
        RebuildTextures();
    }

    private void Flood(int x, int y, Color target)
    {
        if(ApproximatelyEqual(target, _brush)) return;
        var stack = new Stack<Vector2Int>(); stack.Push(new Vector2Int(x,y));
        while(stack.Count > 0){
            var p = stack.Pop();
            if(p.x<0||p.y<0||p.x>=TEX||p.y>=TEX) continue;
            int i = p.y*TEX+p.x;
            if(!ApproximatelyEqual(_pixels[i], target)) continue;
            _pixels[i] = _brush;
            stack.Push(new Vector2Int(p.x+1,p.y)); stack.Push(new Vector2Int(p.x-1,p.y));
            stack.Push(new Vector2Int(p.x,p.y+1)); stack.Push(new Vector2Int(p.x,p.y-1));
        }
    }
    private static bool ApproximatelyEqual(Color a, Color b)=>
        Mathf.Abs(a.r-b.r)<0.01f && Mathf.Abs(a.g-b.g)<0.01f && Mathf.Abs(a.b-b.b)<0.01f && Mathf.Abs(a.a-b.a)<0.01f;

    private void SetBrush(Color c){ _brush = c; if(_swatchActive!=null) _swatchActive.style.backgroundColor = c;
        if(_hexLabel!=null) _hexLabel.text = "#" + ColorUtility.ToHtmlStringRGB(c); }

    private void PushUndo(){ _undo.Add((Color[])_pixels.Clone()); if(_undo.Count>80) _undo.RemoveAt(0); _redo.Clear(); }
    private void Undo(){ if(_undo.Count==0) return; _redo.Add((Color[])_pixels.Clone()); _pixels = _undo[_undo.Count-1]; _undo.RemoveAt(_undo.Count-1); RebuildTextures(); }
    private void Redo(){ if(_redo.Count==0) return; _undo.Add((Color[])_pixels.Clone()); _pixels = _redo[_redo.Count-1]; _redo.RemoveAt(_redo.Count-1); RebuildTextures(); }
    private void ClearCanvas(){ PushUndo(); for(int i=0;i<_pixels.Length;i++) _pixels[i] = new Color(0,0,0,0); RebuildTextures(); }

    private void ExportPng()
    {
        string path = EditorUtility.SaveFilePanel("Export Texture", Application.dataPath, "texture", "png");
        if(string.IsNullOrEmpty(path)) return;
        var outTex = new Texture2D(TEX, TEX);
        for(int y=0;y<TEX;y++) for(int x=0;x<TEX;x++) outTex.SetPixel(x, TEX-1-y, _pixels[y*TEX+x]);
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
