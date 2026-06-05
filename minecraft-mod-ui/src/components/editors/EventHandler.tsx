import { useState, type FC } from 'react';
import { Plus, Trash2, Zap, Code, Play, Copy, Check } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

export interface EventListener {
  id: string;
  eventType: string;
  methodName: string;
  priority: 'highest' | 'high' | 'normal' | 'low' | 'lowest';
  cancelable: boolean;
  receiveCanceled: boolean;
  side: 'both' | 'client' | 'server';
  description: string;
  code: string;
}

export interface CustomEvent {
  id: string;
  name: string;
  cancelable: boolean;
  hasResult: boolean;
  fields: EventField[];
  description: string;
}

export interface EventField {
  id: string;
  name: string;
  type: string;
  description: string;
}

interface EventHandlerProps {
  onSave?: (listeners: EventListener[], customEvents: CustomEvent[]) => void;
}

const EVENT_CATEGORIES: Record<string, string[]> = {
  'Entity Events': [
    'EntityJoinWorldEvent',
    'LivingDeathEvent',
    'LivingHurtEvent',
    'LivingDropsEvent',
    'LivingSpawnEvent',
    'PlayerEvent.PlayerLoggedInEvent',
    'PlayerEvent.PlayerLoggedOutEvent',
    'PlayerEvent.ItemPickupEvent',
    'PlayerInteractEvent',
    'AttackEntityEvent',
  ],
  'World Events': [
    'WorldEvent.Load',
    'WorldEvent.Unload',
    'WorldEvent.Save',
    'BlockEvent.BreakEvent',
    'BlockEvent.PlaceEvent',
    'BlockEvent.EntityPlaceEvent',
    'ExplosionEvent.Start',
    'ExplosionEvent.Detonate',
  ],
  'Server Events': [
    'ServerStartingEvent',
    'ServerStartedEvent',
    'ServerStoppingEvent',
    'ServerStoppedEvent',
    'RegisterCommandsEvent',
    'OnDatapackSyncEvent',
  ],
  'Item Events': [
    'ItemCraftedEvent',
    'ItemSmeltedEvent',
    'AnvilRepairEvent',
    'ItemTooltipEvent',
    'LivingEquipmentChangeEvent',
  ],
  'Tick Events': [
    'TickEvent.ServerTickEvent',
    'TickEvent.ClientTickEvent',
    'TickEvent.WorldTickEvent',
    'TickEvent.PlayerTickEvent',
  ],
  'Rendering (Client)': [
    'RenderLevelStageEvent',
    'RenderGuiOverlayEvent',
    'RenderPlayerEvent',
    'RenderNameTagEvent',
  ],
};

