import { motion } from 'framer-motion';
import { Globe, Search, Zap, FileText, Database, Sparkles } from 'lucide-react';

export const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <motion.div
        className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/20 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/20 blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      
      {/* Floating icons */}
      <FloatingIcon icon={Globe} delay={0} x={80} y={20} />
      <FloatingIcon icon={Search} delay={1} x={20} y={60} />
      <FloatingIcon icon={Zap} delay={2} x={90} y={70} />
      <FloatingIcon icon={FileText} delay={3} x={10} y={30} />
      <FloatingIcon icon={Database} delay={4} x={70} y={85} />
      <FloatingIcon icon={Sparkles} delay={5} x={85} y={40} />
    </div>
  );
};

const FloatingIcon = ({ 
  icon: Icon, 
  delay, 
  x, 
  y 
}: { 
  icon: React.ElementType; 
  delay: number; 
  x: number; 
  y: number;
}) => {
  return (
    <motion.div
      className="absolute text-muted-foreground/20"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: [0.1, 0.3, 0.1],
        y: [0, -20, 0],
        rotate: [0, 10, 0],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    >
      <Icon size={32} />
    </motion.div>
  );
};
