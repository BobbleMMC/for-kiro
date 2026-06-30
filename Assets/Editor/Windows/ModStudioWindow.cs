using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;
using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;

public class ModStudioWindow : EditorWindow
{
    public enum EditorMode
    {
        Block,
        Item,
        Tool,
        Armor,
        Recipe,
        Mob,
        Biome,
        CreativeTab,
        TexturePainter,
        ProjectSettings
    }

    // ── Current-index tracking (multi-element support) ──────────────────────
    private int _currentBlockIdx  = 0;
    private int _currentItemIdx   = 0;
    private int _currentToolIdx   = 0;
    private int _currentArmorIdx  = 0;
    private int _currentRecipeIdx = 0;
    private int _currentEntityIdx = 0;
    private int _currentBiomeIdx  = 0;
    private int _currentTabIdx    = 0;

    // Safe indexed getters — always clamps to valid range
    private BlockDataModel       _currentBlock  => WorkspaceManager.workspace.blocks     [Mathf.Clamp(_currentBlockIdx,  0, WorkspaceManager.workspace.blocks.Count     - 1)];
    private ItemDataModel        _currentItem   => WorkspaceManager.workspace.items      [Mathf.Clamp(_currentItemIdx,   0, WorkspaceManager.workspace.items.Count      - 1)];
    private ToolDataModel        _currentTool   => WorkspaceManager.workspace.tools      [Mathf.Clamp(_currentToolIdx,   0, WorkspaceManager.workspace.tools.Count      - 1)];
    private ArmorDataModel       _currentArmor  => WorkspaceManager.workspace.armors     [Mathf.Clamp(_currentArmorIdx,  0, WorkspaceManager.workspace.armors.Count     - 1)];
    private RecipeDataModel      _currentRecipe => WorkspaceManager.workspace.recipes    [Mathf.Clamp(_currentRecipeIdx, 0, WorkspaceManager.workspace.recipes.Count    - 1)];
    private EntityDataModel      _currentEntity => WorkspaceManager.workspace.entities   [Mathf.Clamp(_currentEntityIdx, 0, WorkspaceManager.workspace.entities.Count   - 1)];
    private BiomeDataModel       _currentBiome  => WorkspaceManager.workspace.biomes     [Mathf.Clamp(_currentBiomeIdx,  0, WorkspaceManager.workspace.biomes.Count     - 1)];
    private CreativeTabDataModel _currentTab    => WorkspaceManager.workspace.creativeTabs[Mathf.Clamp(_currentTabIdx,  0, WorkspaceManager.workspace.creativeTabs.Count - 1)];

    private EditorMode _currentMode = EditorMode.Block;
    private GradleCompiler _gradleCompiler;

    // UI Elementlari
    private TextField _codePreviewField; 
    private Label _terminalLogLabel;
    
    // Tugmalar
    private Button _globalSaveBtn;
    private Button _codeLocalSaveBtn;
    private Button _runBtn;

    // Cheksiz sikldan saqlovchi xavfsizlik bayrog'i (Infinite Loop Guard)
    private bool _isUpdating = false;

    // Loyiha eksport yo'li — foydalanuvchi tanlaydi
    private string _dummyProjectPath = @"C:\MinecraftMods\TestFabricMod";

    // Tekstura chizgich xususiyatlari
    private Color[] _pixels = new Color[256];
    private Texture2D _previewTexture;
    private Color _activePaintColor = Color.red;
    private string _activeTool = "pencil"; // pencil, eraser, bucket, eyedropper
    private string _paintFilename = "custom_block_texture";

    [MenuItem("Mod Studio/Oynani Ochish")]
    public static void OpenWorkspace()
    {
        ModStudioWindow wnd = GetWindow<ModStudioWindow>();
        wnd.titleContent = new GUIContent("Mod Studio Desktop");
        wnd.minSize = new Vector2(1000, 650);
    }

    public static void BatchExportAll()
    {
        Debug.Log("[BatchExport] Start batch export...");
        StudioDatabase.Initialize();
        
        // Initialize workspace with dummy/default data to test export output
        WorkspaceManager.workspace = new WorkspaceData();
        WorkspaceManager.workspace.modId = "mymod";
        WorkspaceManager.workspace.modName = "My Epic Mod";
        WorkspaceManager.workspace.mcVersion = "1.20.1";
        WorkspaceManager.workspace.modloader = "Fabric";
        
        // Populate test block
        var block = new BlockDataModel {
            blockId = "custom_ruby_block",
            displayName = "Ruby Block",
            hardness = 5.0f,
            resistance = 6.0f,
            lightLevel = 15,
            creativeTab = MinecraftCreativeTab.BuildingBlocks,
            texturePath = "custom_ruby_block"
        };
        WorkspaceManager.workspace.blocks.Add(block);
        
        // Populate test item
        var item = new ItemDataModel {
            itemId = "custom_ruby",
            displayName = "Ruby",
            stackSize = 64,
            isFood = false,
            creativeTab = MinecraftCreativeTab.Misc
        };
        WorkspaceManager.workspace.items.Add(item);
        
        // Populate test tool
        var tool = new ToolDataModel {
            toolId = "ruby_pickaxe",
            displayName = "Ruby Pickaxe",
            durability = 1500,
            attackDamage = 6.0f,
            attackSpeed = -2.8f,
            miningLevel = 3,
            toolType = ToolType.Pickaxe
        };
        WorkspaceManager.workspace.tools.Add(tool);
        
        // Populate test armor
        var armor = new ArmorDataModel {
            armorId = "ruby_chestplate",
            displayName = "Ruby Chestplate",
            defense = 8,
            toughness = 2.0f,
            knockbackResistance = 0.0f,
            armorSlot = ArmorSlot.Chestplate
        };
        WorkspaceManager.workspace.armors.Add(armor);
        
        // Populate test recipe
        var recipe = new RecipeDataModel {
            resultItem = "custom_ruby_block",
            resultCount = 1,
            grid = new string[9] {
                "custom_ruby", "custom_ruby", "custom_ruby",
                "custom_ruby", "custom_ruby", "custom_ruby",
                "custom_ruby", "custom_ruby", "custom_ruby"
            }
        };
        WorkspaceManager.workspace.recipes.Add(recipe);
        
        // Save and compile/export
        string testPath = @"C:\MinecraftMods\TestFabricMod";
        WorkspaceManager.SaveWorkspace(testPath);
        WorkspaceManager.CompileAndExportAll(testPath);
        Debug.Log("[BatchExport] Batch export finished successfully!");
    }

