/**
 * Editor connectors — bridge legacy single-asset editors to the project store.
 *
 * The editors in src/components/editors use their own local types (Recipe,
 * Entity, Enchantment, Biome, Advancement) which differ from the canonical
 * types in src/types. Until those are unified, these connectors:
 *  - render the editor with its onSave callback
 *  - emit a console log via the project store on save
 *  - keep the editor functional in the dock layout
 */
import { useCallback, type FC } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import {
  RecipeEditor, EntityEditor, EnchantmentEditor, BiomeEditor, AdvancementEditor,
} from '../editors';

function useSaveLogger(assetType: string) {
  const { addConsoleMessage } = useProjectStore();
  return useCallback(
    (asset: { id?: string | number; display_name?: string; name?: string }) => {
      const label = asset.display_name || asset.name || String(asset.id) || 'unnamed';
      addConsoleMessage({
        id: `msg-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        level: 'success',
        message: `${assetType} saved: ${label}`,
        source: assetType,
      });
    },
    [addConsoleMessage, assetType]
  );
}

export const ConnectedRecipeEditor: FC = () => {
  const onSave = useSaveLogger('Recipe');
  return <RecipeEditor onSave={onSave as never} />;
};

export const ConnectedEntityEditor: FC = () => {
  const onSave = useSaveLogger('Entity');
  return <EntityEditor onSave={onSave as never} />;
};

export const ConnectedEnchantmentEditor: FC = () => {
  const onSave = useSaveLogger('Enchantment');
  return <EnchantmentEditor onSave={onSave as never} />;
};

export const ConnectedBiomeEditor: FC = () => {
  const onSave = useSaveLogger('Biome');
  return <BiomeEditor onSave={onSave as never} />;
};

export const ConnectedAdvancementEditor: FC = () => {
  const onSave = useSaveLogger('Advancement');
  return <AdvancementEditor onSave={onSave as never} />;
};
