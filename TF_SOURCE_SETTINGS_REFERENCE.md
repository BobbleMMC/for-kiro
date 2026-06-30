# TWILIGHT FOREST — MANBA KODGA ASOSLANGAN SETTINGS REFERENSI
## Har bir element uchun haqiqiy kod qiymatlari va kerakli editor toollari

Bu hujjat Twilight Forest 1.20.x **manba kodidan to'g'ridan-to'g'ri olingan** settingslar ro'yxati. Har bir setting yonida haqiqiy qiymat misoli berilgan.

---

## 1. ITEM — `Item.Properties` (TFItems.java dan)

Kodda ishlatilgan BARCHA property'lar:

| Property | Qiymat misoli (kod) | Editor tool |
|----------|---------------------|-------------|
| `.rarity(...)` | `Rarity.UNCOMMON`, `RARE`, `COMMON` | Dropdown |
| `.durability(n)` | `99`, `384`, `1024`, `256`, `9` | Number input |
| `.stacksTo(n)` | `1`, `16` (ice_bomb), `64` | Slider 1-64 |
| `.fireResistant()` | flag | Checkbox |
| `.setNoRepair()` | flag (mazebreaker, glass_sword) | Checkbox |
| `.food(FoodProperties)` | quyida | Food sub-panel |
| `.component(type, val)` | `POTION_FLASK_CONTENTS` | Component editor |
| `.attributes(...)` | `SwordItem.createAttributes(mat, 3, -2.4F)` | Attribute editor |

### FoodProperties.Builder (haqiqiy qiymatlar)
```
hydra_chop:    nutrition=18, saturation=2.0, fireResistant, effect(REGENERATION,100,0, prob=1.0)
torchberries:  alwaysEdible, effect(GLOWING,100,0, prob=0.75)
cooked_venison: nutrition=8, saturation=0.8
raw_venison:   nutrition=3, saturation=0.3
meef_stroganoff: nutrition=8, saturation=0.6, alwaysEdible, stacksTo(1)
maze_wafer:    nutrition=4, saturation=0.6
experiment_115: nutrition=4, saturation=0.3
```
**Editor toollari:** nutrition (int), saturation (float), alwaysEdible (bool), effect listi (effect + duration + amplifier + probability).

### Maxsus Item klasslari (custom behavior — class tanlovchi kerak)
```
TwilightWandItem, LifedrainScepterItem, ZombieWandItem, FortificationWandItem,
MagicMapItem, MazeMapItem, OreMeterItem, CrumbleHornItem, PeacockFanItem,
MoonwormQueenItem, BrittleFlaskItem, GreaterFlaskItem, ChainBlockItem,
TripleBowItem, SeekerBowItem, IceBowItem, EnderBowItem, IceSwordItem,
GlassSwordItem, MagicBeansItem, GiantPickItem, GiantSwordItem, LampOfCindersItem,
CubeOfAnnihilationItem, MoonDialItem, PocketWatchItem, IceBombItem,
TransformPowderItem, OreMagnetItem, RecordItem, BannerPatternItem, TwilightBoatItem
```
**Editor tool:** "Item Behavior Class" dropdown + behavior-specific parametrlar paneli.

---

## 2. TOOL MATERIAL — `SimpleTier` (TFToolMaterials.java dan)

`SimpleTier(incorrectBlocksTag, uses, speed, attackDamageBonus, enchantmentValue, repairIngredient)`

| Material | uses | speed | attackBonus | enchant | repair |
|----------|------|-------|-------------|---------|--------|
| IRONWOOD | 512 | 6.5 | 2 | 25 | tag |
| FIERY | 1024 | 9.0 | 4 | 10 | tag |
| STEELEAF | 131 | 8.0 | 3 | 9 | tag |
| KNIGHTMETAL | 512 | 8.0 | 3 | 8 | tag |
| GIANT | 1024 | 4.0 | 1.0 | 5 | tag |
| ICE | 32 | 1.0 | 3.5 | 5 | tag |
| GLASS | 1 | 1.0 | 36.0 | 30 | EMPTY (no repair) |

