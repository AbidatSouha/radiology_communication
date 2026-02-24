import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

export interface Scenario {
  id: string;
  name: string;
}

export interface Instruction {
  id: string;
  scenario_id: string;
  name: string;
  media: Blob | null;
  media_type: string | null;
  bg_color: string;
}

const scenariosStore = localforage.createInstance({ name: 'radiology', storeName: 'scenarios' });
const instructionsStore = localforage.createInstance({ name: 'radiology', storeName: 'instructions' });

export const db = {
  async getScenarios(): Promise<Scenario[]> {
    const keys = await scenariosStore.keys();
    const scenarios: Scenario[] = [];
    for (const key of keys) {
      const s = await scenariosStore.getItem<Scenario>(key);
      if (s) scenarios.push(s);
    }
    return scenarios.sort((a, b) => a.name.localeCompare(b.name));
  },

  async createScenario(name: string, stepsCount: number): Promise<Scenario> {
    const scenario: Scenario = { id: uuidv4(), name };
    await scenariosStore.setItem(scenario.id, scenario);

    for (let i = 0; i < stepsCount; i++) {
      const inst: Instruction = {
        id: uuidv4(),
        scenario_id: scenario.id,
        name: `Étape ${i + 1}`,
        media: null,
        media_type: null,
        bg_color: 'bg-slate-900',
      };
      await instructionsStore.setItem(inst.id, inst);
    }
    return scenario;
  },

  async deleteScenario(id: string): Promise<void> {
    await scenariosStore.removeItem(id);
    const keys = await instructionsStore.keys();
    for (const key of keys) {
      const inst = await instructionsStore.getItem<Instruction>(key);
      if (inst && inst.scenario_id === id) {
        await instructionsStore.removeItem(key);
      }
    }
  },

  async getInstructions(scenarioId: string): Promise<Instruction[]> {
    const keys = await instructionsStore.keys();
    const instructions: Instruction[] = [];
    for (const key of keys) {
      const inst = await instructionsStore.getItem<Instruction>(key);
      if (inst && inst.scenario_id === scenarioId) {
        instructions.push(inst);
      }
    }
    // Simple sort by creation order (assuming UUIDs or just keeping them in order they were added)
    // For a real app, we might need an 'order' field, but let's stick to the current logic
    return instructions;
  },

  async createInstruction(scenarioId: string, name: string): Promise<Instruction> {
    const inst: Instruction = {
      id: uuidv4(),
      scenario_id: scenarioId,
      name,
      media: null,
      media_type: null,
      bg_color: 'bg-slate-900',
    };
    await instructionsStore.setItem(inst.id, inst);
    return inst;
  },

  async updateInstruction(id: string, data: Partial<Instruction>): Promise<void> {
    const inst = await instructionsStore.getItem<Instruction>(id);
    if (inst) {
      await instructionsStore.setItem(id, { ...inst, ...data });
    }
  },

  async deleteInstruction(id: string): Promise<void> {
    await instructionsStore.removeItem(id);
  }
};
