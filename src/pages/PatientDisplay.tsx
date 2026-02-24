import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Power, Wifi, WifiOff } from 'lucide-react';
import Peer, { DataConnection } from 'peerjs';

interface Instruction {
  id: string;
  name: string;
  media: ArrayBuffer | null;
  media_type: string | null;
  bg_color: string;
}

interface Props {
  onBack: () => void;
}

export default function PatientDisplay({ onBack }: Props) {
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [peerId, setPeerId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  useEffect(() => {
    // Generate a random 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const fullId = `radio-patient-${code}`;
    setPeerId(code);

    const peer = new Peer(fullId);
    peerRef.current = peer;

    peer.on('connection', (conn) => {
      connRef.current = conn;
      
      conn.on('open', () => {
        setIsConnected(true);
      });

      conn.on('data', (data: any) => {
        if (data.type === 'instruction') {
          setInstruction(data.payload);
        } else if (data.type === 'clear') {
          setInstruction(null);
        }
      });

      conn.on('close', () => {
        setIsConnected(false);
        setInstruction(null);
      });
    });

    return () => {
      peer.destroy();
    };
  }, []);

  // Handle media URL creation
  useEffect(() => {
    if (instruction?.media) {
      const blob = new Blob([instruction.media], { type: instruction.media_type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      setMediaUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setMediaUrl(null);
    }
  }, [instruction]);

  // Hide controls after 3 seconds of inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900 overflow-hidden flex flex-col font-sans">
      {/* Hidden controls for exiting patient mode */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-start"
          >
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
              {isConnected ? 'Connecté à la console' : 'En attente de connexion...'}
            </div>
            <button 
              onClick={onBack}
              className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"
            >
              <Power size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {instruction ? (
          <motion.div
            key={instruction.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-900"
          >
            {mediaUrl && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="mb-12 max-w-4xl w-full aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black/40 backdrop-blur-sm border border-white/10"
              >
                {instruction.media_type?.startsWith('video/') ? (
                  <video 
                    src={mediaUrl} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img 
                    src={mediaUrl} 
                    alt={instruction.name}
                    className="w-full h-full object-contain"
                  />
                )}
              </motion.div>
            )}
            
            {/* Only show name if it's not just a number, or if there's no media */}
            {(!mediaUrl || isNaN(Number(instruction.name))) && (
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.8 }}
                className="text-5xl md:text-7xl lg:text-8xl font-semibold text-white text-center leading-tight tracking-tight drop-shadow-lg"
              >
                {instruction.name}
              </motion.h1>
            )}
            
            {!mediaUrl && (
              <motion.div 
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
                className="mt-16 w-32 h-32 rounded-full border-4 border-blue-500/30 flex items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full bg-blue-500/20" />
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-900"
          >
            {!isConnected && (
              <div className="absolute top-1/4 flex flex-col items-center">
                <p className="text-slate-400 mb-4 uppercase tracking-widest text-sm font-semibold">Code de connexion</p>
                <div className="text-7xl font-mono font-bold text-white tracking-widest bg-white/5 px-12 py-6 rounded-3xl border border-white/10">
                  {peerId}
                </div>
                <p className="text-slate-500 mt-6 text-center max-w-md">
                  Entrez ce code sur la console radiologue pour lier cet écran.
                </p>
              </div>
            )}

            <motion.div 
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="w-64 h-64 rounded-full bg-blue-500/10 blur-3xl absolute"
            />
            {isConnected && (
              <h1 className="text-4xl md:text-5xl font-light text-slate-500 text-center relative z-10">
                Veuillez patienter pour les instructions
              </h1>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