    public void CreateGUI()
    {
        VisualElement root = rootVisualElement;

        // Ma'lumotlar bazasini ishga tushiramiz
        StudioDatabase.Initialize();

        // 1. Workspace-ni papkadan yuklaymiz yoki yangi yaratamiz
        bool loaded = WorkspaceManager.LoadWorkspace(_dummyProjectPath);
        if (!loaded)
        {
            WorkspaceManager.workspace = new WorkspaceData();
            WorkspaceManager.SaveWorkspace(_dummyProjectPath);
        }

        // Ma'lumotlar strukturasining izchilligini kafolatlaymiz
        VerifyWorkspaceConsistency();

        // Tekstura piksellarini boshlang'ich shovqin holatida to'ldiramiz
        InitializeDefaultPixels();

        // 2. Asosiy UXML strukturasini xavfsiz yuklash
        var visualTree = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>("Assets/UI/UXML/ModStudioEditor.uxml");
        if (visualTree != null) 
        {
            root.Add(visualTree.Instantiate());
        }
        else
        {
            Debug.LogError("Xato: Assets/UI/UXML/ModStudioEditor.uxml fayli topilmadi! Manzilni tekshiring.");
            return;
        }

        // 3. Asosiy USS stillarini yuklash
        var mainStyleSheet = AssetDatabase.LoadAssetAtPath<StyleSheet>("Assets/UI/Styles/ModStudioEditor.uss");
        if (mainStyleSheet != null) 
        {
            root.styleSheets.Add(mainStyleSheet);
        }

        // 4. Loyiha Daraxtini Dinamik Yaratish
        var treeContainer = root.Q<ScrollView>("project-tree-container");
        if (treeContainer != null)
        {
            treeContainer.Clear();

            // Sarlavha
            Label categoryLabel = new Label("LOYIHA ELEMENTLARI");
            categoryLabel.AddToClassList("tree-category");
            treeContainer.Add(categoryLabel);

            // Daraxt elementlari (Jami 10 ta modul)
            CreateTreeItem(treeContainer, "🧱 Blok Tahrirlovchi", EditorMode.Block);
            CreateTreeItem(treeContainer, "💎 Buyum Tahrirlovchi", EditorMode.Item);
            CreateTreeItem(treeContainer, "⚔️ Qurol Tahrirlovchi", EditorMode.Tool);
            CreateTreeItem(treeContainer, "🛡️ Zirh Tahrirlovchi", EditorMode.Armor);
            CreateTreeItem(treeContainer, "📜 Retsept Tahrirlovchi", EditorMode.Recipe);
            CreateTreeItem(treeContainer, "👾 Mob Tahrirlovchi", EditorMode.Mob);
            CreateTreeItem(treeContainer, "🌲 Bioma Tahrirlovchi", EditorMode.Biome);
            CreateTreeItem(treeContainer, "🗂️ Creative Tab Tahrir", EditorMode.CreativeTab);
            CreateTreeItem(treeContainer, "🎨 Tekstura Tahrirlovchi", EditorMode.TexturePainter);
            
            // Loyiha sozlamalari pastroqda alohida bo'limda turadi
            Label settingsCategory = new Label("SOZLAMALAR");
            settingsCategory.AddToClassList("tree-category");
            treeContainer.Add(settingsCategory);
            CreateTreeItem(treeContainer, "⚙️ Loyiha Sozlamalari", EditorMode.ProjectSettings);
        }

        // 5. 3D Viewport snippetini Loyiha daraxti ichiga joylashtirish
        var viewportTree = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>("Assets/UI/UXML/ModStudioEditor_ViewportSnippet.uxml");
        if (viewportTree != null && treeContainer != null)
        {
            VisualElement viewportVisual = viewportTree.Instantiate();
            treeContainer.Add(viewportVisual);
        }

        // 6. 3D Viewport USS stillarini asosiy oynaga ulash
        var viewportStyle = AssetDatabase.LoadAssetAtPath<StyleSheet>("Assets/UI/Styles/ModStudioEditor_Viewport.uss");
        if (viewportStyle != null) 
        {
            root.styleSheets.Add(viewportStyle);
        }

        // 7. UI elementlarini UXML ichidan qidirib topish
        _codePreviewField = root.Q<TextField>("code-field");
        _terminalLogLabel = root.Q<Label>(className: "terminal-log-text");
        
        // Tugmalarni ID bo'yicha bog'lash
        _globalSaveBtn = root.Q<Button>("btn-save");
        _codeLocalSaveBtn = root.Q<Button>("btn-code-save");
        _runBtn = root.Q<Button>("btn-run");

        if (_codePreviewField == null)
        {
            Debug.LogError("Xato: UXML ichida 'code-field' topilmadi!");
            return; 
        }

        // 8. TextField ichida Rich Text (ranglar) ko'rinishini faollashtirish
        var textInput = _codePreviewField.Q("unity-text-input");
        if (textInput != null)
        {
            var textElement = textInput.Q<TextElement>();
            if (textElement != null) textElement.enableRichText = true;
        }

        // 9. LOKAL KODNI SAQLASH TUGMASI LOGIKASI (Tugma bosilganda kod o'qiladi)
        if (_codeLocalSaveBtn != null)
        {
            _codeLocalSaveBtn.clicked += ExecuteTwoWaySync;
        }

        // Global saqlash tugmasi (Loyiha parametrlarini diskka yozadi va eksport qiladi)
        if (_globalSaveBtn != null)
        {
            _globalSaveBtn.clicked += SaveProjectAndExport;
        }

        // 10. Gradle xizmatini faollashtirish (Minecraft-ni yoqish)
        _gradleCompiler = new GradleCompiler(LogToTerminal, ErrorToTerminal);
        if (_runBtn != null)
        {
            _runBtn.clicked += () => {
                var data = StudioDatabase.GetVersionData(WorkspaceManager.workspace.mcVersion);
                int javaVer = data != null ? data.requiredJavaVersion : 17;
                _gradleCompiler.RunMinecraftClient(_dummyProjectPath, javaVer);
            };
        }

        // 11. Boshlang'ich rejimni Blok qilib yuklaymiz
        SwitchEditorMode(EditorMode.Block);
        // ModStudioWindow.cs ichidagi CreateGUI() metodining oxiriga qo'shing:
        // UV Mapper modulini tekshirish uchun ulaymiz
        if (_globalSaveBtn != null)
        {
            _globalSaveBtn.clicked += () =>
            {
                CuboidUVMapper uvMapper = FindFirstObjectByType<CuboidUVMapper>();
                if (uvMapper != null)
                {
                    // Sinov uchun 16x16 rasm atlasidan hamma yuzaga 0 dan 16 pikselgacha to'liq rasm tushsin deymiz
                    Rect fullFace = new Rect(0, 0, 16, 16);
                    uvMapper.ApplyBlockUVs(fullFace, fullFace, fullFace, fullFace, fullFace, fullFace);
                    
                    LogToTerminal("[3D Motor] Kuboid uchun yangi UV Atlas koordinatalari muvaffaqiyatli hisoblandi.");
                }
            };
        }

// 1. Elementlarni topamiz
FloatField pivotX = root.Q<FloatField>("pivot-x");
FloatField pivotY = root.Q<FloatField>("pivot-y");
FloatField pivotZ = root.Q<FloatField>("pivot-z");

Slider rotX = root.Q<Slider>("rotate-x");
Slider rotY = root.Q<Slider>("rotate-y");
Slider rotZ = root.Q<Slider>("rotate-z");

// Sahnadagi tayyor 3D kuboid transform kontrollerini topamiz
VoxelTransformController transformController = FindFirstObjectByType<VoxelTransformController>();

if (transformController != null && pivotX != null && rotX != null)
{
    // Pivot hodisalarini bog'lash
    System.Action updatePivot = () => {
        transformController.PivotPoint = new Vector3(pivotX.value, pivotY.value, pivotZ.value);
    };
    pivotX.RegisterValueChangedCallback(evt => updatePivot());
    pivotY.RegisterValueChangedCallback(evt => updatePivot());
    pivotZ.RegisterValueChangedCallback(evt => updatePivot());

    // Rotation hodisalarini bog'lash
    System.Action updateRotation = () => {
        transformController.CurrentRotation = new Vector3(rotX.value, rotY.value, rotZ.value);
    };
    rotX.RegisterValueChangedCallback(evt => updateRotation());
    rotY.RegisterValueChangedCallback(evt => updateRotation());
    rotZ.RegisterValueChangedCallback(evt => updateRotation());
}

    }

