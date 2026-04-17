import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Settings, Plus, Power, Wifi, WifiOff, X, Image as ImageIcon, Video, Edit2, Trash2, ChevronDown, ChevronUp, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Scenario {
  id: string;
  name: string;
}

interface Instruction {
  id: string;
  scenario_id: string;
  name: string;
  media_url: string | null;
  media_type: string | null;
  bg_color: string;
}

interface Props {
  socket: Socket | null;
  onBack: () => void;
}

export default function StaffDashboard({ socket, onBack }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [instructionsByScenario, setInstructionsByScenario] = useState<Record<string, Instruction[]>>({});
  
  const [patientConnected, setPatientConnected] = useState(false);
  
  // View state
  const [viewMode, setViewMode] = useState<'list' | 'session' | 'edit'>('list');
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);
  
  // Session state
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Edit state
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [showNewScenario, setShowNewScenario] = useState(false);
  
  // Delete confirmation state
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);
  const [instructionToDelete, setInstructionToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchScenarios();

    if (socket) {
      socket.on('patient_status', (data) => {
        setPatientConnected(data.connected);
      });

      socket.on('scenarios_updated', () => {
        fetchScenarios();
      });

      socket.on('instructions_updated', () => {
        fetchScenarios(); // Re-fetch everything to keep it simple
      });
    }

    return () => {
      if (socket) {
        socket.off('patient_status');
        socket.off('scenarios_updated');
        socket.off('instructions_updated');
      }
    };
  }, [socket]);

  const fetchScenarios = async () => {
    const res = await fetch('/api/scenarios');
    const data: Scenario[] = await res.json();
    setScenarios(data);
    
    // Fetch instructions for all scenarios
    const instMap: Record<string, Instruction[]> = {};
    for (const scenario of data) {
      const instRes = await fetch(`/api/scenarios/${scenario.id}/instructions`);
      instMap[scenario.id] = await instRes.json();
    }
    setInstructionsByScenario(instMap);
  };

  const startSession = (scenarioId: string) => {
    setActiveScenarioId(scenarioId);
    setCurrentStepIndex(0);
    setViewMode('session');
    
    const instructions = instructionsByScenario[scenarioId] || [];
    if (instructions.length > 0) {
      socket?.emit('send_instruction', instructions[0]);
    }
  };

  const endSession = () => {
    setActiveScenarioId(null);
    setCurrentStepIndex(0);
    setViewMode('list');
    socket?.emit('clear_instruction');
  };

  const goToStep = (index: number) => {
    if (!activeScenarioId) return;
    const instructions = instructionsByScenario[activeScenarioId] || [];
    if (index >= 0 && index < instructions.length) {
      setCurrentStepIndex(index);
      socket?.emit('send_instruction', instructions[index]);
    }
  };

  const handleCreateScenario = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await fetch('/api/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        stepsCount: formData.get('stepsCount'),
      }),
    });
    await res.json();
    setShowNewScenario(false);
    fetchScenarios();
  };

  const handleDeleteScenario = (id: string) => {
    setScenarioToDelete(id);
  };

  const confirmDeleteScenario = async () => {
    if (!scenarioToDelete) return;
    await fetch(`/api/scenarios/${scenarioToDelete}`, { method: 'DELETE' });
    if (editingScenarioId === scenarioToDelete) {
      setEditingScenarioId(null);
      setViewMode('list');
    }
    setScenarioToDelete(null);
    fetchScenarios();
  };

  const handleSaveInstruction = async (e: React.FormEvent<HTMLFormElement>, instructionId?: string, scenarioId?: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (instructionId) {
      await fetch(`/api/instructions/${instructionId}`, {
        method: 'PUT',
        body: formData,
      });
    } else if (scenarioId) {
      const res = await fetch(`/api/scenarios/${scenarioId}/instructions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          bg_color: 'bg-slate-900', // Default dark theme for patient
        }),
      });
      const newInst = await res.json();
      const file = formData.get('media') as File;
      if (file && file.size > 0) {
        const updateData = new FormData();
        updateData.append('media', file);
        await fetch(`/api/instructions/${newInst.id}`, {
          method: 'PUT',
          body: updateData,
        });
      }
    }
    fetchScenarios();
    (e.target as HTMLFormElement).reset();
  };

  const handleDeleteInstruction = (id: string) => {
    setInstructionToDelete(id);
  };

  const confirmDeleteInstruction = async () => {
    if (!instructionToDelete) return;
    await fetch(`/api/instructions/${instructionToDelete}`, { method: 'DELETE' });
    setInstructionToDelete(null);
    fetchScenarios();
  };

  // Render Session View
  if (viewMode === 'session' && activeScenarioId) {
    const instructions = instructionsByScenario[activeScenarioId] || [];
    const currentInst = instructions[currentStepIndex];
    const scenario = scenarios.find(s => s.id === activeScenarioId);

    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <button onClick={endSession} className="text-slate-500 font-medium flex items-center gap-2">
            <X size={20} /> Terminer
          </button>
          <div className="text-sm font-medium text-slate-400">
            {currentStepIndex + 1} / {instructions.length}
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${patientConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {patientConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <p className="text-sm text-slate-400 uppercase tracking-widest mb-4">{scenario?.name}</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 leading-tight">
            {currentInst?.name || `Étape ${currentStepIndex + 1}`}
          </h2>
          {currentInst?.media_url && (
            <div className="mt-8 px-4 py-2 bg-slate-50 rounded-full text-sm text-slate-500 flex items-center gap-2">
              {currentInst.media_type === 'video' ? <Video size={16} /> : <ImageIcon size={16} />}
              Média affiché
            </div>
          )}
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <button
            onClick={() => goToStep(currentStepIndex - 1)}
            disabled={currentStepIndex === 0}
            className="py-6 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:active:scale-100 rounded-3xl flex flex-col items-center justify-center gap-2 transition-colors active:scale-95 text-slate-700 font-medium"
          >
            <ChevronLeft size={32} />
            Précédent
          </button>
          <button
            onClick={() => goToStep(currentStepIndex + 1)}
            disabled={currentStepIndex === instructions.length - 1}
            className="py-6 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:active:scale-100 rounded-3xl flex flex-col items-center justify-center gap-2 transition-colors active:scale-95 text-white font-medium shadow-sm"
          >
            <ChevronRight size={32} />
            Suivant
          </button>
        </div>
      </div>
    );
  }

  // Render Edit View
  if (viewMode === 'edit' && editingScenarioId) {
    const scenario = scenarios.find(s => s.id === editingScenarioId);
    const instructions = instructionsByScenario[editingScenarioId] || [];

    const appendNewStep = async () => {
      await fetch(`/api/scenarios/${editingScenarioId}/instructions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Étape ${instructions.length + 1}`,
          bg_color: 'bg-slate-900',
        }),
      });
      fetchScenarios();
    };

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10">
          <button onClick={() => setViewMode('list')} className="p-2 -ml-2 text-slate-500">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-semibold text-slate-900 truncate px-4">{scenario?.name}</h1>
          <button onClick={() => handleDeleteScenario(editingScenarioId)} className="p-2 -mr-2 text-rose-500">
            <Trash2 size={20} />
          </button>
        </header>

        <div className="flex-1 p-4 space-y-4 pb-32">
          {instructions.map((inst, index) => (
            <div key={inst.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-slate-400">Étape {index + 1}</span>
                <button onClick={() => handleDeleteInstruction(inst.id)} className="text-rose-400 p-1">
                  <Trash2 size={18} />
                </button>
              </div>
              <form onSubmit={(e) => handleSaveInstruction(e, inst.id)} className="space-y-4">
                <input 
                  name="name"
                  defaultValue={inst.name}
                  className="w-full text-lg font-medium text-slate-900 placeholder:text-slate-300 outline-none"
                  placeholder="Texte de l'instruction"
                />
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex-1">
                    {inst.media_url ? (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        {inst.media_type === 'video' ? <Video size={16} /> : <ImageIcon size={16} />}
                        Média attaché
                        <label className="ml-4 flex items-center gap-1 text-rose-500 cursor-pointer">
                          <input type="checkbox" name="remove_media" value="true" className="rounded" />
                          Retirer
                        </label>
                      </div>
                    ) : (
                      <input 
                        type="file" 
                        name="media" 
                        accept="image/*,video/*"
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-600"
                      />
                    )}
                  </div>
                  <button type="submit" className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-full">
                    Sauver
                  </button>
                </div>
              </form>
            </div>
          ))}
        </div>

        <div className="fixed bottom-6 right-6 z-20">
          <button
            onClick={appendNewStep}
            className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-full shadow-lg active:scale-95 transition-transform font-medium"
          >
            <Plus size={20} />
            Ajouter
          </button>
        </div>

        {/* Delete Confirmation Modal for Edit View */}
        <AnimatePresence>
          {scenarioToDelete && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center"
              >
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Supprimer le scénario ?</h3>
                <p className="text-slate-500 mb-8">Cette action supprimera également toutes les étapes associées. Cette action est irréversible.</p>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setScenarioToDelete(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-medium active:scale-[0.98] transition-transform"
                  >
                    Annuler
                  </button>
                  <button 
                    type="button"
                    onClick={confirmDeleteScenario}
                    className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-medium active:scale-[0.98] transition-transform"
                  >
                    Supprimer
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {instructionToDelete && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center"
              >
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Supprimer l'étape ?</h3>
                <p className="text-slate-500 mb-8">Cette action est irréversible.</p>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setInstructionToDelete(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-medium active:scale-[0.98] transition-transform"
                  >
                    Annuler
                  </button>
                  <button 
                    type="button"
                    onClick={confirmDeleteInstruction}
                    className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-medium active:scale-[0.98] transition-transform"
                  >
                    Supprimer
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Render List View
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
            <Power size={20} className="text-slate-500" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Scénarios</h1>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${patientConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {patientConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {patientConnected ? 'Connecté' : 'Déconnecté'}
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {scenarios.map(scenario => {
          const instructions = instructionsByScenario[scenario.id] || [];
          const isExpanded = expandedScenarioId === scenario.id;

          return (
            <div key={scenario.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div 
                className="p-5 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedScenarioId(isExpanded ? null : scenario.id)}
              >
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{scenario.name}</h3>
                  <p className="text-sm text-slate-500">{instructions.length} étapes</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScenario(scenario.id);
                    }}
                    className="w-10 h-10 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      startSession(scenario.id);
                    }}
                    className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                  >
                    <Play size={20} className="ml-1" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-100 bg-slate-50/50"
                  >
                    <div className="p-5 space-y-3">
                      {instructions.map((inst, idx) => (
                        <div key={inst.id} className="flex items-center gap-3 text-slate-700">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-sm font-medium truncate">{inst.name}</span>
                          {inst.media_url && <ImageIcon size={14} className="text-slate-400 shrink-0" />}
                        </div>
                      ))}
                      <div className="pt-4 mt-2 border-t border-slate-200 flex justify-end">
                        <button 
                          onClick={() => {
                            setEditingScenarioId(scenario.id);
                            setViewMode('edit');
                          }}
                          className="text-sm font-medium text-blue-600 flex items-center gap-1 px-4 py-2 bg-blue-50 rounded-full"
                        >
                          <Edit2 size={16} />
                          Modifier les étapes
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </main>

      <div className="fixed bottom-6 right-6 z-20">
        <button
          onClick={() => setShowNewScenario(true)}
          className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* New Scenario Modal */}
      <AnimatePresence>
        {showNewScenario && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Nouveau Scénario</h3>
                <button onClick={() => setShowNewScenario(false)} className="p-2 -mr-2 text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCreateScenario} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nom du scénario</label>
                  <input 
                    name="name"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                    placeholder="ex: Thorax de face debout"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombre d'étapes initiales</label>
                  <input 
                    type="number"
                    name="stepsCount"
                    min="1"
                    max="20"
                    defaultValue="4"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-medium text-lg active:scale-[0.98] transition-transform"
                >
                  Créer
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modals */}
      <AnimatePresence>
        {scenarioToDelete && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Supprimer le scénario ?</h3>
              <p className="text-slate-500 mb-8">Cette action supprimera également toutes les étapes associées. Cette action est irréversible.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setScenarioToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-medium active:scale-[0.98] transition-transform"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmDeleteScenario}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-medium active:scale-[0.98] transition-transform"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {instructionToDelete && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Supprimer l'étape ?</h3>
              <p className="text-slate-500 mb-8">Cette action est irréversible.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setInstructionToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-medium active:scale-[0.98] transition-transform"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmDeleteInstruction}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-medium active:scale-[0.98] transition-transform"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
