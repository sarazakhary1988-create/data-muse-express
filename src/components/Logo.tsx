import { motion } from 'framer-motion';
import orkestraIcon from '@/assets/orkestra-icon.png';

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
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <img 
          src={orkestraIcon} 
          alt="ORKESTRA" 
          className="h-10 w-10 object-contain drop-shadow-lg rounded-lg"
        />
      </motion.div>
      
      <div className="flex flex-col">
        <span 
          className="text-xl font-bold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(280, 70%, 50%) 25%, hsl(200, 80%, 50%) 50%, hsl(173, 80%, 40%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          ORKESTRA
        </span>
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
