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
          className="h-10 w-auto object-contain"
        />
      </motion.div>
    </motion.div>
  );
};
