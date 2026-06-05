"""
Entity Models for Minecraft Mod Generator
Python ORM-style models for database schema mapping
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


# ============================================================
# ENUMS
# ============================================================

class ModLoaderType(Enum):
    FABRIC = "fabric"
    FORGE = "forge"
    NEOFORGE = "neoforge"


class MaterialType(Enum):
    STONE = "stone"
    DIRT = "dirt"
    WOOD = "wood"
    ORE = "ore"
    METAL = "metal"
    GLASS = "glass"
    FABRIC = "fabric"
    DECORATIVE = "decorative"
    OTHER = "other"


class RarityType(Enum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class RecipeType(Enum):
    SHAPED = "shaped"
    SHAPELESS = "shapeless"
    SMELTING = "smelting"
    SMOKING = "smoking"
    BLASTING = "blasting"
    CAMPFIRE = "campfire"
    STONECUTTING = "stonecutting"
    SMITHING = "smithing"


class EntityTypeEnum(Enum):
    HOSTILE = "hostile"
    PASSIVE = "passive"
    NEUTRAL = "neutral"
    BOSS = "boss"
    OTHER = "other"


class SpawnType(Enum):
    NATURAL = "natural"
    EGG = "egg"
    SPAWNER = "spawner"
    NONE = "none"


class PrecipitationType(Enum):
    RAIN = "rain"
    SNOW = "snow"
    NONE = "none"


class DimensionType(Enum):
    OVERWORLD = "overworld"
    NETHER = "nether"
    END = "end"
    CUSTOM = "custom"


class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class BuildStatus(Enum):
    SUCCESS = "success"
    FAILED = "failed"
    WARNING = "warning"


class AgentType(Enum):
    ARCHITECT = "architect"
    LOGIC = "logic"
    UI = "ui"
    REVIEWER = "reviewer"


class TaskType(Enum):
    CODE_GENERATION = "code_generation"
    FILE_CREATION = "file_creation"
    MODEL_CREATION = "model_creation"
    TEXTURE_GENERATION = "texture_generation"
    CONFIG_GENERATION = "config_generation"
    REVIEW = "review"
    OTHER = "other"


# ============================================================
# BASE MODELS
# ============================================================

@dataclass
class BaseModel:
    """Base model with common fields"""
    id: Optional[int] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}


# ============================================================
# PROJECT MODELS
# ============================================================

@dataclass
class Project(BaseModel):
    """Project model - Asosiy mod loyihasi"""
    name: str = ""
    description: Optional[str] = None
    minecraft_version: str = "1.20.1"
    mod_loader: ModLoaderType = ModLoaderType.FABRIC
    mod_version: str = "1.0.0"
    author: str = ""
    namespace: str = ""
    build_count: int = 0
    last_build_at: Optional[datetime] = None
    is_archived: bool = False

    def get_mod_identifier(self) -> str:
        """Get unique mod identifier"""
        return f"{self.namespace}-{self.mod_version}"


@dataclass
class ProjectSettings(BaseModel):
    """Project Settings model"""
    project_id: int = 0
    java_version: str = "17"
    gradle_version: str = "8.0"
    source_set_main: str = "src/main"
    source_set_test: str = "src/test"
    output_directory: str = "build/libs"
    enable_mixins: bool = False
    enable_access_transformer: bool = False
    enable_coremods: bool = False
    optimization_level: str = "balanced"


# ============================================================
# BLOCK MODELS
# ============================================================

@dataclass
class Block(BaseModel):
    """Block model - Blok parametrlari"""
    project_id: int = 0
    block_name: str = ""
    display_name: str = ""
    namespace: str = ""
    hardness: float = 1.5
    resistance: float = 6.0
    slipperiness: float = 0.6
    speed_factor: float = 1.0
    friction_factor: float = 0.4
    luminance: int = 0
    is_replaceable: bool = False
    is_solid: bool = True
    has_collision: bool = True
    is_full_block: bool = True
    has_gravity: bool = False
    is_flammable: bool = False
    flammability_level: int = 0
    fire_spreadability: int = 0
    can_be_hydrated: bool = False
    texture_top: Optional[str] = None
    texture_bottom: Optional[str] = None
    texture_side: Optional[str] = None
    texture_all: Optional[str] = None
    custom_model_data: Optional[int] = None
    material_type: MaterialType = MaterialType.STONE

    def get_block_registry_name(self) -> str:
        """Get block registry name"""
        return f"{self.namespace}:{self.block_name}"

    def get_hardness_info(self) -> Dict[str, float]:
        """Get block hardness information"""
        return {
            "hardness": self.hardness,
            "resistance": self.resistance,
            "mining_time": self.hardness * 30 if self.hardness >= 0 else 0
        }


# ============================================================
# ITEM MODELS
# ============================================================

@dataclass
class Item(BaseModel):
    """Item model - Item parametrlari"""
    project_id: int = 0
    item_name: str = ""
    display_name: str = ""
    namespace: str = ""
    max_stack_size: int = 64
    rarity: RarityType = RarityType.COMMON
    is_enchantable: bool = True
    is_consumable: bool = False
    food_nutrition: Optional[int] = None
    food_saturation: Optional[float] = None
    is_weapon: bool = False
    is_armor: bool = False
    is_tool: bool = False
    durability: Optional[int] = None
    attack_damage: Optional[float] = None
    attack_speed: float = 4.0
    texture_path: Optional[str] = None
    custom_model_data: Optional[int] = None

    def get_item_registry_name(self) -> str:
        """Get item registry name"""
        return f"{self.namespace}:{self.item_name}"

    def get_damage_info(self) -> Optional[Dict[str, float]]:
        """Get damage information if item is weapon"""
        if self.is_weapon and self.attack_damage:
            return {
                "attack_damage": self.attack_damage,
                "attack_speed": self.attack_speed,
                "damage_per_second": self.attack_damage * self.attack_speed / 20
            }
        return None


# ============================================================
# ENCHANTMENT MODELS
# ============================================================

@dataclass
class Enchantment(BaseModel):
    """Enchantment model - Muy'chiq parametrlari"""
    project_id: int = 0
    enchantment_name: str = ""
    display_name: str = ""
    namespace: str = ""
    description: Optional[str] = None
    max_level: int = 1
    is_treasure: bool = False
    is_curse: bool = False
    can_anvil_merge: bool = True
    anvil_cost: int = 1
    weight: int = 10

    def get_enchantment_registry_name(self) -> str:
        """Get enchantment registry name"""
        return f"{self.namespace}:{self.enchantment_name}"