    private void VerifyWorkspaceConsistency()
    {
        var ws = WorkspaceManager.workspace;
        if (ws.blocks == null || ws.blocks.Count == 0) { ws.blocks = new List<BlockDataModel>(); ws.blocks.Add(new BlockDataModel()); }
        if (ws.items == null || ws.items.Count == 0) { ws.items = new List<ItemDataModel>(); ws.items.Add(new ItemDataModel()); }
        if (ws.tools == null || ws.tools.Count == 0) { ws.tools = new List<ToolDataModel>(); ws.tools.Add(new ToolDataModel()); }
        if (ws.armors == null || ws.armors.Count == 0) { ws.armors = new List<ArmorDataModel>(); ws.armors.Add(new ArmorDataModel()); }
        if (ws.recipes == null || ws.recipes.Count == 0) { ws.recipes = new List<RecipeDataModel>(); ws.recipes.Add(new RecipeDataModel()); }
        if (ws.entities == null || ws.entities.Count == 0) { ws.entities = new List<EntityDataModel>(); ws.entities.Add(new EntityDataModel()); }
        if (ws.biomes == null || ws.biomes.Count == 0) { ws.biomes = new List<BiomeDataModel>(); ws.biomes.Add(new BiomeDataModel()); }
        if (ws.creativeTabs == null || ws.creativeTabs.Count == 0) { ws.creativeTabs = new List<CreativeTabDataModel>(); ws.creativeTabs.Add(new CreativeTabDataModel()); }
    }

    private void InitializeDefaultPixels()
    {
        System.Random rand = new System.Random(42);
        for (int i = 0; i < 256; i++)
        {
            float noise = (float)rand.NextDouble() * 0.12f;
            float baseColor = 0.5f + noise;
            _pixels[i] = new Color(baseColor, baseColor, baseColor, 1.0f);
        }
    }

    private void CreateTreeItem(VisualElement container, string labelText, EditorMode mode)
    {
        Label item = new Label(labelText);
        item.AddToClassList("tree-item");
        if (_currentMode == mode)
        {
            item.AddToClassList("tree-item--selected");
        }
        
        item.RegisterCallback<ClickEvent>(evt => {
            SwitchEditorMode(mode);
        });

        container.Add(item);
    }

    private void UpdateProjectTreeSelection()
    {
        var root = rootVisualElement;
        var treeContainer = root.Q<ScrollView>("project-tree-container");
        if (treeContainer == null) return;

        var items = treeContainer.Query<Label>(className: "tree-item").ToList();
        
        int index = 0;
        foreach (var item in items)
        {
            item.RemoveFromClassList("tree-item--selected");
            
            EditorMode itemMode = (EditorMode)index;
            if (index == 9) itemMode = EditorMode.ProjectSettings;

            if (itemMode == _currentMode)
            {
                item.AddToClassList("tree-item--selected");
            }
            index++;
        }
    }