export const EventHandler: FC<EventHandlerProps> = ({ onSave }) => {
  const [listeners, setListeners] = useState<EventListener[]>([
    {
      id: 'listener_1',
      eventType: 'LivingHurtEvent',
      methodName: 'onLivingHurt',
      priority: 'normal',
      cancelable: false,
      receiveCanceled: false,
      side: 'both',
      description: 'Handle entity damage events',
      code: '',
    },
  ]);

  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'listeners' | 'custom'>('listeners');
  const [selectedListener, setSelectedListener] = useState<string | null>(listeners[0]?.id || null);
  const [copied, setCopied] = useState(false);

  // Listener handlers
  const handleAddListener = () => {
    const newListener: EventListener = {
      id: `listener_${Date.now()}`,
      eventType: 'PlayerInteractEvent',
      methodName: `onEvent_${listeners.length + 1}`,
      priority: 'normal',
      cancelable: false,
      receiveCanceled: false,
      side: 'both',
      description: '',
      code: '',
    };
    setListeners([...listeners, newListener]);
    setSelectedListener(newListener.id);
  };

  const handleRemoveListener = (id: string) => {
    const updated = listeners.filter(l => l.id !== id);
    setListeners(updated);
    if (selectedListener === id) {
      setSelectedListener(updated[0]?.id || null);
    }
  };

  const handleUpdateListener = (id: string, field: keyof EventListener, value: any) => {
    setListeners(listeners.map(l =>
      l.id === id ? { ...l, [field]: value } : l
    ));
  };

  // Custom event handlers
  const handleAddCustomEvent = () => {
    setCustomEvents([
      ...customEvents,
      {
        id: `event_${Date.now()}`,
        name: 'CustomModEvent',
        cancelable: false,
        hasResult: false,
        fields: [],
        description: '',
      },
    ]);
  };

  const handleRemoveCustomEvent = (id: string) => {
    setCustomEvents(customEvents.filter(e => e.id !== id));
  };

  const handleUpdateCustomEvent = (id: string, field: keyof CustomEvent, value: any) => {
    setCustomEvents(customEvents.map(e =>
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const handleAddField = (eventId: string) => {
    setCustomEvents(customEvents.map(e =>
      e.id === eventId
        ? { ...e, fields: [...e.fields, { id: `field_${Date.now()}`, name: '', type: 'String', description: '' }] }
        : e
    ));
  };

  const handleRemoveField = (eventId: string, fieldId: string) => {
    setCustomEvents(customEvents.map(e =>
      e.id === eventId
        ? { ...e, fields: e.fields.filter(f => f.id !== fieldId) }
        : e
    ));
  };

  const handleUpdateField = (eventId: string, fieldId: string, field: keyof EventField, value: string) => {
    setCustomEvents(customEvents.map(e =>
      e.id === eventId
        ? { ...e, fields: e.fields.map(f => f.id === fieldId ? { ...f, [field]: value } : f) }
        : e
    ));
  };

  const handleSave = () => {
    onSave?.(listeners, customEvents);
  };

  // Generate Java code
  const generateListenerCode = (): string => {
    let code = `package com.example.events;\n\n`;
    code += `import net.minecraftforge.eventbus.api.SubscribeEvent;\n`;
    code += `import net.minecraftforge.eventbus.api.EventPriority;\n`;
    code += `import net.minecraftforge.fml.common.Mod;\n\n`;

    // Import event classes
    const events = new Set(listeners.map(l => l.eventType));
    events.forEach(event => {
      code += `import net.minecraftforge.event.entity.living.${event};\n`;
    });

    code += `\n@Mod.EventBusSubscriber(modid = "examplemod")\npublic class ModEventHandler {\n\n`;

    listeners.forEach(listener => {
      if (listener.description) {
        code += `    /**\n     * ${listener.description}\n     */\n`;
      }
      code += `    @SubscribeEvent(priority = EventPriority.${listener.priority.toUpperCase()}`;
      if (listener.receiveCanceled) {
        code += `, receiveCanceled = true`;
      }
      code += `)\n`;
      code += `    public static void ${listener.methodName}(${listener.eventType} event) {\n`;
      if (listener.cancelable) {
        code += `        if (event.isCancelable()) {\n`;
        code += `            // Cancel logic here\n`;
        code += `            event.setCanceled(true);\n`;
        code += `        }\n`;
      }
      code += `        // Event handler logic\n`;
      if (listener.code) {
        code += `        ${listener.code}\n`;
      }
      code += `    }\n\n`;
    });

    code += `}\n`;
    return code;
  };

  const generateCustomEventCode = (): string => {
    if (customEvents.length === 0) return '// No custom events defined';

    let code = `package com.example.events;\n\n`;
    code += `import net.minecraftforge.eventbus.api.Event;\n\n`;

    customEvents.forEach(event => {
      if (event.description) {
        code += `/**\n * ${event.description}\n */\n`;
      }
      if (event.cancelable) {
        code += `@Event.HasResult\n`;
      }
      code += `public class ${event.name} extends Event {\n\n`;

      // Fields
      event.fields.forEach(field => {
        code += `    private final ${field.type} ${field.name};\n`;
      });

      if (event.fields.length > 0) {
        code += `\n    public ${event.name}(${event.fields.map(f => `${f.type} ${f.name}`).join(', ')}) {\n`;
        event.fields.forEach(f => {
          code += `        this.${f.name} = ${f.name};\n`;
        });
        code += `    }\n\n`;

        // Getters
        event.fields.forEach(field => {
          code += `    public ${field.type} get${field.name.charAt(0).toUpperCase() + field.name.slice(1)}() {\n`;
          code += `        return this.${field.name};\n`;
          code += `    }\n\n`;
        });
      }

      if (event.cancelable) {
        code += `    @Override\n    public boolean isCancelable() {\n        return true;\n    }\n\n`;
      }

      code += `}\n`;
    });

    return code;
  };

  const handleCopyCode = async () => {
    const code = activeTab === 'listeners' ? generateListenerCode() : generateCustomEventCode();
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedListenerData = listeners.find(l => l.id === selectedListener);

  return (
    <div className="space-y-6">
      {/* Tab Toggle */}
      <div className="flex gap-2">
        <Button
          onClick={() => setActiveTab('listeners')}
          variant={activeTab === 'listeners' ? undefined : 'outline'}
          size="sm"
        >
          <Zap size={16} className="mr-2" />
          Event Listeners ({listeners.length})
        </Button>
        <Button
          onClick={() => setActiveTab('custom')}
          variant={activeTab === 'custom' ? undefined : 'outline'}
          size="sm"
        >
          <Code size={16} className="mr-2" />
          Custom Events ({customEvents.length})
        </Button>
      </div>

      {activeTab === 'listeners' && (
        <>
          {/* Listeners List */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Event Listeners</h3>
              <Button onClick={handleAddListener} size="sm">
                <Plus size={16} className="mr-2" />
                Add Listener
              </Button>
            </div>
            <div className="space-y-2">
              {listeners.map((listener) => (
                <div
                  key={listener.id}
                  onClick={() => setSelectedListener(listener.id)}
                  className={`p-3 rounded-md border-2 cursor-pointer transition text-sm ${
                    selectedListener === listener.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-medium">{listener.methodName}</span>
                      <span className="text-xs text-gray-500 ml-2">({listener.eventType})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        listener.priority === 'highest' ? 'bg-red-100 text-red-700' :
                        listener.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        listener.priority === 'low' ? 'bg-blue-100 text-blue-700' :
                        listener.priority === 'lowest' ? 'bg-gray-100 text-gray-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {listener.priority}
                      </span>
                      {listeners.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveListener(listener.id); }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Selected Listener Configuration */}
          {selectedListenerData && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Listener Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Method Name</label>
                  <input
                    type="text"
                    value={selectedListenerData.methodName}
                    onChange={(e) => handleUpdateListener(selectedListenerData.id, 'methodName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Event Type</label>
                  <select
                    value={selectedListenerData.eventType}
                    onChange={(e) => handleUpdateListener(selectedListenerData.id, 'eventType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                  >
                    {Object.entries(EVENT_CATEGORIES).map(([category, events]) => (
                      <optgroup key={category} label={category}>
                        {events.map(event => (
                          <option key={event} value={event}>{event}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <select
                    value={selectedListenerData.priority}
                    onChange={(e) => handleUpdateListener(selectedListenerData.id, 'priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                  >
                    <option value="highest">Highest</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                    <option value="lowest">Lowest</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Side</label>
                  <select
                    value={selectedListenerData.side}
                    onChange={(e) => handleUpdateListener(selectedListenerData.id, 'side', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                  >
                    <option value="both">Both</option>
                    <option value="client">Client Only</option>
                    <option value="server">Server Only</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedListenerData.cancelable} onChange={(e) => handleUpdateListener(selectedListenerData.id, 'cancelable', e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm"><strong>Cancel Event</strong> - Prevent default behavior</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedListenerData.receiveCanceled} onChange={(e) => handleUpdateListener(selectedListenerData.id, 'receiveCanceled', e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm"><strong>Receive Canceled</strong> - Still fire if already canceled</span>
                </label>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Description</label>
                <input
                  type="text"
                  value={selectedListenerData.description}
                  onChange={(e) => handleUpdateListener(selectedListenerData.id, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                  placeholder="What does this handler do?"
                />
              </div>
            </Card>
          )}
        </>
      )}

      {activeTab === 'custom' && (
        <>
          {/* Custom Events */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Custom Events</h3>
              <Button onClick={handleAddCustomEvent} size="sm">
                <Plus size={16} className="mr-2" />
                New Event
              </Button>
            </div>
            {customEvents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No custom events defined. Click "New Event" to create one.</p>
            ) : (
              <div className="space-y-4">
                {customEvents.map((event) => (
                  <div key={event.id} className="p-4 border border-gray-300 dark:border-gray-600 rounded-md">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Event Class Name</label>
                        <input
                          type="text"
                          value={event.name}
                          onChange={(e) => handleUpdateCustomEvent(event.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 font-mono text-sm"
                          placeholder="CustomModEvent"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                        <input
                          type="text"
                          value={event.description}
                          onChange={(e) => handleUpdateCustomEvent(event.id, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4 mb-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={event.cancelable} onChange={(e) => handleUpdateCustomEvent(event.id, 'cancelable', e.target.checked)} className="w-4 h-4 rounded" />
                        Cancelable
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={event.hasResult} onChange={(e) => handleUpdateCustomEvent(event.id, 'hasResult', e.target.checked)} className="w-4 h-4 rounded" />
                        Has Result
                      </label>
                    </div>

                    {/* Fields */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Fields</label>
                        <button
                          onClick={() => handleAddField(event.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          + Add Field
                        </button>
                      </div>
                      <div className="space-y-2">
                        {event.fields.map(field => (
                          <div key={field.id} className="flex gap-2">
                            <select
                              value={field.type}
                              onChange={(e) => handleUpdateField(event.id, field.id, 'type', e.target.value)}
                              className="w-28 px-2 py-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 text-xs"
                            >
                              <option value="String">String</option>
                              <option value="int">int</option>
                              <option value="float">float</option>
                              <option value="double">double</option>
                              <option value="boolean">boolean</option>
                              <option value="Entity">Entity</option>
                              <option value="Player">Player</option>
                              <option value="ItemStack">ItemStack</option>
                              <option value="BlockPos">BlockPos</option>
                              <option value="Level">Level</option>
                            </select>
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) => handleUpdateField(event.id, field.id, 'name', e.target.value)}
                              placeholder="fieldName"
                              className="flex-1 px-2 py-1 border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 text-xs font-mono"
                            />
                            <button
                              onClick={() => handleRemoveField(event.id, field.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveCustomEvent(event.id)}
                      className="w-full mt-3 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-sm flex items-center justify-center"
                    >
                      <Trash2 size={14} className="mr-1" /> Remove Event
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Generated Code */}
      <Card className="p-6 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Play size={20} className="mr-2" />
            Generated Java Code
          </h3>
          <Button onClick={handleCopyCode} size="sm" variant="outline">
            {copied ? <Check size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto whitespace-pre">
          {activeTab === 'listeners' ? generateListenerCode() : generateCustomEventCode()}
        </div>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} className="w-full">
        Save Event Configuration
      </Button>
    </div>
  );
};
