import { motion } from 'framer-motion';
import { Layers, Zap, FileText, Globe, TrendingUp, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';

const features = [
  {
    icon: Globe,
    title: 'Wide Research',
    description: 'Parallel multi-agent system for large-scale data extraction',
  },
  {
    icon: Zap,
    title: 'Real-time Scraping',
    description: 'Extract data from any website with intelligent content parsing',
  },
  {
    icon: Layers,
    title: 'Multi-source Analysis',
    description: 'Aggregate and analyze information from multiple sources',
  },
  {
    icon: FileText,
    title: 'Structured Reports',
    description: 'Generate comprehensive reports in multiple formats',
  },
  {
    icon: TrendingUp,
    title: 'Smart Ranking',
    description: 'AI-powered relevance scoring for accurate results',
  },
  {
    icon: Shield,
    title: 'Data Accuracy',
    description: 'Cross-reference and verify information automatically',
  },
];

export const FeatureGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
      {features.map((feature, index) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + index * 0.1 }}
        >
          <Card 
            variant="glass" 
            className="p-5 h-full hover:border-primary/30 hover:bg-card/80 transition-all group cursor-default"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:from-primary/30 group-hover:to-accent/30 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