    private void SwitchEditorMode(EditorMode mode)
    {
        _currentMode = mode;
        UpdateProjectTreeSelection();

        VisualElement root = rootVisualElement;

        // 1. 3D Viewport-ni blok va tekstura chizishda ko'rsatib, boshqalarida yashirish
        var viewportContainer = root.Q<VisualElement>("viewport-3d-container");
        if (viewportContainer != null)
        {
            viewportContainer.style.display = (mode == EditorMode.Block || mode == EditorMode.TexturePainter) ? DisplayStyle.Flex : DisplayStyle.None;
        }

        UpdatePreviewMaterial();

        // 2. Markaziy formani tozalash va tegishli UXML snippetni yuklash
        var formScroll = root.Q<ScrollView>("editor-form-scroll");
        var headerLabel = root.Q<Label>("editor-header");
        if (formScroll == null) return;

        formScroll.Clear();

        string uxmlPath = "";
        string headerText = "";

        switch (mode)
        {
            case EditorMode.Block:
                uxmlPath = "Assets/UI/UXML/ModStudioEditor_BlockFields.uxml";
                headerText = "BLOK SOZLAMALARI";
                break;
            case EditorMode.Item:
                uxmlPath = "Assets/UI/UXML/ModStudioEditor_ItemFields.uxml";
                headerText = "ITEM SOZLAMALARI";
                break;
            case EditorMode.Tool:
                uxmlPath = "Assets/UI/UXML/ModStudioEditor_ToolFields.uxml";
                headerText = "QUROL SOZLAMALARI";
                break;
            case EditorMode.Armor:
                uxmlPath = "Assets/UI/UXML/ModStudioEditor_ArmorFields.uxml";
                headerText = "ZIRH SOZLAMALARI";
                break;
            case EditorMode.Recipe:
                uxmlPath = "Assets/UI/UXML/ModStudioEditor_RecipeFields.uxml";
                headerText = "VIZUAL RETSEPT TAHRIRLOVCHI";
                break;
            case EditorMode.Mob:
                uxmlPath = "Assets/UI/UXML/ModStudioEditor_MobFields.uxml";
                headerText = "MOB SOZLAMALARI";
                break;
            case EditorMode.Biome:
                uxmlPath = "Assets/UI/UXML/ModStudioEditor_BiomeFields.uxml";
                headerText = "BIOMA SOZLAMALARI";
                break;
            case EditorMode.CreativeTab:
                uxmlPath = "Assets/UI/UXML/ModStudioEditor_CreativeTabFields.uxml";
                headerText = "CREATIVE TAB SOZLAMALARI";
                break;
            case EditorMode.TexturePainter:
                uxmlPath = "Assets/UI/UXML/ModStudioEditor_TexturePainter.uxml";
                headerText = "TEKSTURA CHIZGICH";
                break;
            case EditorMode.ProjectSettings:
                uxmlPath = "Assets/UI/UXML/ModStudioEditor_ProjectSettings.uxml";
                headerText = "LOYIHA SOZLAMALARI";
                break;
        }

        if (headerLabel != null) headerLabel.text = headerText;

        var visualTree = AssetDatabase.LoadAssetAtPath<VisualTreeAsset>(uxmlPath);
        if (visualTree != null)
        {
            formScroll.Add(visualTree.Instantiate());
        }
        else
        {
            Debug.LogError($"Xato: {uxmlPath} snippet fayli topilmadi!");
            return;
        }

        // 3. UI elementlarini bog'lash
        BindFieldsForMode(mode);

        // 4. Live Preview kodni yangilash
        OnModelChanged();
    }

