import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export const Logo = () => {
  return (
    <motion.div 
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30"
        whileHover={{ scale: 1.05, rotate: 5 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Sparkles className="w-5 h-5 text-primary-foreground" />
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent"
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ filter: 'blur(8px)' }}
        />
      </motion.div>
      <div className="flex flex-col">
        <span className="text-xl font-bold tracking-tight gradient-text">NexusAI</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Research Engine</span>
      </div>
    </motion.div>
  );
};
