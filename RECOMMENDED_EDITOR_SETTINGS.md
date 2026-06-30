# MOD STUDIO — TAVSIYA ETILGAN EDITOR SETTINGS (Vanilla + Mod)
## Har bir element uchun qo'shilishi kerak bo'lgan settingslar va to'liq misollar

Bu hujjat **vanilla uslubidagi** va **to'liq modlangan** kontent yaratish uchun har bir editor turiga qaysi settingslarni qo'shish kerakligini misollar bilan ko'rsatadi.

**Belgilar:** 🟢 Asosiy (vanilla) · 🔵 Kengaytirilgan (mod) · ⚙️ Generatsiya qilinadigan kod

---

## 1. ITEM EDITOR

### 🟢 Asosiy settingslar
| Setting | Tip | Misol qiymatlar |
|---------|-----|-----------------|
| itemId | string | `ruby`, `magic_sword` |
| displayName | string | `Ruby`, `Magic Sword` |
| maxStackSize | int (1-64) | `64`, `16`, `1` |
| rarity | dropdown | `Common`, `Uncommon`, `Rare`, `Epic` |
| maxDurability | int | `0` (no durability), `250`, `1561` |
| fireResistant | bool | `true`/`false` |
| isNoRepair | bool | `true`/`false` |
| craftRemainder | item | `bucket` (masalan, milk_bucket → bucket) |

### 🟢 Item turi (subtype) — qaysi behavior
```
Basic, Food, Sword, Pickaxe, Axe, Shovel, Hoe, Armor, Bow, Crossbow,
Shield, FishingRod, Trident, Bucket, Boat, SignItem, RecordMusicDisc,
SpawnEgg, BannerPattern, Wand/Custom
```

### 🟢 Food settings (Food tanlangach)
| Setting | Tip | Misol |
|---------|-----|-------|
| nutrition | int | `4` (apple), `8` (steak), `18` (special) |
| saturationModifier | float | `0.3`, `0.6`, `0.8`, `2.0` |
| isMeat | bool | `true` (it itlar yeyishi uchun) |
| canAlwaysEat | bool | `true` (golden apple) |
| eatDurationTicks | int | `32` (default), `16` (tez) |
| effects | list | quyidagi misol |

**Effect listi misoli:**
```json
[
  { "effect": "minecraft:regeneration", "duration": 100, "amplifier": 1, "probability": 1.0 },
  { "effect": "minecraft:glowing", "duration": 200, "amplifier": 0, "probability": 0.75 }
]
```

### 🔵 Attribute Modifiers (qurol/armor uchun)
| Setting | Misol |
|---------|-------|
| attribute | `generic.attack_damage`, `generic.attack_speed`, `generic.armor`, `generic.movement_speed` |
| amount | `7.0` (damage), `-2.4` (speed), `2.0` (armor) |
| operation | `addition`, `multiply_base`, `multiply_total` |
| slot | `mainhand`, `offhand`, `head`, `chest`, `legs`, `feet` |

**To'liq qilich misoli:**
```
Magic Sword:
  attack_damage: +7.0 (addition, mainhand)
  attack_speed: -2.4 (addition, mainhand)
```

### 🔵 Tooltip / Lore
| Setting | Misol |
|---------|-------|
| loreLines | `["Forged in twilight", "§7Legendary blade"]` |
| enchantmentGlint | `true`/`false` |
| customModelData | `12345` (resource pack uchun) |

### 🔵 Bow/Crossbow maxsus
| Setting | Misol |
|---------|-------|
| drawTimeTicks | `20` |
| arrowVelocity | `3.0` |
| customArrowEntity | `mymod:ice_arrow` |
| chargedProjectiles | int (crossbow multishot) |

### ⚙️ Generatsiya: `items/<id>.json` model, `lang` entry, recipe (ixtiyoriy)

---

## 2. BLOCK EDITOR

### 🟢 Asosiy settingslar
| Setting | Tip | Misol |
|---------|-----|-------|
| blockId | string | `ruby_block` |
| material/mapColor | dropdown | `STONE`, `WOOD`, `METAL`, `PLANT`, `WOOL` |
| hardness | float | `1.5`, `3.0`, `50.0`, `-1.0` (unbreakable) |
| resistance | float | `6.0`, `1200.0`, `3600000.0` (bedrock) |
| soundType | dropdown | `STONE`, `WOOD`, `GLASS`, `METAL`, `GRAVEL`, `WOOL`, `SAND` |
| lightLevel | int (0-15) | `0`, `7`, `15` |
| requiresTool | bool | `true` |
| harvestTool | dropdown | `pickaxe`, `axe`, `shovel`, `hoe` |
| harvestLevel | dropdown | `wood`, `stone`, `iron`, `diamond`, `netherite` |

