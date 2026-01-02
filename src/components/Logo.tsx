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
        className="relative group"
        whileHover={{ scale: 1.05, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-xl opacity-0 group-hover:opacity-60 blur-md transition-all duration-500 animate-pulse" />
        
        {/* Icon with mesh gradient overlay */}
        <div className="relative">
          <img 
            src={orkestraLogo} 
            alt="ORKESTRA" 
            className="h-10 w-10 object-contain relative z-10 drop-shadow-lg"
          />
          {/* Animated ring on hover */}
          <motion.div 
            className="absolute -inset-0.5 rounded-lg border-2 border-primary/30 opacity-0 group-hover:opacity-100"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </motion.div>
      
      <div className="flex flex-col">
        <motion.span 
          className="text-xl font-bold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(280, 70%, 50%) 25%, hsl(200, 80%, 50%) 50%, hsl(173, 80%, 40%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
          whileHover={{ scale: 1.02 }}
        >
          ORKESTRA
        </motion.span>
        <span 
          className="text-[10px] -mt-0.5 tracking-wider uppercase font-medium"
          style={{
            background: 'linear-gradient(90deg, hsl(262, 60%, 55%) 0%, hsl(200, 70%, 50%) 50%, hsl(173, 70%, 45%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Autonomous Research Engine
        </span>
      </div>
    </motion.div>
  );
};
