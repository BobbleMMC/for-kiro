# MOD STUDIO — TO'LIQ EDITOR SETTINGS SPETSIFIKATSIYASI
## Twilight Forest (NeoForge 1.20.x) kod tahlili asosida

**Maqsad:** Mod Studio editorlarini AAA darajaga yetkazish uchun har bir element turi bo'yicha BARCHA kerakli settingslar ro'yxati.

**Referens mod:** [TeamTwilight/twilightforest](https://github.com/TeamTwilight/twilightforest) — 1.20.x branch

---

## 1. BLOCK EDITOR — BlockDataModel + AdvancedBlockSettings

### Mavjud (✅) va Qo'shilishi kerak (❌) settingslar:

#### 1.1 Asosiy xususiyatlar
| Setting | Turi | Status | TF Misol |
|---------|------|--------|----------|
| blockId | string | ✅ | `"mazestone"` |
| displayName | string | ✅ | `"Mazestone"` |
| hardness (strength) | float | ✅ | `100.0f` (mazestone), `2.0f` (wood) |
| resistance (blastResistance) | float | ✅ | `5.0f`, `6.0f`, `2000.0f` (stronghold) |
| lightLevel | int (0-15) | ✅ | `15` (firefly_jar), `11` (portal) |
| creativeTab | enum | ✅ | BuildingBlocks |

#### 1.2 BlockBehaviour.Properties (Twilight Forest andozasi)
| Setting | Turi | Status | TF Misol |
|---------|------|--------|----------|
| mapColor | enum (MapColor) | ✅ (int) | `MapColor.PLANT`, `MapColor.STONE`, `MapColor.ICE` |
| soundGroup | enum | ✅ | `SoundType.GRASS`, `STONE`, `WOOD`, `METAL`, `GLASS` |
| pushReaction | enum | ❌ **KERAK** | `PushReaction.DESTROY`, `BLOCK`, `NORMAL` |
| instrument | enum | ❌ **KERAK** | `NoteBlockInstrument.BASEDRUM`, `BASS`, `CHIME`, `HAT` |
| ignitedByLava | bool | ❌ **KERAK** | Yog'och bloklar uchun `true` |
| replaceable | bool | ❌ **KERAK** | `fiddlehead`, `fallen_leaves` |
| requiresCorrectToolForDrops | bool | ✅ (behavior) | Ko'p tosh bloklar |
| noLootTable | bool | ❌ **KERAK** | Boss spawner, fake bloklar |
| randomTicks | bool | ✅ (behavior) | O'simliklar, fire_jet |
| noTerrainParticles | bool | ❌ **KERAK** | firefly, cicada |

#### 1.3 Visual Settings (yangi qo'shimchalar)
| Setting | Turi | Status | TF Misol |
|---------|------|--------|----------|
| renderLayer | enum | ✅ | Solid, Cutout, Translucent |
| noOcclusion | bool | ✅ (transparent) | Glass, leaves, pane |
| emissiveRendering | bool | ✅ | `fiery_block` — doimo yonib turadi |
| isValidSpawn | bool | ❌ **KERAK** | `noSpawning` — mob spawn qilolmaydi |
| isSuffocating | bool | ❌ **KERAK** | Leaves — suffocate qilmaydi |
| isViewBlocking | bool | ❌ **KERAK** | Leaves — ko'rishni blokirovka qilmaydi |
| isRedstoneConductor | bool | ❌ **KERAK** | Glass — redstone o'tkazmaydi |
| forceSolidOff | bool | ❌ **KERAK** | Ladder, rope |
| customVoxelShape | string | ✅ | `"0,0,0,16,16,16"` |

#### 1.4 Block Turlari (TF dan yangi subtype'lar)
| Block Type | Status | TF Misol |
|-----------|--------|----------|
| Regular Block | ✅ | `mazestone`, `castle_brick` |
| Rotated Pillar | ❌ **KERAK** | `twisted_stone`, `aurora_pillar`, log'lar |
| Stair Block | ❌ **KERAK** | `nagastone_stairs_left`, `castle_brick_stairs` |
| Slab Block | ❌ **KERAK** | `aurora_slab` |
| Fence Block | ❌ **KERAK** | `twilight_oak_fence` |
| Door Block | ❌ **KERAK** | `twilight_oak_door` |
| Trapdoor Block | ❌ **KERAK** | `twilight_oak_trapdoor` |
| Button Block | ❌ **KERAK** | `twilight_oak_button` |
| Pressure Plate | ❌ **KERAK** | `twilight_oak_plate` |
| Fence Gate | ❌ **KERAK** | `twilight_oak_gate` |
| Sign/Hanging Sign | ❌ **KERAK** | `twilight_oak_sign` |
| Leaves Block | ❌ **KERAK** | `twilight_oak_leaves` |
| Sapling Block | ❌ **KERAK** | `twilight_oak_sapling` |
| Flower Pot Block | ❌ **KERAK** | `potted_twilight_oak_sapling` |
| Chest Block | ❌ **KERAK** | `twilight_oak_chest` |

#### 1.5 Wood Set Generator (TF pattern)
Twilight Forest har bir yog'och turi uchun **17 ta blok** ro'yxatdan o'tkazadi:
```
log, wood, stripped_log, stripped_wood, planks, stairs, slab, 
fence, fence_gate, door, trapdoor, button, pressure_plate, 
sign, hanging_sign, banister, chest
```
**Tavsiya:** "Wood Set Generator" tool qo'shish — bitta nom kiritilsa barchasi generatsiya bo'ladi.

---

## 2. ITEM EDITOR — ItemDataModel + AdvancedItemSettings

### 2.1 Item turlari (TF andozasi)
| Tur | Status | TF Misol | Properties |
|-----|--------|----------|------------|
| Basic Item | ✅ | `naga_scale`, `liveroot` | stackSize, rarity |
| Food Item | ✅ | `hydra_chop`, `torchberries` | nutrition, saturation, effects |
| Armor Item | ✅ (ArmorDataModel) | `fiery_helmet`, `arctic_boots` | material, slot, durability |
| Sword Item | ✅ (ToolDataModel) | `fiery_sword`, `ice_sword` | damage, speed, material |
| Tool Item | ✅ (ToolDataModel) | `ironwood_pickaxe`, `steeleaf_axe` | tier, damage, speed |
| Bow Item | ❌ **KERAK** | `triple_bow`, `seeker_bow`, `ice_bow` | drawSpeed, power, specialEffect |
| Shield Item | ❌ **KERAK** | `knightmetal_shield` | durability, specialBlock |
| Scepter/Wand | ❌ **KERAK** | `twilight_scepter`, `zombie_scepter` | durability, charges, effect |
| Throwable Item | ❌ **KERAK** | `ice_bomb` | stackSize, throwPower |
| Music Disc | ❌ **KERAK** | `music_disc_radiance` | soundEvent, lengthInSeconds, comparatorOutput |
| Banner Pattern | ❌ **KERAK** | `naga_banner_pattern` | patternTag |
| Spawn Egg | ❌ **KERAK** | auto-generated | primaryColor, secondaryColor, entityType |
| Boat Item | ❌ **KERAK** | `twilight_oak_boat` | woodType, hasChest |
| Sign Item | ❌ **KERAK** | `twilight_oak_sign` | woodType |
| Map Item | ❌ **KERAK** | `filled_magic_map` | mapType |

### 2.2 Item.Properties (TF dan to'liq ro'yxat)
| Setting | Turi | Status | TF Misol |
|---------|------|--------|----------|
| stacksTo | int | ✅ | `64`, `16` (ice_bomb), `1` (weapons) |
| durability | int | ✅ | `99` (scepter), `384` (bow), `1024` (crumble_horn) |
| rarity | enum | ✅ | `COMMON`, `UNCOMMON`, `RARE`, `EPIC` |
| fireResistant | bool | ✅ | `fiery_ingot`, `hydra_chop`, `cube_talisman` |
| setNoRepair | bool | ❌ **KERAK** | `mazebreaker_pickaxe`, `glass_sword` |
| food | FoodProperties | ✅ | nutrition, saturation, effects, alwaysEdible |
| attributes | AttributeModifiers | ❌ **KERAK** | `SwordItem.createAttributes(material, 3, -2.4F)` |
| component | DataComponent | ❌ **KERAK** | `TFDataComponents.POTION_FLASK_CONTENTS` |

### 2.3 FoodProperties (TF dan to'liq)
| Setting | Turi | Status | TF Misol |
|---------|------|--------|----------|
| nutrition | int | ✅ | `18` (hydra_chop), `4` (maze_wafer) |
| saturationModifier | float | ✅ | `2.0f` (hydra_chop), `0.3f` (torchberries) |
| alwaysEdible | bool | ✅ | `torchberries` |
| effect + probability | list | ❌ **KERAK** | `MobEffects.REGENERATION, 100, 0, prob=1.0` |
| effect + probability | list | ❌ **KERAK** | `MobEffects.GLOWING, 100, 0, prob=0.75` |

---

## 3. ENTITY EDITOR — EntityDataModel + AdvancedEntitySettings

### 3.1 Asosiy Entity Properties (TF andozasi)
| Setting | Turi | Status | TF Misol |
|---------|------|--------|----------|
| entityId | string | ✅ | `"naga"`, `"hydra"`, `"kobold"` |
| displayName | string | ✅ | `"Naga"` |
| width | float | ✅ | `2.0f` (naga), `16.0f` (hydra), `0.6f` (wraith) |
| height | float | ✅ | `3.0f` (naga), `12.0f` (hydra) |
| eyeHeight | float | ❌ **KERAK** | `0.5f` (ghastling), `0.45f` (helmet_crab) |
| health | float | ✅ | `200` (naga), barcha entity uchun |
| movementSpeed | float | ✅ | `0.25f` |
| attackDamage | float | ✅ | `15.0f` |
| followRange | float | ✅ | `35.0f` |
| knockbackResistance | float | ✅ | `1.0` (boss) |
| armor | float | ✅ | `10.0` (armored_giant) |
| armorToughness | float | ✅ (advanced) | — |
| mobCategory | enum | ✅ | `MONSTER`, `CREATURE`, `MISC` |

### 3.2 EntityType.Builder settings (TF dan)
| Setting | Turi | Status | TF Misol |
|---------|------|--------|----------|
| trackingRange | int | ❌ **KERAK** | `80` (default), `150` (projectiles), `10` (boats) |
| updateInterval | int | ❌ **KERAK** | `3` (default), `1` (chain_block, slider), `5` (nature_bolt) |
| shouldReceiveVelocityUpdates | bool | ❌ **KERAK** | `true` (all) |
| fireImmune | bool | ✅ (advanced) | `hydra`, `naga`, `ur_ghast` |
| noSave | bool | ❌ **KERAK** | `charm_effect`, `protection_box` |
| noSummon | bool | ❌ **KERAK** | `charm_effect`, `protection_box` |

### 3.3 Spawn Egg ranglari (TF andozasi)
| Entity | Primary | Secondary |
|--------|---------|-----------|
| Naga | `0xa4d316` | `0x1b380b` |
| Lich | `0xaca489` | `0x360472` |
| Kobold | `0x372096` | `0x895d1b` |
| Penguin | `0x12151b` | `0xf9edd2` |
| Hydra | `0x142940` | `0x29806b` |
**Tavsiya:** Color picker bilan spawn egg ranglarini vizual tanlash imkoniyati.

### 3.4 Spawn Placement (TF dan)
| Setting | Status | TF Misol |
|---------|--------|----------|
| SpawnPlacementTypes.ON_GROUND | ✅ | Ko'p entity |
| SpawnPlacementTypes.NO_RESTRICTIONS | ❌ **KERAK** | `penguin` |
| SpawnPlacementTypes.IN_WATER | ❌ **KERAK** | Suv entitylari |
| Heightmap.Types.MOTION_BLOCKING_NO_LEAVES | ❌ **KERAK** | Barcha entitylar |
| Custom spawn rules | ❌ **KERAK** | `SkeletonDruid::checkDruidSpawnRules` |

---

## 4. ENCHANTMENT EDITOR — EnchantmentDataModel

### 4.1 To'liq Enchantment Settings (TF: 3 enchant)
| Setting | Turi | Status | TF Misol |
|---------|------|--------|----------|
| enchantmentId | string | ✅ | `"fire_react"`, `"chill_aura"`, `"destruction"` |
| displayName | string | ✅ | `"Fire React"` |
| maxLevel | int | ✅ | `4` (fire_react), `3` (destruction) |
| target | enum | ✅ | Armor, Weapon, Digger |
| rarity | enum | ✅ | Common, Uncommon, Rare, VeryRare |
| isTreasure | bool | ✅ | — |
| isCurse | bool | ✅ | — |
| incompatibleWith | list | ✅ | — |
| minCost/maxCost | int | ✅ | — |
| effectType | string | ✅ | `"fire"`, `"chill"`, etc. |
| damagePerLevel | float | ✅ | — |

**Status: ✅ TO'LIQ** — Enchantment editor yetarli darajada.

---

## 5. STRUCTURE EDITOR — StructureDataModel (WorldgenProSettings)

### 5.1 Structure Settings (TF: 22 structure)
| Setting | Turi | Status | TF Misol |
|---------|------|--------|----------|
| structureId | string | ✅ | `"lich_tower"`, `"labyrinth"`, `"aurora_palace"` |
| displayName | string | ✅ | — |
| structureType | string | ✅ | `"minecraft:jigsaw"` |
| startPool | string | ✅ | `"twilightforest:lich_tower/start"` |
| size | int | ✅ | `5` |
| maxDistanceFromCenter | int | ✅ | `80` |
| biomes | string (tag) | ✅ | `"#twilightforest:has_structure/lich_tower"` |
| terrainAdaptation | string | ✅ | `"beard_thin"`, `"beard_box"`, `"bury"` |
| step | string | ❌ **KERAK** | `"surface_structures"`, `"underground_structures"` |
| spawnOverrides | map | ❌ **KERAK** | Monster spawn ichida struktura |

### 5.2 Structure Set (Placement)
| Setting | Turi | Status | TF Misol |
|---------|------|--------|----------|
| placementType | enum | ✅ | `RandomSpread`, `ConcentricRings` |
| spacing | int | ✅ | `32` |
| separation | int | ✅ | `8` |
| salt | int | ✅ | `14357617` |
| exclusionZone | object | ❌ **KERAK** | Boshqa structuradan min masofa |

---

## 6. PARTICLE EDITOR — ❌ YANGI KERAK

### 6.1 TF dan 22 particle type — Editor settingslari:
| Setting | Turi | Tavsif | TF Misol |
|---------|------|--------|----------|
| particleId | string | Particle nomi | `"firefly"`, `"ice_beam"`, `"annihilate"` |
| displayName | string | Ko'rsatish nomi | — |
| alwaysShow | bool | Renderda doimo ko'rinish | `true` (protection) |
| particleClass | enum | `SimpleParticleType` yoki Custom | Simple (ko'p), Custom (fallen_leaf) |
| hasCustomData | bool | Custom codec kerakmi | `true` (fallen_leaf → LeafParticleData) |
| maxAge | int | Particle umri (ticks) | 20-100 |
| gravity | float | Gravitatsiya ta'siri | 0.0 - 1.0 |
| baseSize | float | Boshlang'ich o'lcham | 0.1 - 2.0 |
| fadeOut | bool | Asta-sekin yo'qolish | true/false |
| color | Color (hex) | Particle rangi | `"#FFD700"` |
| velocityX/Y/Z | float | Tezlik vektori | -0.1 to 0.1 |
| spreadX/Y/Z | float | Tarqalish radius | 0.0 - 1.0 |
| count | int | Bir marta spawn soni | 1-50 |
| emitterShape | enum | Emit shakli | Point, Sphere, Cube, Ring |
| textureSheet | enum | Atlas turi | `PARTICLE_SHEET_OPAQUE`, `TRANSLUCENT`, `LIT` |

### 6.2 TF Particle nomlari (referens):
```
large_flame, leaf_rune, boss_tear, ghast_trap, protection,
snow, snow_warning, extended_snow_warning, snow_guardian,
ice_beam, annihilate, huge_smoke, firefly, wandering_firefly,
particle_spawner_firefly, fallen_leaf, dim_flame, ominous_flame,
sorting_particle, transformation_particle, log_core_particle, cloud_puff
```

---

## 7. ADVANCEMENT EDITOR — AdvancementDataModel

### 7.1 TF dan 11 advancement trigger — Editor settingslari:
| Setting | Turi | Status | TF Misol |
|---------|------|--------|----------|
| advancementId | string | ✅ | `"make_tf_portal"` |
| displayName | string | ✅ | — |
| description | string | ✅ | — |
| iconItem | string | ✅ | `"minecraft:diamond"` |
| frameType | enum | ✅ | `"task"`, `"goal"`, `"challenge"` |
| parent | string | ✅ | Parent advancement ID |
| showToast | bool | ✅ | — |
| announceToChat | bool | ✅ | — |
| hidden | bool | ✅ | — |
| criteria | list | ✅ | — |
| rewardExperience | int | ✅ | — |
| rewardRecipes | list | ✅ | — |
| rewardLootTables | list | ✅ | — |

### 7.2 Qo'shimcha kerak bo'lgan triggerlar:
| Trigger | Status | TF Misol |
|---------|--------|----------|
| `minecraft:inventory_changed` | ✅ | — |
| `minecraft:killed_entity` | ❌ **KERAK** | Boss o'ldirganda |
| `minecraft:enter_block` | ❌ **KERAK** | Portal yurganda |
| `minecraft:location` | ❌ **KERAK** | Biome/dimension kirganda |
| `minecraft:consume_item` | ❌ **KERAK** | Item yeganda |
| Custom trigger (modded) | ❌ **KERAK** | `SimpleAdvancementTrigger` |

**Status: ✅ Yaxshi darajada** — Faqat trigger template'larini ko'paytirish kerak.

---

## 8. BIOME EDITOR — BiomeDataModel + AdvancedBiomeSettings

### 8.1 TF dan 23 biome — To'liq settingslar:
| Setting | Turi | Status | TF Misol |
|---------|------|--------|----------|
| biomeId | string | ✅ | `"firefly_forest"`, `"glacier"` |
| temperature | float | ✅ | `0.5f` (firefly), `0.08f` (glacier) |
| downfall | float | ✅ | `1.0f` (firefly), `0.1f` (glacier) |
| hasPrecipitation | bool | ✅ | `true` (snowy), `false` (enchanted) |
| skyColor | hex | ✅ | `0x808080` (snowy), `0x130D28` (glacier) |
| fogColor | hex | ✅ | `0xFFFFFF` (snowy), `0x361F88` (glacier) |
| grassColor | hex | ✅ | `0xFFFFFF` (snowy), `0x00FFFF` (enchanted) |
| foliageColor | hex | ✅ | `0x00FFFF` (enchanted) |
| waterColor | hex | ✅ | `0x005522` (dense), `0x6C2C2C` (fire_swamp) |
| grassColorModifier | enum | ❌ **KERAK** | `SWAMP`, `DARK_FOREST`, custom |
| particles | object | ❌ **KERAK** | `fireflyParticles()`, `whiteAshParticles()` |
| particleProbability | float | ✅ (advanced) | — |
| musicId | string | ✅ | — |
| ambientLoop | string | ❌ **KERAK** | — |
| moodSound | object | ✅ | `ambient.cave` |

### 8.2 TF Biome ranglar jadvaldan:
```
Firefly Forest: temp=0.5, downfall=1.0, fireflyParticles
Enchanted Forest: foliage=0x00FFFF, grass=0x00FFFF, no precipitation
Spooky Forest: grass=0xC45123, foliage=0xFF8501, water=0xBC8857
Fire Swamp: water=0x2D0700, fog=0x380A00, grass=0x572E23, no precipitation, temp=1.0
Dark Forest: sky=0x000000, fog=0x000000, grass=0x4B6754
Snowy Forest: sky=0x808080, fog=0xFFFFFF, all white, temp=0.09
Glacier: sky=0x130D28, fog=0x361F88, temp=0.08
```

---

## 9. RECIPE EDITOR — RecipeDataModel + RecipeProSettings

### 9.1 TF dan 6 recipe type:
| Recipe Type | Status | TF Misol |
|-------------|--------|----------|
| CraftingShaped | ✅ | Standart 3x3 |
| CraftingShapeless | ✅ | `EmperorsClothRecipe` |
| Smelting | ✅ | — |
| Blasting | ✅ | — |
| Smoking | ✅ | — |
| CampfireCooking | ✅ | — |
| Stonecutting | ✅ | — |
| Smithing (no template) | ❌ **KERAK** | `NoTemplateSmithingRecipe` |
| Custom Recipe Type | ❌ **KERAK** | `UncraftingRecipe` |

**Status: ✅ Yaxshi** — Faqat Smithing va Custom recipe type qo'shish kerak.

---

## 10. DIMENSION EDITOR — DimensionDataModel

### 10.1 TF dan to'liq dimension settings (Twilight dimension):
| Setting | Turi | Status | TF Misol |
|---------|------|--------|----------|
| dimensionId | string | ✅ | `"twilightforest:twilight_forest"` |
| generatorType | enum | ✅ | Noise, Flat |
| biomeSource | string | ✅ | `"minecraft:multi_noise"` |
| hasSkylight | bool | ✅ | `true` |
| hasCeiling | bool | ✅ | `false` |
| ultraWarm | bool | ✅ | `false` |
| natural | bool | ✅ | `true` |
| coordinateScale | float | ✅ | `1.0f` |
| minY / height / logicalHeight | int | ✅ | -64, 384, 384 |
| ambientLight | float | ✅ | `0.1f` |
| fixedTime | long | ❌ **KERAK** | TF ning doimo twilight vaqti |
| effects | string | ✅ | `"minecraft:overworld"` / custom |
| portalType | string | ❌ **KERAK** | Custom portal mexanikasi |
| monsterSpawnLight | object | ✅ | min/max |

---

## 11. LOOT TABLE EDITOR — LootTableDataModel

### Status: ✅ Yaxshi (to'liq)
Mavjud settingslar:
- `lootType`: Block, Entity, Chest, Gameplay
- `pools`: rolls, bonusRolls, entries (item/tag/loot_table/empty)
- `functions`: set_count, fortune, explosion_decay, custom
- `conditions`: survives_explosion, silk_touch, killed_by_player, custom

### 11.1 TF dan qo'shimcha kerak:
| Setting | Status | Tavsif |
|---------|--------|--------|
| `looting_enchant` bonus | ❌ **KERAK** | Entity droplar uchun |
| `random_chance` condition | ❌ **KERAK** | Kamdan-kam drop |
| `entity_properties` condition | ❌ **KERAK** | Entity holatiga qarab |
| `alternative` entry | ❌ **KERAK** | Silk touch yoki fortune alternativ |

---

## 12. TAG EDITOR — TagDataModel

### Status: ✅ Yaxshi
Mavjud: Blocks, Items, EntityTypes, Biomes, Fluids, DamageTypes, Functions.

### 12.1 TF dan qo'shimcha tag turlari:
| Tag Type | Status |
|----------|--------|
| `banner_pattern` tag | ❌ **KERAK** |
| `point_of_interest_type` tag | ❌ **KERAK** |
| `structure` tag | ❌ **KERAK** |
| `enchantment` tag | ❌ **KERAK** |
| `painting_variant` tag | ❌ **KERAK** |

---

## 13. ARMOR MATERIAL EDITOR — ❌ YANGI KERAK

### TF dan 8 armor material — kerakli settingslar:
| Setting | Turi | TF Misol |
|---------|------|----------|
| materialId | string | `"naga"`, `"fiery"`, `"knightmetal"` |
| durabilityMultiplier | int | `21` (naga), `25` (fiery), `10` (steeleaf) |
| helmetDefense | int | Har bir slot uchun alohida |
| chestplateDefense | int | — |
| leggingsDefense | int | — |
| bootsDefense | int | — |
| toughness | float | `2.0f` (fiery) |
| knockbackResistance | float | `0.0f` - `0.1f` |
| enchantability | int | `15` |
| equipSound | string | `"item.armor.equip_diamond"` |
| repairIngredient | string | `"mymod:fiery_ingot"` |
| fireResistant | bool | `true` (fiery) |
| customArmorClass | string | `"FieryArmorItem"`, `"PhantomArmorItem"` |

---

## 14. TOOL MATERIAL EDITOR — ❌ KENGAYTIRISH KERAK

### TF dan 7 tool material:
| Material | Damage | Speed | Durability | Level | Enchant |
|----------|--------|-------|------------|-------|---------|
| IRONWOOD | +3 | -2.4 | ~500 | 2 | 15 |
| STEELEAF | +3 | -2.4 | ~131 | 3 | 9 |
| KNIGHTMETAL | +3 | -2.4 | ~512 | 3 | 8 |
| FIERY | +3 | -2.4 | ~1024 | 4 | 10 |
| ICE | +3 | -2.4 | ~512 | 2 | 5 |
| GLASS | +3 | -2.4 | 1 | 5 | 0 |
| GIANT | +10 | -3.5 | ~1024 | 4 | 10 |

### Kerakli qo'shimcha settingslar:
| Setting | Status | Tavsif |
|---------|--------|--------|
| attackDamageBonus | float | ❌ | Har bir qurol turiga +bonus |
| attackSpeedModifier | float | ❌ | -2.4 dan -3.5 gacha |
| specialAbility | enum | ❌ | Fire (fiery), Ice (ice), Glass (1-hit), Giant (4x) |
| customToolClass | string | ❌ | `"GiantPickItem"`, `"FierySwordItem"` |

---

## 15. SOUND EVENT EDITOR — ❌ YANGI KERAK

### TF dan 50+ sound event:
| Setting | Turi | Tavsif |
|---------|------|--------|
| soundId | string | `"music_disc_radiance"` |
| displayName | string | — |
| category | enum | `MUSIC`, `HOSTILE`, `NEUTRAL`, `AMBIENT`, `BLOCKS` |
| subtitle | string | Subtitle matn |
| sounds | list | Fayl yo'llari |
| replace | bool | Vanilla soundni almashtirish |
| volume | float | 0.0 - 1.0 |
| pitch | float | 0.5 - 2.0 |
| weight | int | Random tanlash og'irligi |
| stream | bool | Uzun fayllar uchun streaming |
| attenuationDistance | int | Eshitish masofasi |

---

## 16. MOB EFFECT / POTION EDITOR — ❌ YANGI KERAK

| Setting | Turi | Tavsif |
|---------|------|--------|
| effectId | string | `"frozen"`, `"frosty"` |
| displayName | string | — |
| category | enum | `BENEFICIAL`, `HARMFUL`, `NEUTRAL` |
| color | hex | Particle rangi |
| isInstant | bool | Bir zumda ta'sir |
| iconTexture | string | GUI uchun ikonka |
| attributes | list | Qaysi attribute'larni o'zgartiradi |
| stackable | bool | Bir nechta marta qo'shilishi |

---

## 17. CREATIVE TAB EDITOR — CreativeTabDataModel

### TF pattern: bitta `TFCreativeTabs.java` — barcha tab'lar.
| Setting | Status | Tavsif |
|---------|--------|--------|
| tabId | ✅ | — |
| displayName | ✅ | — |
| iconItem | ❌ **KERAK** | Tab ikonkasi item |
| itemOrder | ❌ **KERAK** | Tab ichidagi tartib |
| searchEnabled | ❌ **KERAK** | Qidiruv bar |

---

## XULOSA — PRIORITY BO'YICHA KERAKLI YANGILANISHLAR

### 🔴 Yuqori prioritet (AAA uchun shart):
1. **Particle Editor** — 22 settingsli to'liq yangi editor
2. **Block subtype system** — Stair, Slab, Fence, Door, Pillar generatsiyasi
3. **Wood Set Generator** — Bir nomdan 17 blok + 5 item
4. **Armor Material Editor** — To'liq material set yaratish
5. **Bow/Shield/Wand item turlari** — Yangi item subtype'lar

### 🟡 O'rta prioritet:
6. **Sound Event Editor** — Musiqa va ambient sozlash
7. **Mob Effect Editor** — Custom potion/effect yaratish
8. **Smithing Recipe** — 1.20+ smithing table
9. **pushReaction, instrument, ignitedByLava** — Block properties kengaytirish
10. **Spawn Egg color picker** — Vizual rang tanlash

### 🟢 Past prioritet (polishing):
11. Tag turlari kengaytirish (banner_pattern, structure, enchantment)
12. Loot table: looting_enchant, random_chance, alternatives
13. Dimension: fixedTime, custom portal
14. Creative Tab: iconItem, itemOrder
15. Custom trigger template'lari (advancement)

---

## REFERENS MANBALAR
- [Twilight Forest GitHub](https://github.com/TeamTwilight/twilightforest) — 1.20.x branch
- `src/main/java/twilightforest/init/` — Barcha registration fayllar
- Litsenziya: Code — LGPL-2.1 (ochiq manba)