**Editor toollari (Tool Material yaratish uchun 6 ta field):**
1. `uses` — Durability (int)
2. `speed` — Mining speed (float)
3. `attackDamageBonus` — Hujum bonusi (float)
4. `enchantmentValue` — Enchantability (int)
5. `incorrectBlocksTag` — Qaysi bloklarni qaza olmaydi (tag selector)
6. `repairIngredient` — Tuzatish itemi (item/tag selector, yoki EMPTY)

> **Diqqat:** Tool damage/speed har QUROL turi uchun alohida: `SwordItem.createAttributes(mat, 3, -2.4F)`, `PickaxeItem.createAttributes(mat, 1.0F, -2.8F)`, `AxeItem.createAttributes(mat, 6.0F, -3.1F)`. Bular tier'dan ajralib turadi.

---

## 3. ENTITY — Attributes (Naga.java `registerAttributes()` dan)

```
Monster.createMonsterAttributes()
  .add(MAX_HEALTH, 120)
  .add(MOVEMENT_SPEED, 0.3)
  .add(ATTACK_DAMAGE, 5.0)
  .add(FOLLOW_RANGE, 80.0)
  .add(KNOCKBACK_RESISTANCE, 0.25)
  .add(STEP_HEIGHT, 2.0)
```

**Editor toollari — Attribute paneli (har bir entity uchun):**
| Attribute | Qiymat misoli | Tip |
|-----------|---------------|-----|
| MAX_HEALTH | 120 (naga) | float |
| MOVEMENT_SPEED | 0.25-0.3 | float |
| ATTACK_DAMAGE | 5.0 | float |
| FOLLOW_RANGE | 80.0 | float |
| KNOCKBACK_RESISTANCE | 0.25 (mob), 1.0 (boss) | float |
| STEP_HEIGHT | 2.0 | float |
| ARMOR | 0-20 | float |
| ARMOR_TOUGHNESS | 0-12 | float |
| ATTACK_KNOCKBACK | 0+ | float |
| FLYING_SPEED | (uchuvchi mob) | float |

### Entity Builder settings (TFEntities.java make() dan)
```
.sized(width, height)              → 2.0 x 3.0 (naga), 16 x 12 (hydra)
.eyeHeight(h)                      → 0.5, 0.45 (ixtiyoriy)
.setTrackingRange(r)               → 80 (mob), 150 (projectile), 10 (boat)
.setUpdateInterval(i)              → 3 (mob), 1 (chain_block), 5 (bolt)
.setShouldReceiveVelocityUpdates() → true
.fireImmune()                      → boss'lar uchun
.noSave().noSummon()               → charm_effect, protection_box
spawnEgg: primaryColor, secondaryColor → 0xa4d316 / 0x1b380b
```

### AI Goals (Naga.java registerGoals() dan — Goal tizimi)
```
goalSelector (priority, goal):
  1: FloatGoal            — suvda suzish
  2: SimplifiedAttackGoal — hujum
  3: NagaSmashGoal        — maxsus hujum
  4: NagaMovementPattern  — harakat patterni
  5: AttemptToGoHomeGoal  — uyga qaytish
  8: RandomStrollGoal     — tasodifiy yurish
targetSelector:
  1: HurtByTargetGoal           — zarba bergan kishini nishon olish
  2: NearestAttackableTargetGoal(Player) — eng yaqin o'yinchini nishon olish
```
**Editor tool:** AI Goal Builder — priority (int) + goal type (dropdown) + parametrlar. Vanilla goallar ro'yxati: Float, MeleeAttack, RandomStroll, LookAtPlayer, RandomLookAround, HurtByTarget, NearestAttackableTarget, Panic, Tempt, Breed, FollowParent, Avoid, RangedAttack.

---

## 4. BLOCK — `BlockBehaviour.Properties` (TFBlocks.java dan)