# ============================================================
# RECIPE MODELS
# ============================================================

@dataclass
class RecipeIngredient(BaseModel):
    """Recipe Ingredient model"""
    recipe_id: int = 0
    item_id: Optional[int] = None
    block_id: Optional[int] = None
    tag_name: Optional[str] = None
    count: int = 1
    position: int = 0


@dataclass
class Recipe(BaseModel):
    """Recipe model - Retsept parametrlari"""
    project_id: int = 0
    recipe_name: str = ""
    output_item_id: Optional[int] = None
    output_block_id: Optional[int] = None
    output_count: int = 1
    recipe_type: RecipeType = RecipeType.SHAPED
    cook_time: Optional[int] = None
    experience: float = 0.0
    ingredients: List[RecipeIngredient] = field(default_factory=list)

    def get_recipe_json_format(self) -> Dict[str, Any]:
        """Get recipe in JSON format for Minecraft"""
        base = {
            "type": f"minecraft:{self.recipe_type.value}",
            "result": {
                "count": self.output_count
            }
        }
        if self.cook_time:
            base["cookingtime"] = self.cook_time
        if self.experience:
            base["experience"] = self.experience
        return base


# ============================================================
# ARMOR MODELS
# ============================================================

@dataclass
class ArmorType(BaseModel):
    """Armor Type model - Zirh tiplari"""
    project_id: int = 0
    armor_name: str = ""
    namespace: str = ""
    helmet_item_id: Optional[int] = None
    chestplate_item_id: Optional[int] = None
    leggings_item_id: Optional[int] = None
    boots_item_id: Optional[int] = None
    armor_value_total: int = 0
    toughness_value: float = 0.0
    knockback_resistance: float = 0.0
    durability: int = 100
    enchantability: int = 10
    repair_item_id: Optional[int] = None

    def get_armor_pieces(self) -> Dict[str, Optional[int]]:
        """Get all armor pieces"""
        return {
            "helmet": self.helmet_item_id,
            "chestplate": self.chestplate_item_id,
            "leggings": self.leggings_item_id,
            "boots": self.boots_item_id
        }

    def get_armor_values(self) -> Dict[str, float]:
        """Get armor protection values"""
        return {
            "total_armor": self.armor_value_total,
            "toughness": self.toughness_value,
            "knockback_resistance": self.knockback_resistance
        }