### 🟢 Block turi (subtype)
```
Block, Stairs, Slab, Wall, Fence, FenceGate, Door, Trapdoor, Button,
PressurePlate, Pillar/Log, Leaves, Sapling, Crop, Pane/Bars, Ladder,
Chest, Furnace, Sign, Carpet, Pottable, Torch, Lantern, Bed, Banner
```

### 🔵 Fizika va render
| Setting | Misol qiymat | Tavsif |
|---------|--------------|--------|
| renderType | `solid`/`cutout`/`cutout_mipped`/`translucent` | Glass → translucent |
| isOpaque (noOcclusion) | `false` → noOcclusion | Shaffof bloklar |
| pushReaction | `NORMAL`/`DESTROY`/`BLOCK`/`PUSH_ONLY` | Piston ta'siri |
| instrument | `BASEDRUM`/`BASS`/`CHIME`/`HAT`/`BELL` | Note block ovozi |
| ignitedByLava | `true` | Yog'och bloklar |
| flammable | `true` + spreadSpeed + flammability | Yonuvchi |
| slipperiness | `0.6` (default), `0.98` (ice) | Sirpanchiqlik |
| friction | float | Yurish tezligi |
| speedFactor / jumpFactor | `1.0`, `0.4` (soul sand) | — |
| randomTicks | `true` | O'simliklar, o't |
| emissiveRendering | `true` | Magmadek yonib turuvchi |