Kodda ishlatilgan BARCHA metodlar:

| Metod | Qiymat misoli | Editor tool |
|-------|---------------|-------------|
| `.strength(hardness, resist)` | `(100.0, 5.0)`, `(1.5, 6.0)`, `(-1.0, 6000000.0)` | 2 number input |
| `.mapColor(...)` | `PLANT`, `STONE`, `ICE`, `SAND`, `WOOD`, `COLOR_ORANGE` | Color dropdown |
| `.sound(...)` | `STONE`, `WOOD`, `GRASS`, `METAL`, `GLASS`, `WOOL`, `MOSS`, `FUNGUS` | Dropdown |
| `.instrument(...)` | `BASEDRUM`, `BASS`, `CHIME`, `HAT`, `FLUTE` | Dropdown |
| `.lightLevel(state→n)` | `15`, `11`, `4`, `state ? 15 : 0` | Slider 0-15 + conditional |
| `.requiresCorrectToolForDrops()` | flag | Checkbox |
| `.noOcclusion()` | flag | Checkbox |
| `.noCollission()` | flag | Checkbox |
| `.noLootTable()` | flag | Checkbox |
| `.randomTicks()` | flag | Checkbox |
| `.ignitedByLava()` | flag | Checkbox |
| `.instabreak()` | flag (strength 0) | Checkbox |
| `.replaceable()` | flag | Checkbox |
| `.pushReaction(...)` | `DESTROY`, `BLOCK`, `NORMAL` | Dropdown |
| `.noTerrainParticles()` | flag | Checkbox |
| `.forceSolidOff()` | flag (ladder, rope) | Checkbox |
| `.emissiveRendering(...)` | `→ true` (fiery_block) | Checkbox |
| `.isValidSpawn(...)` | `noSpawning` | Checkbox |
| `.isSuffocating(...)` | `→ false` (leaves) | Checkbox |
| `.isViewBlocking(...)` | `→ false` (leaves) | Checkbox |
| `.isRedstoneConductor(...)` | `→ false` (glass) | Checkbox |
| `.ofFullCopy(otherBlock)` | mavjud blokdan nusxa | "Copy from" selector |

### Block sinflari (block type selector)
```
Block, RotatedPillarBlock, StairBlock, SlabBlock, FenceBlock, FenceGateBlock,
ButtonBlock, PressurePlateBlock, DoorBlock, TrapDoorBlock, StandingSignBlock,
WallSignBlock, CeilingHangingSignBlock, WallHangingSignBlock, BanisterBlock,
SaplingBlock, FlowerPotBlock, TFChestBlock, TFTrappedChestBlock, TFLeavesBlock,
LadderBlock, RopeBlock, TransparentBlock, IronBarsBlock, BossSpawnerBlock,
TrophyBlock, ThornsBlock, CloudBlock, GiantBlock
```

### MUHIM: Wood Set (har bir yog'och = 17 blok + bog'liq itemlar)
```
log, stripped_log, wood, stripped_wood, planks, stairs, slab, fence,
fence_gate, door, trapdoor, button, pressure_plate, sign, wall_sign,
hanging_sign, wall_hanging_sign, banister, chest, trapped_chest,
+ hollow log (horizontal/vertical/climbable), sapling, potted_sapling, leaves, boat
```
**Editor tool:** "Wood Set Generator" — 1 nom + ranglar → ~30 blok+item avtomatik.

---

## 5. PARTICLE — `SimpleParticleType` / Custom (TFParticleType.java dan)

```
SimpleParticleType(overrideLimiter: boolean)
  → false: oddiy particle (firefly, snow, ice_beam, ...)
  → true:  alwaysShow/limitsizroq render (protection)
Custom (LeafParticleData): codec() + streamCodec() — qo'shimcha data uzatadi
```