# ============================================================
# TOOL MODELS
# ============================================================

@dataclass
class ToolType(BaseModel):
    """Tool Type model - Asboblar"""
    project_id: int = 0
    tool_name: str = ""
    namespace: str = ""
    tool_item_id: int = 0
    tool_type: str = ""  # pickaxe, axe, shovel, hoe, sword, polearm
    harvest_level: int = 0
    harvest_speed: float = 1.0
    attack_damage: float = 0.0
    attack_speed: float = 4.0
    durability: int = 100
    enchantability: int = 10
    repair_item_id: Optional[int] = None

    def get_tool_stats(self) -> Dict[str, float]:
        """Get tool statistics"""
        return {
            "harvest_level": self.harvest_level,
            "harvest_speed": self.harvest_speed,
            "attack_damage": self.attack_damage,
            "attack_speed": self.attack_speed,
            "durability": self.durability
        }


# ============================================================
# ENTITY MODELS
# ============================================================

@dataclass
class EntityDrop(BaseModel):
    """Entity Drop model - Mob tarqatmalari"""
    entity_id: int = 0
    drop_item_id: Optional[int] = None
    drop_block_id: Optional[int] = None
    min_count: int = 1
    max_count: int = 1
    drop_chance: float = 1.0
    requires_player_kill: bool = True
    drop_level_bonus_multiplier: float = 0.0


@dataclass
class EntityType(BaseModel):
    """Entity Type model - Mob parametrlari"""
    project_id: int = 0
    entity_name: str = ""
    namespace: str = ""
    display_name: str = ""
    entity_type: EntityTypeEnum = EntityTypeEnum.PASSIVE
    max_health: float = 20.0
    armor_value: int = 0
    armor_toughness: float = 0.0
    knockback_resistance: float = 0.0
    attack_damage: Optional[float] = None
    attack_speed: float = 4.0
    movement_speed: float = 0.1
    follow_range: float = 16.0
    spawn_weight: Optional[int] = None
    spawn_type: SpawnType = SpawnType.NONE
    spawn_group: Optional[str] = None
    min_group_size: int = 1
    max_group_size: int = 1
    texture_path: Optional[str] = None
    model_path: Optional[str] = None
    drops: List[EntityDrop] = field(default_factory=list)

    def get_entity_registry_name(self) -> str:
        """Get entity registry name"""
        return f"{self.namespace}:{self.entity_name}"

    def get_health_info(self) -> Dict[str, float]:
        """Get health and armor information"""
        return {
            "max_health": self.max_health,
            "armor": self.armor_value,
            "armor_toughness": self.armor_toughness,
            "knockback_resistance": self.knockback_resistance
        }


# ============================================================
# WORLD MODELS
# ============================================================