### 🔵 Collision/Spawn behavior
| Setting | Misol |
|---------|-------|
| noCollision | `true` (o't, gul) |
| customCollisionShape | `[0,0,0, 16,8,16]` (slab) |
| customOutlineShape | voxel shape |
| isSuffocating | `false` (leaves) |
| isViewBlocking | `false` (glass) |
| isRedstoneConductor | `false` (glass) |
| allowsSpawning | `false` (mob spawn yo'q) |
| forceSolidOff | `true` (ladder) |

### 🔵 Blok holatlari (Block States)
| Setting | Misol |
|---------|-------|
| properties | `facing` (N/S/E/W), `lit` (bool), `age` (0-7), `axis` (X/Y/Z), `half` (top/bottom) |
| defaultState | `facing=north, lit=false` |

### 🔵 Block Entity (Tile Entity)
| Setting | Misol |
|---------|-------|
| hasBlockEntity | `true` (chest, furnace) |
| inventorySize | `27` (chest), `3` (furnace) |
| guiType | `chest`, `furnace`, `custom` |
| tickBehavior | `serverTick`, `clientTick` |

### ⚙️ Generatsiya: blockstate JSON, block model, item model, loot table, lang

---

## 3. ENTITY EDITOR

### 🟢 Asosiy
| Setting | Tip | Misol |
|---------|-----|-------|
| entityId | string | `frost_wolf` |
| mobCategory | dropdown | `MONSTER`, `CREATURE`, `AMBIENT`, `WATER_CREATURE`, `MISC` |
| width / height | float | `0.6 x 0.85`, `2.0 x 3.0` |
| eyeHeight | float | `0.85` (ixtiyoriy) |

### 🟢 Attributes (mob statistikasi)
| Attribute | Misol qiymat |
|-----------|--------------|
| max_health | `20`, `100`, `200` (boss) |
| movement_speed | `0.25`, `0.3` |
| attack_damage | `3.0`, `5.0`, `15.0` |
| follow_range | `16`, `35`, `80` |
| knockback_resistance | `0.0`, `0.25`, `1.0` (boss) |
| armor | `0`, `10`, `20` |
| armor_toughness | `0`, `8`, `12` |
| attack_knockback | `0`, `1`, `2` |
| step_height | `0.6`, `1.0`, `2.0` |
| flying_speed | (uchuvchi mob) |

### 🟢 Spawn Egg
| Setting | Misol |
|---------|-------|
| primaryColor | `#A4D316` (color picker) |
| secondaryColor | `#1B380B` |

### 🔵 Builder settings
| Setting | Misol |
|---------|-------|
| trackingRange | `8`, `10`, `80`, `150` (projectile) |
| updateInterval | `1`, `3` (default) |
| fireImmune | `true` (nether/boss mob) |
| canSpawnFarFromPlayer | `true` (boss) |
| isSummonable | `true`/`false` |
| isSaveable | `true`/`false` |

### 🔵 AI Goals (xulq tizimi)
**Goal Builder — priority + goal type + params:**
```
Priority 0: FloatGoal (suvda suzish)
Priority 1: PanicGoal (speed=1.25)
Priority 2: MeleeAttackGoal (speed=1.0, followingTargetEvenIfNotSeen=true)
Priority 3: WaterAvoidingRandomStrollGoal (speed=1.0)
Priority 4: LookAtPlayerGoal (range=8.0)
Priority 5: RandomLookAroundGoal
Target 1: HurtByTargetGoal
Target 2: NearestAttackableTargetGoal (target=Player)
```
**Mavjud vanilla goallar (dropdown):**
```
Float, Panic, Breed, Tempt, FollowParent, MeleeAttack, RangedAttack,
RangedBowAttack, WaterAvoidingRandomStroll, RandomStroll, LookAtPlayer,
RandomLookAround, Avoid, FollowOwner, Sit, Beg, MoveTowardsRestriction,
OpenDoor, LeapAtTarget, RestrictSun, FleeSun, MoveThroughVillage
```

### 🔵 Spawn Rules (tabiiy spawn)
| Setting | Misol |
|---------|-------|
| spawnBiomes | `#minecraft:is_forest`, `mymod:frost_biome` |
| spawnWeight | `10`, `100` |
| minGroupSize / maxGroupSize | `1` / `4` |
| spawnPlacement | `ON_GROUND`, `IN_WATER`, `NO_RESTRICTIONS` |
| heightmap | `MOTION_BLOCKING_NO_LEAVES` |
| lightLevel condition | `0-7` (monster), any (creature) |

### 🔵 Loot va xususiyatlar
| Setting | Misol |
|---------|-------|
| lootTable | drops (item + count + chance + looting bonus) |
| experienceReward | `5`, `50` (boss) |
| isBoss + bossBar | color (`PURPLE`), style (`NOTCHED_6`) |
| immuneToFire/Fall/Drown | bool listi |
| rideable / tameable / breedable | bool + breeding item |

### ⚙️ Generatsiya: entity class stub, renderer, model, loot table, spawn egg item, lang

---

## 4. ARMOR EDITOR + ARMOR MATERIAL

### 🟢 Armor Material (alohida material yaratish)
| Setting | Misol qiymatlar |
|---------|-----------------|
| materialId | `ruby`, `fiery` |
| durabilityMultiplier | `15`, `25`, `33` (netherite) |
| defense (helmet) | `3` |
| defense (chestplate) | `8` |
| defense (leggings) | `6` |
| defense (boots) | `3` |
| toughness | `0.0`, `2.0`, `3.0` |
| knockbackResistance | `0.0`, `0.1` |
| enchantmentValue | `9`, `15`, `10` (netherite) |
| equipSound | `item.armor.equip_diamond` |
| repairIngredient | item/tag |

### 🟢 Armor Item (har bir slot)
| Setting | Misol |
|---------|-------|
| slot | `helmet`/`chestplate`/`leggings`/`boots` |
| material | yuqorida yaratilgan material |
| armorTexture | layer1/layer2 PNG |
| isFireResistant | `true` (netherite-style) |

### 🔵 Set bonus (modlangan)
| Setting | Misol |
|---------|-------|
| fullSetEffect | `mymod:fiery → fire_resistance` |
| pieceEffect | har bir element uchun effekt |

---

## 5. TOOL EDITOR + TOOL MATERIAL

### 🟢 Tool Material
| Setting | Misol (vanilla referens) |
|---------|--------------------------|
| materialId | `ruby` |
| miningLevel/incorrectBlocksTag | `wood`/`stone`/`iron`/`diamond`/`netherite` |
| durability (uses) | `59` (gold), `1561` (diamond), `2031` (netherite) |
| miningSpeed | `2.0`, `8.0`, `12.0` |
| attackDamageBonus | `0`, `3`, `4` |
| enchantmentValue | `14`, `10`, `15` |
| repairIngredient | item/tag |

### 🟢 Tool tipiga qarab attribute (MUHIM — har tur alohida)
| Tool | attackDamage | attackSpeed | Misol |
|------|--------------|-------------|-------|
| Sword | +3 | -2.4 | `createAttributes(mat, 3, -2.4)` |
| Pickaxe | +1 | -2.8 | — |
| Axe | +6...+5 | -3.0/-3.1 | — |
| Shovel | +1.5 | -3.0 | — |
| Hoe | -mat | varies | — |

### 🔵 Maxsus qobiliyat (modlangan)
```
Fire (yondiradi), Ice (muzlatadi), Vein-mine (bir necha blok),
Auto-smelt (eritadi), Lifesteal, Glass (1 zarba/sinadi)
```

### ⚙️ Generatsiya: item class, attribute modifiers, model, recipe

---

## 6. RECIPE EDITOR

### 🟢 Recipe turlari
| Tur | Settingslar |
|-----|-------------|
| Shaped Crafting | 3x3 grid + ingredients + result + count |
| Shapeless Crafting | ingredient listi + result |
| Smelting (Furnace) | input + result + experience + cookTime(200) |
| Blasting | input + result + exp + cookTime(100) |
| Smoking | input + result + exp + cookTime(100) |
| Campfire | input + result + exp + cookTime(600) |
| Stonecutting | input + result + count |
| Smithing Transform | template + base + addition + result |
| Smithing Trim | template + base + addition |

### 🔵 Modlangan
| Setting | Misol |
|---------|-------|
| customRecipeType | `mymod:alloy_smelting` |
| ingredientTags | `#forge:ingots/copper` |
| conditions | `mod_loaded`, `tag_not_empty` |
| nbtIngredient | NBT bilan moslashtirilgan input |
| resultNbt | natijada NBT/component |

**Shaped misol:**
```json
{
  "pattern": ["XXX", "X#X", "XXX"],
  "key": { "X": {"item": "minecraft:diamond"}, "#": {"item": "minecraft:stick"} },
  "result": { "item": "mymod:magic_block", "count": 1 }
}
```

---

## 7. ENCHANTMENT EDITOR

### 🟢 + 🔵 To'liq settingslar
| Setting | Misol |
|---------|-------|
| enchantmentId | `frost_aspect` |
| maxLevel | `1`, `3`, `5` |
| rarity/weight | `COMMON(10)`, `UNCOMMON(5)`, `RARE(2)`, `VERY_RARE(1)` |
| category/supportedItems | `#minecraft:enchantable/sword`, `weapon`, `armor` |
| slots | `mainhand`, `armor` |
| minCost / maxCost | `1 + level*10` formula |
| isTreasure | `true` (faqat sandiqdan) |
| isCurse | `true` |
| isTradeable | `true` |
| isDiscoverable | `true` (enchant table) |
| incompatibleWith | `[sharpness, smite]` |
| effectType | `damage`, `protection`, `attribute`, `custom` |

**Effect misoli (mod):**
```
Frost Aspect:
  onHit → apply slowness (duration = level*40 ticks)
  damageBonus = level * 2.5
```

---

## 8. PARTICLE EDITOR (yangi)

### 🟢 + 🔵 Settingslar
| Setting | Misol |
|---------|-------|
| particleId | `magic_spark` |
| alwaysShow (overrideLimiter) | `false`/`true` |
| maxAge (ticks) | `20`, `60`, `100` |
| gravity | `0.0`, `0.3`, `1.0` |
| baseSize | `0.1`, `0.5`, `1.0` |
| color | `#FFD700` (gradient: start→end) |
| velocityX/Y/Z | `0.0`, `±0.1` |
| spread | `0.5` |
| collision | `true`/`false` |
| textureSheet | `OPAQUE`/`TRANSLUCENT`/`LIT` |
| animationFrames | sprite count |
| emitterShape | `Point`/`Sphere`/`Cube`/`Ring` |
| count | `1-50` |

### ⚙️ Generatsiya: particle JSON, client factory stub, texture

---

## 9. BIOME EDITOR

### 🟢 Climate
| Setting | Misol |
|---------|-------|
| temperature | `0.08` (snow), `0.8`, `2.0` (desert) |
| downfall | `0.0`, `0.5`, `1.0` |
| hasPrecipitation | `true`/`false` |
| temperatureModifier | `none`/`frozen` |

### 🟢 Ranglar (Effects)
| Setting | Misol |
|---------|-------|
| skyColor | `#78A7FF` |
| fogColor | `#C0D8FF` |
| waterColor | `#3F76E4` |
| waterFogColor | `#050533` |
| grassColor | `#91BD59` (yoki modifier) |
| foliageColor | `#77AB2F` |
| grassColorModifier | `none`/`dark_forest`/`swamp` |

### 🔵 Atmosfera
| Setting | Misol |
|---------|-------|
| ambientParticle | `minecraft:white_ash` + probability `0.118` |
| ambientSound | `minecraft:ambient.cave` |
| moodSound | `ambient.cave` + tickDelay + offset |
| additionsSound | random ambient |
| music | `music.overworld.forest` |

### 🔵 Generatsiya (Features)
| Setting | Misol |
|---------|-------|
| features (per step) | `VEGETAL_DECORATION → mymod:placed_ruby_tree` |
| carvers | `AIR → cave, canyon` |
| oreGeneration | ore + count + size + height range |
| treeGeneration | tree feature + density |

### 🔵 Mob Spawns
```
MONSTER:  zombie (weight=95, min=4, max=4), skeleton (weight=100, min=4, max=4)
CREATURE: frost_wolf (weight=10, min=1, max=2)
```

---

## 10. STRUCTURE EDITOR

### 🟢 + 🔵 Settingslar
| Setting | Misol |
|---------|-------|
| structureId | `frost_tower` |
| structureType | `jigsaw`/`single`/`custom` |
| startPool | `mymod:frost_tower/start` |
| size (jigsaw depth) | `1-7` |
| startHeight | `absolute(64)`, `uniform(0,128)` |
| projectStartToHeightmap | `WORLD_SURFACE_WG` |
| maxDistanceFromCenter | `80` |
| biomes (tag) | `#mymod:has_structure/frost_tower` |
| step (GenerationStep) | `surface_structures`, `underground_structures` |
| terrainAdaptation | `none`/`beard_thin`/`beard_box`/`bury`/`encapsulate` |
| spawnOverrides | mob category + spawn list |

### Structure Set (placement — alohida)
| Setting | Misol |
|---------|-------|
| placementType | `random_spread`/`concentric_rings` |
| spacing | `32` (chunk) |
| separation | `8` |
| salt | `165745296` (unique random seed) |
| frequency | `0.0-1.0` |

---

## 11. DIMENSION EDITOR

### 🟢 + 🔵 Settingslar
| Setting | Misol |
|---------|-------|
| dimensionId | `mymod:twilight` |
| hasSkylight | `true`/`false` |
| hasCeiling | `false` (overworld), `true` (nether) |
| ultrawarm | `false`/`true` (water bug'lanadi) |
| natural | `true` (compass ishlaydi) |
| coordinateScale | `1.0`, `8.0` (nether) |
| ambientLight | `0.0`, `0.1`, `0.15` |
| fixedTime | `none`, `18000` (doimo tun) |
| hasRaids | `true`/`false` |
| respawnAnchorWorks / bedWorks | bool |
| minY / height / logicalHeight | `-64` / `384` / `384` |
| infiniburn | `#minecraft:infiniburn_overworld` |
| effectsLocation | `overworld`/`nether`/`end`/custom |
| monsterSpawnLightLevel | `0-7` |
| biomeSource | `multi_noise`/`fixed`/`checkerboard` |
| chunkGenerator | `noise`/`flat`/`debug` |

---

## 12. LOOT TABLE EDITOR

### 🟢 + 🔵 Settingslar
```
type: block / entity / chest / fishing / gameplay / archaeology
pools[]:
  rolls: 1 / uniform(1,3) / binomial(n,p)
  bonusRolls: 0 / luck-based
  entries[]:
    type: item / tag / loot_table / dynamic / empty / alternatives / group
    weight: 10
    quality: 1 (luck ta'siri)
    functions[]: set_count, set_nbt, enchant_randomly, enchant_with_levels,
                 looting_enchant, set_damage, furnace_smelt, explosion_decay,
                 set_components, set_potion
    conditions[]: survives_explosion, killed_by_player, random_chance,
                  random_chance_with_looting, entity_properties, match_tool,
                  table_bonus, weather_check, time_check
```
**Misol (mob drop):**
```
entity loot:
  pool: rolls=1
    entry: item=mymod:frost_shard, count=uniform(1,3)
      functions: looting_enchant(0,1)
      conditions: random_chance_with_looting(0.5, 0.1)
```

---

## 13. ADVANCEMENT EDITOR

### 🟢 + 🔵 Settingslar
| Setting | Misol |
|---------|-------|
| advancementId | `mymod:enter_twilight` |
| parent | `mymod:root` |
| iconItem | `mymod:twilight_portal` |
| title / description | translation key |
| frameType | `task`/`goal`/`challenge` |
| background (root only) | `textures/block/dirt.png` |
| showToast / announceToChat / hidden | bool |
| criteria | trigger + conditions |
| requirements | AND/OR mantiq |
| rewards | exp, recipes[], loot[], function |

**Trigger turlari (dropdown):**
```
inventory_changed, killed_entity, entity_killed_player, location,
enter_block, consume_item, used_ender_eye, placed_block, recipe_unlocked,
changed_dimension, levitation, effects_changed, tick, impossible (manual),
custom_modded_trigger
```

---

## 14. SOUND EVENT EDITOR (yangi)

| Setting | Misol |
|---------|-------|
| soundId | `entity.frost_wolf.howl` |
| categoryPrefix | `entity`/`block`/`item`/`ambient`/`music`/`weather` |
| soundFiles | `[frost_wolf_howl1.ogg, ...2.ogg]` |
| subtitle | `subtitles.frost_wolf.howl` |
| volume / pitch | `1.0` / `1.0` (yoki random range) |
| weight | `1` (random tanlash) |
| stream | `true` (uzun musiqa) |
| attenuationDistance | `16` |
| category (mixer) | `MASTER`/`MUSIC`/`HOSTILE`/`AMBIENT`/`BLOCKS`/`PLAYERS` |

---

## 15. MOB EFFECT / POTION EDITOR (yangi)

### Mob Effect
| Setting | Misol |
|---------|-------|
| effectId | `frozen` |
| category | `BENEFICIAL`/`HARMFUL`/`NEUTRAL` |
| color | `#80C0FF` (particle) |
| isInstantenous | `false` |
| attributeModifiers | `movement_speed × -0.15 per level` |
| onTick behavior | har necha tick ta'sir |
| iconTexture | 18×18 GUI ikonka |

### Potion (effekt + idish)
| Setting | Misol |
|---------|-------|
| potionId | `frost_potion` |
| effects | effect + duration + amplifier |
| baseName | `frost` |
| brewingRecipe | base + ingredient + result |

---

## 16. CREATIVE TAB EDITOR

| Setting | Misol |
|---------|-------|
| tabId | `mymod:main` |
| title | translation key |
| iconItem | `mymod:ruby` |
| tabOrder (withTabsBefore/After) | boshqa tab key |
| displayItems | reorderable item ro'yxati |
| enchantedPreviews | item + enchant + level |
| autoSpawnEggs | `true` (barcha spawn egg) |
| searchBar | `true`/`false` |

---

## 17. DATA COMPONENT EDITOR (1.20.5+, yangi)

| Setting | Misol |
|---------|-------|
| componentId | `mymod:charge_level` |
| dataType | `Unit`/`Int`/`Float`/`String`/`Bool`/`Item`/`Block`/`UUID`/`Custom` |
| persistent | `true` (saqlanadi) |
| networkSynchronized | `true` (tarmoq) |
| cacheEncoding | `false` |
| defaultValue | `0` |

---

# UMUMIY TAVSIYA — PRIORITET REJASI

### 🔴 1-bosqich (eng muhim, vanilla parity):
1. **Block: render/physics settings** — renderType, pushReaction, instrument, flammable, slipperiness, collision shape
2. **Block subtype'lar** — Stairs/Slab/Wall/Fence/Door (1 blokdan auto)
3. **Item: attribute modifiers** — har qurol/armor uchun damage/speed/armor
4. **Tool & Armor Material editorlar** — durability, speed, defense, enchant, repair
5. **Entity: AI Goal Builder + Spawn Rules**

### 🟡 2-bosqich (mod boyligi):
6. **Particle editor** (to'liq render params)
7. **Sound Event editor**
8. **Mob Effect / Potion editor**
9. **Block State system** (facing, lit, age...)
10. **Block Entity** (inventory, GUI)
11. **Smithing recipe + custom recipe type**

### 🟢 3-bosqich (polishing):
12. **Data Component editor** (1.20.5+)
13. **Loot: alternatives, group, conditions kengaytirish**
14. **Biome: feature drag-drop per generation step**
15. **Creative Tab: ordering + enchanted preview**
16. **Dimension: fixedTime, infiniburn, custom effects**
17. **Advancement: custom trigger builder**

---
*Bu hujjat vanilla Minecraft + NeoForge/Forge modlash imkoniyatlari asosida tuzilgan. Referens: Twilight Forest 1.20.x manba kodi.*