**Editor toollari (Particle yaratish):**
| Field | Qiymat | Tip |
|-------|--------|-----|
| particleId | `firefly`, `ice_beam` | string |
| overrideLimiter (alwaysShow) | true/false | checkbox |
| hasCustomData | false (ko'p), true (fallen_leaf) | checkbox |
| customDataClass | `LeafParticleData` | dropdown (agar custom) |

> Render xususiyatlari (maxAge, gravity, size, color, velocity) **client-side particle factory**da bo'ladi — bu alohida client kodi. Editor JSON+factory stub generatsiya qilishi kerak.

22 particle: large_flame, leaf_rune, boss_tear, ghast_trap, protection, snow, snow_warning, extended_snow_warning, snow_guardian, ice_beam, annihilate, huge_smoke, firefly, wandering_firefly, particle_spawner_firefly, fallen_leaf, dim_flame, ominous_flame, sorting_particle, transformation_particle, log_core_particle, cloud_puff.

---

## 6. SOUND EVENT — `SoundEvent` (TFSounds.java dan)

```
createEvent("entity.twilightforest.alpha_yeti.alert")
```
Naming konvensiyasi: `<category>.<modid>.<subject>.<action>`

**Editor toollari:**
| Field | Qiymat misoli | Tip |
|-------|---------------|-----|
| soundId | `alpha_yeti.alert` | string |
| category prefix | `entity`, `block`, `item`, `environment`, `ambient`, `music` | dropdown |
| subject | `alpha_yeti`, `boar`, `flask` | string |
| soundFiles | .ogg yo'llari | file list |
| subtitle | matn | string |
| volume / pitch | 1.0 / 1.0 | float |
| stream | true (uzun music) | checkbox |

Entity sound to'plami patterni (har bir mob uchun): `ambient`, `death`, `hurt`, `step` (+ maxsus: `alert`, `grab`, `growl`, `roar`, `throw`, `ice`, `pant`).

---

## 7. MOB EFFECT — `MobEffect` (TFMobEffects.java dan)

```
MOB_EFFECTS.register("frosted", FrostedEffect::new)
```
Custom class (`FrostedEffect`) MobEffect'dan meros oladi.

**Editor toollari (MobEffect yaratish):**
| Field | Tip |
|-------|-----|
| effectId | string |
| category | `BENEFICIAL` / `HARMFUL` / `NEUTRAL` (dropdown) |
| color (particle) | hex color picker |
| isInstant | checkbox |
| attributeModifiers | list (attribute + amount + operation) |
| applyEffectTick logic | behavior class stub |
| iconTexture | 18x18 GUI texture |

---

## 8. DATA COMPONENT — `DataComponentType` (TFDataComponents.java dan)

1.20.5+ Data Component tizimi. Itemga maxsus data biriktirish.

```
builder()
  .persistent(Codec)              — diskka saqlanadi
  .networkSynchronized(StreamCodec) — tarmoqqa uzatiladi
  .cacheEncoding()                — keshlanadi (ixtiyoriy)
  .build()
```

Misollar (data turi → maqsad):
```
Unit              → flag (emperors_cloth, infinite_glass_sword, translatable_book)
PotionFlaskComponent → flask ichidagi suyuqlik
UUID              → otilgan snaryad ID (thrown_projectile)
String            → variant nomi (e115_variant)
Integer           → ore_loading, ore_range (NON_NEGATIVE_INT)
Block             → ore_filter (block registry codec)
SkullCandles      → custom data (skull + sham soni)
Holder<Variant>   → magic_painting_variant
```

**Editor toollari:**
| Field | Tip |
|-------|-----|
| componentId | string |
| dataType | dropdown: Unit, Int, String, UUID, Block, Item, Custom |
| persistent | checkbox |
| networkSynchronized | checkbox |
| cacheEncoding | checkbox |
| defaultValue | dataType'ga qarab input |

---

## 9. CREATIVE TAB — `CreativeModeTab.builder()` (TFCreativeTabs.java dan)

```
CreativeModeTab.builder()
  .title(Component.translatable("itemGroup.modid.blocks"))
  .icon(() -> new ItemStack(SOME_BLOCK))
  .withTabsBefore(OTHER_TAB.getKey())   — tartib
  .displayItems((params, output) -> { output.accept(ITEM); ... })
  .build()
```

**Editor toollari:**
| Field | Qiymat | Tip |
|-------|--------|-----|
| tabId | `blocks`, `items`, `equipment` | string |
| title | translation key | string |
| icon | item/block | item selector |
| withTabsBefore | oldingi tab | tab selector (tartib) |
| displayItems | item ro'yxati | drag-drop reorderable list |
| enchanted variants | `generateGearWithEnchants(...)` | special: item + enchant + level |
| spawn eggs auto | `createSpawnEggsAlphabetical()` | checkbox |

> TF Equipment tab'da gear'larni **oldindan enchant qilingan** holda ko'rsatadi (`EnchantmentInstance(EFFICIENCY, 1)`). Editor "preview enchant" qo'shishi mumkin.

---

## 10. BIOME — `BiomeGenerationSettings.Builder` (BiomeHelper.java dan)

```
biome.addFeature(GenerationStep.Decoration.<STEP>, PlacedFeature)
```

GenerationStep.Decoration bosqichlari (feature qaysi bosqichda qo'shiladi):
```
RAW_GENERATION, LAKES, LOCAL_MODIFICATIONS, UNDERGROUND_STRUCTURES,
SURFACE_STRUCTURES, STRONGHOLDS, UNDERGROUND_ORES, UNDERGROUND_DECORATION,
FLUID_SPRINGS, VEGETAL_DECORATION, TOP_LAYER_MODIFICATION
```

**Editor toollari (Biome — Climate + Effects + Generation + Spawns):**

### Climate (TFBiomes.java dan haqiqiy qiymatlar)
```
temperature: 0.08 (glacier) ... 1.0 (fire_swamp)
downfall:    0.1 ... 1.0
hasPrecipitation: true/false
```
### Ambient/Effects ranglar
```
skyColor, fogColor, waterColor, waterFogColor,
grassColorOverride, foliageColorOverride,
grassColorModifier: NONE / SWAMP / DARK_FOREST (+ custom)
particles: type + probability (fireflyParticles, whiteAshParticles)
ambientSound, moodSound, additionsSound, music
```
### Generation
```
features: [step → placedFeature] listi (drag-drop)
carvers: AIR carver listi
```
### Mob Spawns
```
MobSpawnSettings.Builder:
  addSpawn(MobCategory, SpawnerData(entityType, weight, minCount, maxCount))
  spookSpawning, darkForestSpawning, snowForestSpawning, penguinSpawning — preset'lar
```

---

## 11. STRUCTURE — `Structure` config (TFStructures.java dan)

```
ResourceKey<Structure> = registerKey("lich_tower")
context.register(KEY, XxxStructure.buildConfig(context))
```
22 struktura: hedge_maze, quest_grove, small/medium/large_hollow_hill, naga_courtyard, lich_tower, labyrinth, hydra_lair, knight_stronghold, dark_tower, yeti_cave, aurora_palace, troll_cave, giant_house, final_castle, hollow_tree, mushroom_tower, quest_island, druid_grove, floating_ruins, world_tree.

**Editor toollari (Structure):**
| Field | Tip |
|-------|-----|
| structureId | string |
| structureType | dropdown (jigsaw, single piece, custom) |
| step (GenerationStep) | dropdown |
| terrainAdaptation | dropdown: none, beard_thin, beard_box, bury, encapsulate |
| biomes (tag) | tag selector |
| spawnOverrides | mob category → spawn list |
| startPool / size / maxDistance (jigsaw uchun) | string / int / int |

### Structure Set (joylashish — alohida tool)
```
placement: RandomSpread (spacing, separation, salt) / ConcentricRings
```

---

## 12. ENCHANTMENT — custom class (TFEnchantments.java dan)

```
ENCHANTMENTS.register("fire_react", () -> new FireReactEnchantment(4))
                                                              ↑ maxLevel
```
Custom class enchantment logikasini saqlaydi. 3 ta: fire_react (max 4), chill_aura (max 4), destruction (max 3).

**Editor toollari:** ✅ allaqachon to'liq (maxLevel, target, rarity, treasure, curse, incompatible, min/maxCost).

---

## 13. RECIPE — `RecipeSerializer` / `RecipeType` (TFRecipes.java dan)

Custom recipe turlari:
```
SimpleCraftingRecipeSerializer → EmperorsClothRecipe, MagicMapCloning, MazeMapCloning, MoonwormQueenRepair
UncraftingRecipe (custom type) → maxsus serializer + RecipeType.simple()
NoTemplateSmithingRecipe       → template'siz smithing
```

**Editor tool qo'shilishi kerak:**
- Custom recipe type yaratish (RecipeType + Serializer)
- NoTemplateSmithing (1.20+ smithing table'ni template'siz)

---

## 14. ADVANCEMENT TRIGGER — `CriterionTrigger` (TFAdvancements.java dan)

```
TRIGGERS.register("make_tf_portal", SimpleAdvancementTrigger::new)
```
Custom triggerlar: make_tf_portal, consume_hydra_chop_on_low_hunger, complete_quest_ram, placed_on_trophy_pedestal, activate_ghast_trap, structure_cleared, drink_from_flask, kill_bug, hurt_boss, kill_all_phantoms, uncraft_item.

**Editor tool:** Custom Trigger Builder — triggerId + trigger class (Simple / parametrli) + JSON criteria.

---

# XULOSA — Source kod tahlilidan kelib chiqqan ENG MUHIM kerakli toollar

### Hozir Mod Studio'da yetishmaydigan, source kodda MUHIM bo'lgan:

1. **Tool Material editor** (6 field: uses, speed, attackBonus, enchant, incorrectBlocksTag, repairIngredient) — har material 7 ta qurolga ulanadi
2. **Per-tool-type attributes** (sword: dmg+3 spd-2.4, axe: dmg+6 spd-3.1, pickaxe: dmg+1 spd-2.8)
3. **Entity AI Goal Builder** (priority + goal type + params) — registerGoals() patterni
4. **Entity Builder settings** (trackingRange, updateInterval, eyeHeight, noSave/noSummon)
5. **Block: instrument, pushReaction, ignitedByLava, isSuffocating, isViewBlocking, isRedstoneConductor, isValidSpawn, forceSolidOff, noTerrainParticles**
6. **Block "ofFullCopy"** — mavjud blokdan property nusxa olish
7. **Wood Set Generator** — 1 nomdan ~30 blok+item
8. **Data Component editor** (persistent/networkSync/cacheEncoding + dataType)
9. **Sound Event editor** (category prefix + subtitle + stream + multi-file)
10. **Mob Effect editor** (category, color, isInstant, attribute modifiers)
11. **Particle: overrideLimiter (alwaysShow) + custom data class**
12. **Creative Tab: withTabsBefore (tartib) + enchanted preview + auto spawn eggs**
13. **Biome: GenerationStep'ga feature qo'shish (drag-drop) + grassColorModifier + particle probability**
14. **FoodProperties: effect listi (effect+duration+amplifier+probability)**
15. **Custom Recipe Type + NoTemplateSmithing**

### Allaqachon yetarli (✅):
Enchantment, asosiy Block strength/light, asosiy Item rarity/durability, Loot Table, Tag, Recipe (standart), Dimension, Advancement (asosiy), Structure (asosiy).

---
**Referens:** [TeamTwilight/twilightforest @ 1.20.x](https://github.com/TeamTwilight/twilightforest/tree/1.20.x/src/main/java/twilightforest/init)
*Litsenziya: TF kodi LGPL-2.1 ostida. Bu hujjat tahlil/o'rganish maqsadida.*