@dataclass
class Biome(BaseModel):
    """Biome model - Oromlar"""
    project_id: int = 0
    biome_name: str = ""
    namespace: str = ""
    display_name: str = ""
    description: Optional[str] = None
    temperature: float = 0.8
    humidity: float = 0.4
    precipitation: PrecipitationType = PrecipitationType.RAIN
    grass_color_rgb: Optional[str] = None
    foliage_color_rgb: Optional[str] = None
    water_color_rgb: Optional[str] = None
    sky_color_rgb: Optional[str] = None
    fog_color_rgb: Optional[str] = None
    ambient_mood_sound: Optional[str] = None
    music_track: Optional[str] = None

    def get_biome_registry_name(self) -> str:
        """Get biome registry name"""
        return f"{self.namespace}:{self.biome_name}"


@dataclass
class Dimension(BaseModel):
    """Dimension model - O'lchamlar"""
    project_id: int = 0
    dimension_name: str = ""
    namespace: str = ""
    display_name: str = ""
    description: Optional[str] = None
    dimension_type: DimensionType = DimensionType.CUSTOM
    is_natural: bool = False
    has_ceiling: bool = False
    ultra_warm: bool = False
    has_raids: bool = False
    respawn_anchor_works: bool = False
    bed_works: bool = True
    has_skylight: bool = True
    has_fixed_time: bool = False
    fixed_time: Optional[int] = None
    piglin_safe: bool = False

    def get_dimension_registry_name(self) -> str:
        """Get dimension registry name"""
        return f"{self.namespace}:{self.dimension_name}"


# ============================================================
# AI AGENT MODELS
# ============================================================

@dataclass
class AgentTask(BaseModel):
    """Agent Task model - AI agentning vazifasi"""
    project_id: int = 0
    task_type: TaskType = TaskType.CODE_GENERATION
    agent_type: AgentType = AgentType.LOGIC
    input_data: str = ""
    output_data: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    error_message: Optional[str] = None
    retry_count: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    def mark_started(self):
        """Mark task as started"""
        self.status = TaskStatus.IN_PROGRESS
        self.started_at = datetime.now()

    def mark_completed(self, output: str):
        """Mark task as completed"""
        self.status = TaskStatus.COMPLETED
        self.output_data = output
        self.completed_at = datetime.now()

    def mark_failed(self, error: str):
        """Mark task as failed"""
        self.status = TaskStatus.FAILED
        self.error_message = error
        self.completed_at = datetime.now()
        self.retry_count += 1


# ============================================================
# BUILD MODELS
# ============================================================

@dataclass
class BuildLog(BaseModel):
    """Build Log model - Qurish loglari"""
    project_id: int = 0
    build_number: int = 0
    status: BuildStatus = BuildStatus.SUCCESS
    log_content: str = ""
    error_summary: Optional[str] = None
    warnings_count: int = 0
    errors_count: int = 0
    build_time_ms: Optional[int] = None

    def is_successful(self) -> bool:
        """Check if build was successful"""
        return self.status == BuildStatus.SUCCESS

    def get_summary(self) -> Dict[str, Any]:
        """Get build summary"""
        return {
            "build_number": self.build_number,
            "status": self.status.value,
            "errors": self.errors_count,
            "warnings": self.warnings_count,
            "duration_ms": self.build_time_ms
        }


# ============================================================
# DEPENDENCY MODELS
# ============================================================

@dataclass
class ProjectDependency(BaseModel):
    """Project Dependency model - Loyihaning bog'lanishlari"""
    project_id: int = 0
    dependency_name: str = ""
    dependency_type: str = "lib"  # lib, mod, gradle_plugin
    version: str = ""
    repository: Optional[str] = None
    is_optional: bool = False

    def get_gradle_declaration(self) -> str:
        """Get Gradle declaration for this dependency"""
        if self.dependency_type == "gradle_plugin":
            return f'id "{self.dependency_name}" version "{self.version}"'
        else:
            return f'"{self.dependency_name}:{self.version}"'
