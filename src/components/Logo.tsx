import { motion } from 'framer-motion';
import orkestraLogo from '@/assets/orkestra-logo.png';

export const Logo = () => {
  return (
    <motion.div 
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="relative"
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <img 
          src={orkestraLogo} 
          alt="ORKESTRA - Autonomous Research Engine" 
          className="h-9 w-9 object-contain"
        />
      </motion.div>
      <div className="flex flex-col">
        <span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          ORKESTRA
        </span>
        <span className="text-[10px] text-muted-foreground -mt-0.5 tracking-wide">
          Autonomous Research Engine
        </span>
      </div>
    </motion.div>
  );
};