    private void BindFieldsForMode(EditorMode mode)
    {
        var root = rootVisualElement;
        _isUpdating = true; // Callbacklar o'rnatilayotganda cheksiz sikldan saqlaydi

        switch (mode)
        {
            case EditorMode.Block:
                {
                    var idF = root.Q<TextField>("input-id");
                    var nameF = root.Q<TextField>("input-name");
                    var hardS = root.Q<Slider>("slider-hardness");
                    var resS = root.Q<Slider>("slider-resistance");

                    if (idF != null) idF.value = _currentBlock.blockId;
                    if (nameF != null) nameF.value = _currentBlock.displayName;
                    if (hardS != null) hardS.value = _currentBlock.hardness;
                    if (resS != null) resS.value = _currentBlock.resistance;

                    idF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentBlock.blockId = evt.newValue; OnModelChanged(); } });
                    nameF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentBlock.displayName = evt.newValue; OnModelChanged(); } });
                    hardS?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentBlock.hardness = evt.newValue; OnModelChanged(); } });
                    resS?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentBlock.resistance = evt.newValue; OnModelChanged(); } });
                }
                break;

            case EditorMode.Item:
                {
                    var idF = root.Q<TextField>("input-item-id");
                    var nameF = root.Q<TextField>("input-item-name");
                    var stackF = root.Q<IntegerField>("input-item-stack");
                    var foodT = root.Q<Toggle>("input-item-isfood");

                    if (idF != null) idF.value = _currentItem.itemId;
                    if (nameF != null) nameF.value = _currentItem.displayName;
                    if (stackF != null) stackF.value = _currentItem.stackSize;
                    if (foodT != null) foodT.value = _currentItem.isFood;

                    idF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentItem.itemId = evt.newValue; OnModelChanged(); } });
                    nameF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentItem.displayName = evt.newValue; OnModelChanged(); } });
                    stackF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentItem.stackSize = evt.newValue; OnModelChanged(); } });
                    foodT?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentItem.isFood = evt.newValue; OnModelChanged(); } });
                }
                break;

            case EditorMode.Tool:
                {
                    var idF = root.Q<TextField>("input-tool-id");
                    var nameF = root.Q<TextField>("input-tool-name");
                    var typeF = root.Q<DropdownField>("input-tool-type");
                    var dmgS = root.Q<Slider>("slider-tool-damage");
                    var spdS = root.Q<Slider>("slider-tool-speed");
                    var durF = root.Q<IntegerField>("input-tool-durability");
                    var minL = root.Q<IntegerField>("input-tool-mininglvl");

                    if (idF != null) idF.value = _currentTool.toolId;
                    if (nameF != null) nameF.value = _currentTool.displayName;
                    if (typeF != null) typeF.value = _currentTool.toolType.ToString();
                    if (dmgS != null) dmgS.value = _currentTool.attackDamage;
                    if (spdS != null) spdS.value = _currentTool.attackSpeed;
                    if (durF != null) durF.value = _currentTool.durability;
                    if (minL != null) minL.value = _currentTool.miningLevel;

                    idF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentTool.toolId = evt.newValue; OnModelChanged(); } });
                    nameF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentTool.displayName = evt.newValue; OnModelChanged(); } });
                    typeF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { if (Enum.TryParse<ToolType>(evt.newValue, out ToolType t)) _currentTool.toolType = t; OnModelChanged(); } });
                    dmgS?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentTool.attackDamage = evt.newValue; OnModelChanged(); } });
                    spdS?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentTool.attackSpeed = evt.newValue; OnModelChanged(); } });
                    durF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentTool.durability = evt.newValue; OnModelChanged(); } });
                    minL?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentTool.miningLevel = evt.newValue; OnModelChanged(); } });
                }
                break;

            case EditorMode.Armor:
                {
                    var idF = root.Q<TextField>("input-armor-id");
                    var nameF = root.Q<TextField>("input-armor-name");
                    var slotF = root.Q<DropdownField>("input-armor-slot");
                    var defS = root.Q<Slider>("slider-armor-defense");
                    var tghS = root.Q<Slider>("slider-armor-toughness");
                    var knkS = root.Q<Slider>("slider-armor-knockback");

                    if (idF != null) idF.value = _currentArmor.armorId;
                    if (nameF != null) nameF.value = _currentArmor.displayName;
                    if (slotF != null) slotF.value = _currentArmor.armorSlot.ToString();
                    if (defS != null) defS.value = _currentArmor.defense;
                    if (tghS != null) tghS.value = _currentArmor.toughness;
                    if (knkS != null) knkS.value = _currentArmor.knockbackResistance;

                    idF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentArmor.armorId = evt.newValue; OnModelChanged(); } });
                    nameF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentArmor.displayName = evt.newValue; OnModelChanged(); } });
                    slotF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { if (Enum.TryParse<ArmorSlot>(evt.newValue, out ArmorSlot s)) _currentArmor.armorSlot = s; OnModelChanged(); } });
                    defS?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentArmor.defense = (int)evt.newValue; OnModelChanged(); } });
                    tghS?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentArmor.toughness = evt.newValue; OnModelChanged(); } });
                    knkS?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentArmor.knockbackResistance = evt.newValue; OnModelChanged(); } });
                }
                break;

            case EditorMode.Recipe:
                {
                    for (int i = 0; i < 9; i++)
                    {
                        int index = i;
                        var slotF = root.Q<TextField>($"input-slot-{index}");
                        if (slotF != null)
                        {
                            slotF.value = _currentRecipe.grid[index];
                            slotF.RegisterValueChangedCallback(evt => {
                                if (!_isUpdating)
                                {
                                    _currentRecipe.grid[index] = evt.newValue;
                                    OnModelChanged();
                                }
                            });
                        }
                    }

                    var resF = root.Q<TextField>("input-slot-result");
                    if (resF != null)
                    {
                        resF.value = _currentRecipe.resultItem;
                        resF.RegisterValueChangedCallback(evt => {
                            if (!_isUpdating)
                            {
                                _currentRecipe.resultItem = evt.newValue;
                                OnModelChanged();
                            }
                        });
                    }

                    var countF = root.Q<IntegerField>("input-result-count");
                    if (countF != null)
                    {
                        countF.value = _currentRecipe.resultCount;
                        countF.RegisterValueChangedCallback(evt => {
                            if (!_isUpdating)
                            {
                                _currentRecipe.resultCount = evt.newValue;
                                OnModelChanged();
                            }
                        });
                    }
                }
                break;

            case EditorMode.Mob:
                {
                    var idF = root.Q<TextField>("input-mob-id");
                    var nameF = root.Q<TextField>("input-mob-name");
                    var catF = root.Q<DropdownField>("input-mob-category");
                    var hpS = root.Q<Slider>("slider-mob-health");
                    var spdS = root.Q<Slider>("slider-mob-speed");
                    var dmgS = root.Q<Slider>("slider-mob-damage");

                    if (idF != null) idF.value = _currentEntity.entityId;
                    if (nameF != null) nameF.value = _currentEntity.displayName;
                    if (catF != null) catF.value = _currentEntity.mobCategory.ToString();
                    if (hpS != null) hpS.value = _currentEntity.health;
                    if (spdS != null) spdS.value = _currentEntity.movementSpeed;
                    if (dmgS != null) dmgS.value = _currentEntity.attackDamage;

                    idF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentEntity.entityId = evt.newValue; OnModelChanged(); } });
                    nameF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentEntity.displayName = evt.newValue; OnModelChanged(); } });
                    catF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { if (Enum.TryParse<MobCategory>(evt.newValue, out MobCategory c)) _currentEntity.mobCategory = c; OnModelChanged(); } });
                    hpS?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentEntity.health = evt.newValue; OnModelChanged(); } });
                    spdS?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentEntity.movementSpeed = evt.newValue; OnModelChanged(); } });
                    dmgS?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentEntity.attackDamage = evt.newValue; OnModelChanged(); } });
                }
                break;

            case EditorMode.Biome:
                {
                    var idF = root.Q<TextField>("input-biome-id");
                    var nameF = root.Q<TextField>("input-biome-name");
                    var precT = root.Q<Toggle>("input-biome-prec");
                    var tempS = root.Q<Slider>("slider-biome-temp");
                    var skyF = root.Q<TextField>("input-biome-sky");
                    var grassF = root.Q<TextField>("input-biome-grass");
                    var waterF = root.Q<TextField>("input-biome-water");
                    var fogF = root.Q<TextField>("input-biome-fog");

                    if (idF != null) idF.value = _currentBiome.biomeId;
                    if (nameF != null) nameF.value = _currentBiome.displayName;
                    if (precT != null) precT.value = _currentBiome.precipitation;
                    if (tempS != null) tempS.value = _currentBiome.temperature;
                    if (skyF != null) skyF.value = _currentBiome.skyColor;
                    if (grassF != null) grassF.value = _currentBiome.grassColor;
                    if (waterF != null) waterF.value = _currentBiome.waterColor;
                    if (fogF != null) fogF.value = _currentBiome.fogColor;

                    idF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentBiome.biomeId = evt.newValue; OnModelChanged(); } });
                    nameF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentBiome.displayName = evt.newValue; OnModelChanged(); } });
                    precT?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentBiome.precipitation = evt.newValue; OnModelChanged(); } });
                    tempS?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentBiome.temperature = evt.newValue; OnModelChanged(); } });
                    skyF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentBiome.skyColor = evt.newValue; OnModelChanged(); } });
                    grassF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentBiome.grassColor = evt.newValue; OnModelChanged(); } });
                    waterF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentBiome.waterColor = evt.newValue; OnModelChanged(); } });
                    fogF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentBiome.fogColor = evt.newValue; OnModelChanged(); } });
                }
                break;

            case EditorMode.CreativeTab:
                {
                    var idF = root.Q<TextField>("input-tab-id");
                    var nameF = root.Q<TextField>("input-tab-name");
                    var iconF = root.Q<TextField>("input-tab-icon");

                    if (idF != null) idF.value = _currentTab.tabId;
                    if (nameF != null) nameF.value = _currentTab.displayName;
                    if (iconF != null) iconF.value = _currentTab.iconItemId;

                    idF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentTab.tabId = evt.newValue; OnModelChanged(); } });
                    nameF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentTab.displayName = evt.newValue; OnModelChanged(); } });
                    iconF?.RegisterValueChangedCallback(evt => { if (!_isUpdating) { _currentTab.iconItemId = evt.newValue; OnModelChanged(); } });
                }
                break;

            case EditorMode.TexturePainter:
                {
                    var gridContainer = root.Q<VisualElement>("painter-grid");
                    var colorField = root.Q<TextField>("input-paint-color");
                    var filenameField = root.Q<TextField>("input-paint-filename");
                    var saveBtn = root.Q<Button>("btn-paint-save");

                    if (colorField != null)
                    {
                        colorField.value = "#" + ColorUtility.ToHtmlStringRGBA(_activePaintColor);
                        colorField.RegisterValueChangedCallback(evt => {
                            if (!_isUpdating)
                            {
                                _activePaintColor = ParseColorFromHex(evt.newValue);
                            }
                        });
                    }

                    if (filenameField != null)
                    {
                        filenameField.value = _paintFilename;
                        filenameField.RegisterValueChangedCallback(evt => {
                            if (!_isUpdating)
                            {
                                _paintFilename = evt.newValue;
                                OnModelChanged();
                            }
                        });
                    }

                    if (saveBtn != null)
                    {
                        saveBtn.clicked += () => SaveTextureToProject(_paintFilename);
                    }

                    BindToolSelection(root, "pencil");
                    BindToolSelection(root, "eraser");
                    BindToolSelection(root, "bucket");
                    BindToolSelection(root, "eyedropper");

                    BindPresetColor(root, "color-preset-red", "#FF5555");
                    BindPresetColor(root, "color-preset-green", "#55FF55");
                    BindPresetColor(root, "color-preset-blue", "#5555FF");
                    BindPresetColor(root, "color-preset-yellow", "#FFFF55");
                    BindPresetColor(root, "color-preset-orange", "#FFaa00");
                    BindPresetColor(root, "color-preset-white", "#FFFFFF");
                    BindPresetColor(root, "color-preset-black", "#000000");
                    BindPresetColor(root, "color-preset-gray", "#888888");

                    if (gridContainer != null)
                    {
                        gridContainer.Clear();
                        for (int i = 0; i < 256; i++)
                        {
                            int index = i;
                            VisualElement pixel = new VisualElement();
                            pixel.style.width = Length.Percent(6.25f);
                            pixel.style.height = Length.Percent(6.25f);
                            pixel.style.backgroundColor = _pixels[index];
                            
                            pixel.style.borderTopWidth = 0.5f;
                            pixel.style.borderBottomWidth = 0.5f;
                            pixel.style.borderLeftWidth = 0.5f;
                            pixel.style.borderRightWidth = 0.5f;
                            
                            Color borderColor = new Color(0.2f, 0.2f, 0.2f, 0.3f);
                            pixel.style.borderTopColor = borderColor;
                            pixel.style.borderBottomColor = borderColor;
                            pixel.style.borderLeftColor = borderColor;
                            pixel.style.borderRightColor = borderColor;

                            pixel.RegisterCallback<PointerDownEvent>(evt => {
                                if (evt.button == 0)
                                {
                                    PaintPixelAt(index, pixel);
                                }
                            });

                            pixel.RegisterCallback<PointerEnterEvent>(evt => {
                                if (evt.pressedButtons == 1)
                                {
                                    PaintPixelAt(index, pixel);
                                }
                            });

                            gridContainer.Add(pixel);
                        }
                    }
                }
                break;

            case EditorMode.ProjectSettings:
                {
                    var idF = root.Q<TextField>("input-settings-modid");
                    var nameF = root.Q<TextField>("input-settings-modname");
                    var verDrop = root.Q<DropdownField>("dropdown-mc-version");
                    var loaderDrop = root.Q<DropdownField>("dropdown-modloader");

                    if (idF != null) idF.value = WorkspaceManager.workspace.modId;
                    if (nameF != null) nameF.value = WorkspaceManager.workspace.modName;

                    if (verDrop != null)
                    {
                        verDrop.choices = StudioDatabase.Versions.Select(v => v.gameVersion).ToList();
                        verDrop.value = WorkspaceManager.workspace.mcVersion;
                    }

                    if (loaderDrop != null)
                    {
                        var data = StudioDatabase.GetVersionData(WorkspaceManager.workspace.mcVersion);
                        loaderDrop.choices = data != null ? data.supportedModloaders : new List<string> { "Fabric" };
                        loaderDrop.value = WorkspaceManager.workspace.modloader;
                    }

                    UpdateProjectSettingsLabels();

                    idF?.RegisterValueChangedCallback(evt => {
                        if (!_isUpdating)
                        {
                            WorkspaceManager.workspace.modId = evt.newValue;
                            OnModelChanged();
                        }
                    });

                    nameF?.RegisterValueChangedCallback(evt => {
                        if (!_isUpdating)
                        {
                            WorkspaceManager.workspace.modName = evt.newValue;
                            OnModelChanged();
                        }
                    });

                    verDrop?.RegisterValueChangedCallback(evt => {
                        if (!_isUpdating)
                        {
                            WorkspaceManager.workspace.mcVersion = evt.newValue;
                            
                            var data = StudioDatabase.GetVersionData(WorkspaceManager.workspace.mcVersion);
                            if (loaderDrop != null && data != null)
                            {
                                loaderDrop.choices = data.supportedModloaders;
                                if (!data.supportedModloaders.Contains(WorkspaceManager.workspace.modloader))
                                {
                                    WorkspaceManager.workspace.modloader = data.supportedModloaders[0];
                                    loaderDrop.value = WorkspaceManager.workspace.modloader;
                                }
                            }

                            if (data != null)
                            {
                                LogToTerminal($"[Loyiha] Versiya o'zgartirildi: {data.gameVersion}. Tizim ushbu versiya uchun Java {data.requiredJavaVersion} talab qiladi.");
                            }

                            UpdateProjectSettingsLabels();
                            OnModelChanged();
                        }
                    });

                    loaderDrop?.RegisterValueChangedCallback(evt => {
                        if (!_isUpdating)
                        {
                            WorkspaceManager.workspace.modloader = evt.newValue;
                            OnModelChanged();
                        }
                    });
                }
                break;
        }

        _isUpdating = false;
    }

    private void SaveProjectAndExport()
    {
        WorkspaceManager.SaveWorkspace(_dummyProjectPath);
        WorkspaceManager.CompileAndExportAll(_dummyProjectPath);
        LogToTerminal("[Workspace] Loyiha muvaffaqiyatli saqlandi va barcha Java/JSON assetlari eksport qilindi.");
        EditorUtility.DisplayDialog("Workspace Saqlandi ✓", "Workspace JSON saqlandi va Fabric loyihasi eksport qilindi!", "OK");
    }

    private void BindToolSelection(VisualElement root, string name)
    {
        var btn = root.Q<Button>($"btn-tool-{name}");
        if (btn != null)
        {
            btn.clicked += () => SelectPaintTool(root, name);
        }
    }

    private void SelectPaintTool(VisualElement root, string toolName)
    {
        _activeTool = toolName;
        string[] tools = { "pencil", "eraser", "bucket", "eyedropper" };
        foreach (var t in tools)
        {
            var btn = root.Q<Button>($"btn-tool-{t}");
            if (btn != null)
            {
                if (t == toolName)
                    btn.AddToClassList("painter-tool-btn--active");
                else
                    btn.RemoveFromClassList("painter-tool-btn--active");
            }
        }
    }

    private void BindPresetColor(VisualElement root, string name, string hex)
    {
        var btn = root.Q<Button>(name);
        var hexField = root.Q<TextField>("input-paint-color");
        if (btn != null)
        {
            btn.clicked += () => {
                if (hexField != null) hexField.value = hex;
                _activePaintColor = ParseColorFromHex(hex);
            };
        }
    }

    private Color ParseColorFromHex(string hex)
    {
        hex = hex.Replace("#", "").Trim();
        if (hex.Length == 6)
        {
            byte r = Convert.ToByte(hex.Substring(0, 2), 16);
            byte g = Convert.ToByte(hex.Substring(2, 2), 16);
            byte b = Convert.ToByte(hex.Substring(4, 2), 16);
            return new Color32(r, g, b, 255);
        }
        return Color.red;
    }

    private void PaintPixelAt(int index, VisualElement pixel)
    {
        if (_activeTool == "pencil")
        {
            _pixels[index] = _activePaintColor;
            pixel.style.backgroundColor = _activePaintColor;
            UpdatePreviewMaterial();
        }
        else if (_activeTool == "eraser")
        {
            _pixels[index] = Color.clear;
            pixel.style.backgroundColor = Color.clear;
            UpdatePreviewMaterial();
        }
        else if (_activeTool == "bucket")
        {
            Color targetColor = _pixels[index];
            if (ColorMatch(targetColor, _activePaintColor)) return;
            
            FloodFill(index, targetColor, _activePaintColor);
            
            var root = rootVisualElement;
            var gridContainer = root.Q<VisualElement>("painter-grid");
            if (gridContainer != null)
            {
                var children = gridContainer.Children().ToList();
                for (int i = 0; i < 256; i++)
                {
                    children[i].style.backgroundColor = _pixels[i];
                }
            }
            UpdatePreviewMaterial();
        }
        else if (_activeTool == "eyedropper")
        {
            Color color = _pixels[index];
            _activePaintColor = color;
            
            string hex = "#" + ColorUtility.ToHtmlStringRGBA(color);
            var hexField = rootVisualElement.Q<TextField>("input-paint-color");
            if (hexField != null)
            {
                _isUpdating = true;
                hexField.value = hex;
                _isUpdating = false;
            }
            SelectPaintTool(rootVisualElement, "pencil");
        }
    }

    private bool ColorMatch(Color c1, Color c2)
    {
        return Mathf.Abs(c1.r - c2.r) < 0.01f &&
               Mathf.Abs(c1.g - c2.g) < 0.01f &&
               Mathf.Abs(c1.b - c2.b) < 0.01f &&
               Mathf.Abs(c1.a - c2.a) < 0.01f;
    }

    private void FloodFill(int index, Color targetColor, Color replacementColor)
    {
        int startX = index % 16;
        int startY = index / 16;

        Queue<Vector2Int> queue = new Queue<Vector2Int>();
        queue.Enqueue(new Vector2Int(startX, startY));

        bool[] visited = new bool[256];

        while (queue.Count > 0)
        {
            Vector2Int pt = queue.Dequeue();
            if (pt.x < 0 || pt.x >= 16 || pt.y < 0 || pt.y >= 16) continue;

            int idx = pt.y * 16 + pt.x;
            if (visited[idx]) continue;
            visited[idx] = true;

            if (ColorMatch(_pixels[idx], targetColor))
            {
                _pixels[idx] = replacementColor;
                queue.Enqueue(new Vector2Int(pt.x + 1, pt.y));
                queue.Enqueue(new Vector2Int(pt.x - 1, pt.y));
                queue.Enqueue(new Vector2Int(pt.x, pt.y + 1));
                queue.Enqueue(new Vector2Int(pt.x, pt.y - 1));
            }
        }
    }

    private void UpdatePreviewMaterial()
    {
        var cube = GameObject.Find("VoxelCube_Preview");
        if (cube == null) return;

        var renderer = cube.GetComponent<Renderer>();
        if (renderer == null) return;

        if (_previewTexture == null)
        {
            _previewTexture = new Texture2D(16, 16);
            _previewTexture.filterMode = FilterMode.Point;
            _previewTexture.wrapMode = TextureWrapMode.Clamp;
        }

        _previewTexture.SetPixels(_pixels);
        _previewTexture.Apply();

        renderer.sharedMaterial.mainTexture = _previewTexture;
        renderer.sharedMaterial.SetFloat("_Smoothness", 0f);
        renderer.sharedMaterial.SetFloat("_Metallic", 0f);
    }

    private void SaveTextureToProject(string filename)
    {
        if (string.IsNullOrEmpty(filename)) filename = "custom_block_texture";
        if (!filename.EndsWith(".png")) filename += ".png";

        if (!Directory.Exists("Assets/Textures"))
        {
            Directory.CreateDirectory("Assets/Textures");
        }

        string path = Path.Combine("Assets/Textures", filename);

        Texture2D tex = new Texture2D(16, 16);
        tex.SetPixels(_pixels);
        tex.Apply();

        byte[] bytes = tex.EncodeToPNG();
        File.WriteAllBytes(path, bytes);
        DestroyImmediate(tex);

        AssetDatabase.ImportAsset(path);
        
        var imp = AssetImporter.GetAtPath(path) as TextureImporter;
        if (imp != null)
        {
            PixelArtTexturePostProcessor.ApplyPixelArtSettings(imp, path);
            imp.SaveAndReimport();
        }

        LogToTerminal($"[Tekstura] Muvaqqiyatli saqlandi: {path}");
        EditorUtility.DisplayDialog("Tekstura Saqlandi ✓", $"Tekstura saqlandi:\n{path}", "OK");
    }

    private void UpdateProjectSettingsLabels()
    {
        var root = rootVisualElement;
        var javaLabel = root.Q<Label>("label-required-java");
        var changelogLabel = root.Q<Label>("label-changelog");
        
        var data = StudioDatabase.GetVersionData(WorkspaceManager.workspace.mcVersion);
        if (data != null)
        {
            if (javaLabel != null)
            {
                javaLabel.text = $"Java Versiyasi: Java {data.requiredJavaVersion}";
                javaLabel.style.color = data.requiredJavaVersion == 21 ? new Color(1f, 0.4f, 0.4f) : new Color(0f, 1f, 0f);
            }
            if (changelogLabel != null)
            {
                changelogLabel.text = data.versionChangelog;
            }
        }
    }

    private string GenerateFabricModJson()
    {
        var ws = WorkspaceManager.workspace;
        var data = StudioDatabase.GetVersionData(ws.mcVersion);
        int javaVer = data != null ? data.requiredJavaVersion : 17;
        
        return $@"{{
  ""schemaVersion"": 1,
  ""id"": ""{ws.modId}"",
  ""version"": ""1.0.0"",
  ""name"": ""{ws.modName}"",
  ""description"": ""A Minecraft mod generated using Mod Studio Desktop."",
  ""environment"": ""*"",
  ""depends"": {{
    ""fabricloader"": "">=0.15.0"",
    ""minecraft"": ""~{ws.mcVersion}"",
    ""java"": "">={javaVer}""
  }}
}}";
    }

    private void ExecuteTwoWaySync()
    {
        if (_isUpdating) return;

        if (_currentMode != EditorMode.Block)
        {
            LogToTerminal("[Eslatma] Ikki tomonlama sinxronizatsiya faqat Blok tahrirlovchi uchun qo'llab-quvvatlanadi.");
            return;
        }

        string userWrittenCode = _codePreviewField.value;
        if (string.IsNullOrEmpty(userWrittenCode)) return;

        _isUpdating = true;

        // Qo'lda yozilgan kodni tahlil qilib, modelni yangilaymiz
        JavaCodeParser.ParseJavaIntoModel(userWrittenCode, _currentBlock);
        
        // UI-ni yangilaymiz
        UpdateUiFromModel();

        // Kod oynasidagi rangli teglarni qayta chizamiz
        string rawJavaCode = JavaCodeGenerator.GenerateFabricBlockCode(_currentBlock);
        string highlightedCode = JavaSyntaxHighlighter.HighlightJavaCode(rawJavaCode);
        _codePreviewField.value = highlightedCode;

        _isUpdating = false;
        
        LogToTerminal("[Muvaffaqiyat] Java kodi tahlil qilindi va barcha panellar sinxronlashtirildi.");
    }

    private void UpdateUiFromModel()
    {
        BindFieldsForMode(_currentMode);
    }

    private void OnModelChanged()
    {
        if (_codePreviewField == null) return;

        _isUpdating = true;

        string loader    = WorkspaceManager.workspace.modloader;
        string mcVersion = WorkspaceManager.workspace.mcVersion;
        string modId     = WorkspaceManager.workspace.modId;
        string rawCode   = "";

        switch (_currentMode)
        {
            case EditorMode.Block:
                // Single-block live preview — always Fabric-style for simplicity
                _currentBlock.textureNamespace = string.IsNullOrEmpty(modId) ? "mymod" : modId;
                rawCode = JavaCodeGenerator.GenerateFabricBlockCode(_currentBlock);
                break;
            case EditorMode.Item:
                rawCode = _currentItem.GenerateFabricCode();
                break;
            case EditorMode.Tool:
                rawCode = _currentTool.GenerateFabricCode();
                break;
            case EditorMode.Armor:
                rawCode = _currentArmor.GenerateFabricCode();
                break;
            case EditorMode.Recipe:
                rawCode = _currentRecipe.GenerateFabricCode();
                break;
            case EditorMode.Mob:
                rawCode = _currentEntity.GenerateFabricCode();
                break;
            case EditorMode.Biome:
                rawCode = _currentBiome.GenerateFabricCode();
                break;
            case EditorMode.CreativeTab:
                rawCode = _currentTab.GenerateFabricCode();
                break;
            case EditorMode.TexturePainter:
                rawCode = GenerateTextureManifestJson();
                break;
            case EditorMode.ProjectSettings:
                rawCode = GenerateFabricModJson();
                break;
        }

        string highlighted = JavaSyntaxHighlighter.HighlightJavaCode(rawCode);
        _codePreviewField.value = highlighted;
        _codePreviewField.MarkDirtyRepaint();
        _isUpdating = false;
    }

    private string GenerateTextureManifestJson()
    {
        return $@"{{
  ""texture_name"": ""{_paintFilename}.png"",
  ""resolution"": ""16x16"",
  ""format"": ""PNG"",
  ""filter_mode"": ""Point"",
  ""compression"": ""None"",
  ""target_path"": ""Assets/Textures/{_paintFilename}.png""
}}";
    }

    private void LogToTerminal(string message)
    {
        rootVisualElement.schedule.Execute(() => {
            if (_terminalLogLabel != null)
            {
                _terminalLogLabel.text += $"\n[Gradle] {message}";
                var scroll = _terminalLogLabel.GetFirstAncestorOfType<ScrollView>();
                if (scroll != null) scroll.scrollOffset = new Vector2(0, _terminalLogLabel.layout.height);
            }
        });
    }

    private void ErrorToTerminal(string message)
    {
        rootVisualElement.schedule.Execute(() => {
            if (_terminalLogLabel != null)
            {
                _terminalLogLabel.text += $"\n<color=#FF3333>[XATO] {message}</color>";
            }
        });
    }

    private void OnDestroy()
    {
        if (_gradleCompiler != null) _gradleCompiler.StopProcess();
    }
}
